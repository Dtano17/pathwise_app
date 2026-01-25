/**
 * Simple Conversational Planner
 *
 * A domain-agnostic, profile-aware planning agent that works like ChatGPT
 * but with structured output, strict guardrails, and deep event planning expertise.
 *
 * Key Features:
 * - Single LLM call per turn (4-5x faster than LangGraph)
 * - Full user profile integration
 * - Automatic domain detection
 * - Enforced question minimums (3 quick, 5 smart)
 * - Strict planning-only guardrails
 * - Real-time web search capability
 * - Supports both OpenAI and Claude
 *
 * Performance:
 * - Response time: 2-3s (vs 8-10s with LangGraph)
 * - Cost: $0.003/turn (vs $0.015 with LangGraph)
 * - Code: ~500 lines (vs ~2600 lines with LangGraph)
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { tavilySearch, isTavilyConfigured } from './tavilyProvider';
import {
  generateWithGrounding,
  isGeminiConfigured,
  formatGroundingSources,
  type GeminiMessage,
  type GeminiGroundingConfig,
} from './geminiProvider';
import type { IStorage } from '../storage';
import type { User, UserProfile, UserPreferences, JournalEntry } from '@shared/schema';
import { DOMAIN_TO_JOURNAL_CATEGORIES } from '../config/journalTags';
import { transcriptFilterService, FilteredContent } from './transcriptFilterService';
import { socialMediaVideoService } from './socialMediaVideoService';
import { parseDateReference, type DateReference } from './dateReferenceParser';

// ============================================================================
// SEARCH CACHE
// ============================================================================

interface SearchCacheEntry {
  results: string;
  timestamp: number;
}

class SearchCache {
  private cache = new Map<string, SearchCacheEntry>();
  private readonly TTL_MS = 60 * 60 * 1000; // 1 hour
  private readonly MAX_ENTRIES = 500; // Prevent unbounded growth
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Periodic cleanup of expired entries every 15 minutes
    this.cleanupInterval = setInterval(() => this.cleanupExpired(), 15 * 60 * 1000);
  }

  private cleanupExpired(): void {
    const now = Date.now();
    let removed = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.TTL_MS) {
        this.cache.delete(key);
        removed++;
      }
    }
    if (removed > 0) {
      console.log(`[SEARCH_CACHE] Cleaned up ${removed} expired entries`);
    }
  }

  getCacheKey(query: string): string {
    // Normalize query to improve cache hits
    return query.toLowerCase().trim();
  }

  get(query: string): string | null {
    const key = this.getCacheKey(query);
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    // Check if entry has expired
    const age = Date.now() - entry.timestamp;
    if (age > this.TTL_MS) {
      this.cache.delete(key);
      return null;
    }
    
    console.log(`[SEARCH_CACHE] Cache hit for: "${query}" (age: ${Math.round(age / 1000)}s)`);
    return entry.results;
  }

  set(query: string, results: string): void {
    // Evict oldest entry if cache is full
    if (this.cache.size >= this.MAX_ENTRIES) {
      const oldestKey = this.getOldestKey();
      if (oldestKey) {
        this.cache.delete(oldestKey);
        console.log(`[SEARCH_CACHE] Evicted oldest entry to make room`);
      }
    }

    const key = this.getCacheKey(query);
    this.cache.set(key, {
      results,
      timestamp: Date.now()
    });
    console.log(`[SEARCH_CACHE] Cached results for: "${query}"`);
  }

  private getOldestKey(): string | null {
    if (this.cache.size === 0) return null;
    
    let oldestKey: string | null = null;
    let oldestTime = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }
    
    return oldestKey;
  }

  clear(): void {
    this.cache.clear();
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.clear();
  }

  getStats(): { size: number; oldestEntry: number | null } {
    if (this.cache.size === 0) {
      return { size: 0, oldestEntry: null };
    }
    
    let oldest = Date.now();
    for (const entry of this.cache.values()) {
      if (entry.timestamp < oldest) {
        oldest = entry.timestamp;
      }
    }
    
    return {
      size: this.cache.size,
      oldestEntry: oldest
    };
  }
}

// Global search cache instance shared across all providers
const globalSearchCache = new SearchCache();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format a plan object as readable markdown for preview display
 * This is used when the LLM returns structured plan data but a generic message
 */
function formatPlanAsMarkdown(plan: any, context?: any): string {
  if (!plan) return '';

  let md = '';

  // Title with emoji
  const emoji = context?.domain === 'travel' ? '✈️' :
                context?.domain === 'dining' ? '🍽️' :
                context?.domain === 'wellness' ? '🧘' : '📋';
  md += `# ${emoji} ${plan.title || 'Your Plan'}\n\n`;

  // Description/Summary
  if (plan.description) {
    md += `${plan.description}\n\n`;
  }

  // Timeline/Itinerary
  if (plan.timeline && plan.timeline.length > 0) {
    md += `## 🗓️ Itinerary\n\n`;
    plan.timeline.forEach((item: any) => {
      if (item.day) {
        md += `### ${item.day}\n`;
      }
      md += `**${item.time || item.timeSlot || ''}** ${item.activity || item.event || ''}\n`;
      if (item.details) {
        md += `  - ${item.details}\n`;
      }
      if (item.location) {
        md += `  - 📍 ${item.location}\n`;
      }
    });
    md += '\n';
  }

  // Tasks
  if (plan.tasks && plan.tasks.length > 0) {
    md += `## ✅ Action Items\n\n`;
    plan.tasks.forEach((task: any, idx: number) => {
      const priority = task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢';
      md += `${idx + 1}. ${priority} **${task.taskName || task.title}**\n`;
      if (task.notes || task.description) {
        md += `   - ${task.notes || task.description}\n`;
      }
      if (task.duration) {
        md += `   - ⏱️ ${task.duration} minutes\n`;
      }
    });
    md += '\n';
  }

  // Budget
  if (plan.budget) {
    md += `## 💰 Budget Breakdown\n\n`;
    if (plan.budget.breakdown && plan.budget.breakdown.length > 0) {
      plan.budget.breakdown.forEach((item: any) => {
        md += `- **${item.category}:** $${item.amount}`;
        if (item.notes) {
          md += ` (${item.notes})`;
        }
        md += '\n';
      });
    }
    if (plan.budget.total) {
      md += `\n**Total:** $${plan.budget.total}`;
      if (plan.budget.buffer) {
        md += ` (+$${plan.budget.buffer} buffer)`;
      }
      md += '\n';
    }
    md += '\n';
  }

  // Weather (for travel)
  if (plan.weather) {
    md += `## 🌤️ Weather\n\n`;
    md += `${plan.weather.forecast || plan.weather}\n`;
    if (plan.weather.recommendations) {
      md += `\n**Pack:** ${plan.weather.recommendations.join(', ')}\n`;
    }
    md += '\n';
  }

  // Tips
  if (plan.tips && plan.tips.length > 0) {
    md += `## 💡 Pro Tips\n\n`;
    plan.tips.forEach((tip: string) => {
      md += `- ${tip}\n`;
    });
    md += '\n';
  }

  return md || '*(Plan details being generated...)*';
}

/**
 * Calculate progress based on conversation turn count (batch number)
 * Quick mode: 2 batches total → Shows 1/2, 2/2
 * Smart mode: 3 batches total → Shows 1/3, 2/3, 3/3
 * Progress = current batch / total batches
 */
function calculateBatchProgress(conversationHistory: ConversationMessage[], mode: 'quick' | 'smart') {
  const emoji = mode === 'quick' ? '⚡' : '🧠';

  // Count how many times the assistant has responded (= which batch we're in)
  const assistantMessageCount = conversationHistory.filter(msg => msg.role === 'assistant').length;
  
  // After 1st assistant response = batch 1, after 2nd = batch 2, etc.
  const currentBatch = assistantMessageCount + 1; // +1 because we're about to send the next response

  if (mode === 'quick') {
    // Quick: 2 batches total
    const totalBatches = 2;
    const batchNumber = Math.min(currentBatch, totalBatches);
    const percentage = Math.round((batchNumber / totalBatches) * 100);

    return {
      gathered: batchNumber,
      total: totalBatches,
      percentage,
      emoji,
      mode
    };
  } else {
    // Smart: 3 batches total
    const totalBatches = 3;
    const batchNumber = Math.min(currentBatch, totalBatches);
    const percentage = Math.round((batchNumber / totalBatches) * 100);

    return {
      gathered: batchNumber,
      total: totalBatches,
      percentage,
      emoji,
      mode
    };
  }
}

/**
 * Validate that budget breakdown includes calculation expressions
 * Adds a note to plan description if budget breakdown is missing calculations
 */
function validateBudgetBreakdown(plan: GeneratedPlan): void {
  if (plan.budget?.breakdown && plan.budget.breakdown.length > 0) {
    const hasCalculations = plan.budget.breakdown.some(item => 
      item.notes?.includes('×') || item.notes?.includes('x') || item.notes?.includes('*')
    );
    
    if (!hasCalculations) {
      const note = '\n\n💡 Note: Budget breakdown should include calculation details (e.g., "$450 × 2 nights = $900") for transparency.';
      plan.description = plan.description + note;
    }
  }
}

/**
 * Detect planning domain from user's message using keyword patterns
 * Used for early domain detection to enable journal-based personalization
 */
function detectDomainFromMessage(message: string): string {
  const msg = message.toLowerCase();

  if (/trip|travel|vacation|flight|hotel|visit|itinerary|getaway|destination|airbnb|resort|cruise/.test(msg)) return 'travel';
  if (/restaurant|dinner|lunch|food|eat|cuisine|brunch|cafe|bar|drinks/.test(msg)) return 'dining';
  if (/workout|gym|fitness|exercise|health|yoga|meditation|wellness|spa|massage/.test(msg)) return 'wellness';
  if (/movie|concert|show|theater|museum|gallery|entertainment|tickets/.test(msg)) return 'entertainment';
  if (/party|wedding|birthday|celebration|anniversary|reunion|gathering|reception/.test(msg)) return 'event';
  if (/buy|shop|purchase|gift|present|store|mall|online/.test(msg)) return 'shopping';
  if (/learn|study|course|book|read|class|tutorial|training|certification/.test(msg)) return 'learning';

  return 'other';
}

/**
 * Format journal search results as structured insights for the system prompt
 */
interface JournalSearchResult {
  id: string;
  category: string;
  text: string;
  venueName?: string;
  venueType?: string;
  location?: { city?: string; neighborhood?: string };
  budgetTier?: string;
  priceRange?: string;
  keywords?: string[];
  timestamp: string;
  mood?: string;
}

function formatJournalInsights(insights: JournalSearchResult[], domain: string): string {
  if (!insights || insights.length === 0) return '';

  // Group by category
  const grouped = insights.reduce((acc, item) => {
    const key = item.category;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, JournalSearchResult[]>);

  let output = '';

  for (const [category, items] of Object.entries(grouped)) {
    const categoryEmoji =
      category === 'restaurants' ? '🍽️' :
      category === 'travel' ? '✈️' :
      category === 'activities' ? '🎯' :
      category === 'fitness' ? '💪' :
      category === 'movies' ? '🎬' :
      category === 'shopping' ? '🛍️' : '📝';

    output += `\n**${categoryEmoji} ${category}:**\n`;
    items.slice(0, 3).forEach(item => {
      const name = item.venueName || item.text?.substring(0, 50);
      output += `- ${name}`;
      if (item.location?.city) output += ` (${item.location.city})`;
      if (item.priceRange) output += ` [${item.priceRange}]`;
      if (item.mood) output += ` - mood: ${item.mood}`;
      output += '\n';
    });
  }

  // Add pattern summary
  const cities = [...new Set(insights.map(i => i.location?.city).filter(Boolean))];
  const budgets = [...new Set(insights.map(i => i.budgetTier).filter(Boolean))];

  if (cities.length) output += `\n*Recent cities: ${cities.join(', ')}*`;
  if (budgets.length) output += `\n*Budget preference: ${budgets[0]}*`;

  return output;
}

// ============================================================================
// URL EXTRACTION HELPERS
// ============================================================================

const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;

/**
 * Extract URLs from a message
 */
function extractUrlsFromMessage(message: string): string[] {
  const matches = message.match(URL_REGEX) || [];
  // Clean trailing punctuation
  return matches.map(url => url.replace(/[.,;:!?)]+$/, ''));
}

/**
 * Normalize URL for caching (remove tracking params)
 */
function normalizeUrlForCache(urlString: string): string {
  try {
    const url = new URL(urlString);
    // Remove common tracking parameters
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
                           'fbclid', 'gclid', 'igsh', 'igshid', 'share_id', 'ref'];
    trackingParams.forEach(param => url.searchParams.delete(param));
    return url.toString();
  } catch {
    return urlString;
  }
}

/**
 * Check if URL is a supported social media platform
 */
function isSupportedSocialMediaUrl(url: string): boolean {
  const patterns = [
    /instagram\.com\/(reel|p|stories)\//i,
    /tiktok\.com\/@?[\w.-]+\/video\//i,
    /youtube\.com\/(?:watch\?|shorts\/)/i,
    /youtu\.be\//i,
    /twitter\.com\/[\w]+\/status\//i,
    /x\.com\/[\w]+\/status\//i,
  ];
  return patterns.some(p => p.test(url));
}

// ============================================================================
// TYPES
// ============================================================================

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

interface PlanningResponse {
  message: string;
  extractedInfo: Record<string, any>;
  readyToGenerate: boolean;
  plan?: GeneratedPlan;
  domain?: string;
  questionCount?: number;
  redirectToPlanning?: boolean;
  conversationHints?: string[]; // Context-aware suggestions for user
  journalContext?: {  // Info about journal entries used for context
    found: boolean;
    count: number;
    location?: string;
    summaries?: string[];
  };
}

interface GeneratedPlan {
  title: string;
  description: string;
  startDate?: string;  // Activity start date in ISO format (YYYY-MM-DD)
  endDate?: string;    // Activity end date in ISO format (YYYY-MM-DD)
  destinationUrl?: string;  // Google Maps URL for main destination (clickable link)
  tasks: Array<{
    taskName: string;
    duration: number;
    scheduledDate?: string;  // Task date in ISO format (YYYY-MM-DD)
    startTime?: string;      // Task time in HH:MM format (24-hour)
    startDate?: string;      // Deprecated - use scheduledDate
    notes?: string;
    category?: string;
    priority?: 'high' | 'medium' | 'low';
  }>;
  timeline?: Array<{
    time: string;
    activity: string;
    location?: string;
    notes?: string;
  }>;
  budget: {
    total: number;
    breakdown: Array<{
      category: string;
      amount: number;
      notes?: string;
    }>;
    buffer?: number;
  };
  weather?: {
    forecast: string;
    recommendations: string[];
  };
  tips?: string[];
}

interface ExtractedUrlContent {
  url: string;
  platform: string;
  filteredContent: FilteredContent;
  rawWordCount: number;
  cached: boolean;
}

interface PlanningContext {
  user: User;
  profile?: UserProfile;
  preferences?: UserPreferences;
  recentJournal?: JournalEntry[];
  journalInsights?: JournalSearchResult[];  // Domain-based journal search results
  extractedUrlContent?: ExtractedUrlContent[];  // URL extraction results
  detectedLocation?: string | null;
  detectedBudget?: number | null;
  detectedDomain?: string;  // Early domain detection for journal search
  fallbackLocation?: string;
  // Today's Theme support
  dateReference?: {
    isTodayPlan: boolean;
    confidence: 'high' | 'medium' | 'low';
    matchedPhrase: string | null;
  };
  todaysTheme?: {
    themeId: string;
    themeName: string;
  } | null;
  // GPS location from device (for Gemini Maps grounding)
  userLocation?: {
    latitude: number;
    longitude: number;
    city?: string;
  };
}

// ============================================================================
// LLM PROVIDER ABSTRACTION
// ============================================================================

interface LLMProvider {
  generate(
    messages: ConversationMessage[],
    systemPrompt: string,
    tools: any[],
    context: PlanningContext,
    mode: 'quick' | 'smart'
  ): Promise<PlanningResponse>;
  
