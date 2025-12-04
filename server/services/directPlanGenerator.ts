import Anthropic from "@anthropic-ai/sdk";
import type { User, InsertUrlContentCache } from '@shared/schema';
import axios from 'axios';
import { tavily } from '@tavily/core';
import { storage } from '../storage';
import { socialMediaVideoService } from './socialMediaVideoService';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Initialize Tavily client for advanced URL content extraction
const tavilyClient = tavily({ apiKey: process.env.TAVILY_API_KEY });

// Patterns to detect social media content
const SOCIAL_MEDIA_PATTERNS = [
  'Platform: INSTAGRAM',
  'Platform: TIKTOK', 
  'Platform: YOUTUBE',
  'On-Screen Text (OCR)',
  'Audio Transcript'
];

// Use Sonnet-4 for direct plan generation (needs high quality output)
const CLAUDE_SONNET = "claude-sonnet-4-20250514";

export interface DirectPlanResult {
  activity: {
    title: string;
    description: string;
    category: string;
  };
  tasks: Array<{
    title: string;
    description: string;
    category: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}

export interface UserPreferences {
  location: string;
  savedItems: number;
  venues: Array<{
    name: string;
    type: string;
    priceRange?: string;
  }>;
  categories: string[];
  budgetTiers: string[];
}

/**
 * Direct Plan Generator - No questions, no validation, just generate!
 *
 * User gives input (text or image) → Claude generates plan → Done!
 */
export class DirectPlanGenerator {

  /**
   * Detect if input is a URL (entire input is just a URL)
   */
  private isUrl(input: string): boolean {
    try {
      new URL(input.trim());
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Normalize URL for consistent cache keys
   * Strips tracking params (igsh, utm_*, etc.) that don't affect content
   */
  private normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const paramsToRemove = [
        'igsh', 'igshid', 'ig_mid', 'ig_cache_key',
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
        'fbclid', 'gclid', 'ref', 'ref_src', 's', 't'
      ];
      paramsToRemove.forEach(param => urlObj.searchParams.delete(param));
      return urlObj.toString().replace(/\/$/, ''); // Remove trailing slash
    } catch {
      return url.trim().toLowerCase();
    }
  }

  /**
   * Extract URLs from text input
   * Returns array of URLs found in the text
   */
  private extractUrls(input: string): string[] {
    // Match URLs starting with http:// or https://
    const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
    const matches = input.match(urlRegex) || [];
    return matches.map(url => {
      // Clean up trailing punctuation that might have been captured
      return url.replace(/[.,;:!?)]+$/, '');
    });
  }

  /**
   * Check if content is from social media (extracted via our services)
   */
  private isSocialMediaContent(content: string): boolean {
    return SOCIAL_MEDIA_PATTERNS.some(pattern => content.includes(pattern));
  }

  /**
   * Extract location/destination info from social media content
   */
  private extractLocationsFromContent(content: string): { destination: string | null; areas: string[] } {
    const areas: string[] = [];
    let destination: string | null = null;

    // Common area patterns in content (e.g., "VI", "Ikoyi", "Lagos")
    const areaPatterns = [
      /\bVI\b/gi,
      /\bVictoria Island\b/gi,
      /\bIkoyi\b/gi,
      /\bIkeja\b/gi,
      /\bLekki\b/gi,
      /\bIlashe\b/gi,
      /\bLagos\b/gi,
      /\bAbuja\b/gi,
      /\bParis\b/gi,
      /\bLondon\b/gi,
      /\bDubai\b/gi,
      /\bNew York\b/gi,
      /\bMarrakech\b/gi,
    ];

    for (const pattern of areaPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        for (const match of matches) {
          const normalized = match.toLowerCase() === 'vi' ? 'Victoria Island' : match;
          if (!areas.includes(normalized)) {
            areas.push(normalized);
          }
        }
      }
    }

