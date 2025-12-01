import { documentParser, ParsedDocument } from './documentParser';
import { socialMediaVideoService } from './socialMediaVideoService';
import { tavily } from '@tavily/core';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const tavilyClient = process.env.TAVILY_API_KEY ? tavily({ apiKey: process.env.TAVILY_API_KEY }) : null;

export interface ContentSource {
  id: string;
  type: 'url' | 'file' | 'text';
  source: string;
  mimeType?: string;
  filePath?: string;
  originalName?: string;
}

export interface ParsedSource {
  id: string;
  type: 'url' | 'pdf' | 'docx' | 'image' | 'video' | 'audio' | 'text';
  source: string;
  content: string;
  success: boolean;
  error?: string;
  metadata?: {
    wordCount?: number;
    pages?: number;
    duration?: number;
    platform?: string;
  };
}

export interface OrchestratorResult {
  success: boolean;
  sources: ParsedSource[];
  unifiedContent: string;
  extractedVenues: Array<{
    name: string;
    type: string;
    priceRange?: string;
    mentions: number;
    sourceIds: string[];
  }>;
  extractedLocations: string[];
  suggestedCategory: string;
  error?: string;
}

class ContentOrchestrator {
  async parseMultipleSources(sources: ContentSource[]): Promise<OrchestratorResult> {
    console.log(`[ORCHESTRATOR] Processing ${sources.length} content sources`);
    
    const parsedSources: ParsedSource[] = [];
    
    for (const source of sources) {
      try {
        const parsed = await this.parseSource(source);
        parsedSources.push(parsed);
      } catch (error: any) {
        console.error(`[ORCHESTRATOR] Failed to parse source ${source.id}:`, error);
        parsedSources.push({
          id: source.id,
          type: source.type === 'url' ? 'url' : 'text',
          source: source.source,
          content: '',
          success: false,
          error: error.message || 'Failed to parse source'
        });
      }
    }

    const successfulSources = parsedSources.filter(s => s.success && s.content.length > 0);
    
    if (successfulSources.length === 0) {
      return {
        success: false,
        sources: parsedSources,
        unifiedContent: '',
        extractedVenues: [],
        extractedLocations: [],
        suggestedCategory: 'daily_planning',
        error: 'No content could be extracted from the provided sources'
      };
    }

    const unifiedContent = this.combineContent(successfulSources);
    const { venues, locations, category } = await this.analyzeContent(unifiedContent);

    console.log(`[ORCHESTRATOR] Unified ${successfulSources.length} sources, found ${venues.length} venues, ${locations.length} locations`);

    return {
      success: true,
      sources: parsedSources,
      unifiedContent,
      extractedVenues: venues,
      extractedLocations: locations,
      suggestedCategory: category
    };
  }

  private async parseSource(source: ContentSource): Promise<ParsedSource> {
    if (source.type === 'url') {
      return await this.parseUrl(source);
    } else if (source.type === 'file' && source.filePath && source.mimeType) {
      return await this.parseFile(source);
    } else if (source.type === 'text') {
      return {
        id: source.id,
        type: 'text',
        source: source.source.substring(0, 50) + '...',
        content: source.source,
        success: true,
        metadata: {
          wordCount: source.source.split(/\s+/).length
        }
      };
    }
    
    throw new Error('Invalid source configuration');
  }