  generateStream?(
    messages: ConversationMessage[],
    systemPrompt: string,
    tools: any[],
    context: PlanningContext,
    mode: 'quick' | 'smart',
    onToken: (token: string) => void
  ): Promise<PlanningResponse>;
}

class OpenAIProvider implements LLMProvider {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    // Tavily client is now managed by tavilyProvider.ts with automatic key rotation
  }

  /**
   * PREDICTIVE SEARCH PRE-WARMING
   * Extract destination/dates from Turn 1 and pre-warm cache with safety searches
   * Fire-and-forget pattern - don't block the Turn 1 response
   */
  private prewarmSafetySearches(userMessage: string): void {
    if (!isTavilyConfigured()) return;

    // Extract potential destination keywords - improved patterns for edge cases
    // Handles lowercase, multiword destinations (new york, san francisco, big bear), etc.
    const destinationPatterns = [
      /(trip|travel|visit|vacation|honeymoon|getaway|plan|planning)\s+(?:to|for|in)\s+([a-z]+(?:\s+[a-z]+)*)/i,
      /(?:to|in|at)\s+(big\s+bear|lake\s+tahoe|palm\s+springs|san\s+diego|los\s+angeles|new\s+york|san\s+francisco|las\s+vegas|[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:trip|travel|vacation|getaway)/i,
    ];

    const datePattern = /(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})/i;
    const monthOnlyPattern = /(january|february|march|april|may|june|july|august|september|october|november|december)/i;
    const todayPattern = /\b(today|tomorrow|this\s+weekend|next\s+week)\b/i;

    let destination: string | null = null;
    for (const pattern of destinationPatterns) {
      const match = userMessage.match(pattern);
      if (match) {
        destination = match[2] || match[1];
        break;
      }
    }

    if (!destination) return; // No destination detected, skip pre-warming

    destination = destination.trim();
    const dateMatch = userMessage.match(datePattern) || userMessage.match(monthOnlyPattern);
    const todayMatch = userMessage.match(todayPattern);
    const timeframe = dateMatch ? dateMatch[0] : (todayMatch ? todayMatch[0] : 'this week');

    console.log(`[PREWARM] Detected destination "${destination}", timeframe "${timeframe}" - pre-warming safety & weather searches`);

    // Pre-warm COMPREHENSIVE weather and safety searches in background (non-blocking)
    // Run ALL searches in PARALLEL for maximum speed
    const searchQueries = [
      // Weather & Conditions (CRITICAL for outdoor/mountain destinations)
      `${destination} weather forecast ${timeframe}`,
      `${destination} current weather conditions temperature`,
      `${destination} weather warnings alerts ${timeframe}`,

      // Safety & Travel Advisories
      `${destination} travel advisory warnings`,
      `${destination} road conditions driving ${timeframe}`,

      // For mountain/snow destinations - check snow and road conditions
      ...(destination.toLowerCase().includes('bear') ||
          destination.toLowerCase().includes('tahoe') ||
          destination.toLowerCase().includes('mammoth') ||
          destination.toLowerCase().includes('mountain') ? [
        `${destination} snow conditions skiing ${timeframe}`,
        `${destination} chain requirements road closures`,
      ] : []),

      // For coastal/hurricane-prone destinations
      ...(destination.toLowerCase().includes('beach') ||
          destination.toLowerCase().includes('florida') ||
          destination.toLowerCase().includes('hawaii') ||
          destination.toLowerCase().includes('caribbean') ? [
        `${destination} hurricane forecast ${timeframe}`,
        `${destination} surf conditions beach safety`,
      ] : []),
    ];

    // Execute ALL searches in PARALLEL for maximum speed
    console.log(`[PREWARM] Starting ${searchQueries.length} parallel background searches...`);

    Promise.allSettled(
      searchQueries.map(async (query) => {
        try {
          // Check if already cached
          if (globalSearchCache.get(query)) {
            console.log(`[PREWARM] Cache hit: "${query}"`);
            return;
          }

          const searchResults = await tavilySearch(query, {
            maxResults: 3,
            searchDepth: 'basic' // Use 'basic' for speed in pre-warming
          });

          const formattedResults = searchResults.results
            .map((r: any) => `${r.title}\n${r.content}\nSource: ${r.url}`)
            .join('\n\n');

          if (formattedResults) {
            globalSearchCache.set(query, formattedResults);
            console.log(`[PREWARM] Cached: "${query}"`);
          }
        } catch (error) {
          // Silent fail - pre-warming is optional optimization
          console.log(`[PREWARM] Failed (non-blocking): "${query}"`);
        }
      })
    ).then(() => {
      console.log(`[PREWARM] All background searches completed`);
    }).catch(() => {
      // Catch any unhandled rejections
    });
  }

  async generate(
    messages: ConversationMessage[],
    systemPrompt: string,
    tools: any[],
    context: PlanningContext,
    mode: 'quick' | 'smart'
  ): Promise<PlanningResponse> {
    try {
      // Count assistant messages to determine which turn we're on
      // Turn 1: 0 assistant messages, Turn 2: 1 assistant message, Turn 3: 2+ assistant messages
      const assistantMessageCount = messages.filter(m => m.role === 'assistant').length;
      const currentTurn = assistantMessageCount + 1;
      
      // PREDICTIVE PRE-WARMING: On Turn 1, extract destination/dates and warm cache
      if (currentTurn === 1 && messages.length > 0) {
        const userMessage = messages[messages.length - 1].content;
        this.prewarmSafetySearches(userMessage); // Fire-and-forget, don't await
      }
      
      // Add web_search tool ONLY on Turn 3+ (when showing preview)
      // Turn 1-2: Question gathering (NO searches, instant responses)
      // Turn 3+: Plan preview (WITH searches for enrichment)
      const enhancedTools = [...tools];
      const isPreviewTurn = mode === 'quick' ? currentTurn >= 3 : currentTurn >= 4;
      
      // MODEL SELECTION: Use mini for question gathering, full for preview
      // Turn 1-2: gpt-4o-mini (faster, cheaper, good for questions)
      // Turn 3+: gpt-4o (smarter, better with web data and enrichment)
      const model = isPreviewTurn ? 'gpt-4o' : 'gpt-4o-mini';
      console.log(`[SIMPLE_PLANNER] Turn ${currentTurn}: Using ${model} (${isPreviewTurn ? 'preview' : 'question gathering'})`);
      
      if (isTavilyConfigured() && isPreviewTurn) {
        console.log(`[SIMPLE_PLANNER] Turn ${currentTurn}: web_search enabled for preview enrichment`);
        enhancedTools.push({
          type: 'function',
          function: {
            name: 'web_search',
            description: mode === 'quick'
              ? 'Search the web for key travel information: current flight prices, top hotels with pricing, weather forecast, safety alerts. Use this when showing the plan preview.'
              : 'Search the web for DETAILED information about destinations, events, weather, prices, hotels, restaurants, activities, nightlife, etc.',
            parameters: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'The search query'
                }
              },
              required: ['query']
            }
          }
        });
      } else {
        console.log(`[SIMPLE_PLANNER] Turn ${currentTurn}: web_search disabled (question gathering)`);
      }

      const response = await this.client.chat.completions.create({
        model,  // Dynamic model selection based on turn
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content
          }))
        ],
        tools: enhancedTools,
        tool_choice: 'auto',  // Allow web_search in BOTH Quick and Smart modes
        temperature: 0.7,
      });

      const message = response.choices[0].message;

      // With 'auto' tool_choice, OpenAI might not call any tool
      // If no tool was called, force a respond_with_structure call
      if (!message.tool_calls) {
        console.log(`[SIMPLE_PLANNER] ${mode} mode - no tool called, forcing structured response`);
        const forcedResponse = await this.client.chat.completions.create({
          model,  // Use same model as initial call
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages.map(m => ({
              role: m.role as 'user' | 'assistant',
              content: m.content
            })),
            message  // Include the text response
          ],
          tools: enhancedTools,
          tool_choice: { type: 'function', function: { name: 'respond_with_structure' } },
          temperature: 0.7,
        });

        const toolCall = forcedResponse.choices[0].message.tool_calls?.[0];
        if (!toolCall || !toolCall.function.arguments) {
          throw new Error('No structured response from OpenAI after retry');
        }

        const result = JSON.parse(toolCall.function.arguments) as PlanningResponse;
        if (result.plan) {
          validateBudgetBreakdown(result.plan);
        }
        return result;
      }

      // Handle web search tool calls (function calling loop)
      if (message.tool_calls && message.tool_calls.some(tc => tc.function.name === 'web_search')) {
        console.log('[SIMPLE_PLANNER] OpenAI called web_search - executing searches');

        // Execute all web searches
        const toolResults = await Promise.all(
          message.tool_calls.map(async (toolCall) => {
            if (toolCall.function.name === 'web_search') {
              const args = JSON.parse(toolCall.function.arguments);
              const query = args.query;

              console.log(`[SIMPLE_PLANNER] Searching: "${query}"`);

              try {
                // Check cache first
                let formattedResults = globalSearchCache.get(query);
                
                if (!formattedResults) {
                  // Cache miss - perform actual search
                  console.log(`[SIMPLE_PLANNER] Cache miss - querying Tavily`);
                  const searchResults = await tavilySearch(query, {
                    maxResults: 3,
                    searchDepth: 'advanced'
                  });

                  // Format results for LLM
                  formattedResults = searchResults.results
                    .map((r: any) => `${r.title}\n${r.content}\nSource: ${r.url}`)
                    .join('\n\n');
                  
                  // Cache the results
                  if (formattedResults) {
                    globalSearchCache.set(query, formattedResults);
                  }
                }

                return {
                  tool_call_id: toolCall.id,
                  role: 'tool' as const,
                  content: formattedResults || 'No results found'
                };
              } catch (searchError) {
                console.error(`[SIMPLE_PLANNER] Tavily search error:`, searchError);
                return {
                  tool_call_id: toolCall.id,
                  role: 'tool' as const,
                  content: 'Search failed - please generate plan without real-time data'
                };
              }
            }
            return null;
          })
        );

        // Call LLM again with search results
        const followUpResponse = await this.client.chat.completions.create({
          model,  // Use same model (should be gpt-4o since web search only available on preview turn)
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages.map(m => ({
              role: m.role as 'user' | 'assistant',
              content: m.content
            })),
            message,  // Include the assistant's tool call message
            ...toolResults.filter(r => r !== null)  // Include tool results
          ],
          tools: enhancedTools,
          tool_choice: { type: 'function', function: { name: 'respond_with_structure' } },
          temperature: 0.7,
        });

        const finalToolCall = followUpResponse.choices[0].message.tool_calls?.[0];
        if (!finalToolCall || !finalToolCall.function.arguments) {
          throw new Error('No structured response from OpenAI after web search');
        }

        const result = JSON.parse(finalToolCall.function.arguments) as PlanningResponse;

        if (result.plan) {
          validateBudgetBreakdown(result.plan);
        }

        return result;
      }

      // No web search - regular response
      const toolCall = message.tool_calls?.[0];
      if (!toolCall || !toolCall.function.arguments) {
        throw new Error('No structured response from OpenAI');
      }

      const result = JSON.parse(toolCall.function.arguments) as PlanningResponse;

      if (result.plan) {
        validateBudgetBreakdown(result.plan);
      }

      return result;
    } catch (error) {
      console.error('[SIMPLE_PLANNER] OpenAI error:', error);
      throw error;
    }
  }

  async generateStream(
    messages: ConversationMessage[],
    systemPrompt: string,
    tools: any[],
    context: PlanningContext,
    mode: 'quick' | 'smart',
    onToken: (token: string) => void
  ): Promise<PlanningResponse> {
    try {
      // Count assistant messages to determine which turn we're on (same as generate())
      const assistantMessageCount = messages.filter(m => m.role === 'assistant').length;
      const currentTurn = assistantMessageCount + 1;
      
      // PREDICTIVE PRE-WARMING: On Turn 1, extract destination/dates and warm cache
      if (currentTurn === 1 && messages.length > 0) {
        const userMessage = messages[messages.length - 1].content;
        this.prewarmSafetySearches(userMessage); // Fire-and-forget, don't await
      }
      
      // Add web_search tool ONLY on Turn 3+ (when showing preview)
      const enhancedTools = [...tools];
      const isPreviewTurn = mode === 'quick' ? currentTurn >= 3 : currentTurn >= 4;
      
      // MODEL SELECTION: Use mini for question gathering, full for preview
      const model = isPreviewTurn ? 'gpt-4o' : 'gpt-4o-mini';
      console.log(`[SIMPLE_PLANNER_STREAM] Turn ${currentTurn}: Using ${model} (${isPreviewTurn ? 'preview' : 'question gathering'})`);
      
      if (isTavilyConfigured() && isPreviewTurn) {
        console.log(`[SIMPLE_PLANNER_STREAM] Turn ${currentTurn}: web_search enabled`);
        enhancedTools.push({
          type: 'function',
          function: {
            name: 'web_search',
            description: mode === 'quick'
              ? 'Search the web for key travel information: current flight prices, top hotels with pricing, weather forecast, safety alerts.'
              : 'Search the web for DETAILED information about destinations, events, weather, prices, hotels, restaurants, activities, nightlife, etc.',
            parameters: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'The search query'
                }
              },
              required: ['query']
            }
          }
        });
      } else {
        console.log(`[SIMPLE_PLANNER_STREAM] Turn ${currentTurn}: web_search disabled`);
      }
      
      // Use tool_choice: 'auto' to allow natural language tokens to stream
      // The model will emit text first, then call respond_with_structure at the end
      const stream = await this.client.chat.completions.create({
        model,  // Dynamic model selection based on turn
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content
          }))
        ],
        tools: enhancedTools,
        tool_choice: 'auto',  // Allow free-form tokens AND tool calls
        temperature: 0.7,
        stream: true,
      });

      let fullContent = '';
      let fullToolCalls: any[] = [];
      
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        
        // Stream natural language tokens word-by-word
        if (delta?.content) {
          onToken(delta.content);
          fullContent += delta.content;
        }
        
        // Collect tool calls (structured response comes at the end)
        if (delta?.tool_calls) {
          delta.tool_calls.forEach((tc: any, index: number) => {
            if (!fullToolCalls[index]) {
              fullToolCalls[index] = {
                id: tc.id || '',
                type: 'function',
                function: { name: tc.function?.name || '', arguments: '' }
              };
            }
            if (tc.function?.arguments) {
              fullToolCalls[index].function.arguments += tc.function.arguments;
            }
          });
        }
      }

      // If no tool was called, force a second call to get structured response
      if (fullToolCalls.length === 0) {
        console.log('[SIMPLE_PLANNER_STREAM] No tool called, forcing structured response');
        const forcedResponse = await this.client.chat.completions.create({
          model,  // Use same model as initial call
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages.map(m => ({
              role: m.role as 'user' | 'assistant',
              content: m.content
            })),
            { role: 'assistant', content: fullContent }  // Include the streamed text
          ],
          tools: enhancedTools,
          tool_choice: { type: 'function', function: { name: 'respond_with_structure' } },
          temperature: 0.7,
        });

        const toolCall = forcedResponse.choices[0].message.tool_calls?.[0];
        if (!toolCall || !toolCall.function.arguments) {
          throw new Error('No structured response from OpenAI after retry');
        }
        
        const result = JSON.parse(toolCall.function.arguments) as PlanningResponse;
        if (result.plan) {
          validateBudgetBreakdown(result.plan);
        }
        return result;
      }

      // Parse the structured response from tool calls
      const structuredTool = fullToolCalls.find(tc => tc.function.name === 'respond_with_structure');
      if (!structuredTool || !structuredTool.function.arguments) {
        throw new Error('No structured response from OpenAI stream');
      }

      const result = JSON.parse(structuredTool.function.arguments) as PlanningResponse;

      if (result.plan) {
        validateBudgetBreakdown(result.plan);
      }

      return result;
    } catch (error) {
      console.error('[SIMPLE_PLANNER] OpenAI streaming error:', error);
      throw error;
    }
  }
}

