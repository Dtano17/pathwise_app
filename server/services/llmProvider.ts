/**
 * LLM Provider Abstraction Layer
 *
 * Provides a unified interface for interacting with multiple LLM providers:
 * - OpenAI (GPT-4o-mini, GPT-4o)
 * - Anthropic Claude (Sonnet, Haiku)
 * - DeepSeek (DeepSeek-V3, DeepSeek-R1)
 *
 * Benefits:
 * - Switch providers with environment variable
 * - Automatic fallback on errors
 * - Cost optimization per task type
 * - A/B testing different models
 */

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMCompletionOptions {
  temperature?: number;
  maxTokens?: number;
  stopSequences?: string[];
  topP?: number;
}

export interface LLMFunctionCall {
  name: string;
  arguments: string; // JSON string
}

export interface LLMStructuredOptions extends LLMCompletionOptions {
  functions?: LLMFunctionDefinition[];
  functionCall?: { name: string } | 'auto' | 'none';
}

export interface LLMFunctionDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface LLMCompletionResult {
  content: string;
  functionCall?: LLMFunctionCall;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalCost: number; // in USD
  };
}

/**
 * Base interface for all LLM providers
 */
export interface ILLMProvider {
  readonly name: string;
  readonly model: string;
  readonly costPer1MInputTokens: number;  // USD
  readonly costPer1MOutputTokens: number; // USD

  /**
   * Generate a text completion
   */
  generateCompletion(
    messages: LLMMessage[],
    options?: LLMCompletionOptions
  ): Promise<LLMCompletionResult>;

  /**
   * Generate structured output using function calling
   */
  generateStructured(
    messages: LLMMessage[],
    functions: LLMFunctionDefinition[],
    options?: LLMStructuredOptions
  ): Promise<LLMCompletionResult>;

  /**
   * Check if provider is available (API key configured)
   */
  isAvailable(): boolean;
}

/**
 * Task types for intelligent LLM routing
 */
export type TaskType =
  | 'domain_detection'       // Fast, cheap classification
  | 'question_generation'    // Moderate complexity
  | 'gap_analysis'          // Critical accuracy needed
  | 'slot_extraction'       // Structured data extraction
  | 'enrichment'            // Bulk web search (cost-sensitive)
  | 'plan_synthesis'        // Creative writing (quality-sensitive)
  | 'general';

/**
 * Provider selection strategy based on task type
 */
export interface ProviderStrategy {
  primary: string;      // e.g., 'openai'
  fallback?: string;    // e.g., 'claude'
  reason: string;       // Why this provider was chosen
}

/**
 * Get optimal LLM provider for a specific task
 */
export function getProviderForTask(task: TaskType): ProviderStrategy {
  const strategies: Record<TaskType, ProviderStrategy> = {
    domain_detection: {
      primary: 'openai',
      fallback: 'claude',
      reason: 'OpenAI GPT-4o-mini: Fast classification (86 tok/s), 40% cheaper than Claude Haiku'
    },
    question_generation: {
      primary: 'openai',
      fallback: 'claude',
      reason: 'OpenAI GPT-4o-mini: Good at structured outputs, faster, cheaper'
    },
    gap_analysis: {
      primary: 'openai',
      fallback: 'claude',
      reason: 'OpenAI GPT-4o-mini: Better at classification (82% MMLU), function calling ensures consistency'
    },
    slot_extraction: {
      primary: 'openai',
      fallback: 'claude',
      reason: 'OpenAI function calling provides guaranteed structured JSON'
    },
    enrichment: {
      primary: 'deepseek',
      fallback: 'claude',
      reason: 'DeepSeek: 27x cheaper for bulk operations, good enough quality for web search'
    },
    plan_synthesis: {
      primary: 'claude',
      fallback: 'openai',
      reason: 'Claude Sonnet-4: Best at creative writing and long-form content'
    },
    general: {
      primary: 'openai',
      fallback: 'claude',
      reason: 'OpenAI: Good balance of cost, speed, and quality'
    }
  };

  return strategies[task];
}

/**
 * Provider registry
 */
const providers = new Map<string, ILLMProvider>();

export function registerProvider(name: string, provider: ILLMProvider) {
  providers.set(name, provider);
  console.log(`[LLM PROVIDER] Registered: ${name} (${provider.model})`);
}

export function getProvider(name: string): ILLMProvider | undefined {
  return providers.get(name);
}

/**
 * Get provider with automatic fallback
 */
export async function getProviderWithFallback(
  primaryName: string,
  fallbackName?: string
): Promise<ILLMProvider> {
  const primary = getProvider(primaryName);

  if (primary && primary.isAvailable()) {
    return primary;
  }

  if (fallbackName) {
    const fallback = getProvider(fallbackName);
    if (fallback && fallback.isAvailable()) {
      console.warn(`[LLM PROVIDER] ${primaryName} unavailable, using fallback: ${fallbackName}`);
      return fallback;
    }
  }

  throw new Error(
    `No available LLM provider. Tried: ${primaryName}${fallbackName ? `, ${fallbackName}` : ''}`
  );
}

/**
 * Execute LLM call with automatic fallback and error handling
 * Returns both the result and metadata about which provider was used
 */
export async function executeLLMCall<T = LLMCompletionResult>(
  task: TaskType,
  executor: (provider: ILLMProvider) => Promise<T>,
  options?: {
    customStrategy?: ProviderStrategy;
    retries?: number;
  }
): Promise<T & { __providerName?: string }> {
  const strategy = options?.customStrategy || getProviderForTask(task);
  const maxRetries = options?.retries ?? 2;

  let lastError: Error | undefined;

  // Try primary provider
  try {
    const provider = await getProviderWithFallback(strategy.primary, strategy.fallback);
    console.log(`[LLM PROVIDER] Task: ${task} | Using: ${provider.name} | Reason: ${strategy.reason}`);

    const result = await executor(provider);
    // Attach provider metadata to result
    return { ...result, __providerName: provider.name };
  } catch (error) {
    lastError = error as Error;
    console.error(`[LLM PROVIDER] Primary failed for ${task}:`, error);
  }

  // Try fallback if available
  if (strategy.fallback) {
    try {
      const fallbackProvider = await getProviderWithFallback(strategy.fallback);
      console.warn(`[LLM PROVIDER] Retrying ${task} with fallback: ${fallbackProvider.name}`);

      const result = await executor(fallbackProvider);
      // Attach provider metadata to result
      return { ...result, __providerName: fallbackProvider.name };
    } catch (error) {
      lastError = error as Error;
      console.error(`[LLM PROVIDER] Fallback failed for ${task}:`, error);
    }
  }

  throw new Error(
    `All LLM providers failed for task: ${task}. Last error: ${lastError?.message}`
  );
}

/**
 * Calculate cost for a completion
 */
export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  provider: ILLMProvider
): number {
  const inputCost = (inputTokens / 1_000_000) * provider.costPer1MInputTokens;
  const outputCost = (outputTokens / 1_000_000) * provider.costPer1MOutputTokens;
  return inputCost + outputCost;
}