    // Detect main destination (usually a city/country)
    const destinationPatterns = [
      /\bLagos\b/gi,
      /\bNigeria\b/gi,
      /\bParis\b/gi,
      /\bFrance\b/gi,
      /\bLondon\b/gi,
      /\bDubai\b/gi,
      /\bMorocco\b/gi,
    ];

    for (const pattern of destinationPatterns) {
      if (pattern.test(content)) {
        destination = pattern.source.replace(/\\b/g, '');
        break;
      }
    }

    return { destination, areas };
  }

  /**
   * Search for contextual additions (hotels, transport) near extracted locations
   */
  private async searchContextualAdditions(destination: string, areas: string[]): Promise<string> {
    if (!destination || areas.length === 0) {
      return '';
    }

    const areaList = areas.slice(0, 3).join(', ');
    console.log(`[DIRECT PLAN] Searching for hotels/transport near: ${areaList} in ${destination}`);

    try {
      const searchQuery = `best hotels accommodations near ${areaList} ${destination} prices 2024`;
      const response = await tavilyClient.search(searchQuery, {
        maxResults: 5,
        searchDepth: 'basic'
      });

      if (response.results && response.results.length > 0) {
        const hotelInfo = response.results
          .slice(0, 3)
          .map((r: any) => `- ${r.title}: ${r.content?.substring(0, 200) || 'No details'}`)
          .join('\n');

        console.log(`[DIRECT PLAN] Found contextual hotel info: ${hotelInfo.length} chars`);
        return `\n\n=== CONTEXTUAL ADDITIONS (for complementary logistics) ===\n**Destination:** ${destination}\n**Key Areas:** ${areaList}\n\n**Nearby Accommodation Options (from web search):**\n${hotelInfo}\n\nUse this to suggest contextual accommodation NEAR the extracted venues.`;
      }
    } catch (error) {
      console.warn('[DIRECT PLAN] Contextual search failed:', error);
    }

    return '';
  }

  /**
   * Extract content from URL using Tavily Extract API
   * Handles JavaScript-rendered pages, CAPTCHAs, and anti-bot measures
   */
  private async extractUrlContentWithTavily(url: string): Promise<string> {
    try {
      console.log(`[DIRECT PLAN] Extracting URL with Tavily (advanced mode): ${url}`);
      
      const response = await tavilyClient.extract([url], {
        extractDepth: 'advanced', // Handles JS rendering, CAPTCHAs, anti-bot
        format: 'markdown', // Get clean markdown format
        timeout: 30 // 30 second timeout for advanced extraction
      });

      if (response.results && response.results.length > 0) {
        const content = response.results[0].rawContent;
        if (content) {
          console.log(`[DIRECT PLAN] Successfully extracted ${content.length} chars from URL via Tavily`);
          return content.substring(0, 5000); // Limit to 5000 chars
        }
      }

      if (response.failedResults && response.failedResults.length > 0) {
        throw new Error(`Tavily extraction failed: ${response.failedResults[0]}`);
      }

      throw new Error('Tavily extraction returned no content');
    } catch (error) {
      console.error('[DIRECT PLAN] Tavily extraction failed:', error);
      throw error;
    }
  }

  /**
   * Fetch content from URL with smart caching and fallback chain:
   * 1. Check database cache first (instant, free)
   * 2. Try social media service for Instagram/TikTok (Apify + OCR + transcription)
   * 3. Fall back to Tavily Extract for other URLs
   * 4. Fall back to axios
   * 5. Cache successful extractions permanently
   */
  private async fetchUrlContent(url: string): Promise<string> {
    const normalizedUrl = this.normalizeUrl(url);
    
    // Step 1: Check cache FIRST - this is FREE and instant!
    try {
      const cached = await storage.getUrlContentCache(normalizedUrl);
      if (cached) {
        console.log(`[DIRECT PLAN] 💾 CACHE HIT for URL: ${normalizedUrl}`);
        console.log(`[DIRECT PLAN] Returning ${cached.wordCount} words from cache (source: ${cached.extractionSource})`);
        return cached.extractedContent;
      }
      console.log(`[DIRECT PLAN] Cache MISS for URL: ${normalizedUrl}`);
    } catch (cacheError) {
      console.warn('[DIRECT PLAN] Cache lookup failed:', cacheError);
    }
    
    // Step 2: Determine extraction method based on platform
    const platform = socialMediaVideoService.detectPlatform(url);
    let extractedContent: string | null = null;
    let extractionSource: string = 'unknown';
    let metadata: InsertUrlContentCache['metadata'] = {};
    
    // Step 3: Use social media service for Instagram/TikTok/YouTube (Apify + Whisper + OCR)
    if (platform) {
      console.log(`[DIRECT PLAN] 🎬 Detected ${platform} - using social media extraction service...`);
      try {
        const socialResult = await socialMediaVideoService.extractContent(url);
        
        if (socialResult.success) {
          extractedContent = socialMediaVideoService.combineExtractedContent(socialResult);
          extractionSource = 'social_media_service';
          metadata = {
            title: socialResult.metadata?.title,
            author: socialResult.metadata?.author,
            caption: socialResult.caption,
            hasAudioTranscript: !!socialResult.audioTranscript,
            hasOcrText: !!socialResult.ocrText,
            carouselItemCount: socialResult.carouselItems?.length
          };
          console.log(`[DIRECT PLAN] ✅ Social media extraction SUCCESS: ${extractedContent.length} chars`);
        } else {
          console.warn(`[DIRECT PLAN] Social media extraction failed: ${socialResult.error}`);
        }
      } catch (socialError: any) {
        console.warn(`[DIRECT PLAN] Social media service error: ${socialError.message}`);
      }
    }
    
    // Step 4: Fall back to Tavily if social media extraction failed or unsupported platform
    if (!extractedContent) {
      console.log(`[DIRECT PLAN] Trying Tavily extraction...`);
      try {
        extractedContent = await this.extractUrlContentWithTavily(url);
        extractionSource = 'tavily';
        console.log(`[DIRECT PLAN] Tavily extraction SUCCESS: ${extractedContent.length} chars`);
      } catch (tavilyError: any) {
        console.warn(`[DIRECT PLAN] Tavily failed: ${tavilyError.message}`);
        
        // Step 5: Last resort - axios
        try {
          console.log(`[DIRECT PLAN] Trying axios fallback...`);
          const response = await axios.get(url, { timeout: 10000 });
          const content = response.data;
          if (typeof content === 'string' && content.includes('<html')) {
            extractedContent = content
              .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
              .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
              .substring(0, 15000);
          } else {
            extractedContent = content.toString().substring(0, 15000);
          }
          extractionSource = 'axios';
          console.log(`[DIRECT PLAN] Axios extraction SUCCESS: ${extractedContent?.length || 0} chars`);
        } catch (axiosError: any) {
          console.error(`[DIRECT PLAN] All extraction methods failed for ${url}`);
          throw new Error(`Failed to extract content from URL: ${url}`);
        }
      }
    }
    
    // Step 6: Cache the successful extraction permanently for future users!
    if (extractedContent) {
      const wordCount = extractedContent.split(/\s+/).length;
      try {
        await storage.createUrlContentCache({
          normalizedUrl,
          originalUrl: url,
          platform: platform || undefined,
          extractedContent,
          extractionSource,
          wordCount,
          metadata
        });
        console.log(`[DIRECT PLAN] 💾 CACHED content for URL: ${normalizedUrl} (${wordCount} words)`);
      } catch (cacheError: any) {
        // Don't fail on cache errors - content was still extracted
        if (cacheError.code === '23505') {
          console.log(`[DIRECT PLAN] URL already cached (race condition), continuing...`);
        } else {
          console.warn('[DIRECT PLAN] Failed to cache content:', cacheError.message);
        }
      }
    }
    
    return extractedContent || '';
  }

  /**
   * Generate a plan directly from user input
   * No questions, no back-and-forth, just create the plan!
   */
  async generatePlan(
    userInput: string,
    contentType: 'text' | 'image',
    userProfile: User,
    existingPlan?: DirectPlanResult, // For modifications
    userPreferences?: UserPreferences // User's saved preferences for the destination
  ): Promise<DirectPlanResult> {

    console.log(`[DIRECT PLAN] Generating plan from ${contentType} input`);
    console.log(`[DIRECT PLAN] User input: ${userInput.substring(0, 100)}...`);

    const isModification = !!existingPlan;

    if (isModification) {
      console.log(`[DIRECT PLAN] Modifying existing plan: "${existingPlan.activity.title}"`);
    }

    // Step 0: Check if input contains URLs and fetch content from them
    let processedInput = userInput;
    if (!isModification && contentType === 'text') {
      // First check if entire input is a URL
      if (this.isUrl(userInput.trim())) {
        console.log('[DIRECT PLAN] Single URL detected, fetching content...');
        try {
          const urlContent = await this.fetchUrlContent(userInput.trim());
          processedInput = `URL: ${userInput.trim()}\n\nContent from URL:\n${urlContent}`;
          console.log(`[DIRECT PLAN] Fetched ${urlContent.length} chars from URL`);
        } catch (error) {
          console.error('[DIRECT PLAN] URL fetch failed:', error);
          // Don't throw - continue with original input and let AI handle it
          processedInput = `User wants to create a plan from this URL (content could not be fetched): ${userInput}`;
        }
      } else {
        // Check if input contains URLs within text
        const urls = this.extractUrls(userInput);
        if (urls.length > 0) {
          console.log(`[DIRECT PLAN] Found ${urls.length} URL(s) in text:`, urls);
          
          // Fetch content from all URLs (limit to first 3)
          const urlContents: string[] = [];
          for (const url of urls.slice(0, 3)) {
            try {
              console.log(`[DIRECT PLAN] Fetching content from: ${url}`);
              const content = await this.fetchUrlContent(url);
              urlContents.push(`\n--- Content from ${url} ---\n${content}`);
              console.log(`[DIRECT PLAN] Fetched ${content.length} chars from ${url}`);
            } catch (error) {
              console.error(`[DIRECT PLAN] Failed to fetch ${url}:`, error);
              urlContents.push(`\n--- Could not fetch content from ${url} ---`);
            }
          }
          
          if (urlContents.length > 0) {
            // Combine user's text with fetched URL content
            processedInput = `${userInput}\n\n=== FETCHED URL CONTENT ===\n${urlContents.join('\n')}`;
          }
        }
      }
    }

    // Step 1: Validate if input is plan-related (guardrail check)
    if (!isModification && contentType === 'text') {
      const isPlanRelated = await this.validatePlanIntent(processedInput);
      if (!isPlanRelated) {
        throw new Error('INPUT_NOT_PLAN_RELATED: Your input doesn\'t appear to be requesting a plan. Please describe what you want to plan or accomplish.');
      }
    }

    // Step 1.5: If social media content detected, search for contextual additions
    if (!isModification && this.isSocialMediaContent(processedInput)) {
      console.log('[DIRECT PLAN] Social media content detected, extracting locations...');
      const { destination, areas } = this.extractLocationsFromContent(processedInput);
      
      if (destination && areas.length > 0) {
        console.log(`[DIRECT PLAN] Found destination: ${destination}, areas: ${areas.join(', ')}`);
        const contextualInfo = await this.searchContextualAdditions(destination, areas);
        if (contextualInfo) {
          processedInput += contextualInfo;
          console.log('[DIRECT PLAN] Added contextual hotel/transport info to input');
        }
      }
    }

    // Build prompt based on whether it's new or modification
    const prompt = isModification
      ? this.buildModificationPrompt(processedInput, existingPlan, userProfile)
      : this.buildCreationPrompt(processedInput, contentType, userProfile, userPreferences);

    try {
      const messageContent = contentType === 'image'
        ? this.buildImageMessage(userInput, prompt)
        : [{ type: "text" as const, text: prompt }];

      const response = await anthropic.messages.create({
        model: CLAUDE_SONNET,
        max_tokens: 4096,
        temperature: 0.7,
        system: [
          {
            type: "text",
            text: `You are a plan generation expert. Your job is to convert user requests into actionable activity plans with specific tasks. Be direct, clear, and actionable. Format everything as proper activities and tasks that can be tracked.`,
            cache_control: { type: "ephemeral" as any }
          }
        ],
        messages: [{
          role: "user",
          content: messageContent
        }]
      });

      const responseText = (response.content[0] as any).text;

      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in Claude response');
      }

      const result: DirectPlanResult = JSON.parse(jsonMatch[0]);

      console.log(`[DIRECT PLAN] Generated: "${result.activity.title}" with ${result.tasks.length} tasks`);

      return result;

    } catch (error) {
      console.error('[DIRECT PLAN] Error:', error);
      throw error;
    }
  }

  /**
   * Validate if user input is actually requesting a plan (guardrail)
   */
  private async validatePlanIntent(userInput: string): Promise<boolean> {
    console.log('[GUARDRAIL] Checking if input is plan-related...');

    try {
      const response = await anthropic.messages.create({
        model: "claude-3-5-haiku-20241022", // Use Haiku for fast, cheap validation
        max_tokens: 50,
        temperature: 0,
        messages: [{
          role: "user",
          content: `Analyze this user input and determine if they are requesting help to CREATE, PLAN, or ORGANIZE something.

INPUT: "${userInput}"

PLAN-RELATED INDICATORS:
✅ "plan my..." / "help me plan..."
✅ "organize..." / "prepare for..."
✅ "I need to..." / "I want to..."
✅ Pasted steps/tasks/lists (numbered, bulleted)
✅ Goals, objectives, projects
✅ "create a..." / "build a..."

NOT PLAN-RELATED:
❌ Random statements ("fall on ice", "it's cold")
❌ Questions without action intent ("what is...?", "how does...?")
❌ Observations or facts
❌ Single-word inputs without context

Answer with ONLY "YES" or "NO".`
        }]
      });

      const answer = (response.content[0] as any).text.trim().toLowerCase();
      const isPlanRelated = answer.includes('yes');

      console.log(`[GUARDRAIL] Result: ${isPlanRelated ? 'PLAN-RELATED ✅' : 'NOT PLAN-RELATED ❌'}`);

      return isPlanRelated;
    } catch (error) {
      // If validation fails, assume it's plan-related (fail-open)
      console.warn('[GUARDRAIL] Validation error, assuming plan-related:', error);
      return true;
    }
  }

  /**
   * Build prompt for creating NEW plan
   */
  private buildCreationPrompt(
    userInput: string,
    contentType: 'text' | 'image',
    userProfile: User,
    userPreferences?: UserPreferences
  ): string {

    const userName = userProfile.firstName || userProfile.username || 'User';
    const userContext = `User: ${userName}
Location: ${userProfile.location || 'Unknown'}
Timezone: ${userProfile.timezone || 'Unknown'}`;
    
    // Build user preferences section if available
    let userPreferencesSection = '';
    if (userPreferences && userPreferences.savedItems > 0) {
      const venuesList = userPreferences.venues
        .slice(0, 10)
        .map(v => `- ${v.name} (${v.type}${v.priceRange ? `, ${v.priceRange}` : ''})`)
        .join('\n');
      
      userPreferencesSection = `

## 🌟 USER'S SAVED PREFERENCES FOR ${userPreferences.location.toUpperCase()} 🌟

The user has previously saved ${userPreferences.savedItems} items for ${userPreferences.location}.
These are places/activities they're interested in visiting:

${venuesList}

Categories of interest: ${userPreferences.categories.join(', ')}
Budget preference: ${userPreferences.budgetTiers.join(', ') || 'Not specified'}

**INSTRUCTIONS FOR USING PREFERENCES:**
1. PRIORITIZE these saved venues/activities in your plan
2. Include at least 2-3 of their saved spots as specific tasks
3. Use their saved preferences to understand their taste and recommend similar venues
4. Match their budget preference when suggesting additional options
5. DO NOT ignore their saved preferences - they specifically saved these for a reason!
`;
    }

    return `Generate an actionable plan based on the user's request.

USER CONTEXT:
${userContext}
${userPreferencesSection}
USER REQUEST:
"${userInput}"

TASK:
1. Create an activity with a CLEAR, SPECIFIC, USER-FRIENDLY title
2. Break down into 6-9 actionable tasks (occasionally 5 for very simple goals)
3. Each task MUST include SPECIFIC details - real prices, budgets, named recommendations
4. Use appropriate priorities (high/medium/low)

CRITICAL - ACTIVITY TITLE REQUIREMENTS:
- MUST be clear, concise, and immediately understandable
- MUST reflect the main goal/objective from the user's request
- MUST be natural language (like a human would say it)
- Extract and use ANY header/title from the pasted content
- Include timeframes if mentioned (weekend, today, next week, etc.)
- Preserve emojis if present in request
- BAD: "Clear intuitive title based on the user request with what was generated from claude"
- GOOD: "Weekend: IP Protection Tasks"
- GOOD: "Google Interview Prep - Next Week"
- GOOD: "🏋️ 30-Day Fitness Challenge"

OUTPUT FORMAT (JSON only, no markdown):
{
  "activity": {
    "title": "SPECIFIC, CLEAR TITLE HERE",
    "description": "Brief description of the overall plan",
    "category": "Work|Personal|Health|Learning|Finance|Social|Other"
  },
  "tasks": [
    {
      "title": "Specific, actionable task title with concrete details",
      "description": "Detailed description including specific prices ($X-Y), named recommendations, quantities, and actionable steps",
      "category": "Same as activity or more specific",
      "priority": "high|medium|low"
    }
  ]
}

## TASK SPECIFICITY REQUIREMENTS

ALL tasks MUST include:
1. **Specific dollar amounts** when relevant (hotels: $80-120/night, flights: $300-500, etc.)
2. **Named recommendations** (specific restaurants, hotels, apps, tools by name)
3. **Concrete quantities** (3 hours, 5 pages, 2 weeks, 30 minutes)
4. **Actionable steps** - not "research X" but "do X using Y method"

❌ FORBIDDEN VAGUE PATTERNS:
- "Research prices for hotels" → Instead: "Book hotel ($80-120/night, try Booking.com for Medina riads)"
- "Find flights" → Instead: "Book roundtrip flights ($400-600, check Google Flights/Kayak)"
- "Set a budget" → Instead: "Allocate $500 for dining, $300 for activities, $200 for shopping"
- "Look into transportation" → Instead: "Rent car via Avis ($45/day) or use Uber ($15-25 avg ride)"

RULES FOR TITLE EXTRACTION:
1. If user's request starts with a title/header → USE IT as activity title
2. If request says "plan my [X]" → Activity: "[X] Plan" or just "[X]"
3. If request mentions goal → USE THE GOAL as title
4. If pasted content has markdown headers (# Title) → USE THAT HEADER
5. If timeframe mentioned → INCLUDE IT in title
6. If request is a list without title → CREATE descriptive title from context
7. NEVER use generic titles like "Action Plan" or "Your Tasks"
8. NEVER use meta descriptions about generating or creating

⚠️ CRITICAL: URL CONTENT HANDLING ⚠️
When the input contains "FETCHED URL CONTENT" or "Content from URL":
- You HAVE the actual content already - it's provided above!
- Generate actionable tasks DIRECTLY FROM the content
- DO NOT create tasks like "Access the URL", "Navigate to the link", "Read the content"
- DO NOT create tasks that tell the user to visit/review/access the URL
- The content HAS BEEN extracted for you - work with it directly!

## 🔒 STRICT GROUNDING RULES FOR SOCIAL MEDIA CONTENT 🔒

When the input contains "Platform: INSTAGRAM", "Platform: TIKTOK", "Platform: YOUTUBE" or "On-Screen Text (OCR)":
This is EXTRACTED SOCIAL MEDIA CONTENT. You MUST follow these MANDATORY rules:

### RULE 1: PRESERVE ALL EXTRACTED CONTENT (NEVER SUBSTITUTE)
- Every venue/activity/location mentioned in the OCR or caption MUST become a task
- Use the EXACT names from the content (e.g., "Lo Studio", "Knowhere", "Ounje Co", "Dulce")
- Use the EXACT prices from the content (e.g., "₦100,000", "₦50,000", "₦20,000")
- NEVER substitute extracted venues with generic recommendations
- NEVER replace specific restaurants/venues with ones from your training data

### RULE 2: ADDITIVE ONLY (ADD, NEVER REDUCE)
You MAY add complementary logistics that support the extracted content:
- ✅ Flights/transportation TO the destination mentioned in content
- ✅ Accommodation NEAR the venues mentioned in content (use same area/neighborhood)
- ✅ Transportation BETWEEN the extracted venues
- ✅ Pre-trip preparation (packing, booking)

### RULE 3: CONTEXTUAL ADDITIONS (LOCATION-AWARE)
When adding logistics, they must be CONTEXTUAL to the extracted locations:
- If venues are in "Victoria Island" → suggest hotels IN Victoria Island
- If venues are in "Ikoyi" → suggest staying near Ikoyi
- Reference specific venues: "Stay near Victoria Island to access Lo Studio, Knowhere, and Dulce easily"

### RULE 4: NO HALLUCINATED ALTERNATIVES
❌ FORBIDDEN: Adding restaurants/venues NOT in the extracted content
❌ FORBIDDEN: Suggesting "alternatives" like "or try Nok by Alara" (not from source)
❌ FORBIDDEN: Generic recommendations like "premium dining experiences at Lagos' top restaurants"
❌ FORBIDDEN: Replacing extracted prices with your own estimates

### EXAMPLE - CORRECT GROUNDING:

**Source Content (OCR):**
- PILATES - Lo Studio, VI - ₦100,000
- PADEL - Padel House, Ikoyi
- BRUNCH - Knowhere, VI - ₦50,000
- DINNER - Ounje Co - ₦100,000
- MATCHA DATE - Dulce, Ikoyi - ₦20,000

**✅ CORRECT PLAN:**
1. Book flights to Lagos (₦450,000-650,000) [ADDED - logistics]
2. Stay in Victoria Island/Ikoyi area near venues (₦150,000-250,000/night) [ADDED - contextual]
3. Pilates session at Lo Studio, VI (₦100,000 as per source) [FROM SOURCE]
4. Padel at Padel House, Ikoyi (contact for booking) [FROM SOURCE]
5. Premium brunch at Knowhere, VI (₦50,000) [FROM SOURCE]
6. Private dinner at Ounje Co (₦100,000) [FROM SOURCE]
7. Matcha date at Dulce, Ikoyi (₦20,000) [FROM SOURCE]
8. Arrange transport between venues (Uber/Bolt) [ADDED - logistics]

**❌ WRONG PLAN (violates grounding):**
1. Book flights to Lagos
2. Stay at Marriott or Radisson
3. Try pilates at Lo Studio
4. Book dining at Nok by Alara, Yellow Chilli ← NOT IN SOURCE!
5. Visit spa for wellness day ← NOT IN SOURCE!
6. Premium shopping at Palms Mall ← NOT IN SOURCE!

FORBIDDEN TASK PATTERNS (never generate these):
❌ "Access the shared URL"
❌ "Navigate to [URL] and verify..."
❌ "Extract and document key information"
❌ "Review your notes to identify..."
❌ "Read through all content in the shared link"
❌ "Take note of any access requirements"
❌ "Research prices for X"
❌ "Look up options for Y"
❌ "Try [restaurant not mentioned in source]"
❌ "Book dining at [generic recommendations]"

CORRECT TASK PATTERNS (generate these instead):
✅ "Book flights to Paris ($450-650 roundtrip via Google Flights)"
✅ "Reserve hotel in Le Marais ($150-200/night, try Hotel du Petit Moulin)"
✅ "Allocate $200 budget for museum passes (Louvre $17, Orsay $16, etc.)"
✅ "Complete 30-minute HIIT session (YouTube: Heather Robertson or Sydney Cummings)"
✅ "Set up Node.js project with Express + TypeScript (2 hours)"
✅ "Create 5 Instagram Reels for brand launch ($0 using Canva free tier)"
✅ "Book [EXACT venue name from source] - [EXACT price from source]"

EXAMPLES:

Request: "plan my weekend: 1. Document workflow 2. File trademark 3. Register copyright"
✅ Activity Title: "Weekend: IP Protection Tasks"

Request: "I need to prep for my interview at Google next week"
✅ Activity Title: "Google Interview Prep - Next Week"

Request: "🏋️ 30-day fitness challenge..."
✅ Activity Title: "🏋️ 30-Day Fitness Challenge"

Request: "# Weekend Shopping List\n1. Buy groceries\n2. Get new shoes"
✅ Activity Title: "Weekend Shopping List"

Request: "organize my home office this week"
✅ Activity Title: "Home Office Organization - This Week"

Request: "Learn React basics, build a todo app, deploy it"
✅ Activity Title: "React Learning Project"

Return ONLY valid JSON, no markdown blocks.`;
  }

  /**
   * Build prompt for MODIFYING existing plan
   */
  private buildModificationPrompt(
    userInput: string,
    existingPlan: DirectPlanResult,
    userProfile: User
  ): string {

    return `Modify the existing plan based on the user's request.

EXISTING PLAN:
${JSON.stringify(existingPlan, null, 2)}

USER'S MODIFICATION REQUEST:
"${userInput}"

TASK:
Update the plan based on the request. This could mean:
- Adding new tasks
- Removing tasks
- Changing task details (title, description, priority)
- Updating activity title or description
- Reordering tasks

Apply the requested changes and return the UPDATED plan.

OUTPUT FORMAT (JSON only):
{
  "activity": {
    "title": "Updated title (if changed)",
    "description": "Updated description (if changed)",
    "category": "Updated category (if changed)"
  },
  "tasks": [
    // All tasks (existing + new, minus removed)
    {
      "title": "Task title",
      "description": "Task description",
      "category": "Category",
      "priority": "high|medium|low"
    }
  ]
}

RULES:
- Keep existing tasks unless explicitly asked to remove them
- If adding, append new tasks to the list
- If removing, identify by title/description and exclude
- If modifying, update the matching task
- Preserve task order unless asked to reorder

Return ONLY valid JSON, no markdown blocks.`;
  }

  /**
   * Build image message content
   */
  private buildImageMessage(base64Image: string, textPrompt: string): any[] {
    // Extract media type from base64 string
    const mediaTypeMatch = base64Image.match(/data:image\/(.*?);/);
    const mediaType = mediaTypeMatch ? mediaTypeMatch[1] : 'jpeg';

    // Extract base64 data (remove data:image/...;base64, prefix)
    const base64Data = base64Image.includes('base64,')
      ? base64Image.split('base64,')[1]
      : base64Image;

    return [
      {
        type: "image" as const,
        source: {
          type: "base64" as const,
          media_type: `image/${mediaType}` as any,
          data: base64Data
        }
      },
      {
        type: "text" as const,
        text: textPrompt
      }
    ];
  }
}

// Export singleton instance
export const directPlanGenerator = new DirectPlanGenerator();