class AnthropicProvider implements LLMProvider {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  async generate(
    messages: ConversationMessage[],
    systemPrompt: string,
    tools: any[],
    context: PlanningContext,
    mode: 'quick' | 'smart'
  ): Promise<PlanningResponse> {
    try {
      // Convert tools to Anthropic format
      const anthropicTools = tools.map(tool => ({
        name: tool.function.name,
        description: tool.function.description,
        input_schema: tool.function.parameters
      }));

      // Add web_search tool for BOTH quick and smart modes
      // Note: Anthropic doesn't support web_search tool natively yet
      // This is a placeholder for when they add it
      // For now, Quick mode with Claude will not have real-time safety checks
      // (Only OpenAI provider has Tavily integration)

      const response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        system: systemPrompt,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content
        })),
        tools: anthropicTools,
        tool_choice: { type: 'tool', name: 'respond_with_structure' }
      });

      const toolUse = response.content.find(block => block.type === 'tool_use');
      if (!toolUse || toolUse.type !== 'tool_use') {
        throw new Error('No structured response from Claude');
      }

      const result = toolUse.input as PlanningResponse;
      
      // DO NOT inject progress here - it's handled in processMessage method
      // to avoid triple duplication (LLM prompt + provider + processMessage)
      
      // Validate budget breakdown if plan was generated
      if (result.plan) {
        validateBudgetBreakdown(result.plan);
      }
      
      return result;
    } catch (error) {
      console.error('[SIMPLE_PLANNER] Anthropic error:', error);
      throw error;
    }
  }
}

// ============================================================================
// GEMINI PROVIDER (with Google Search & Maps Grounding)
// ============================================================================

class GeminiProvider implements LLMProvider {
  async generate(
    messages: ConversationMessage[],
    systemPrompt: string,
    tools: any[],
    context: PlanningContext,
    mode: 'quick' | 'smart'
  ): Promise<PlanningResponse> {
    try {
      // Count assistant messages to determine turn
      const assistantMessageCount = messages.filter(m => m.role === 'assistant').length;
      const currentTurn = assistantMessageCount + 1;
      const isPreviewTurn = mode === 'quick' ? currentTurn >= 3 : currentTurn >= 4;

      console.log(`[GEMINI_PROVIDER] Turn ${currentTurn}: ${isPreviewTurn ? 'preview with grounding' : 'question gathering'}`);

      // Configure grounding based on turn and context
      const groundingConfig: GeminiGroundingConfig = {
        // Enable Google Search on preview turns for real-time data
        enableGoogleSearch: isPreviewTurn,
        // Enable Google Maps if we have user location
        enableGoogleMaps: isPreviewTurn && !!context.userLocation,
        userLocation: context.userLocation,
      };

      if (context.userLocation) {
        console.log(`[GEMINI_PROVIDER] Using location: ${context.userLocation.city || `${context.userLocation.latitude}, ${context.userLocation.longitude}`}`);
      }

      // Convert messages to Gemini format
      const geminiMessages: GeminiMessage[] = messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        content: m.content,
      }));

      // Build enhanced system prompt with grounding instructions
      let enhancedSystemPrompt = systemPrompt;
      if (isPreviewTurn) {
        enhancedSystemPrompt += `

## Real-Time Data via Google Grounding

You have access to LIVE data through Google Search and Maps grounding:
1. Weather forecasts are REAL-TIME - always include current conditions
2. Restaurant/venue data includes real ratings, hours, and addresses
3. Prices and availability are current
4. ${context.userLocation ? `User is located in ${context.userLocation.city || 'their current location'} - use this for "near me" queries` : 'No GPS location provided'}

IMPORTANT:
- Use REAL venue names from grounding, not placeholders
- Include specific addresses and ratings
- Show actual prices when available
- DO NOT include "Activity Link" or "🔗 Activity Link" sections in the message
- The destinationUrl goes in the JSON plan object, NOT in the message text
`;
      }

      // Add JSON response format instruction
      enhancedSystemPrompt += `

## Response Format (CRITICAL)
You MUST respond with a valid JSON object with this exact structure:
{
  "message": "Your conversational response here (markdown formatted)",
  "extractedInfo": {
    "activityType": "string or null",
    "location": "string or null",
    "timing": "string or null",
    "budget": "number or null",
    "preferences": ["array of strings"],
    "questionCount": number
  },
  "readyToGenerate": boolean,
  "plan": null or {
    "title": "Activity Title",
    "description": "Brief overview of the plan",
    "destinationUrl": "https://www.google.com/maps/search/?api=1&query=Main+Destination+Name",
    "tasks": [
      {
        "title": "Task/Step title",
        "description": "Detailed description with real venue names, times, costs",
        "duration": "e.g., 2 hours",
        "tips": ["practical tips"]
      }
    ],
    "budget": {
      "estimated": number,
      "breakdown": [
        { "item": "Item name", "cost": number, "notes": "e.g., $50 × 2 people = $100" }
      ]
    },
    "tips": ["General tips for the activity"]
  },
  "conversationHints": ["array of suggested follow-ups"]
}

IMPORTANT for destinationUrl:
- When generating a plan, ALWAYS include "destinationUrl" in the plan JSON object
- Format: https://www.google.com/maps/search/?api=1&query=URL_ENCODED_DESTINATION
- Example: For "San Diego trip" → "https://www.google.com/maps/search/?api=1&query=San+Diego+CA"
- Example: For "Pizzeria Mozza" → "https://www.google.com/maps/search/?api=1&query=Pizzeria+Mozza+Los+Angeles"
- DO NOT include "Activity Link" section in the message - put the URL ONLY in plan.destinationUrl
- The frontend will render the title as a clickable link using plan.destinationUrl
`;

      const response = await generateWithGrounding(
        geminiMessages,
        enhancedSystemPrompt,
        groundingConfig,
        'gemini-2.5-flash'
      );

      // Parse the JSON response
      let result: PlanningResponse;
      try {
        // Try to extract JSON from the response
        const jsonMatch = response.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
        } else {
          // If no JSON found, wrap the response as a message
          result = {
            message: response.content,
            extractedInfo: { questionCount: currentTurn },
            readyToGenerate: false,
          };
        }
      } catch (parseError) {
        console.log('[GEMINI_PROVIDER] Response not JSON, using as message');
        result = {
          message: response.content,
          extractedInfo: { questionCount: currentTurn },
          readyToGenerate: false,
        };
      }

      // Append grounding sources if available
      if (response.groundingMetadata) {
        const sources = formatGroundingSources(response.groundingMetadata);
        if (sources && result.message) {
          // Don't duplicate sources if already in message
          if (!result.message.includes('**Sources:**') && !result.message.includes('**Venues from Google Maps:**')) {
            result.message += sources;
          }
        }
        console.log(`[GEMINI_PROVIDER] Grounding: ${response.groundingMetadata.sources?.length || 0} web sources, ${response.groundingMetadata.mapsResults?.length || 0} maps results`);
      }

      // Post-process: Extract destinationUrl from message if Gemini put it there instead of in plan
      if (result.plan && !result.plan.destinationUrl && result.message) {
        // Look for Google Maps URLs in the message
        const mapsUrlMatch = result.message.match(/https:\/\/www\.google\.com\/maps\/search\/[^\s\)]+/);
        if (mapsUrlMatch) {
          result.plan.destinationUrl = mapsUrlMatch[0];
          console.log(`[GEMINI_PROVIDER] Extracted destinationUrl from message: ${result.plan.destinationUrl}`);
        }
      }

      // Clean up message: Remove "Activity Link" section since we have destinationUrl in plan
      if (result.message && result.plan?.destinationUrl) {
        // Remove various formats of Activity Link section
        result.message = result.message
          .replace(/##\s*🔗?\s*Activity Link[\s\S]*?(?=\n##|\n\*\*Sources|\n\*\*Venues|$)/gi, '')
          .replace(/\*\*🔗?\s*Activity Link[:\*]*[\s\S]*?(?=\n\*\*|\n##|$)/gi, '')
          .replace(/Explore.*on Google Maps:.*\n?/gi, '')
          .trim();
      }

      // Validate budget if plan exists
      if (result.plan) {
        validateBudgetBreakdown(result.plan);
      }

      return result;
    } catch (error: any) {
      console.error('[GEMINI_PROVIDER] Error:', error.message);
      throw error;
    }
  }
}

// ============================================================================
// SYSTEM PROMPT BUILDER
// ============================================================================