  private async parseUrl(source: ContentSource): Promise<ParsedSource> {
    console.log(`[ORCHESTRATOR] Parsing URL: ${source.source}`);
    
    let content = '';
    let platform: string | undefined;
    
    const detectedPlatform = socialMediaVideoService.detectPlatform(source.source);
    
    if (detectedPlatform) {
      platform = detectedPlatform;
      console.log(`[ORCHESTRATOR] Detected social media platform: ${platform}, using video extraction`);
      
      try {
        const socialResult = await socialMediaVideoService.extractContent(source.source);
        
        if (socialResult.success) {
          const combinedContent = socialMediaVideoService.combineExtractedContent(socialResult);
          
          console.log(`[ORCHESTRATOR] Social media extraction complete: ${combinedContent.length} chars`);
          
          return {
            id: source.id,
            type: 'video',
            source: source.source,
            content: combinedContent,
            success: true,
            metadata: {
              platform: socialResult.platform,
              wordCount: combinedContent.split(/\s+/).length,
              duration: socialResult.metadata?.duration
            }
          };
        } else {
          console.log(`[ORCHESTRATOR] Social media extraction failed: ${socialResult.error}`);
        }
      } catch (error: any) {
        console.log(`[ORCHESTRATOR] Social media extraction error: ${error.message}`);
      }
    }

    if (tavilyClient) {
      try {
        const response = await tavilyClient.extract([source.source], {
          extractDepth: 'advanced'
        });
        
        if (response.results?.[0]?.rawContent) {
          content = response.results[0].rawContent;
        }
      } catch (error: any) {
        console.log(`[ORCHESTRATOR] Tavily extraction failed for ${source.source}:`, error.message);
      }
    }

    if (!content) {
      try {
        const response = await fetch(source.source, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        if (response.ok) {
          const html = await response.text();
          content = html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        }
      } catch (error: any) {
        console.log(`[ORCHESTRATOR] Basic fetch failed for ${source.source}:`, error.message);
      }
    }

    if (!content || content.length < 50) {
      return {
        id: source.id,
        type: 'url',
        source: source.source,
        content: '',
        success: false,
        error: platform 
          ? `Could not extract content from ${platform} video. Please describe the content.`
          : 'Could not extract content from this URL',
        metadata: { platform }
      };
    }

    content = content.substring(0, 15000);

    return {
      id: source.id,
      type: 'url',
      source: source.source,
      content: `[Source: ${platform || 'Web'}]\n${content}`,
      success: true,
      metadata: {
        platform,
        wordCount: content.split(/\s+/).length
      }
    };
  }

  private async parseFile(source: ContentSource): Promise<ParsedSource> {
    console.log(`[ORCHESTRATOR] Parsing file: ${source.originalName || source.filePath}`);
    
    const result = await documentParser.parseFile(source.filePath!, source.mimeType!);
    
    return {
      id: source.id,
      type: result.type as any,
      source: source.originalName || source.filePath!,
      content: result.success ? `[Source: ${source.originalName || 'Uploaded File'}]\n${result.content}` : '',
      success: result.success,
      error: result.error,
      metadata: {
        wordCount: result.metadata?.wordCount,
        pages: result.metadata?.pages,
        duration: result.metadata?.transcriptionDuration
      }
    };
  }

  private combineContent(sources: ParsedSource[]): string {
    const sections: string[] = [];
    
    for (let i = 0; i < sources.length; i++) {
      const source = sources[i];
      sections.push(`--- Source ${i + 1}: ${source.source} ---\n${source.content}`);
    }
    
    return sections.join('\n\n');
  }

  private async analyzeContent(content: string): Promise<{
    venues: Array<{
      name: string;
      type: string;
      priceRange?: string;
      mentions: number;
      sourceIds: string[];
    }>;
    locations: string[];
    category: string;
  }> {
    if (!process.env.OPENAI_API_KEY) {
      return { venues: [], locations: [], category: 'daily_planning' };
    }

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.3,
        messages: [
          {
            role: 'system',
            content: `You are an expert at analyzing content to extract actionable information for planning.
Analyze the provided content and extract:
1. Venues/Places mentioned (restaurants, hotels, attractions, etc.) with price ranges if mentioned
2. Locations/Cities/Countries mentioned
3. Best category for this content

Return JSON in this exact format:
{
  "venues": [
    {"name": "Venue Name", "type": "restaurant|hotel|attraction|activity", "priceRange": "$50-100 per person"}
  ],
  "locations": ["City", "Country"],
  "category": "travel|date_night|fitness|daily_planning|interview_prep"
}

Deduplicate venues that appear multiple times.
Only include venues with concrete names (not generic descriptions).
For price ranges, include currency and per-unit (per night, per person, etc.)`
          },
          {
            role: 'user',
            content: content.substring(0, 8000)
          }
        ],
        response_format: { type: 'json_object' }
      });

      const parsed = JSON.parse(response.choices[0]?.message?.content || '{}');
      
      return {
        venues: parsed.venues || [],
        locations: parsed.locations || [],
        category: parsed.category || 'daily_planning'
      };
    } catch (error: any) {
      console.error('[ORCHESTRATOR] Content analysis failed:', error.message);
      return { venues: [], locations: [], category: 'daily_planning' };
    }
  }

  async generateUnifiedPlan(
    orchestratorResult: OrchestratorResult,
    userGoal?: string
  ): Promise<{
    title: string;
    description: string;
    tasks: Array<{
      title: string;
      description: string;
      priority: 'high' | 'medium' | 'low';
      budget?: string;
      venue?: string;
    }>;
    totalBudget?: string;
    timeframe?: string;
  }> {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    const venueContext = orchestratorResult.extractedVenues.length > 0
      ? `\n\nExtracted venues from sources:\n${orchestratorResult.extractedVenues.map(v => 
          `- ${v.name} (${v.type})${v.priceRange ? ` - ${v.priceRange}` : ''}`
        ).join('\n')}`
      : '';

    const locationContext = orchestratorResult.extractedLocations.length > 0
      ? `\n\nLocations mentioned: ${orchestratorResult.extractedLocations.join(', ')}`
      : '';

    const prompt = `Based on the following content from multiple sources, create a comprehensive action plan.

${userGoal ? `User's goal: ${userGoal}\n` : ''}
Content from ${orchestratorResult.sources.filter(s => s.success).length} sources:

${orchestratorResult.unifiedContent.substring(0, 12000)}
${venueContext}
${locationContext}

Create 6-9 SPECIFIC, ACTIONABLE tasks with:
- Real venue names and prices (use the extracted venues when applicable)
- Concrete budgets with currency
- Specific recommendations

FORBIDDEN patterns:
- "Research prices" (instead: "$150/night at Hotel X")
- "Look into options" (instead: "Book table at Restaurant Y for $80/person")
- "Set a budget" (instead: specific amounts)

Return JSON:
{
  "title": "Descriptive plan title",
  "description": "Brief overview with key highlights",
  "tasks": [
    {
      "title": "Specific actionable task",
      "description": "Details with venue, price, timing",
      "priority": "high|medium|low",
      "budget": "$XX",
      "venue": "Venue name if applicable"
    }
  ],
  "totalBudget": "Estimated total: $X - $Y",
  "timeframe": "X days/weeks"
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.5,
      messages: [
        {
          role: 'system',
          content: 'You are an expert planner who creates detailed, actionable plans with specific venues, prices, and recommendations. Never use vague language - always be specific.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' }
    });

    return JSON.parse(response.choices[0]?.message?.content || '{}');
  }
}

export const contentOrchestrator = new ContentOrchestrator();
