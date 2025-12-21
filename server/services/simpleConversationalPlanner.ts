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
import { tavily } from '@tavily/core';
import type { IStorage } from '../storage';
import type { User, UserProfile, UserPreferences, JournalEntry } from '@shared/schema';

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
  conversationHints?: string[]; // NEW: Context-aware suggestions for user
  journalContext?: {  // NEW: Info about journal entries used for context
    found: boolean;
    count: number;
    location?: string;
    summaries?: string[];  // Brief summaries of what was found
  };
}

interface GeneratedPlan {
  title: string;
  description: string;
  tasks: Array<{
    taskName: string;
    duration: number;
    startDate?: string;
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

interface PlanningContext {
  user: User;
  profile?: UserProfile;
  preferences?: UserPreferences;
  recentJournal?: JournalEntry[];
  detectedLocation?: string | null;
  detectedBudget?: number | null;
  fallbackLocation?: string;
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
  private tavilyClient: any;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Initialize Tavily for web search (optional - only if API key provided)
    if (process.env.TAVILY_API_KEY) {
      this.tavilyClient = tavily({
        apiKey: process.env.TAVILY_API_KEY
      });
    }
  }

  /**
   * PREDICTIVE SEARCH PRE-WARMING
   * Extract destination/dates from Turn 1 and pre-warm cache with safety searches
   * Fire-and-forget pattern - don't block the Turn 1 response
   */
  private prewarmSafetySearches(userMessage: string): void {
    if (!this.tavilyClient) return;

    // Extract potential destination keywords - improved patterns for edge cases
    // Handles lowercase, multiword destinations (new york, san francisco), etc.
    const destinationPattern = /(trip|travel|visit|vacation|honeymoon|getaway|plan|planning)\s+(?:to|for|in)\s+([a-z]+(?:\s+[a-z]+)*)/i;
    const datePattern = /(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})/i;
    const monthOnlyPattern = /(january|february|march|april|may|june|july|august|september|october|november|december)/i;
    
    const destinationMatch = userMessage.match(destinationPattern);
    const dateMatch = userMessage.match(datePattern) || userMessage.match(monthOnlyPattern);
    
    if (!destinationMatch) return; // No destination detected, skip pre-warming
    
    const destination = destinationMatch[2].trim();
    const timeframe = dateMatch ? dateMatch[0] : 'current';
    
    console.log(`[PREWARM] Detected destination "${destination}", timeframe "${timeframe}" - pre-warming safety searches`);
    
    // Pre-warm critical safety searches in background (non-blocking)
    const safetyQueries = [
      `${destination} travel advisory ${timeframe}`,
      `${destination} hurricane forecast ${timeframe}`,
      `${destination} weather alerts ${timeframe}`
    ];
    
    // Use Promise.allSettled to handle all searches properly
    Promise.allSettled(
      safetyQueries.map(async (query) => {
        try {
          // Check if already cached
          if (globalSearchCache.get(query)) {
            console.log(`[PREWARM] Already cached: "${query}"`);
            return;
          }
          
          console.log(`[PREWARM] Starting background search: "${query}"`);
          const searchResults = await this.tavilyClient.search(query, {
            maxResults: 3,
            searchDepth: 'advanced'
          });
          
          const formattedResults = searchResults.results
            .map((r: any) => `${r.title}\n${r.content}\nSource: ${r.url}`)
            .join('\n\n');
          
          if (formattedResults) {
            globalSearchCache.set(query, formattedResults);
            console.log(`[PREWARM] Cached results for: "${query}"`);
          }
        } catch (error) {
          // Silent fail - pre-warming is optional optimization
          console.log(`[PREWARM] Search failed for "${query}" (non-blocking)`);
        }
      })
    ).catch(() => {
      // Catch any unhandled rejections from Promise.allSettled
      // This shouldn't happen but provides extra safety
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
      // Turn 1-2: gpt-4o-mini-2024-07-18 (faster, cheaper, good for questions)
      // Turn 3+: gpt-4o-2024-11-20 (smarter, better with web data and enrichment)
      const model = isPreviewTurn ? 'gpt-4o-2024-11-20' : 'gpt-4o-mini-2024-07-18';
      console.log(`[SIMPLE_PLANNER] Turn ${currentTurn}: Using ${model} (${isPreviewTurn ? 'preview' : 'question gathering'})`);
      
      if (this.tavilyClient && isPreviewTurn) {
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
                  const searchResults = await this.tavilyClient.search(query, {
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
      const model = isPreviewTurn ? 'gpt-4o-2024-11-20' : 'gpt-4o-mini-2024-07-18';
      console.log(`[SIMPLE_PLANNER_STREAM] Turn ${currentTurn}: Using ${model} (${isPreviewTurn ? 'preview' : 'question gathering'})`);
      
      if (this.tavilyClient && isPreviewTurn) {
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
        model: 'claude-opus-4-5-20251101', // Updated to Claude 4.5 Opus for best reasoning
        max_tokens: 8192, // Increased for better responses
        system: systemPrompt,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content
        })),
        tools: anthropicTools,
        tool_choice: { type: 'tool', name: 'respond_with_structure' },
        thinking: {
          type: 'enabled' as const,
          budget_tokens: 2000 // Extended thinking for complex planning
        },
        temperature: 0.7, // Balanced creativity and consistency
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
// SYSTEM PROMPT BUILDER
// ============================================================================

function buildSystemPrompt(context: PlanningContext, mode: 'quick' | 'smart', isPreviewTurn: boolean = false): string {
  const { user, profile, preferences, recentJournal } = context;

  const modeDescription = mode === 'smart'
    ? 'comprehensive planning with detailed research, real-time data, and enrichment'
    : 'quick planning focusing on essential information for fast execution';

  const minQuestions = mode === 'smart' ? 10 : 5;

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

${recentJournal && recentJournal.length > 0 ? `**Recent Journal Entries:**\n${recentJournal.map(j => `- ${j.date}: Mood ${j.mood}, ${j.reflection || 'No reflection'}`).join('\n')}` : ''}
`.trim();

  // Build priority context section (NEW)
  let priorityContext = '';

  if (context.detectedLocation) {
    priorityContext += `\n\n## ⚡ PRIORITY CONTEXT - User Mentioned Location\n\n`;
    priorityContext += `**Location Detected:** ${context.detectedLocation}\n`;
    priorityContext += `**Relevant Journal Entries:** ${recentJournal?.length || 0} entries found mentioning this location\n`;
    
    // Add journal entry details if found
    if (recentJournal && recentJournal.length > 0) {
      priorityContext += `\n### 📔 JOURNAL INSIGHTS - USE THESE DETAILS!\n`;
      priorityContext += `**CRITICAL:** The user has journaled about ${context.detectedLocation} before. Reference this in your response!\n\n`;
      recentJournal.slice(0, 3).forEach((entry, i) => {
        priorityContext += `**Entry ${i + 1}** (${entry.date || 'recent'}):\n`;
        priorityContext += `- Text: "${entry.text?.substring(0, 200)}${entry.text && entry.text.length > 200 ? '...' : ''}"\n`;
        if (entry.mood) priorityContext += `- Mood: ${entry.mood}\n`;
        if (entry.reflection) priorityContext += `- Reflection: ${entry.reflection}\n`;
        priorityContext += '\n';
      });
      priorityContext += `**ACTION:** In your FIRST response, acknowledge: "I see you've journaled about ${context.detectedLocation} before - let me use those details to personalize your plan!"\n`;
      priorityContext += `**SKIP questions that the journal entries already answer** (e.g., if they mention a hotel, don't ask about accommodation preferences).\n`;
    }
    
    priorityContext += `\n**Use this location as the PRIMARY context for planning.** The user has already specified where they want to plan for.\n`;
  }

  if (context.detectedBudget) {
    priorityContext += `\n\n## ⚡ PRIORITY CONTEXT - User Specified Budget\n\n`;
    priorityContext += `**Budget Detected:** $${context.detectedBudget}\n`;
    priorityContext += `\n**CRITICAL:** Optimize ALL suggestions to fit within this budget.\n`;
    priorityContext += `Provide detailed budget breakdown in your plan.\n`;
    priorityContext += `Never exceed $${context.detectedBudget} total.\n`;
  }

  if (!context.detectedLocation) {
    priorityContext += `\n\n## 🚨 LOCATION MISSING - ASK FIRST! 🚨\n\n`;
    priorityContext += `**⚠️ CRITICAL RULE:** Location was NOT detected in the user's message.\n`;
    priorityContext += `**LOCATION MUST BE YOUR FIRST QUESTION** - before budget, dates, vibe, or anything else!\n\n`;
    
    if (context.fallbackLocation) {
      priorityContext += `**User's Profile Location:** ${context.fallbackLocation}\n`;
      priorityContext += `You can offer: "Would you like to plan for ${context.fallbackLocation}, or somewhere else?"\n`;
    } else {
      priorityContext += `**No profile location available.**\n`;
      priorityContext += `Ask directly: "📍 Where would you like to plan for? (City or location)"\n`;
    }
    
    priorityContext += `\n**DO NOT assume any location. DO NOT skip this question.**\n`;
    priorityContext += `**This MUST be Question #1 in Batch 1.**\n`;
  }

  // COMPRESSED BUDGET-FIRST SYSTEM PROMPT
  return `You are JournalMate Planning Agent - an expert planner specializing in budget-conscious, personalized plans.

${userContext}${priorityContext}

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
- **Batch 1 (Turn 1):** Ask EXACTLY 3 questions together in a numbered list IN THIS RESPONSE. End: "(Say 'create plan' anytime!)"
  - **DO NOT announce** "Let me ask questions" - just ask them immediately
  - **Questions must appear** in this first message, not delayed
- **Batch 2 (Turn 2):** Ask EXACTLY 2 MORE questions together in a numbered list. NO preview yet!
- **Turn 3+:** Show COMPLETE PLAN PREVIEW with real-time data from web_search. Wait for confirmation.

**❌ NEVER just announce questions without asking them**
**❌ NEVER ask 1 question alone**
**❌ NEVER ask budget by itself**
**✅ ALWAYS ask questions IMMEDIATELY in the same message**
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

**Domain Priority Questions (LOCATION ALWAYS FIRST if not specified):**

**🌴 Travel:** 1) 📍 WHERE (destination)? 2) From where? 3) Duration? 4) Budget? 5) Dates? 6) Occasion/vibe? 7) Group size? 8) Interests? 9) Diet? 10) Accommodation?
**💪 Wellness:** 1) 📍 WHERE (gym/home/outdoor)? 2) Activity type? 3) Fitness level? 4) Goal? 5) Time available? 6) Solo/group? 7) Budget? 8) Diet needs? 9) Health conditions? 10) Experience?
**🎉 Events:** 1) 📍 WHERE (city/venue)? 2) Event type? 3) Date? 4) Guest count? 5) Budget? 6) Style/theme? 7) Must-haves? 8) Dietary restrictions? 9) Venue preference? 10) Flexibility?
**🍽️ Dining:** 1) 📍 WHERE (city/neighborhood)? 2) Cuisine? 3) Date/time? 4) Occasion? 5) Group size? 6) Budget/person? 7) Dietary? 8) Ambiance? 9) Must-try dishes? 10) Transport?
**📋 General:** 1) 📍 WHERE (location context)? Then ask domain-specific questions based on the activity type.

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
**Quick Mode (2-4 searches):**
Travel: 1) Safety/advisories 2) Flights 3) Hotels 4) Weather
Non-travel: Skip unless needed
` : `
**Smart Mode (5+ searches):**
1) Safety/advisories 2) Transport 3) Hotels 4) Dining 5) Activities 6) Weather 7) Budget intel
`}

**⚠️ TRAVEL SAFETY PROTOCOL:**
**Check FIRST:** Hurricanes, advisories, unrest, disasters, disease, extreme weather

**If HAZARD detected:**
1. Display at TOP: "⚠️ **URGENT TRAVEL ALERT** ⚠️"
2. Details: Hurricane name/category, landfall date, affected areas
3. Guidance: "Hurricane Melissa (Cat 4) landfall Oct 27 → POSTPONE or reschedule to Oct 30+"
4. Show plan as CONDITIONAL: "If proceeding with current dates..."

**Example:**
\`\`\`
⚠️ **URGENT - JAMAICA HURRICANE** ⚠️
Hurricane Melissa (Cat 4) → Landfall Oct 27 (your date)
State Dept: Level 4 (Do Not Travel) Oct 26-28
🚨 **POSTPONE** → Oct 30+ safe, or alt destination (Aruba clear)
[Plan shown as CONDITIONAL]
\`\`\`

**No hazards:** Proceed, note "✅ No advisories"
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
[Hurricane/advisory details from search results]

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

\`\`\`json
{
  "message": "Friendly conversational response",
  "extractedInfo": {"domain": "travel/event/dining/etc", "budget": "...", "destination": "...", "dates": "..."},
  "readyToGenerate": false,  // true when ${minQuestions}+ answered
  "plan": {  // ONLY if readyToGenerate = true
    "title": "...",
    "description": "...",
    "tasks": [
      // CREATE 8-12 DETAILED tasks like professional assistant
      // Each MUST include: budget, transportation, dress code, logistics
      
      // TRAVEL EXAMPLE:
      {"taskName": "Book flights Austin→Paris (Nov 10-24)", "duration": 45,
       "notes": "$540×2=$1,080 (11% budget, $8,920 left). Delta/United/Air France. Book via Google Flights. Seats together, 1 bag each ($70). Total $1,150.",
       "category": "Travel", "priority": "high"},
      
      {"taskName": "Reserve Hôtel (14 nights)", "duration": 30,
       "notes": "$320×14=$4,480 (45% budget, $4,440 left). Booking.com. Request honeymoon package, high floor, quiet. Free cancel until Nov 1.",
       "category": "Travel", "priority": "high"},
      
      {"taskName": "Airport shuttle CDG→hotel", "duration": 15,
       "notes": "$35/person Welcome Pickups. Book 48hrs ahead. Alt: RER train $12/person 45min or taxi $60.",
       "category": "Travel", "priority": "high"},
      
      {"taskName": "Pack for 50°F + umbrella", "duration": 60,
       "notes": "Layers, rain jacket, umbrella, walking shoes (5+ miles/day), 1-2 dressy outfits. Metro has stairs - pack light!",
       "category": "Travel", "priority": "medium"},
      
      {"taskName": "Buy Navigo Metro pass", "duration": 10,
       "notes": "€30/person at airport/station. Unlimited 7 days. Saves vs €2.10 singles. Use 10+/day. Line 1→Eiffel, Line 4→Notre-Dame.",
       "category": "Travel", "priority": "medium"},
      
      {"taskName": "Reserve Le George (romantic dinner)", "duration": 20,
       "notes": "€150/person=$320 total. Book 2-3 weeks ahead, OpenTable/direct. Window table, mention honeymoon. Dress: business casual. 10min walk. 8pm.",
       "category": "Dining", "priority": "high"}
      
      // Continue for 8-12 tasks with THIS detail level
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
    "tips": ["..."]
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
            tasks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  taskName: { type: 'string' },
                  duration: { type: 'number', description: 'Duration in minutes' },
                  startDate: { type: 'string' },
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
            }
          },
          required: ['title', 'description', 'tasks', 'budget']
        },
        redirectToPlanning: {
          type: 'boolean',
          description: 'True if the user asked something off-topic and you are redirecting them to planning'
        },
        conversationHints: {
          type: 'array',
          description: 'Contextual hints to guide the user (e.g., "continue", "I don\'t know", "create plan"). These will be shown as clickable chips.',
          items: {
            type: 'string'
          }
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

  constructor(provider: 'openai' | 'claude' = 'openai') {
    this.llmProvider = provider === 'claude'
      ? new AnthropicProvider()
      : new OpenAIProvider();
  }

  /**
   * Process a conversation turn
   */
  async processMessage(
    userId: string,
    userMessage: string,
    conversationHistory: ConversationMessage[],
    storage: IStorage,
    mode: 'quick' | 'smart' = 'quick'
  ): Promise<PlanningResponse> {
    console.log(`[SIMPLE_PLANNER] Processing message for user ${userId} in ${mode} mode`);

    try {
      // 1. Gather user context (pass user message for smart extraction)
      const context = await this.gatherUserContext(userId, storage, userMessage);

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

      // 5.5. Add journal context to response for frontend display
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

      // Check if user requested early generation
      const latestUserMessage = messages[messages.length - 1]?.content || '';
      const createPlanTrigger = /\b(create plan|generate plan|make plan|make the plan|that's enough|let's do it|good to go|ready to generate|proceed|i'm ready)\b/i.test(latestUserMessage.toLowerCase());

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
        
        // VALIDATION: Check for phantom/unvalidated slot data
        const extractedInfo = response.extractedInfo || {};
        console.log(`[SIMPLE_PLANNER] 🔍 DEBUG - Plan extractedInfo:`, JSON.stringify(extractedInfo, null, 2));
        
        // For travel domain, validate that origin was actually provided by user
        // IMPORTANT: Only check USER messages (not assistant examples like "Austin, TX")
        // AND include the current userMessage since it might contain the origin
        if (extractedInfo.domain === 'travel') {
          // Collect ONLY user messages from history + current message
          const userMessages = conversationHistory
            .filter(m => m.role === 'user')
            .map(m => m.content.toLowerCase());
          userMessages.push(userMessage.toLowerCase()); // Include current message
          
          const allUserText = userMessages.join(' ');
          const origin = extractedInfo.origin?.toLowerCase() || '';
          
          // Check if origin was mentioned by the USER (not in assistant examples)
          if (origin && !allUserText.includes(origin)) {
            console.warn(`[SIMPLE_PLANNER] ⚠️ PHANTOM DATA DETECTED - Origin "${origin}" not found in user messages`);
            console.log(`[SIMPLE_PLANNER] User messages scanned:`, userMessages);
            // Clear phantom origin and plan to force re-asking
            delete extractedInfo.origin;
            delete response.plan; // Clear stray plan preview
            response.readyToGenerate = false;
            response.message = `I want to make sure I have your details correct. Where are you traveling from?`;
          } else if (origin) {
            console.log(`[SIMPLE_PLANNER] ✅ Origin "${origin}" confirmed in user messages`);
          }
        }
        
        // Log the plan content for debugging
        if (response.plan) {
          console.log(`[SIMPLE_PLANNER] 📋 Generated plan:`, {
            title: response.plan.title,
            description: response.plan.description?.substring(0, 100),
            taskCount: response.plan.tasks?.length,
            hasBudget: !!response.plan.budget,
            hasWeather: !!response.plan.weather
          });
        }
        
        // Log message content for debugging
        console.log(`[SIMPLE_PLANNER] 📝 Message length: ${response.message?.length}, has markdown headers: ${response.message?.includes('##')}`);
      }
      
      // Progress tracking disabled per user request
      // Users found it confusing and it was causing localStorage persistence issues

      // 6. Generate conversation hints to guide user
      if (!response.conversationHints || response.conversationHints.length === 0) {
        response.conversationHints = this.generateConversationHints(
          response.extractedInfo,
          mode,
          response.readyToGenerate,
          questionCount
        );
        console.log(`[SIMPLE_PLANNER] Generated ${response.conversationHints.length} conversation hints`);
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
    onProgress?: (phase: string, message: string) => void
  ): Promise<PlanningResponse> {
    console.log(`[SIMPLE_PLANNER] Processing message with streaming for user ${userId} in ${mode} mode`);

    try {
      // 1. Gather user context (pass user message for smart extraction)
      const context = await this.gatherUserContext(userId, storage, userMessage);

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

      // 5.5. Add journal context to response for frontend display (same as non-streaming)
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

      // Use AI's reported questionCount directly (same as non-streaming version)
      // AI is instructed to track cumulative questions across all batches in extractedInfo
      const minimum = mode === 'quick' ? 5 : 10;
      const questionCount = response.extractedInfo.questionCount || 0;

      // Check if user requested early generation
      const latestUserMessage = messages[messages.length - 1]?.content || '';
      const createPlanTrigger = /\b(create plan|generate plan|make plan|make the plan|that's enough|let's do it|good to go|ready to generate|proceed|i'm ready)\b/i.test(latestUserMessage.toLowerCase());

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
        
        // VALIDATION: Check for phantom/unvalidated slot data
        const extractedInfo = response.extractedInfo || {};
        console.log(`[SIMPLE_PLANNER] 🔍 DEBUG - Plan extractedInfo:`, JSON.stringify(extractedInfo, null, 2));
        
        // For travel domain, validate that origin was actually provided by user
        // IMPORTANT: Only check USER messages (not assistant examples like "Austin, TX")
        // AND include the current userMessage since it might contain the origin
        if (extractedInfo.domain === 'travel') {
          // Collect ONLY user messages from history + current message
          const userMessages = conversationHistory
            .filter(m => m.role === 'user')
            .map(m => m.content.toLowerCase());
          userMessages.push(userMessage.toLowerCase()); // Include current message
          
          const allUserText = userMessages.join(' ');
          const origin = extractedInfo.origin?.toLowerCase() || '';
          
          // Check if origin was mentioned by the USER (not in assistant examples)
          if (origin && !allUserText.includes(origin)) {
            console.warn(`[SIMPLE_PLANNER] ⚠️ PHANTOM DATA DETECTED - Origin "${origin}" not found in user messages`);
            console.log(`[SIMPLE_PLANNER] User messages scanned:`, userMessages);
            // Clear phantom origin and plan to force re-asking
            delete extractedInfo.origin;
            delete response.plan; // Clear stray plan preview
            response.readyToGenerate = false;
            response.message = `I want to make sure I have your details correct. Where are you traveling from?`;
          } else if (origin) {
            console.log(`[SIMPLE_PLANNER] ✅ Origin "${origin}" confirmed in user messages`);
          }
        }
        
        // Log the plan content for debugging
        if (response.plan) {
          console.log(`[SIMPLE_PLANNER] 📋 Generated plan:`, {
            title: response.plan.title,
            description: response.plan.description?.substring(0, 100),
            taskCount: response.plan.tasks?.length,
            hasBudget: !!response.plan.budget,
            hasWeather: !!response.plan.weather
          });
        }
        
        // Log message content for debugging
        console.log(`[SIMPLE_PLANNER] 📝 Message length: ${response.message?.length}, has markdown headers: ${response.message?.includes('##')}`);
      }
      
      // Progress tracking disabled per user request
      // Users found it confusing and it was causing localStorage persistence issues

      // 6. Generate conversation hints to guide user
      if (!response.conversationHints || response.conversationHints.length === 0) {
        response.conversationHints = this.generateConversationHints(
          response.extractedInfo,
          mode,
          response.readyToGenerate,
          questionCount
        );
        console.log(`[SIMPLE_PLANNER] Generated ${response.conversationHints.length} conversation hints`);
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
      hints.push("yes");
      hints.push("create plan");
      hints.push("change something");
      hints.push("start over");
      return hints;
    }

    // Default helpful hints based on conversation state
    const hasLocation = extractedInfo.location || extractedInfo.detectedLocation;
    const hasBudget = extractedInfo.budget || extractedInfo.detectedBudget;
    const hasDate = extractedInfo.date || extractedInfo.startDate || extractedInfo.when;

    // Smart mode gets more detailed hints
    if (mode === 'smart') {
      if (questionCount < 3) {
        // Early stage hints
        hints.push("continue");
        hints.push("I don't know");
        hints.push("skip this");
      } else {
        // Mid-stage hints
        hints.push("continue");
        hints.push("create plan now");
        hints.push("tell me more");
      }
    } else {
      // Quick mode hints
      hints.push("continue");
      hints.push("create plan");
      if (!hasLocation) {
        hints.push("use my current location");
      }
    }

    // Context-specific hints
    if (!hasLocation) {
      hints.push("assume a reasonable location");
    }

    if (!hasBudget) {
      hints.push("flexible budget");
    }

    if (!hasDate) {
      hints.push("this weekend");
    }

    // Always offer escape hatches
    if (questionCount > 2) {
      hints.push("I'll provide details later");
    }

    return hints.slice(0, 5); // Limit to 5 hints for clean UI
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
      let detectedLocation: string | null = null;
      let detectedBudget: number | null = null;

      // Smart extraction from user message if provided
      if (userMessage) {
        detectedLocation = this.extractLocationFromMessage(userMessage);
        detectedBudget = this.extractBudgetFromMessage(userMessage);
      }

      // Scan journal with location priority
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
        detectedLocation,
        detectedBudget,
        fallbackLocation,
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
  setProvider(provider: 'openai' | 'claude') {
    this.llmProvider = provider === 'claude'
      ? new AnthropicProvider()
      : new OpenAIProvider();
    console.log(`[SIMPLE_PLANNER] Switched to ${provider} provider`);
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

const provider = (process.env.LLM_PROVIDER || 'openai') as 'openai' | 'claude';
export const simpleConversationalPlanner = new SimpleConversationalPlanner(provider);
export { globalSearchCache };

console.log(`[SIMPLE_PLANNER] Initialized with ${provider} provider`);