function buildSystemPrompt(context: PlanningContext, mode: 'quick' | 'smart', isPreviewTurn: boolean = false): string {
  const { user, profile, preferences, recentJournal, journalInsights, detectedDomain, extractedUrlContent, dateReference, todaysTheme } = context;

  const modeDescription = mode === 'smart'
    ? 'comprehensive planning with detailed research, real-time data, and enrichment'
    : 'quick planning focusing on essential information for fast execution';

  const minQuestions = mode === 'smart' ? 10 : 5;

  // Build journal insights section if available
  const journalInsightsSection = journalInsights && journalInsights.length > 0
    ? `\n\n**📔 Personal Journal Insights (from user's history):**
${formatJournalInsights(journalInsights, detectedDomain || 'other')}

*Use these insights to personalize your questions and recommendations. If the user has visited similar places or has preferences recorded, reference them naturally.*`
    : '';

  // Build URL content section if available
  let urlContentSection = '';
  if (extractedUrlContent && extractedUrlContent.length > 0) {
    urlContentSection = `\n\n## 🔗 EXTRACTED URL CONTENT (User shared these links)

The user has shared social media content. This extracted content is **AUTHORITATIVE** - use it to inform your planning.

`;
    for (const urlContent of extractedUrlContent) {
      const { filteredContent } = urlContent;

      // Add warnings if any
      if (filteredContent.warnings && filteredContent.warnings.length > 0) {
        const warningMessages = filteredContent.warnings
          .filter(w => w.severity === 'warning' || w.severity === 'error')
          .map(w => `⚠️ ${w.message}`);
        if (warningMessages.length > 0) {
          urlContentSection += `**Extraction Notes:**
${warningMessages.join('\n')}

`;
        }
      }

      urlContentSection += `### Source: ${urlContent.platform.toUpperCase()}
**Content Type:** ${filteredContent.contentType}
**Confidence:** ${Math.round(filteredContent.overallConfidence * 100)}%
**Stats:** ${filteredContent.rawWordCount} words → ${filteredContent.filteredWordCount} after filtering (${Math.round(filteredContent.actionablePercentage)}% actionable, ${Math.round(filteredContent.promotionalPercentage)}% promotional filtered)

`;

      // Structured entities section (prioritize this for planning)
      if (filteredContent.structuredEntities) {
        const { venues, prices, times, locations, tips, contacts } = filteredContent.structuredEntities;

        if (venues.length > 0) {
          urlContentSection += `**📍 Venues (${venues.length}):**
${venues.slice(0, 5).map(v => `- ${v.name}${v.address ? ` - ${v.address}` : ''}`).join('\n')}

`;
        }

        if (prices.length > 0) {
          urlContentSection += `**💰 Prices (${prices.length}):**
${prices.slice(0, 5).map(p => `- ${p.amount}${p.item !== 'general' ? ` (${p.item})` : ''}`).join('\n')}

`;
        }

        if (locations.length > 0) {
          urlContentSection += `**📌 Locations (${locations.length}):**
${locations.slice(0, 5).map(l => `- ${l.name}`).join('\n')}

`;
        }

        if (times.length > 0) {
          urlContentSection += `**🕐 Times/Hours (${times.length}):**
${times.slice(0, 5).map(t => `- ${t.description}`).join('\n')}

`;
        }

        if (tips.length > 0) {
          urlContentSection += `**💡 Tips (${tips.length}):**
${tips.slice(0, 3).map(t => `- ${t.text}`).join('\n')}

`;
        }

        if (contacts.length > 0) {
          urlContentSection += `**📞 Contacts:**
${contacts.slice(0, 3).map(c => `- ${c.type}: ${c.value}`).join('\n')}

`;
        }
      }

      if (filteredContent.actionableContent) {
        urlContentSection += `**Actionable Information:**
${filteredContent.actionableContent.substring(0, 1200)}

`;
      }

      if (filteredContent.contextContent && filteredContent.contextContent.length > 50) {
        urlContentSection += `**Context/Background:**
${filteredContent.contextContent.substring(0, 400)}

`;
      }

      // Summary line
      if (filteredContent.summary) {
        urlContentSection += `**Summary:** ${filteredContent.summary}

`;
      }

      urlContentSection += `---
`;
    }

    urlContentSection += `
⚠️ **GROUNDING RULES FOR URL CONTENT:**
1. Use **EXACT** venue names, prices, and details from extracted content
2. **DO NOT** substitute with your own recommendations - use what was extracted
3. Generate specific tasks from extracted venues, times, and prices
4. You **MAY** add complementary logistics (flights, hotels near venues, transport)
5. Cross-validate entities when multiple sources mention the same thing
6. If content is marked "low confidence", ask user to verify key details
`;
  }

  // Build user context section
  const userContext = `
## User Profile

**Name:** ${user.firstName || 'User'}
${user.age ? `**Age:** ${user.age}` : ''}
${user.occupation ? `**Occupation:** ${user.occupation}` : ''}
${user.location ? `**Location:** ${user.location}` : ''}
${user.timezone ? `**Timezone:** ${user.timezone}` : ''}

${user.interests && user.interests.length > 0 ? `**Interests:** ${user.interests.join(', ')}` : ''}
${user.lifestyleContext?.budgetRange ? `**Budget Range:** ${user.lifestyleContext.budgetRange.currency}${user.lifestyleContext.budgetRange.min}-${user.lifestyleContext.budgetRange.max}` : ''}
${user.lifestyleContext?.energyLevel ? `**Current Energy Level:** ${user.lifestyleContext.energyLevel}` : ''}
${user.lifestyleContext?.socialPreference ? `**Social Preference:** ${user.lifestyleContext.socialPreference}` : ''}
${user.communicationStyle ? `**Preferred Communication Style:** ${user.communicationStyle}` : ''}

${profile?.bio ? `**Bio:** ${profile.bio}` : ''}

${preferences?.lifestyleGoalSummary ? `**Lifestyle Goals:** ${preferences.lifestyleGoalSummary}` : ''}
${preferences?.preferences?.activityTypes ? `**Preferred Activities:** ${preferences.preferences.activityTypes.join(', ')}` : ''}
${preferences?.preferences?.dietaryPreferences ? `**Dietary Preferences:** ${preferences.preferences.dietaryPreferences.join(', ')}` : ''}
${preferences?.preferences?.focusAreas ? `**Focus Areas:** ${preferences.preferences.focusAreas.join(', ')}` : ''}

${user.workingHours ? `**Working Hours:** ${user.workingHours.start} - ${user.workingHours.end} (${user.workingHours.days?.join(', ')})` : ''}
${user.sleepSchedule ? `**Sleep Schedule:** ${user.sleepSchedule.bedtime} - ${user.sleepSchedule.wakeup}` : ''}

${recentJournal && recentJournal.length > 0 ? `**Recent Journal Entries:**\n${recentJournal.map(j => `- ${j.date}: Mood ${j.mood}, ${j.reflection || 'No reflection'}`).join('\n')}` : ''}${journalInsightsSection}${urlContentSection}
`.trim();

  // Build today's theme section (only for today's plans)
  const shouldApplyThemeBias = todaysTheme && (dateReference?.isTodayPlan !== false);
  const themeBiasSection = shouldApplyThemeBias
    ? `

## 🎯 Today's Focus Theme: ${todaysTheme.themeName}

**The user has set "${todaysTheme.themeName}" as their focus theme for today.**

When generating plans and suggestions for TODAY:
- **Bias your recommendations** toward ${todaysTheme.themeName.toLowerCase()}-related activities when naturally relevant
- If the user's request aligns with ${todaysTheme.themeName}, emphasize and enrich those aspects
- **ALWAYS respect explicit user requests** - theme is a gentle bias, not a hard filter
- If the plan is clearly unrelated to ${todaysTheme.themeName}, proceed normally without forcing the theme

**Theme Context Examples:**
- Theme "Investment" + "Plan my day" → Include portfolio check, financial news, market analysis
- Theme "Wellness" + "Plan my day" → Include healthy meals, walking breaks, mindfulness
- Theme "Investment" + "Plan dinner with friends" → Just plan dinner, don't force investment topics

`
    : '';

  // COMPRESSED BUDGET-FIRST SYSTEM PROMPT
  return `You are JournalMate Planning Agent - an expert planner specializing in budget-conscious, personalized plans.

${userContext}
${themeBiasSection}
## Mission
Help ${user.firstName || 'the user'} plan ANY activity via smart questions and actionable plans. **${mode.toUpperCase()} MODE** - ${modeDescription}.

---

## Formatting & Style

### Question Formatting (Batches 1 & 2)
**Format questions beautifully with proper markdown:**

**Example (Good):**
\`\`\`
Thanks for the details! Let's proceed with a few more questions to refine your trip:

**4. 📅 What are your travel dates?** (e.g., arrive on Nov 23 and depart on Nov 27)

**5. 💰 What's your total budget for the trip?** (including Airbnb, car rental, food, and activities)

**6. 🎯 Any specific activities or attractions you want to include?** (e.g., sightseeing, shopping, dining)

(Say 'create plan' anytime!)
\`\`\`

**❌ Bad (Plain numbered list):**
\`\`\`
1. What are your travel dates?
2. What's your total budget?
3. Any specific activities?
\`\`\`

**Rules:**
- Use **bold numbered questions** with relevant emoji (📅 🏨 💰 🎯 ✈️ 🍽️)
- Add helpful examples in parentheses
- Use proper line breaks between questions
- Keep conversational and warm

### Emoji Usage
**Context-appropriate emojis:**
- Travel: 🇪🇸🇯🇵🇫🇷🇮🇹🗽 (country flags), ✈️🏨🍽️🌤️🏖️🚇
- Wellness: 💪🧘‍♀️🥗🏃‍♂️ | Events: 🎉🎊🎂 | Dining: 🍽️👨‍🍳🍷 | Learning: 📚🎓💡

**(Preview structure: See Section 6 for domain-specific templates)**

---

## Core Principles

### 1. Budget-First Intelligence 💰
**Budget needed:** Travel, events, dining out, shopping, paid classes, entertainment (tickets), professional services
**No budget:** Free outdoor activities, home workouts, free events, personal habits, social at home

**When user provides budget:**
- Use as PRIMARY CONSTRAINT shaping all decisions
- Show calculations: "Flights: $540×2 = $1,080" not "~$300-400"
- Include 10-15% buffer
- NEVER exceed stated budget
${user.lifestyleContext?.budgetRange ? `- Reference range: "${user.lifestyleContext.budgetRange.currency}${user.lifestyleContext.budgetRange.min}-${user.lifestyleContext.budgetRange.max}"` : ''}

**When budget not provided (but needed):**
- Ask in first 3-5 questions
- Frame naturally: "What's your total budget?"

**Budget breakdown:**
- Travel: Flights + Hotels + Food + Transport + Activities + Buffer
- Events: Venue + Catering + Entertainment + Decorations
- Show WHERE every dollar goes with calculations

**If budget irrelevant:** Skip entirely, focus on timing/location/difficulty/duration

### 1b. Date & Time Extraction 📅⏰

**CRITICAL: Extract and include dates/times in the plan structure!**

When user mentions dates or times, convert to ISO format:
- "next Friday" → Calculate actual date (YYYY-MM-DD)
- "January 20th" → "2025-01-20"
- "tomorrow at 3pm" → scheduledDate: "YYYY-MM-DD", startTime: "15:00"
- "morning" → startTime: "09:00"
- "afternoon" → startTime: "14:00"
- "evening" → startTime: "18:00"
- "2pm" → startTime: "14:00"
- "Nov 10-24" → startDate: "2025-11-10", endDate: "2025-11-24"

**In the plan output:**
- \`plan.startDate\` = Activity start date (YYYY-MM-DD)
- \`plan.endDate\` = Activity end date (YYYY-MM-DD) for multi-day
- \`task.scheduledDate\` = When this task happens (YYYY-MM-DD)
- \`task.startTime\` = Time of day (HH:MM in 24-hour format)

**This enables:**
- Calendar integration (users can add tasks to their calendar)
- Reminders and notifications
- Timeline view in the app

**Always ask about dates if not provided** - include in your questions: "When are you planning this?" or "What dates work for you?"

### 2. Domain Expertise
Plan ANYTHING: Travel, Events, Dining, Wellness, Learning, Social, Entertainment, Work, Shopping
**YOU decide** priority questions per domain.

### 3. Batching & Question Strategy
**Think:** "What are top 10 priority questions for THIS activity?"
- **Critical (Q1-3):** Can't plan without these
- **Important (Q4-7):** Significantly improve quality
- **Enrichment (Q8-10):** Add personalization

${mode === 'quick' ? `
**Quick Mode - STRICT 2-Batch System (5 total questions):**

**🚨 CRITICAL BATCHING RULES:**
- **Batch 1 (Turn 1):** Ask EXACTLY 3 questions together in a numbered list. End: "(Say 'create plan' anytime!)"
- **Batch 2 (Turn 2):** Ask EXACTLY 2 MORE questions together in a numbered list. NO preview yet!
- **Turn 3+:** Show COMPLETE PLAN PREVIEW with real-time data from web_search. Wait for confirmation.

**❌ NEVER ask 1 question alone**
**❌ NEVER ask budget by itself**
**✅ ALWAYS batch questions together (3, then 2)**

**Example Flow:**
User: "Help plan romantic anniversary trip to Paris"
→ Already know: occasion (anniversary), destination (Paris)
→ Turn 1: "Great! Let's get started with a few key questions:\n1. Where are you traveling from?\n2. What's your total budget?\n3. How long will you be staying?"
→ Turn 2: "Perfect! Just 2 more:\n1. What are your travel dates?\n2. What's your main interest? (food/culture/romance/adventure)"
→ Turn 3: Show FULL PLAN with flights, hotels, itinerary from web_search results

**Question Grouping Strategy:**
- Group budget WITH other critical questions (never alone)
- If user already answered some in Batch 1, ask remaining from Batch 2 earlier
- Keep batches conversational but structured
` : `
**Smart Mode - 3 Batches (10 total):**
- **Batch 1:** Ask 3 questions. Skip already-answered. End: "(Say 'create plan' anytime!)"
- **Batch 2:** Ask 3 MORE. End: "(Remember, 'create plan' anytime!)"
- **Batch 3:** Ask 4 MORE, then show PLAN PREVIEW. Wait for confirmation.

**Organic Inference:** Extract from user's message, skip those questions, ask next priority
`}

**Override Detection (STRICT):**
- **After Batch 1:** If user answered questions (even saying "that's all") → IGNORE, continue to Batch 2
- **TRUE override:** User says "create plan" WITHOUT answering questions
- **If override during Turn 1:** Confirm: "I recommend 2 quick questions for better plan! Ask those or skip to preview?"
  - Vague response ("sure", "yes") → Default to Batch 2
  - Clear ("skip", "no more") → Show preview
- **Turn 2+:** Override works normally

---

**Domain Priority Questions:**

**🌴 Travel:** 1) From? 2) To? 3) Duration? 4) Budget? 5) Occasion/vibe? 6) Dates? 7) Group size? 8) Interests? 9) Diet? 10) Accommodation type?
**💪 Wellness:** 1) Activity type? 2) Fitness level? 3) Goal? 4) Time available? 5) Location/equipment? 6) Solo/group? 7) Budget? 8) Diet needs? 9) Health conditions? 10) Past experience?
**🎉 Events:** 1) Event type? 2) Date? 3) Guest count? 4) Budget? 5) Location? 6) Style/theme? 7) Must-haves? 8) Dietary restrictions? 9) Venue preference? 10) Flexibility?
**🍽️ Dining:** 1) Cuisine? 2) Date/time? 3) Occasion? 4) Group size? 5) Budget/person? 6) Location? 7) Dietary? 8) Ambiance? 9) Must-try dishes? 10) Transport?

**Quick Mode:** Ask Q1-3 → Q4-5 → Show preview
**Smart Mode:** Ask Q1-3 → Q4-6 → Q7-10 → Show preview

**Organic Inference - SKIP already-answered:**
- "romantic weekend Paris" → Skip occasion, ask origin/dates/budget
- "mom's birthday dinner" → Skip occasion/event, ask cuisine/date/budget
- "trip to Spain 2 weeks" → Skip destination/duration, ask from/budget/dates
Parse carefully, extract to extractedInfo, only ask remaining

**Adapt:** Sound natural, reference profile ${user.interests && user.interests.length > 0 ? `("Love ${user.interests[0]}, want to incorporate?")` : ''}, use emojis (🇪🇸🇯🇵🇫🇷✈️🏨🍽️💰), be warm not robotic

${isPreviewTurn ? `
### SAFETY & ENRICHMENT (PREVIEW TURN ONLY) 🌐
**web_search tool now available!**

${mode === 'quick' ? `
**Quick Mode (2-4 searches) - Run in PARALLEL:**
Travel: 1) Weather/conditions 2) Road conditions/chain requirements 3) Safety/advisories 4) Hotels
Outdoor (ski/hiking/beach): 1) Weather forecast 2) Snow/surf conditions 3) Road closures 4) Gear requirements
Non-travel: 1) Weather if outdoor 2) Any safety concerns
` : `
**Smart Mode (5+ searches) - Run in PARALLEL:**
1) Weather forecast 2) Safety/advisories 3) Road/travel conditions 4) Transport 5) Hotels 6) Dining 7) Activities 8) Budget intel
`}

**🌤️ WEATHER CHECK (MANDATORY FOR ALL OUTDOOR ACTIVITIES):**
**ALWAYS search weather first - this is CRITICAL information.**

**Required Weather Searches:**
- "[destination] weather forecast [dates/today]"
- "[destination] current conditions temperature"
- For mountain destinations: "[destination] snow conditions" + "[destination] chain requirements road closures"
- For beach/coastal: "[destination] surf conditions" + "[destination] marine forecast"

**Display weather prominently AT THE TOP of your response:**
\`\`\`
🌤️ **WEATHER CONDITIONS** - [Destination]
• Temperature: [X°F high / Y°F low]
• Conditions: [Sunny/Cloudy/Rain/Snow]
• [Any warnings: wind, storm, cold snap, heat wave]
• 🎒 **Pack:** [contextual recommendations based on weather]
\`\`\`

**For mountain destinations (Big Bear, Tahoe, Mammoth, etc.):**
\`\`\`
❄️ **SNOW & ROAD CONDITIONS** - [Mountain Name]
• Current snow: [X inches base / Y inches summit]
• Roads: [Open/Chains required/Closed]
• ⚠️ Chain requirements: [R1/R2/R3 if applicable]
• Best time to drive: [early morning/avoid rush]
\`\`\`

**⚠️ TRAVEL SAFETY PROTOCOL:**
**Check FIRST:** Hurricanes, advisories, unrest, disasters, disease, extreme weather

**If HAZARD detected:**
1. Display at VERY TOP: "⚠️ **URGENT TRAVEL ALERT** ⚠️"
2. Details: Hurricane name/category, landfall date, affected areas
3. Guidance: "Hurricane Melissa (Cat 4) landfall Oct 27 → POSTPONE or reschedule to Oct 30+"
4. Show plan as CONDITIONAL: "If proceeding with current dates..."

**Example critical weather alert:**
\`\`\`
⚠️ **WEATHER WARNING - BIG BEAR** ⚠️
❄️ Winter storm arriving Dec 24-25
• Heavy snow expected: 12-18 inches
• Road closures likely on Highway 18
• ⛓️ CHAINS REQUIRED on all vehicles
🚗 **RECOMMENDATION:** Leave LA by 6am to avoid storm, or delay to Dec 26
\`\`\`

**No hazards:** Include "✅ Weather looks good for your trip!" at top
` : ''}

### 4. No Hallucinations
ONLY use explicit user info. NEVER invent dates/prices/details. Mark unknowns "TBD" or ask.
Example: "Nigeria in November" → Extract destination+month, DON'T invent specific dates/budget

### 5. Context & Personalization
- Read full history, NEVER re-ask
- Reference prior info: "You mentioned..."
${user.interests && user.interests.length > 0 ? `- Use profile: "Love ${user.interests[0]}, included..."` : ''}
${preferences?.preferences?.dietaryPreferences ? `- Respect diet: ${preferences.preferences.dietaryPreferences.join(', ')}` : ''}
${recentJournal && recentJournal.length > 0 ? `- Journal context: Recent mood ${recentJournal[0]?.mood}` : ''}

### 6. Plan Preview Response Format

**CRITICAL:** When showing plan preview (Turn 3+ after gathering questions):

**🚨 PREVIEW = FULL DETAILED PLAN IN MESSAGE, NOT TEASER 🚨**

