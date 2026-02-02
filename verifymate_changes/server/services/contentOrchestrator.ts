import { documentParser, ParsedDocument } from './documentParser';
import { socialMediaVideoService } from './socialMediaVideoService';
import { tavilyExtract, isTavilyConfigured } from './tavilyProvider';
import OpenAI from 'openai';
import { storage } from '../storage';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
// Tavily client is now managed by tavilyProvider.ts with automatic key rotation

function normalizeUrlForCache(urlString: string): string {
  try {
    const parsed = new URL(urlString);
    
    if (parsed.hostname.includes('instagram.com')) {
      const pathMatch = parsed.pathname.match(/\/(reel|p|stories)\/([^\/]+)/);
      if (pathMatch) {
        return `https://www.instagram.com/${pathMatch[1]}/${pathMatch[2]}/`;
      }
    }
    
    if (parsed.hostname.includes('tiktok.com')) {
      const pathMatch = parsed.pathname.match(/\/@[^\/]+\/video\/(\d+)/);
      if (pathMatch) {
        const username = parsed.pathname.split('/')[1];
        return `https://www.tiktok.com/${username}/video/${pathMatch[1]}`;
      }
    }
    
    if (parsed.hostname.includes('youtube.com') || parsed.hostname.includes('youtu.be')) {
      let videoId: string | null = null;
      if (parsed.hostname.includes('youtu.be')) {
        videoId = parsed.pathname.slice(1);
      } else if (parsed.pathname.includes('/shorts/')) {
        videoId = parsed.pathname.split('/shorts/')[1]?.split('/')[0];
      } else {
        videoId = parsed.searchParams.get('v');
      }
      if (videoId) {
        return `https://www.youtube.com/watch?v=${videoId}`;
      }
    }
    
    const paramsToRemove = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid', 'ref', 'source', 'igsh'];
    paramsToRemove.forEach(param => parsed.searchParams.delete(param));
    
    return parsed.toString();
  } catch {
    return urlString;
  }
}

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
      const normalizedUrl = normalizeUrlForCache(source.source);
      console.log(`[ORCHESTRATOR] Detected social media platform: ${platform}, normalized URL: ${normalizedUrl}`);
      
      // Step 1: CHECK CACHE FIRST - this is FREE and instant!
      try {
        const cached = await storage.getUrlContentCache(normalizedUrl);
        if (cached) {
          console.log(`[ORCHESTRATOR] 💾 CACHE HIT! Returning ${cached.wordCount} words (source: ${cached.extractionSource})`);
          return {
            id: source.id,
            type: 'video',
            source: source.source,
            content: cached.extractedContent,
            success: true,
            metadata: {
              platform: detectedPlatform,
              wordCount: cached.wordCount || undefined
            }
          };
        }
        console.log(`[ORCHESTRATOR] Cache MISS for ${normalizedUrl} - will extract fresh`);
      } catch (cacheError) {
        console.warn('[ORCHESTRATOR] Cache lookup failed:', cacheError);
      }
      
      // Step 2: Extract fresh content
      try {
        const socialResult = await socialMediaVideoService.extractContent(source.source);
        
        if (socialResult.success) {
          const combinedContent = socialMediaVideoService.combineExtractedContent(socialResult);
          
          console.log(`[ORCHESTRATOR] Social media extraction complete: ${combinedContent.length} chars`);
          
          // Step 3: CACHE the successful extraction for future use
          try {
            const wordCount = combinedContent.split(/\s+/).length;
            await storage.createUrlContentCache({
              normalizedUrl,
              originalUrl: source.source,
              platform: detectedPlatform,
              extractedContent: combinedContent,
              extractionSource: 'social_media_service',
              wordCount,
              metadata: {
                hasAudioTranscript: !!socialResult.audioTranscript,
                hasOcrText: !!socialResult.ocrText,
                caption: socialResult.caption,
                author: socialResult.metadata?.author
              }
            });
            console.log(`[ORCHESTRATOR] ✅ Cached content for future use: ${normalizedUrl} (${wordCount} words)`);
          } catch (cacheError) {
            console.warn('[ORCHESTRATOR] Failed to cache extraction:', cacheError);
          }
          
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

    if (isTavilyConfigured()) {
      try {
        const response = await tavilyExtract([source.source], {
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
    sourceKeyPoints: Array<{
      point: string;
      context?: string;
    }>;
    suggestedActions: Array<{
      title: string;
      description: string;
      priority: 'high' | 'medium' | 'low';
      category?: string;
      estimatedTime?: string;
      budget?: string;
      venue?: string;
      aiGenerated: boolean;
    }>;
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

    const prompt = `Based on the following content from multiple sources, create a comprehensive action plan with TWO DISTINCT SECTIONS:

1. SOURCE KEY POINTS: Extract the actual facts, quotes, and advice DIRECTLY stated in the source content. Do NOT add any interpretation or specific numbers that aren't explicitly mentioned. These should be paraphrases or direct quotes from the source.

2. AI SUGGESTED ACTIONS: Create actionable tasks based on the key points. Here you CAN add specific details like dollar amounts, time blocks, product names, etc. to make the advice actionable. These are YOUR suggestions for implementing the source's advice.

${userGoal ? `User's goal: ${userGoal}\n` : ''}
Content from ${orchestratorResult.sources.filter(s => s.success).length} sources:

${orchestratorResult.unifiedContent.substring(0, 12000)}
${venueContext}
${locationContext}

IMPORTANT DISTINCTION:
- "sourceKeyPoints" = What the source ACTUALLY says (no invented specifics)
- "suggestedActions" = YOUR actionable interpretation (can include specific amounts, products, timeframes)

Return JSON:
{
  "title": "Descriptive plan title",
  "description": "Brief overview",
  "sourceKeyPoints": [
    {
      "point": "The main idea or advice from the source (paraphrase or quote)",
      "context": "Optional additional context from the source"
    }
  ],
  "suggestedActions": [
    {
      "title": "Specific actionable task",
      "description": "Details with venue, price, timing - clearly AI-generated specifics",
      "priority": "high|medium|low",
      "category": "Category like Financial Planning, Daily Habits, etc.",
      "estimatedTime": "30 min, 1 hour, etc.",
      "budget": "$XX (AI suggested)",
      "venue": "Venue name if applicable",
      "aiGenerated": true
    }
  ],
  "tasks": [
    {
      "title": "Specific actionable task (same as suggestedActions for backwards compatibility)",
      "description": "Details",
      "priority": "high|medium|low"
    }
  ],
  "totalBudget": "Estimated total: $X - $Y (AI estimate)",
  "timeframe": "X days/weeks"
}

Extract 4-8 source key points and create 6-9 suggested actions.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.5,
      messages: [
        {
          role: 'system',
          content: `You are an expert at extracting information and creating actionable plans. 

CRITICAL: You must clearly separate:
1. What the SOURCE actually says (no invented details)
2. What YOU suggest to implement it (can include specific amounts, products, times)

Never mix source facts with AI suggestions. Users need transparency about what came from the article vs. what you invented to make it actionable.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(response.choices[0]?.message?.content || '{}');
    
    // Ensure all suggestedActions have aiGenerated flag
    if (result.suggestedActions) {
      result.suggestedActions = result.suggestedActions.map((action: any) => ({
        ...action,
        aiGenerated: true
      }));
    }
    
    // BACKWARDS COMPATIBILITY: Ensure tasks array is always populated
    // If the model didn't provide tasks, copy from suggestedActions
    if (!result.tasks || result.tasks.length === 0) {
      result.tasks = (result.suggestedActions || []).map((action: any) => ({
        title: action.title,
        description: action.description,
        priority: action.priority || 'medium',
        budget: action.budget,
        venue: action.venue
      }));
    }
    
    // Ensure sourceKeyPoints is always an array (default to empty if not provided)
    if (!result.sourceKeyPoints) {
      result.sourceKeyPoints = [];
    }
    
    // Ensure suggestedActions is always an array
    if (!result.suggestedActions) {
      result.suggestedActions = (result.tasks || []).map((task: any) => ({
        ...task,
        aiGenerated: true
      }));
    }
    
    return result;
  }
}

export const contentOrchestrator = new ContentOrchestrator();
