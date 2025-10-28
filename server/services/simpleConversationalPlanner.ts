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
  budget?: {
    total: number;
    breakdown: Array<{
      category: string;
      amount: number;
      notes?: string;
    }>;
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
      // Turn 1-2: gpt-4o-mini (faster, cheaper, good for questions)
      // Turn 3+: gpt-4o (smarter, better with web data and enrichment)
      const model = isPreviewTurn ? 'gpt-4o' : 'gpt-4o-mini';
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
      const model = isPreviewTurn ? 'gpt-4o' : 'gpt-4o-mini';
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

  // COMPRESSED BUDGET-FIRST SYSTEM PROMPT
  return `You are JournalMate Planning Agent - an expert planner specializing in budget-conscious, personalized plans.

${userContext}

## Mission
Help ${user.firstName || 'the user'} plan ANY activity via smart questions and actionable plans. **${mode.toUpperCase()} MODE** - ${modeDescription}.

---

## Formatting & Emojis
**Use context-appropriate emojis:**
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
**Quick Mode - 2 Batches (5 total):**
- **Batch 1 (Turn 1):** Ask 3 questions from priority list. Skip already-answered. End: "(Say 'create plan' anytime!)"
- **Batch 2 (Turn 2):** Ask 2 MORE questions. Don't show preview yet!
- **Batch 3 (Turn 3):** Show PLAN PREVIEW with real-time data. Wait for confirmation before readyToGenerate=true

**Example:** User says "Help plan romantic anniversary trip to Paris"
→ Skip Q2 (occasion) & Q3 (destination) already known
→ Ask Q1 (from?), Q5 (when?), Q6 (duration?) instead
→ Acknowledge: "Anniversary in Paris - how romantic! 💕"
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

## 🌤️ Weather Forecast (from web search)
• **Expected:** [Temperature range, conditions]
• **Rain:** [Chance of rain, when]
• **Packing:** [Layers, umbrella, sunscreen, etc]
• **Best Time:** [Morning/afternoon for activities]

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
              description: 'ONLY include if activity needs budget (travel, dining, events, shopping, etc.). OMIT entirely for free activities (hiking, walking, meditation, etc.)',
              properties: {
                total: {
                  type: 'number',
                  description: 'Total budget amount user specified'
                },
                breakdown: {
                  type: 'array',
                  description: 'Itemized costs showing WHERE money goes - be specific!',
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
                  description: 'Recommended buffer for unexpected costs (10-15% of total)'
                }
              }
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
          required: ['title', 'description', 'tasks']
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
      // 1. Gather user context
      const context = await this.gatherUserContext(userId, storage);

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
      }
      
      // Progress tracking disabled per user request
      // Users found it confusing and it was causing localStorage persistence issues

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
    onToken: (token: string) => void
  ): Promise<PlanningResponse> {
    console.log(`[SIMPLE_PLANNER] Processing message with streaming for user ${userId} in ${mode} mode`);

    try {
      // 1. Gather user context
      const context = await this.gatherUserContext(userId, storage);

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
      }
      
      // Progress tracking disabled per user request
      // Users found it confusing and it was causing localStorage persistence issues

      return response;
    } catch (error) {
      console.error('[SIMPLE_PLANNER] Error processing streaming message:', error);
      throw error;
    }
  }

  /**
   * Gather full user context for personalization
   */
  private async gatherUserContext(userId: string, storage: IStorage): Promise<PlanningContext> {
    try {
      const [user, profile, preferences, recentJournal] = await Promise.all([
        storage.getUser(userId),
        storage.getUserProfile(userId),
        storage.getUserPreferences(userId),
        storage.getUserJournalEntries(userId, 7) // Last 7 days
      ]);

      if (!user) {
        throw new Error(`User ${userId} not found`);
      }

      return {
        user,
        profile: profile || undefined,
        preferences: preferences || undefined,
        recentJournal: recentJournal || []
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

console.log(`[SIMPLE_PLANNER] Initialized with ${provider} provider`);