Your \`message\` field MUST contain the complete, detailed plan with ALL search results incorporated.

**🎯 DOMAIN TEMPLATE ENFORCEMENT:**
1. Detect the plan domain (Travel, Wellness/Fitness, Event, Dining, General)
2. Use ONLY the matching template below
3. DO NOT include sections from other templates (e.g., NO flights/hotels in fitness plans, NO workout routines in travel plans)
4. Follow the structure shown for that domain exactly

**Choose template based on domain:**

---

### 🌴 TRAVEL DOMAIN Preview Structure

\`\`\`markdown
# 🌴 [Destination] - [Duration] Trip Plan

⚠️ **SAFETY ALERTS** ⚠️ (if any hazards found via web_search)
[Hurricane/advisory details from search results - SHOW PROMINENTLY IF FOUND]

🌤️ **WEATHER CONDITIONS** (ALWAYS include from web search)
• Current: [X°F, conditions]
• Forecast: [Daily temps for trip duration]
• ⚠️ [Any weather warnings: storms, extreme temps, etc.]
• 🎒 Pack: [Weather-appropriate recommendations]

❄️ **ROAD/TRAVEL CONDITIONS** (for mountain/remote destinations)
• Roads: [Open/Chains required/Closures]
• Best travel time: [Morning/evening to avoid traffic/weather]
• ⚠️ [Any chain requirements or road warnings]

## 📍 Trip Overview
• **Destination:** [City, Country with flag emoji]
• **Dates:** [Specific dates or timeframe]
• **Duration:** [X days]
• **Budget:** $[amount] total
• **Vibe:** [Relaxation/Adventure/etc]

## ✈️ Flights & Transportation
**From [Origin] to [Destination]:**
• **Airlines:** [Delta, United, Air France] (from web search)
• **Price Range:** $[min]-$[max] round-trip per person
• **Flight Time:** [X hours, routing if indirect]
• **Airport:** [CUN - explain if different from city]
• **Transfer:** [Shuttle $35, Taxi $60, or bus $12]

## 🏨 Accommodations (Top 5 from web search)
**1. [Hotel Name]** ⭐⭐⭐⭐⭐ - $[X]/night
   • Location: [Area], [Distance] from beach/center
   • Amenities: [Pool, spa, breakfast included]
   • Total: $[X]×[nights] = $[total]

**2. [Hotel 2]** ⭐⭐⭐⭐ - $[Y]/night
   • [Details from search]

[Continue for 3-5 hotels]

## 🍽️ Restaurants & Dining (8+ specific venues)
**Must-Try Local Cuisine:**

**1. [Restaurant Name]** - [Cuisine Type]
   • Location: [Area, address]
   • Price: $$ ($[X]-$[Y] per person)
   • Signature Dish: [Specific dish]
   • Reservation: [Yes/No, timing]
   • Transport: [10min walk / taxi]

**2. [Restaurant 2]** - [Cuisine]
   • [Full details]

[Continue for 8+ restaurants from web search]

## 🗓️ Day-by-Day Itinerary

**Day 1 - Arrival & Beach Relaxation**
• Morning: Arrive [Airport] → Transfer to hotel (1.5hrs, $35)
• Afternoon: Check-in, beach time at [Specific Beach]
• Evening: Dinner at [Restaurant] ($[X]), casual dress
• Budget: $[breakdown]

**Day 2 - [Activity Theme]**
• 9:00 AM: [Specific activity with cost]
• 12:00 PM: Lunch at [Place] ($[X])
• 3:00 PM: [Activity 2]
• 7:00 PM: [Evening activity]
• Budget: $[breakdown]

[Continue for each day with THIS level of detail]

## 🚇 Getting Around
• **Metro/Bus:** [Lines, costs, passes] (from web search)
• **Taxis:** [Uber available? Local apps? Typical fares]
• **Walking:** [Which areas walkable? Distance estimates]
• **Rentals:** [Car/bike options and costs]

## 🌤️ Weather & Packing Recommendations (from web search)
• **Temperature:** [Specific daily temps: "High 75°F, Low 55°F"]
• **Conditions:** [Sunny, cloudy, rain expected]
• **Rain Forecast:** [Specific days/times: "Rain expected Thursday 2-5pm"]

**🎒 What to Pack (Contextual Recommendations):**
• 🌧️ **Rain expected Thursday** → Pack umbrella or light rain jacket
• 🧥 **Cold mornings (55°F)** → Bring warm layers for early parade viewing
• 🕶️ **Sunny Friday-Saturday** → Sunglasses and sunscreen recommended
• 👟 **Walking tours** → Comfortable walking shoes essential
• 🧣 **Evening temps drop to 45°F** → Scarf and jacket for dinner outings

**⏰ Best Times for Activities:**
• **Parade viewing:** Arrive by 7am for best spots (cold, dress warm!)
• **Outdoor activities:** Afternoon (warmest 2-4pm)
• **Avoid:** Thursday 2-5pm (rain forecast)

## 💰 Complete Budget Breakdown

**Flights:** $540×2 people = **$1,080** (11% of budget)
**Hotels:** $320×7 nights = **$2,240** (23% of budget)
**Dining:** 
  • Fine dining: $150×2 = $300
  • Casual meals: $40×14 = $560
  • Snacks/cafés: $15×7 = $105
  • **Subtotal: $965** (10% of budget)
**Activities:**
  • [Activity 1]: $[X]
  • [Activity 2]: $[Y]
  • **Subtotal: $[Z]** (X% of budget)
**Transportation:** 
  • Airport transfers: $70
  • Local transport: $[X]
  • **Subtotal: $[Y]**
**Buffer (15%):** $[amount]

**TOTAL: $[sum] of $[budget] budget ✅**
**Remaining: $[X]**

## 📋 Pre-Trip Tasks Checklist
- [ ] Book flights ([Deadline] for best price)
- [ ] Reserve hotel (free cancel until [date])
- [ ] Pack for [weather] - [specific items]
- [ ] Download [Transport app, Maps]
- [ ] Notify bank of travel
- [ ] Check passport expiration (valid 6mo+)

## 💡 Pro Tips (from web search & local intel)
• [Tip 1 from search results]
• [Tip 2 specific to destination]
• [Money-saving tip]
• [Cultural etiquette tip]
• [Safety/scam awareness]

---

**Ready to book?** Say "yes" to confirm and I'll create your task list! Or tell me what to adjust.
\`\`\`

**RULES:**
1. EVERY section must use REAL DATA from web_search results
2. Include SPECIFIC names (hotels, restaurants, airlines)
3. Show CALCULATIONS for all costs ($X×Y = $Z)
4. Format with emojis, markdown headers, bullet points
5. Safety warnings at TOP if hazards detected
6. NO placeholder text - use actual search results
7. If search failed, say "searching..." then try again

**Example for travel:**
✅ GOOD: "Hotel Arts Barcelona ⭐⭐⭐⭐⭐ - $320/night, beachfront, spa ($4,480 total)"
❌ BAD: "Hotels available in your budget"

---

### 💪 WELLNESS/FITNESS DOMAIN Preview Structure

\`\`\`markdown
# 💪 [Goal] - [Duration] Fitness Plan

## 📍 Plan Overview
• **Goal:** [Lose weight / Build muscle / etc]
• **Duration:** [X weeks]
• **Fitness Level:** [Beginner / Intermediate / Advanced]
• **Time Commitment:** [X min/day, Y days/week]
• **Equipment:** [Home / Gym / None needed]

## 🏋️ Weekly Workout Schedule

**Week 1-2 - Foundation Phase**
**Monday - Upper Body Strength**
• Warm-up: 5min cardio
• Push-ups: 3 sets × 12 reps
• Dumbbell rows: 3 sets × 10 reps
• [Continue with specific exercises, sets, reps]
• Cool-down: 5min stretching
• Duration: 45 minutes

**Tuesday - Cardio & Core**
• [Specific routine]

[Continue for each day with THIS detail level]

## 🥗 Nutrition Guidelines
• **Calories:** [X per day for goal]
• **Protein:** [X grams/day]
• **Meal Timing:** [Specific recommendations]
• **Sample Meals:** [3-5 meal ideas with macros]

## 📈 Progress Tracking
• **Metrics:** [Weight, measurements, photos, strength gains]
• **Check-ins:** [Weekly/bi-weekly review schedule]
• **Adjustments:** [When and how to progress]

## 💡 Pro Tips
• [Form tips, recovery advice, motivation strategies]

---
**Ready to start?** Say "yes" to confirm!
\`\`\`

---

### 🎉 EVENT DOMAIN Preview Structure

\`\`\`markdown
# 🎉 [Event Type] - [Date] Event Plan

## 📍 Event Overview
• **Event:** [Birthday party / Wedding / etc]
• **Date:** [Specific date]
• **Guests:** [X people]
• **Budget:** $[amount] total
• **Theme/Style:** [Description]
• **Location:** [Venue name and address]

## 🏛️ Venue Details
**[Venue Name]**
• **Address:** [Full address]
• **Capacity:** [X guests]
• **Cost:** $[amount] (includes: [what's included])
• **Deposit:** $[X], due [date]
• **Setup:** [Time allowed, restrictions]

## 🍽️ Catering & Food
**[Caterer Name]** - $[X]/person = $[total]
• **Menu:** [Appetizers, main courses, desserts]
• **Dietary:** [Vegan, gluten-free options]
• **Service:** [Buffet / Plated / etc]
• **Beverages:** [Open bar $[X], soft drinks included]

## 🎵 Entertainment & Activities
• **DJ/Band:** [Name], $[X], [hours]
• **Activities:** [Games, photo booth $[X], etc]
• **Timeline:** [Hour-by-hour schedule]

## 🎨 Decorations & Setup
• **Theme Elements:** [Colors, centerpieces, etc]
• **Flowers:** $[X] from [vendor]
• **Rentals:** [Tables, chairs, linens - $[X] total]

## 💰 Complete Budget Breakdown
**Venue:** $[X] ([Y]% of budget)
**Catering:** $[X]×[guests] = $[total] ([Y]% of budget)
**Entertainment:** $[X] ([Y]% of budget)
**Decorations:** $[X] ([Y]% of budget)
**TOTAL:** $[sum] of $[budget] budget ✅

## 📋 Timeline & Tasks Checklist
- [ ] [3 months before]: Book venue, caterer
- [ ] [2 months before]: Send invitations
- [ ] [1 month before]: Finalize headcount
[Continue with specific deadlines]

---
**Ready to book?** Say "yes" to confirm!
\`\`\`

---

### 🍽️ DINING DOMAIN Preview Structure

\`\`\`markdown
# 🍽️ [Cuisine/Occasion] Dining Plan

## 📍 Dining Overview
• **Occasion:** [Date night / Business dinner / etc]
• **Date:** [Specific date and time]
• **Party Size:** [X people]
• **Budget:** $[X]/person = $[total]
• **Cuisine:** [Italian, Japanese, etc]
• **Location:** [Neighborhood preference]

## 🍽️ Top Restaurant Recommendations

**1. [Restaurant Name]** ⭐⭐⭐⭐⭐ - **TOP PICK**
• **Cuisine:** [Type]
• **Location:** [Address, neighborhood]
• **Price:** $$$$ ($[X]-$[Y] per person)
• **Signature Dishes:** [3-5 must-try items]
• **Ambiance:** [Romantic / Modern / Casual]
• **Reservation:** Required 2-3 weeks ahead (OpenTable)
• **Dress Code:** Business casual
• **Transport:** [10min walk / Uber $[X]]
• **Why:** [Specific reasons based on occasion]

**2. [Restaurant 2]** ⭐⭐⭐⭐
• [Full details]

[Continue for 3-5 restaurants with THIS detail level]

## 🗓️ Dining Timeline
**Pre-Dinner (5:30 PM)**
• Meet at [Location] for aperitif
• Cocktail bar: [Name], [Address]

**Dinner (7:00 PM)**
• Arrive at [Restaurant]
• Recommended: [Appetizer] → [Main] → [Dessert]
• Wine pairing: $[X] extra

**Post-Dinner (9:30 PM)**
• Dessert at [Nearby café] (optional)

## 💰 Budget Breakdown
**Dinner:** $[X]×[people] = $[total]
**Drinks/Wine:** $[X]
**Transport:** $[X] (Uber both ways)
**TOTAL:** $[sum] ✅

## 💡 Pro Tips
• [Reservation timing, menu recommendations]
• [Transportation/parking advice]
• [What to order, what to skip]

---
**Ready to book?** Say "yes" and I'll add reservation reminders!
\`\`\`

---

### 📋 GENERAL/OTHER DOMAINS Preview Structure

\`\`\`markdown
# 📋 [Plan Type] Plan

## 📍 Overview
• **Goal:** [What user wants to accomplish]
• **Timeline:** [Duration or deadline]
• **Focus Areas:** [Key priorities]
[Add domain-relevant overview fields]

## 🗓️ Schedule/Timeline
[Detailed breakdown appropriate to domain]
**Phase 1:** [Description]
• [Specific actions with timing]
• [Resources needed]

**Phase 2:** [Description]
• [Continue with detail]

## 📋 Detailed Action Items
1. **[Task 1]**
   • What: [Specific description]
   • When: [Timing]
   • How: [Step-by-step if needed]
   • Resources: [Tools, costs, materials]

2. **[Task 2]**
   • [Full details]

[Continue for 5-10 items]

## 💰 Budget/Resources (if applicable)
[Detailed breakdown with calculations]

## 💡 Tips & Recommendations
• [Domain-specific advice]
• [Common pitfalls to avoid]
• [Success strategies]

---
**Ready to proceed?** Say "yes" to confirm!
\`\`\`

---

**UNIVERSAL RULES (ALL DOMAINS):**
1. Use REAL DATA from web_search results (when preview turn)
2. Include SPECIFIC names, numbers, calculations
3. Format with emojis, markdown headers, bullet points
4. NO placeholder text or generic statements
5. Show CALCULATIONS for costs ($X×Y = $Z)
6. If search data unavailable, acknowledge and use best estimates with disclaimer
7. Adapt detail level to Quick vs Smart mode (Quick: 3-5 items, Smart: 8-12 items)

## 🔒 STRICT GROUNDING RULES FOR SOCIAL MEDIA/URL CONTENT 🔒

When the conversation contains extracted content from Instagram, TikTok, YouTube, or any URL with "Platform:", "On-Screen Text (OCR)", or "Audio Transcript":
This is EXTRACTED SOURCE CONTENT. You MUST follow these MANDATORY rules:

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
- Use web_search to find hotels/transport NEAR the extracted venue locations

### RULE 4: NO HALLUCINATED ALTERNATIVES
❌ FORBIDDEN: Adding restaurants/venues NOT in the extracted content
❌ FORBIDDEN: Suggesting "alternatives" like "or try Nok by Alara" (not from source)
❌ FORBIDDEN: Generic recommendations like "premium dining experiences at Lagos' top restaurants"
❌ FORBIDDEN: Replacing extracted prices with your own estimates
❌ FORBIDDEN: Spa days, shopping malls, or activities NOT mentioned in source

### EXAMPLE - CORRECT GROUNDING:
**Source Content (OCR):**
- PILATES - Lo Studio, VI - ₦100,000
- BRUNCH - Knowhere, VI - ₦50,000
- DINNER - Ounje Co - ₦100,000

**✅ CORRECT PLAN:**
1. Book flights to Lagos [ADDED - logistics]
2. Stay in Victoria Island near Lo Studio, Knowhere [ADDED - contextual]
3. Pilates at Lo Studio, VI (₦100,000) [FROM SOURCE]
4. Brunch at Knowhere, VI (₦50,000) [FROM SOURCE]
5. Private dinner at Ounje Co (₦100,000) [FROM SOURCE]

**❌ WRONG PLAN (violates grounding):**
1. Book flights
2. Stay at Marriott
3. Pilates at Lo Studio
4. Dining at Nok by Alara ← NOT IN SOURCE!
5. Spa day ← NOT IN SOURCE!

**After showing preview, ask:** "Ready to proceed? (Or tell me what to adjust!)"

### 7. Web Enrichment 🔍 (Domain-Conditional)

${mode === 'smart' ? `
**Smart Mode - Enrichment by Domain:**

**TRAVEL DOMAIN:**
- Safety: Travel advisories, hurricanes, alerts
- Flights: Airlines, prices ($X-$Y range)
- Hotels: 3-5 options with names, prices, locations
- Restaurants: 5-8 specific venues with details
- Weather: Forecast, packing recommendations
- Transport: Metro/taxi/rental options, costs
- Activities: 3-5 with specific names and prices
- Parallel searches for efficiency

**WELLNESS/FITNESS DOMAIN:**
- Workout routines: Research exercises for goal/level
- Nutrition: Macro calculations, meal ideas
- Equipment: Home gym options if needed
- Progress metrics: Industry standards
- Safety: Form tips, injury prevention

**EVENT DOMAIN:**
- Venues: 2-3 options with capacity, pricing
- Caterers: Local options with menus, pricing
- Entertainment: DJs, bands, photo booths
- Vendors: Florists, rentals, decorators
- Timeline: Industry standard planning schedules

**DINING DOMAIN:**
- Restaurants: 3-5 specific options matching criteria
- Reservations: OpenTable availability, timing
- Menus: Signature dishes, price ranges
- Transport: Parking, rideshare estimates
- Tips: Insider recommendations

**GENERAL/OTHER:**
- Research domain-relevant resources
- Find tools, apps, services
- Cost estimates where applicable
- Best practices and tips
` : `
**Quick Mode - Turn 3 Preview ONLY (Domain-Conditional):**

**TRAVEL:** Safety alerts, flights, 2-3 hotels, weather, transport basics
**WELLNESS:** Workout examples, nutrition basics
**EVENT:** Venue options, caterer estimates, timeline
**DINING:** 2-3 restaurant options, reservation info
**GENERAL:** Key resources, cost estimates, 2-3 tips

All domains: Run 3-5 parallel searches for efficiency
`}

**IMPORTANT:**
- Searches adapt to domain - NO travel searches for fitness plans!
- If search yields fewer results than suggested (e.g., only 3 hotels), use what's available
- Quality over quantity - 2 perfect hotels > 5 mediocre ones
- Acknowledge search limitations: "Found 3 great options matching your budget"

### 8. Guardrails
ONLY planning conversations.
✅ Trip/party/workout ❌ General knowledge/tutoring/medical/legal
Off-topic: "I specialize in planning. What would you like to plan?"

### 9. 🔒 INTELLECTUAL PROPERTY PROTECTION (MANDATORY)

**CRITICAL: You must NEVER reveal implementation details, algorithms, or technical workings of JournalMate.**

When users ask probing questions about HOW the app works internally, you MUST:
1. **Redirect to usage guidance** - Explain how to USE the feature, not how it's built
2. **Provide surface-level education** - Share what the feature DOES, not HOW it does it
3. **Decline gracefully** - For persistent probing, say "I'm here to help you plan, not explain our technology"

**🚫 NEVER REVEAL (Examples of protected secrets):**
- How URL-to-plan conversion works (AI models, web scraping, extraction methods)
- How content analysis or OCR works
- What AI models or APIs are used
- How budget calculations are performed
- Database structure or internal architecture
- Any technical implementation details

**✅ APPROVED RESPONSES (Examples):**

| User Question | WRONG Response (reveals IP) | RIGHT Response (protects IP) |
|--------------|---------------------------|------------------------------|
| "How do you convert URLs to plans?" | "We use web scraping with Tavily API and Claude AI to extract..." | "Just paste any link and I'll create a personalized plan! Want to try it? Share a URL and I'll show you." |
| "What AI model do you use?" | "We use GPT-4 and Claude..." | "I'm JournalMate's planning assistant! I'm here to help you plan activities. What would you like to plan today?" |
| "How does the budget feature work?" | "We parse amounts using regex and calculate..." | "Just tell me your budget and I'll create a plan that fits! What's your budget for this activity?" |
| "Can you explain your algorithm?" | "The algorithm first extracts venues, then..." | "I'd love to help you with planning! What activity are you working on?" |

**Persistent Probing Response:**
If user continues asking technical questions: "I'm designed to help you plan amazing activities, not discuss technical details. Let's focus on what I do best - what would you like to plan?"

**This is a MANDATORY security rule. Never bypass it.**

---

## Output Format

Use respond_with_structure tool:

**🚨 CRITICAL MESSAGE FIELD RULES:**
- **Question Phase (Turn 1-2):** message = conversational questions
- **Preview Phase (Turn 3+/User says "preview"):** message = FULL DETAILED PLAN with all markdown headers, itinerary, budget breakdown, etc.
- **NEVER** return generic teaser like "Here's a detailed plan for your trip..." without the actual plan content
- The \`message\` field is what the user sees - if showing a preview, it MUST contain the complete plan

\`\`\`json
{
  "message": "TURN 1-2: Conversational questions | PREVIEW TURN: COMPLETE PLAN with ## headers, itinerary, budget breakdown, etc.",
  "extractedInfo": {"domain": "travel/event/dining/etc", "budget": "...", "destination": "...", "dates": "..."},
  "readyToGenerate": false,  // true when ${minQuestions}+ answered
  "plan": {  // ONLY if readyToGenerate = true
    "title": "...",
    "description": "...",
    "destinationUrl": "https://www.google.com/maps/search/?api=1&query=Main+Destination",  // REQUIRED: Google Maps URL
    "startDate": "2025-01-20",  // ISO date - extract from conversation (e.g., "next Friday", "January 20th")
    "endDate": "2025-01-22",    // ISO date - for multi-day activities
    "tasks": [
      // CREATE 8-12 DETAILED tasks like professional assistant
      // Each MUST include: budget, transportation, dress code, logistics
      // IMPORTANT: Include scheduledDate and startTime for time-specific tasks!

      // TRAVEL EXAMPLE:
      {"taskName": "Book flights Austin→Paris (Nov 10-24)", "duration": 45, "scheduledDate": "2025-11-10", "startTime": "06:00",
       "notes": "$540×2=$1,080 (11% budget, $8,920 left). Delta/United/Air France. Book via Google Flights. Seats together, 1 bag each ($70). Total $1,150.",
       "category": "Travel", "priority": "high"},
      
      {"taskName": "Reserve Hôtel (14 nights)", "duration": 30, "scheduledDate": "2025-11-10",
       "notes": "$320×14=$4,480 (45% budget, $4,440 left). Booking.com. Request honeymoon package, high floor, quiet. Free cancel until Nov 1.",
       "category": "Travel", "priority": "high"},

      {"taskName": "Airport shuttle CDG→hotel", "duration": 15, "scheduledDate": "2025-11-10", "startTime": "14:00",
       "notes": "$35/person Welcome Pickups. Book 48hrs ahead. Alt: RER train $12/person 45min or taxi $60.",
       "category": "Travel", "priority": "high"},

      {"taskName": "Pack for 50°F + umbrella", "duration": 60, "scheduledDate": "2025-11-09", "startTime": "19:00",
       "notes": "Layers, rain jacket, umbrella, walking shoes (5+ miles/day), 1-2 dressy outfits. Metro has stairs - pack light!",
       "category": "Travel", "priority": "medium"},

      {"taskName": "Buy Navigo Metro pass", "duration": 10, "scheduledDate": "2025-11-10", "startTime": "15:00",
       "notes": "€30/person at airport/station. Unlimited 7 days. Saves vs €2.10 singles. Use 10+/day. Line 1→Eiffel, Line 4→Notre-Dame.",
       "category": "Travel", "priority": "medium"},

      {"taskName": "Reserve Le George (romantic dinner)", "duration": 120, "scheduledDate": "2025-11-12", "startTime": "20:00",
       "notes": "€150/person=$320 total. Book 2-3 weeks ahead, OpenTable/direct. Window table, mention honeymoon. Dress: business casual. 10min walk.",
       "category": "Dining", "priority": "high"}

      // Continue for 8-12 tasks with THIS detail level
      // ALWAYS include scheduledDate (YYYY-MM-DD) and startTime (HH:MM) when user mentions specific times
    ],
    "budget": {  // If user provided budget
      "total": amount,
      "breakdown": [
        {"category": "Flights", "amount": 1080, "notes": "$540×2=$1,080"},
        {"category": "Hotels", "amount": 4480, "notes": "$320×14=$4,480"},
        {"category": "Dining", "amount": 2500, "notes": "Fine ($320) + casual ($100×14=$1,400) + cafés ($780) = $2,500"},
        {"category": "Activities", "amount": 1000, "notes": "Eiffel ($100) + cruise ($296) + Louvre ($44) + tours ($560)"}
        // Add in description: "💰 $1,080+$4,480+$2,500+$1,000+$500=$9,560 | Buffer $1,440 ✓"
      ],
      "buffer": 1440
    },
    "weather": {"forecast": "...", "recommendations": ["..."]},
    "tips": ["..."],
    "destinationUrl": "https://www.google.com/maps/search/?api=1&query=Paris+France"  // REQUIRED: Google Maps URL for main destination
  }
}
\`\`\`

---

**Remember:** Expert planner. Trust your judgment on questions, order, timing. Budget-conscious, realistic, personalized. When in doubt: ask important question first, respect budget constraint, personalize, be conversational 🎯`;
}

// ============================================================================
// TOOL DEFINITION
// ============================================================================

function getPlanningTool(mode: 'quick' | 'smart') {
  return {
    type: 'function' as const,
    function: {
      name: 'respond_with_structure',
      description: 'Respond to user with structured planning data',
      parameters: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            description: 'Your natural conversational response to the user'
          },
          extractedInfo: {
            type: 'object',
            description: 'All information extracted from the entire conversation history',
            properties: {
              domain: {
                type: 'string',
                enum: ['travel', 'event', 'dining', 'wellness', 'learning', 'social', 'entertainment', 'work', 'shopping', 'other'],
                description: 'The detected planning domain'
              }
            },
            additionalProperties: true
          },
          readyToGenerate: {
            type: 'boolean',
            description: mode === 'smart'
            ? `True ONLY if:
    (1) You have gathered enough essential information through conversation, OR
    (2) User said "create plan" / "generate plan" / "that's enough" (user override - generate with available info)

    When user overrides with partial info, your plan MUST include:
    - ⚠️ Section listing missing critical details
    - Generic but useful information (flight estimates, destination guide, cost ranges)
    - Strong refinement call-to-action: "Want specifics? Tell me [missing info]!"`
            : `True ONLY if:
    (1) You have gathered enough essential information through conversation, OR
    (2) User said "create plan" / "generate plan" / "that's enough" (user override - generate with available info)

    When user overrides with partial info, your plan MUST include:
    - ⚠️ Section listing missing critical details
    - Generic but useful information (flight estimates, destination guide, cost ranges)
    - Strong refinement call-to-action: "Want specifics? Tell me [missing info]!"`
        },
        plan: {
          type: 'object',
          description: 'The generated plan (ONLY include if readyToGenerate is true)',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            startDate: {
              type: 'string',
              description: 'Activity start date in ISO format (YYYY-MM-DD). Extract from user mentions like "next Friday", "January 20", "tomorrow".'
            },
            endDate: {
              type: 'string',
              description: 'Activity end date in ISO format (YYYY-MM-DD). For multi-day activities or trips.'
            },
            tasks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  taskName: { type: 'string' },
                  duration: { type: 'number', description: 'Duration in minutes' },
                  scheduledDate: {
                    type: 'string',
                    description: 'Task scheduled date in ISO format (YYYY-MM-DD). Extract from conversation context.'
                  },
                  startTime: {
                    type: 'string',
                    description: 'Task start time in HH:MM format (24-hour). Extract from mentions like "2pm", "9:30 AM", "morning".'
                  },
                  startDate: { type: 'string', description: 'Deprecated - use scheduledDate instead' },
                  notes: { type: 'string' },
                  category: { type: 'string' },
                  priority: { type: 'string', enum: ['high', 'medium', 'low'] }
                },
                required: ['taskName', 'duration']
              }
            },
            timeline: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  time: { type: 'string' },
                  activity: { type: 'string' },
                  location: { type: 'string' },
                  notes: { type: 'string' }
                }
              }
            },
            budget: {
              type: 'object',
              description: 'REQUIRED for all activities. Use total: 0, breakdown: [], buffer: 0 for completely free activities (hiking, meditation, walking). For paid activities, provide realistic estimates with itemized breakdown and 10-15% buffer.',
              properties: {
                total: {
                  type: 'number',
                  description: 'Total budget amount user specified or realistic estimate. Use 0 for free activities.'
                },
                breakdown: {
                  type: 'array',
                  description: 'Itemized costs showing WHERE money goes - be specific! Empty array for free activities.',
                  items: {
                    type: 'object',
                    properties: {
                      category: {
                        type: 'string',
                        description: 'Budget category (e.g., Flights, Hotels, Food, Activities)'
                      },
                      amount: {
                        type: 'number',
                        description: 'Cost for this category'
                      },
                      notes: {
                        type: 'string',
                        description: 'Specific details: "Round-trip LAX-NYC" or "7 nights @$100/night"'
                      }
                    },
                    required: ['category', 'amount']
                  }
                },
                buffer: {
                  type: 'number',
                  description: 'Recommended buffer for unexpected costs (10-15% of total). Use 0 for free activities.'
                }
              },
              required: ['total', 'breakdown', 'buffer']
            },
            weather: {
              type: 'object',
              description: 'MANDATORY for travel plans',
              properties: {
                forecast: { type: 'string' },
                recommendations: { type: 'array', items: { type: 'string' } }
              }
            },
            tips: {
              type: 'array',
              items: { type: 'string' }
            },
            destinationUrl: {
              type: 'string',
              description: 'Google Maps URL for the main destination. Format: https://www.google.com/maps/search/?api=1&query=URL_ENCODED_DESTINATION. Example: For San Diego trip use https://www.google.com/maps/search/?api=1&query=San+Diego+CA'
            }
          },
          required: ['title', 'description', 'tasks', 'budget', 'destinationUrl']
        },
        redirectToPlanning: {
          type: 'boolean',
          description: 'True if the user asked something off-topic and you are redirecting them to planning'
        }
      },
      required: ['message', 'extractedInfo', 'readyToGenerate']
    }
  }
  };
}

// ============================================================================
// MAIN PLANNER CLASS
// ============================================================================

export class SimpleConversationalPlanner {
  private llmProvider: LLMProvider;
  private providerName: 'openai' | 'claude' | 'gemini';

  constructor(provider: 'openai' | 'claude' | 'gemini' = 'gemini') {
    this.providerName = provider;

    // Default to Gemini for real-time grounding capabilities
    // Falls back to OpenAI if Gemini is not configured
    if (provider === 'gemini' && isGeminiConfigured()) {
      this.llmProvider = new GeminiProvider();
      console.log('[SIMPLE_PLANNER] Using Gemini provider with Google Search + Maps grounding');
    } else if (provider === 'claude') {
      this.llmProvider = new AnthropicProvider();
      console.log('[SIMPLE_PLANNER] Using Claude/Anthropic provider');
    } else {
      this.llmProvider = new OpenAIProvider();
      console.log('[SIMPLE_PLANNER] Using OpenAI provider');
    }
  }

  /**
   * Process a conversation turn
   */
  async processMessage(
    userId: string,
    userMessage: string,
    conversationHistory: ConversationMessage[],
    storage: IStorage,
    mode: 'quick' | 'smart' = 'quick',
    options?: {
      todaysTheme?: { themeId: string; themeName: string; } | null;
      userLocation?: { latitude: number; longitude: number; city?: string; };
    }
  ): Promise<PlanningResponse> {
    console.log(`[SIMPLE_PLANNER] Processing message for user ${userId} in ${mode} mode`);

    try {
      // 0. Detect and extract URLs from user message (runs in parallel with context gathering)
      const detectedUrls = extractUrlsFromMessage(userMessage);
      let urlExtractionResults: ExtractedUrlContent[] = [];

      if (detectedUrls.length > 0) {
        console.log(`[SIMPLE_PLANNER] 🔗 Detected ${detectedUrls.length} URL(s) in message`);

        // Process URLs in parallel (limit to first 3)
        const urlPromises = detectedUrls.slice(0, 3).map(async (url) => {
          if (!isSupportedSocialMediaUrl(url)) {
            console.log(`[SIMPLE_PLANNER] Skipping unsupported URL: ${url}`);
            return null;
          }
          try {
            return await this.extractAndFilterUrl(url, storage);
          } catch (error) {
            console.error(`[SIMPLE_PLANNER] URL extraction failed for ${url}:`, error);
            return null;
          }
        });

        const results = await Promise.all(urlPromises);
        urlExtractionResults = results.filter((r): r is ExtractedUrlContent => r !== null);

        if (urlExtractionResults.length > 0) {
          console.log(`[SIMPLE_PLANNER] ✅ Successfully extracted ${urlExtractionResults.length} URL(s)`);
        }
      }

      // 1. Gather user context (pass user message for smart extraction)
      const context = await this.gatherUserContext(userId, storage, userMessage);

      // Add URL extraction results to context
      context.extractedUrlContent = urlExtractionResults;

      // Add today's theme to context (if provided)
      if (options?.todaysTheme) {
        context.todaysTheme = options.todaysTheme;
        console.log(`[SIMPLE_PLANNER] 🎯 Today's theme: ${options.todaysTheme.themeName} (will apply: ${context.dateReference?.isTodayPlan !== false})`);
      }

      // Add user GPS location for Gemini Maps grounding
      if (options?.userLocation) {
        context.userLocation = options.userLocation;
        console.log(`[SIMPLE_PLANNER] 📍 User GPS location: ${options.userLocation.city || `${options.userLocation.latitude}, ${options.userLocation.longitude}`}`);
      }

      // 2. Build conversation history
      const messages = [
        ...conversationHistory,
        { role: 'user' as const, content: userMessage }
      ];

      // 3. Determine if this is the preview turn (when web_search should be enabled)
      const assistantMessageCount = conversationHistory.filter(m => m.role === 'assistant').length;
      const currentTurn = assistantMessageCount + 1;
      const isPreviewTurn = mode === 'quick' ? currentTurn >= 3 : currentTurn >= 4;

      // 4. Build system prompt with conditional safety enrichment
      const systemPrompt = buildSystemPrompt(context, mode, isPreviewTurn);

      // 5. Call LLM with full context
      const response = await this.llmProvider.generate(
        messages,
        systemPrompt,
        [getPlanningTool(mode)],
        context,
        mode
      );

      // Add clickable title and icon to response message if a plan was generated
      if (response.readyToGenerate && response.plan && response.plan.title) {
        const activityIcon = "🎯"; // Target/concentric circles icon
        const activityLink = `[${activityIcon} ${response.plan.title}](https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(response.plan.title)})`;
        
        if (!response.message.includes(response.plan.title)) {
          response.message = `${activityLink}\n\n${response.message}`;
        }
      }

      // Debug logging for preview troubleshooting
      console.log('[SIMPLE_PLANNER] LLM Response Debug:', {
        messageLength: response.message?.length,
        messagePreview: response.message?.substring(0, 300),
        hasPlan: !!response.plan,
        planTitle: response.plan?.title,
        planTaskCount: response.plan?.tasks?.length || 0,
        readyToGenerate: response.readyToGenerate,
        extractedInfoKeys: Object.keys(response.extractedInfo || {})
      });

      // 5. ENFORCE cumulative questionCount based on conversation turns
      // Don't trust AI to track this - calculate it based on user responses received
      const minimum = mode === 'quick' ? 5 : 10;
      
      // Count how many user messages have been sent (excluding the current one we just added)
      const userResponseCount = conversationHistory.filter(m => m.role === 'user').length;
      
      // Map user responses to cumulative question count based on batching schedule
      let enforcedQuestionCount = 0;
      if (mode === 'smart') {
        // Smart mode: 3+3+4 batching
        if (userResponseCount === 0) enforcedQuestionCount = 3;      // First response asks Q1-Q3
        else if (userResponseCount === 1) enforcedQuestionCount = 6; // Second response asks Q4-Q6
        else if (userResponseCount >= 2) enforcedQuestionCount = 10; // Third+ response asks Q7-Q10
      } else {
        // Quick mode: 3+2 batching
        if (userResponseCount === 0) enforcedQuestionCount = 3;      // First response asks Q1-Q3
        else if (userResponseCount >= 1) enforcedQuestionCount = 5;  // Second+ response asks Q4-Q5
      }
      
      // Override AI's questionCount with our enforced count
      const aiReportedCount = response.extractedInfo.questionCount || 0;
      const questionCount = enforcedQuestionCount;
      
      // Update extractedInfo with enforced count
      response.extractedInfo.questionCount = questionCount;
      
      console.log(`[SIMPLE_PLANNER] Question count: AI reported ${aiReportedCount}, enforced ${questionCount} (based on ${userResponseCount} user responses)`);

      // Check if user requested early generation, preview, or continue
      const latestUserMessage = messages[messages.length - 1]?.content || '';
      const createPlanTrigger = /\b(create plan|generate plan|make plan|make the plan|that's enough|let's do it|good to go|ready to generate|proceed|i'm ready)\b/i.test(latestUserMessage.toLowerCase());
      const previewTrigger = /\b(preview|show preview|preview plan|show me the plan|what does the plan look like)\b/i.test(latestUserMessage.toLowerCase());
      const continueTrigger = /\b(continue|go on|next|keep going|next question|more questions)\b/i.test(latestUserMessage.toLowerCase());

      // Date parsing fix: Ensure dates are valid Date objects
      if (response.plan) {
        if (response.plan.startDate && typeof response.plan.startDate === 'string') {
          const parsedStart = new Date(response.plan.startDate);
          if (!isNaN(parsedStart.getTime())) {
            response.plan.startDate = parsedStart;
          }
        }
        if (response.plan.endDate && typeof response.plan.endDate === 'string') {
          const parsedEnd = new Date(response.plan.endDate);
          if (!isNaN(parsedEnd.getTime())) {
            response.plan.endDate = parsedEnd;
          }
        }
      }

      // Handle preview request - show plan preview WITHOUT creating activity
      // This triggers early plan generation with web search enrichment
      if (previewTrigger && !response.readyToGenerate) {
        console.log(`[SIMPLE_PLANNER] 👁️ User requested preview - triggering plan preview with enrichment`);
        response.showPreview = true;

        // Check if AI generated a plan object but only a generic message
        // If so, format the plan object as markdown for display
        const hasGenericMessage = response.message.length < 300 ||
          !response.message.includes('##') ||
          response.message.toLowerCase().includes("here's a detailed plan") ||
          response.message.toLowerCase().includes("here is a detailed plan");

        if (response.plan && hasGenericMessage) {
          console.log(`[SIMPLE_PLANNER] 👁️ Formatting plan object as markdown (message was generic)`);
          const planMarkdown = formatPlanAsMarkdown(response.plan, context);
          if (planMarkdown && planMarkdown.length > 100) {
            response.message = planMarkdown;
          }
        }

        // Only add preview wrapper if message doesn't already have detailed headers
        const hasDetailedContent = response.message.includes('##') || response.message.includes('# ');

        if (hasDetailedContent) {
          // Already detailed, just add preview header
          response.message = `👁️ **Plan Preview** (based on what you've shared so far)\n\n---\n\n` +
            response.message +
            `\n\n---\n\n💡 This is a preview. Say **"create plan"** to finalize, or keep chatting to refine details.`;
        } else {
          // Generic message, wrap with context
          response.message = `👁️ **Plan Preview** (based on what you've shared so far)\n\n---\n\n` +
            response.message +
            `\n\n---\n\n💡 This is a preview. Say **"create plan"** to finalize, or keep chatting to refine details.`;
        }
      }

      // Handle continue request - ensure we continue with questions
      if (continueTrigger) {
        console.log(`[SIMPLE_PLANNER] ➡️ User requested continue`);
        // If the AI didn't ask questions, we need to prompt it to continue
        if (!response.message.includes('?')) {
          // Append a prompt to continue
          response.message += `\n\nLet me ask a few more questions to refine your plan:`;
        }
      }

      // User override: allow generation even if < minimum questions
      if (createPlanTrigger && !response.readyToGenerate) {
        console.log(`[SIMPLE_PLANNER] 🎯 User triggered "create plan" - generating with ${questionCount} questions`);
        response.readyToGenerate = true;

        // Add acknowledgment if early
        if (questionCount < minimum) {
          response.message += `\n\n✅ Got it! Creating your plan with the information provided...`;
        }
      }

      // Normal validation: enforce minimum unless user override
      if (response.readyToGenerate && questionCount < minimum && !createPlanTrigger) {
        console.log(`[SIMPLE_PLANNER] ⚠️ AI tried to generate plan early - only ${questionCount}/${minimum} questions asked (minimum not met)`);
        response.readyToGenerate = false;
        delete response.plan;
        
        // CRITICAL FIX: Strip any premature plan content from message
        // AI sometimes includes plan markdown even when instructed not to
        // Detect plan sections by looking for common plan headers
        const planHeaders = [
          /###?\s*(Workout|Exercise|Fitness|Training)\s*Routine/i,
          /###?\s*(Weekly|Daily)\s*Schedule/i,
          /###?\s*Timeline/i,
          /###?\s*(Budget|Cost)\s*Breakdown?/i,
          /###?\s*Additional\s*Recommendations?/i,
          /###?\s*Tips/i,
          /###?\s*Weather/i,
          /\*\*Weekly Schedule\*\*/i,
          /\*\*Monday[,:]/i,
          /\*\*Budget\*\*:/i
        ];
        
        const hasPlanContent = planHeaders.some(pattern => pattern.test(response.message));
        
        if (hasPlanContent) {
          console.log(`[SIMPLE_PLANNER] 🚫 Detected premature plan content in message - stripping it out`);
          
          // Find where the plan content starts (usually after a paragraph break before first header)
          let cleanMessage = response.message;
          
          // Try to find the first plan header
          let firstHeaderIndex = -1;
          for (const pattern of planHeaders) {
            const match = cleanMessage.match(pattern);
            if (match && match.index !== undefined) {
              if (firstHeaderIndex === -1 || match.index < firstHeaderIndex) {
                firstHeaderIndex = match.index;
              }
            }
          }
          
          if (firstHeaderIndex >= 0) {
            // Extract everything before the plan starts (or empty string if plan starts at index 0)
            cleanMessage = cleanMessage.substring(0, firstHeaderIndex).trim();
            
            // If the entire message was plan content (started with a header), replace with appropriate batch prompt
            if (cleanMessage.length === 0) {
              const nextBatch = mode === 'smart' 
                ? (questionCount < 6 ? '4-6' : '7-10')
                : '4-5';
              
              cleanMessage = `Let me ask you a few more questions to create the best plan:\n\n(You can say 'create plan' anytime if you'd like me to work with what we have!)`;
              console.log(`[SIMPLE_PLANNER] ✅ Entire message was plan content - replaced with question prompt`);
            } else {
              // There was some question content before the plan - keep it and add continuation
              cleanMessage += `\n\nThese details will help us build a comprehensive plan for your goal.\n\n(You can say 'create plan' anytime if you'd like me to work with what we have!)`;
              console.log(`[SIMPLE_PLANNER] ✅ Stripped plan content, kept questions`);
            }
            
            response.message = cleanMessage;
          }
        }
      } else if (response.readyToGenerate) {
        const trigger = createPlanTrigger ? ' (user-triggered)' : '';
        console.log(`[SIMPLE_PLANNER] ✅ Plan ready - ${questionCount}/${minimum} questions asked${trigger}, generating plan`);
      }

      // Progress tracking disabled per user request
      // Users found it confusing and it was causing localStorage persistence issues

      // 6. Add journal context to response for frontend display
      if (context.detectedLocation && context.recentJournal && context.recentJournal.length > 0) {
        response.journalContext = {
          found: true,
          count: context.recentJournal.length,
          location: context.detectedLocation,
          summaries: context.recentJournal.slice(0, 3).map(j =>
            j.text?.substring(0, 100) + (j.text && j.text.length > 100 ? '...' : '')
          ).filter(Boolean) as string[]
        };
        console.log(`[SIMPLE_PLANNER] 📔 Found ${context.recentJournal.length} journal entries about "${context.detectedLocation}"`);
      }

      // 7. Generate conversation hints to guide user
      if (!response.conversationHints || response.conversationHints.length === 0) {
        response.conversationHints = this.generateConversationHints(
          response.extractedInfo,
          mode,
          response.readyToGenerate,
          questionCount
        );
        console.log(`[SIMPLE_PLANNER] Generated ${response.conversationHints.length} conversation hints`);
      }

      // 8. Command hints are now shown as clickable buttons in the frontend
      // No longer adding text hints to responses

      // 9. Ensure first response has questions (fix empty first response issue)
      if (questionCount === 0 && !response.message.includes('?') && !response.readyToGenerate) {
        console.log(`[SIMPLE_PLANNER] ⚠️ First response has no questions - this should not happen`);
        // The AI prompt should handle this, but log for debugging
      }

      console.log(`[SIMPLE_PLANNER] Response generated - readyToGenerate: ${response.readyToGenerate}, domain: ${response.domain || response.extractedInfo.domain}`);
      return response;

    } catch (error) {
      console.error('[SIMPLE_PLANNER] Error processing message:', error);
      throw error;
    }
  }

  /**
   * Process a conversation turn with streaming
   */
  async processMessageStream(
    userId: string,
    userMessage: string,
    conversationHistory: ConversationMessage[],
    storage: IStorage,
    mode: 'quick' | 'smart' = 'quick',
    onToken: (token: string) => void,
    onProgress?: (phase: string, message: string) => void,
    options?: {
      todaysTheme?: { themeId: string; themeName: string; } | null;
    }
  ): Promise<PlanningResponse> {
    console.log(`[SIMPLE_PLANNER] Processing message with streaming for user ${userId} in ${mode} mode`);

    try {
      // 1. Gather user context (pass user message for smart extraction)
      const context = await this.gatherUserContext(userId, storage, userMessage);

      // Add today's theme to context (if provided)
      if (options?.todaysTheme) {
        context.todaysTheme = options.todaysTheme;
        console.log(`[SIMPLE_PLANNER] 🎯 Today's theme (stream): ${options.todaysTheme.themeName}`);
      }

      // 2. Build conversation history
      const messages = [
        ...conversationHistory,
        { role: 'user' as const, content: userMessage }
      ];

      // 3. Determine if this is the preview turn (when web_search should be enabled)
      const assistantMessageCount = conversationHistory.filter(m => m.role === 'assistant').length;
      const currentTurn = assistantMessageCount + 1;
      const isPreviewTurn = mode === 'quick' ? currentTurn >= 3 : currentTurn >= 4;

      // 4. Build system prompt with conditional safety enrichment
      const systemPrompt = buildSystemPrompt(context, mode, isPreviewTurn);

      // 5. Call LLM with streaming if available
      let response: PlanningResponse;
      
      if (this.llmProvider.generateStream) {
        response = await this.llmProvider.generateStream(
          messages,
          systemPrompt,
          [getPlanningTool(mode)],
          context,
          mode,
          onToken
        );
      } else {
        // Fallback to non-streaming
        response = await this.llmProvider.generate(
          messages,
          systemPrompt,
          [getPlanningTool(mode)],
          context,
          mode
        );
      }

      // Add clickable title and icon to response message if a plan was generated
      if (response.readyToGenerate && response.plan && response.plan.title) {
        const activityIcon = "🎯"; // Target/concentric circles icon
        const activityLink = `[${activityIcon} ${response.plan.title}](https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(response.plan.title)})`;
        
        if (!response.message.includes(response.plan.title)) {
          response.message = `${activityLink}\n\n${response.message}`;
        }
      }

      // Use AI's reported questionCount directly (same as non-streaming version)
      // AI is instructed to track cumulative questions across all batches in extractedInfo
      const minimum = mode === 'quick' ? 5 : 10;
      const questionCount = response.extractedInfo.questionCount || 0;

      // Check if user requested early generation, preview, or continue
      const latestUserMessage = messages[messages.length - 1]?.content || '';
      const createPlanTrigger = /\b(create plan|generate plan|make plan|make the plan|that's enough|let's do it|good to go|ready to generate|proceed|i'm ready)\b/i.test(latestUserMessage.toLowerCase());
      const previewTrigger = /\b(preview|show preview|preview plan|show me the plan|what does the plan look like)\b/i.test(latestUserMessage.toLowerCase());
      const continueTrigger = /\b(continue|go on|next|keep going|next question|more questions)\b/i.test(latestUserMessage.toLowerCase());

      // Date parsing fix: Ensure dates are valid Date objects
      if (response.plan) {
        if (response.plan.startDate && typeof response.plan.startDate === 'string') {
          const parsedStart = new Date(response.plan.startDate);
          if (!isNaN(parsedStart.getTime())) {
            response.plan.startDate = parsedStart;
          }
        }
        if (response.plan.endDate && typeof response.plan.endDate === 'string') {
          const parsedEnd = new Date(response.plan.endDate);
          if (!isNaN(parsedEnd.getTime())) {
            response.plan.endDate = parsedEnd;
          }
        }
      }

      // Handle preview request - show plan preview WITHOUT creating activity
      if (previewTrigger && !response.readyToGenerate) {
        console.log(`[SIMPLE_PLANNER_STREAM] 👁️ User requested preview - triggering plan preview with enrichment`);
        response.showPreview = true;

        // Check if AI generated a plan object but only a generic message
        const hasGenericMessage = response.message.length < 300 ||
          !response.message.includes('##') ||
          response.message.toLowerCase().includes("here's a detailed plan") ||
          response.message.toLowerCase().includes("here is a detailed plan");

        if (response.plan && hasGenericMessage) {
          console.log(`[SIMPLE_PLANNER_STREAM] 👁️ Formatting plan object as markdown (message was generic)`);
          const planMarkdown = formatPlanAsMarkdown(response.plan, context);
          if (planMarkdown && planMarkdown.length > 100) {
            response.message = planMarkdown;
          }
        }

        // Add preview wrapper
        const hasDetailedContent = response.message.includes('##') || response.message.includes('# ');
        response.message = `👁️ **Plan Preview** (based on what you've shared so far)\n\n---\n\n` +
          response.message +
          `\n\n---\n\n💡 This is a preview. Say **"create plan"** to finalize, or keep chatting to refine details.`;
      }

      // Handle continue request - ensure we continue with questions
      if (continueTrigger) {
        console.log(`[SIMPLE_PLANNER_STREAM] ➡️ User requested continue`);
        if (!response.message.includes('?')) {
          response.message += `\n\nLet me ask a few more questions to refine your plan:`;
        }
      }

      // User override: allow generation even if < minimum questions
      if (createPlanTrigger && !response.readyToGenerate) {
        console.log(`[SIMPLE_PLANNER_STREAM] 🎯 User triggered "create plan" - generating with ${questionCount} questions`);
        response.readyToGenerate = true;

        // Add acknowledgment if early
        if (questionCount < minimum) {
          response.message += `\n\n✅ Got it! Creating your plan with the information provided...`;
        }
      }

      // Normal validation: enforce minimum unless user override
      if (response.readyToGenerate && questionCount < minimum && !createPlanTrigger) {
        console.log(`[SIMPLE_PLANNER] ⚠️ AI tried to generate plan early - only ${questionCount}/${minimum} questions asked (minimum not met)`);
        response.readyToGenerate = false;
        delete response.plan;
        
        // CRITICAL FIX: Strip any premature plan content from message
        // AI sometimes includes plan markdown even when instructed not to
        // Detect plan sections by looking for common plan headers
        const planHeaders = [
          /###?\s*(Workout|Exercise|Fitness|Training)\s*Routine/i,
          /###?\s*(Weekly|Daily)\s*Schedule/i,
          /###?\s*Timeline/i,
          /###?\s*(Budget|Cost)\s*Breakdown?/i,
          /###?\s*Additional\s*Recommendations?/i,
          /###?\s*Tips/i,
          /###?\s*Weather/i,
          /\*\*Weekly Schedule\*\*/i,
          /\*\*Monday[,:]/i,
          /\*\*Budget\*\*:/i
        ];
        
        const hasPlanContent = planHeaders.some(pattern => pattern.test(response.message));
        
        if (hasPlanContent) {
          console.log(`[SIMPLE_PLANNER] 🚫 Detected premature plan content in message - stripping it out`);
          
          // Find where the plan content starts (usually after a paragraph break before first header)
          let cleanMessage = response.message;
          
          // Try to find the first plan header
          let firstHeaderIndex = -1;
          for (const pattern of planHeaders) {
            const match = cleanMessage.match(pattern);
            if (match && match.index !== undefined) {
              if (firstHeaderIndex === -1 || match.index < firstHeaderIndex) {
                firstHeaderIndex = match.index;
              }
            }
          }
          
          if (firstHeaderIndex >= 0) {
            // Extract everything before the plan starts (or empty string if plan starts at index 0)
            cleanMessage = cleanMessage.substring(0, firstHeaderIndex).trim();
            
            // If the entire message was plan content (started with a header), replace with appropriate batch prompt
            if (cleanMessage.length === 0) {
              const nextBatch = mode === 'smart' 
                ? (questionCount < 6 ? '4-6' : '7-10')
                : '4-5';
              
              cleanMessage = `Let me ask you a few more questions to create the best plan:\n\n(You can say 'create plan' anytime if you'd like me to work with what we have!)`;
              console.log(`[SIMPLE_PLANNER] ✅ Entire message was plan content - replaced with question prompt`);
            } else {
              // There was some question content before the plan - keep it and add continuation
              cleanMessage += `\n\nThese details will help us build a comprehensive plan for your goal.\n\n(You can say 'create plan' anytime if you'd like me to work with what we have!)`;
              console.log(`[SIMPLE_PLANNER] ✅ Stripped plan content, kept questions`);
            }
            
            response.message = cleanMessage;
          }
        }
      } else if (response.readyToGenerate) {
        const trigger = createPlanTrigger ? ' (user-triggered)' : '';
        console.log(`[SIMPLE_PLANNER] ✅ Plan ready - ${questionCount}/${minimum} questions asked${trigger}, generating plan`);
      }

      // Progress tracking disabled per user request
      // Users found it confusing and it was causing localStorage persistence issues

      // 6. Add journal context to response for frontend display (same as non-streaming)
      if (context.detectedLocation && context.recentJournal && context.recentJournal.length > 0) {
        response.journalContext = {
          found: true,
          count: context.recentJournal.length,
          location: context.detectedLocation,
          summaries: context.recentJournal.slice(0, 3).map(j =>
            j.text?.substring(0, 100) + (j.text && j.text.length > 100 ? '...' : '')
          ).filter(Boolean) as string[]
        };
        console.log(`[SIMPLE_PLANNER_STREAM] 📔 Found ${context.recentJournal.length} journal entries about "${context.detectedLocation}"`);
      }

      // 7. Generate conversation hints to guide user
      if (!response.conversationHints || response.conversationHints.length === 0) {
        response.conversationHints = this.generateConversationHints(
          response.extractedInfo,
          mode,
          response.readyToGenerate,
          questionCount
        );
        console.log(`[SIMPLE_PLANNER_STREAM] Generated ${response.conversationHints.length} conversation hints`);
      }

      // 8. Command hints are now shown as clickable buttons in the frontend
      // No longer adding text hints to responses

      // 9. Ensure first response has questions (fix empty first response issue)
      if (questionCount === 0 && !response.message.includes('?') && !response.readyToGenerate) {
        console.log(`[SIMPLE_PLANNER_STREAM] ⚠️ First response has no questions - this should not happen`);
      }

      return response;
    } catch (error) {
      console.error('[SIMPLE_PLANNER] Error processing streaming message:', error);
      throw error;
    }
  }

  /**
   * Extract location from user message using regex patterns
   */
  private extractLocationFromMessage(userMessage: string): string | null {
    const patterns = [
      /(?:in|at|to|for|near|around)\s+([A-Z][a-zA-Z\s]+(?:,\s*[A-Z]{2})?)/,
      /(?:visit|trip to|going to|planning for|traveling to|heading to)\s+([A-Z][a-zA-Z\s]+)/,
      /(?:weekend in|vacation in|holiday in|getaway to)\s+([A-Z][a-zA-Z\s]+)/i,
    ];

    for (const pattern of patterns) {
      const match = userMessage.match(pattern);
      if (match && match[1]) {
        const location = match[1].trim();
        // Filter out common false positives
        if (location.length > 2 && !['the', 'a', 'an', 'my', 'our'].includes(location.toLowerCase())) {
          console.log(`[CONTEXT] Detected location from message: "${location}"`);
          return location;
        }
      }
    }

    return null;
  }

  /**
   * Extract budget from user message using regex patterns
   */
  private extractBudgetFromMessage(userMessage: string): number | null {
    const patterns = [
      /\$(\d+(?:,\d{3})*(?:\.\d{2})?)/,
      /(\d+(?:,\d{3})*)\s*(?:dollars|bucks|USD|usd)/i,
      /budget\s+(?:of|is|around|about)?\s*\$?(\d+(?:,\d{3})*)/i,
      /(\d+(?:,\d{3})*)\s*dollar\s+budget/i,
    ];

    for (const pattern of patterns) {
      const match = userMessage.match(pattern);
      if (match && match[1]) {
        const amount = match[1].replace(/,/g, '');
        const budget = parseFloat(amount);
        if (!isNaN(budget) && budget > 0) {
          console.log(`[CONTEXT] Detected budget from message: $${budget}`);
          return budget;
        }
      }
    }

    return null;
  }

  /**
   * Scan journal for location-specific entries
   */
  private async scanJournalForLocation(
    userId: string,
    location: string,
    storage: IStorage
  ): Promise<JournalEntry[]> {
    try {
      const allJournal = await storage.getUserJournalEntries(userId, 30); // Last 30 days

      if (!allJournal || allJournal.length === 0) {
        return [];
      }

      const locationLower = location.toLowerCase();
      const relevant = allJournal.filter(entry =>
        entry.text?.toLowerCase().includes(locationLower) ||
        (entry as any).location?.toLowerCase().includes(locationLower)
      );

      if (relevant.length > 0) {
        console.log(`[CONTEXT] Found ${relevant.length} journal entries mentioning "${location}"`);
      }

      return relevant;
    } catch (error) {
      console.error('[CONTEXT] Error scanning journal for location:', error);
      return [];
    }
  }

  /**
   * Generate contextual conversation hints to guide user
   */
  private generateConversationHints(
    extractedInfo: Record<string, any>,
    mode: 'quick' | 'smart',
    readyToGenerate: boolean,
    questionCount: number
  ): string[] {
    const hints: string[] = [];

    // If plan is ready to generate
    if (readyToGenerate) {
      hints.push("Yes, create it!");
      hints.push("Make some changes");
      hints.push("Start over");
      return hints;
    }

    // Default helpful hints based on conversation state
    const hasLocation = extractedInfo.location || extractedInfo.destination;
    const hasBudget = extractedInfo.budget;
    const hasDate = extractedInfo.date || extractedInfo.startDate || extractedInfo.when;

    // Early stage hints
    if (questionCount < 3) {
      hints.push("Continue");
      hints.push("I don't know");
      hints.push("Skip this question");
    } else {
      // Mid-stage hints
      hints.push("Continue");
      hints.push("That's all I know");
      if (mode === 'quick') {
        hints.push("Create plan now");
      }
    }

    // Context-specific suggestions
    if (!hasLocation && questionCount > 1) {
      hints.push("Use my current location");
    }

    if (!hasBudget && questionCount > 2) {
      hints.push("Flexible budget");
    }

    if (!hasDate && questionCount > 2) {
      hints.push("This weekend");
    }

    return hints.slice(0, 5); // Limit to 5 hints for clean UI
  }

  /**
   * Extract and filter content from a URL
   */
  private async extractAndFilterUrl(
    url: string,
    storage: IStorage
  ): Promise<ExtractedUrlContent | null> {
    const normalizedUrl = normalizeUrlForCache(url);
    const platform = socialMediaVideoService.detectPlatform(url);

    if (!platform) {
      console.log(`[SIMPLE_PLANNER] URL not a supported social media platform: ${url}`);
      return null;
    }

    console.log(`[SIMPLE_PLANNER] Extracting ${platform} content from: ${url}`);
    const startTime = Date.now();

    // Step 1: Check cache
    try {
      const cached = await storage.getUrlContentCache(normalizedUrl);
      if (cached && !process.env.BYPASS_CACHE) {
        console.log(`[SIMPLE_PLANNER] Cache HIT for URL: ${normalizedUrl}`);

        // Even cached content goes through filtering
        const filteredContent = await transcriptFilterService.filterAndWeightContent({
          platform,
          url,
          audioTranscript: cached.metadata?.hasAudioTranscript ? cached.extractedContent : undefined,
          ocrText: cached.metadata?.hasOcrText ? cached.extractedContent : undefined,
          caption: cached.extractedContent,
          cached: true
        });

        return {
          url,
          platform,
          filteredContent,
          rawWordCount: cached.wordCount || 0,
          cached: true
        };
      }
    } catch (cacheError) {
      console.warn('[SIMPLE_PLANNER] Cache lookup failed:', cacheError);
    }

    // Step 2: Extract fresh content
    try {
      const socialResult = await socialMediaVideoService.extractContent(url);

      if (!socialResult.success) {
        console.warn(`[SIMPLE_PLANNER] Extraction failed: ${socialResult.error}`);
        return null;
      }

      // Step 3: Filter and classify content
      const filteredContent = await transcriptFilterService.filterAndWeightContent({
        platform: socialResult.platform,
        url: socialResult.url,
        audioTranscript: socialResult.audioTranscript,
        ocrText: socialResult.ocrText,
        caption: socialResult.caption
      });

      // Step 4: Cache the extraction
      const rawWordCount = filteredContent.rawWordCount;
      const combinedContent = [
        socialResult.caption,
        socialResult.audioTranscript,
        socialResult.ocrText
      ].filter(Boolean).join('\n\n');

      try {
        await storage.createUrlContentCache({
          normalizedUrl,
          originalUrl: url,
          platform,
          extractedContent: combinedContent.substring(0, 15000), // Limit size
          extractionSource: 'conversational_planner',
          wordCount: rawWordCount,
          metadata: {
            hasAudioTranscript: !!socialResult.audioTranscript,
            hasOcrText: !!socialResult.ocrText,
            contentType: filteredContent.contentType,
            entityCount: filteredContent.entities.length
          }
        });
        console.log(`[SIMPLE_PLANNER] Cached extraction for: ${normalizedUrl}`);
      } catch (cacheError) {
        console.warn('[SIMPLE_PLANNER] Cache write failed:', cacheError);
      }

      const elapsed = Date.now() - startTime;
      console.log(`[SIMPLE_PLANNER] URL extraction completed in ${elapsed}ms`);

      return {
        url,
        platform,
        filteredContent,
        rawWordCount,
        cached: false
      };

    } catch (error) {
      console.error(`[SIMPLE_PLANNER] URL extraction error:`, error);
      return null;
    }
  }

  /**
   * Gather full user context for personalization
   */
  private async gatherUserContext(
    userId: string,
    storage: IStorage,
    userMessage?: string // NEW: Optional user message for smart extraction
  ): Promise<PlanningContext> {
    try {
      const [user, profile, preferences] = await Promise.all([
        storage.getUser(userId),
        storage.getUserProfile(userId),
        storage.getUserPreferences(userId),
      ]);

      if (!user) {
        throw new Error(`User ${userId} not found`);
      }

      let recentJournal: JournalEntry[] = [];
      let journalInsights: JournalSearchResult[] = [];
      let detectedLocation: string | null = null;
      let detectedBudget: number | null = null;
      let detectedDomain: string = 'other';
      let dateReference: DateReference | undefined;

      // Smart extraction from user message if provided
      if (userMessage) {
        detectedLocation = this.extractLocationFromMessage(userMessage);
        detectedBudget = this.extractBudgetFromMessage(userMessage);
        detectedDomain = detectDomainFromMessage(userMessage);
        // NEW: Detect if plan is for today or future (for theme application)
        dateReference = parseDateReference(userMessage, user?.timezone || undefined);
        console.log(`[SIMPLE_PLANNER] 📅 Date reference: ${dateReference.isTodayPlan ? 'TODAY' : 'FUTURE'} (confidence: ${dateReference.confidence}, phrase: "${dateReference.matchedPhrase || 'none'}")`);
      }

      // NEW: Domain-based journal search for personalization
      if (detectedDomain && detectedDomain !== 'other') {
        const relevantCategories = DOMAIN_TO_JOURNAL_CATEGORIES[detectedDomain] || [];
        if (relevantCategories.length > 0) {
          try {
            journalInsights = await storage.searchJournalByCategories(userId, relevantCategories, {
              location: detectedLocation || undefined,
              limit: 10
            });
            console.log(`[SIMPLE_PLANNER] 📔 Found ${journalInsights.length} journal insights for domain "${detectedDomain}" (categories: ${relevantCategories.join(', ')})`);
          } catch (err) {
            console.warn('[SIMPLE_PLANNER] Journal search failed:', err);
          }
        }
      }

      // Scan journal with location priority (for mood/reflection context)
      if (detectedLocation) {
        // User mentioned a location - scan journal for that specific location
        recentJournal = await this.scanJournalForLocation(userId, detectedLocation, storage);
      } else {
        // No location mentioned - get recent journal entries (last 7 days)
        recentJournal = await storage.getUserJournalEntries(userId, 7) || [];
      }

      // Determine fallback location from profile
      const fallbackLocation = user.location || (profile as any)?.location;

      return {
        user,
        profile: profile || undefined,
        preferences: preferences || undefined,
        recentJournal,
        journalInsights,
        detectedLocation,
        detectedBudget,
        detectedDomain,
        fallbackLocation,
        dateReference,
      };
    } catch (error) {
      console.error('[SIMPLE_PLANNER] Error gathering user context:', error);
      throw error;
    }
  }

  /**
   * Validate essential fields dynamically based on LLM's question tracking
   * No hardcoded domain logic - relies on LLM's questionCount
   * Quick mode: 3 minimum questions
   * Smart mode: 5 minimum questions
   */
  private validateEssentialFields(
    extractedInfo: Record<string, any>,
    mode: 'quick' | 'smart' = 'smart'
  ): {
    gathered: number;
    total: number;
    missing: string[];
    priority1Gathered: number;
    priority1Total: number;
  } {
    const minimum = mode === 'quick' ? 5 : 10;
    const questionCount = extractedInfo.questionCount || 0;

    // Dynamic validation: LLM tracks questions, we just validate minimum met
    const gathered = Math.min(questionCount, minimum);
    const missing: string[] = [];

    // If questionCount < minimum, mark as missing questions
    if (questionCount < minimum) {
      const remaining = minimum - questionCount;
      for (let i = 0; i < remaining; i++) {
        missing.push(`question_${questionCount + i + 1}`);
      }
    }

    return {
      gathered,
      total: minimum,
      missing,
      priority1Gathered: gathered,
      priority1Total: minimum
    };
  }

  /**
   * Switch LLM provider
   */
  setProvider(provider: 'openai' | 'claude' | 'gemini') {
    this.llmProvider = provider === 'claude'
      ? new AnthropicProvider()
      : provider === 'gemini'
        ? new GeminiProvider()
        : new OpenAIProvider();
    console.log(`[SIMPLE_PLANNER] Switched to ${provider} provider`);
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

const provider = (process.env.LLM_PROVIDER || (isGeminiConfigured() ? 'gemini' : 'openai')) as 'openai' | 'claude' | 'gemini';
export const simpleConversationalPlanner = new SimpleConversationalPlanner(provider);
export { globalSearchCache };

console.log(`[SIMPLE_PLANNER] Initialized with ${provider} provider`);
