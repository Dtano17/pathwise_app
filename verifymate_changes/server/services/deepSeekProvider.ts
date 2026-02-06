/**
 * DeepSeek Provider Implementation
 *
 * Supports:
 * - DeepSeek-V3 (deepseek-chat): $0.14/MTok input, $0.28/MTok output
 * - DeepSeek-R1 (deepseek-reasoner): $0.14/MTok input, $0.28/MTok output
 *
 * Advantages:
 * - 27x cheaper than OpenAI for same workload
 * - 97% cheaper than Claude Sonnet-4
 * - Cache hit feature reduces costs further (50-75% off-peak)
 * - Good for bulk/non-critical operations (enrichment, web search)
 *
 * Note: DeepSeek API is OpenAI-compatible, so we can use the OpenAI SDK
 */

import OpenAI from 'openai';
import type {
  ILLMProvider,
  LLMMessage,
  LLMCompletionOptions,
  LLMCompletionResult,
  LLMFunctionDefinition,
  LLMStructuredOptions
} from './llmProvider';
import { calculateCost } from './llmProvider';

export class DeepSeekProvider implements ILLMProvider {
  private client: OpenAI;
  public readonly name = 'deepseek';
  public readonly model: string;
  public readonly costPer1MInputTokens = 0.14;   // $0.14 per 1M tokens
  public readonly costPer1MOutputTokens = 0.28;  // $0.28 per 1M tokens

  constructor(model: 'deepseek-chat' | 'deepseek-reasoner' = 'deepseek-chat') {
    // DeepSeek API is OpenAI-compatible
    this.client = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: 'https://api.deepseek.com/v1'
    });

    this.model = model;

    // Note: deepseek-reasoner (R1) does not support function calling
    // Only deepseek-chat (V3) supports function calling
  }

  isAvailable(): boolean {
    return !!process.env.DEEPSEEK_API_KEY;
  }

  async generateCompletion(
    messages: LLMMessage[],
    options: LLMCompletionOptions = {}
  ): Promise<LLMCompletionResult> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 4096,
        top_p: options.topP ?? 1.0,
        stop: options.stopSequences
      });

      const choice = response.choices[0];
      const usage = response.usage;

      return {
        content: choice.message.content || '',
        usage: usage ? {
          inputTokens: usage.prompt_tokens,
          outputTokens: usage.completion_tokens,
          totalCost: calculateCost(usage.prompt_tokens, usage.completion_tokens, this)
        } : undefined
      };
    } catch (error) {
      console.error('[DEEPSEEK PROVIDER] Completion error:', error);
      throw new Error(`DeepSeek completion failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async generateStructured(
    messages: LLMMessage[],
    functions: LLMFunctionDefinition[],
    options: LLMStructuredOptions = {}
  ): Promise<LLMCompletionResult> {
    // Check if model supports function calling
    if (this.model === 'deepseek-reasoner') {
      console.warn('[DEEPSEEK PROVIDER] deepseek-reasoner does not support function calling, falling back to text extraction');

      // Add JSON schema to system message
      const systemMessage: LLMMessage = {
        role: 'system',
        content: `You must respond with valid JSON matching this schema:\n${JSON.stringify(functions[0].parameters, null, 2)}\n\nRespond ONLY with the JSON object, no markdown, no explanations.`
      };

      const result = await this.generateCompletion([systemMessage, ...messages], options);

      // Parse JSON from response
      try {
        const jsonMatch = result.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return {
            ...result,
            functionCall: {
              name: functions[0].name,
              arguments: jsonMatch[0]
            }
          };
        }
      } catch (error) {
        console.error('[DEEPSEEK PROVIDER] Failed to parse JSON from response');
      }

      return result;
    }

    // DeepSeek-V3 supports function calling
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        functions: functions.map(fn => ({
          name: fn.name,
          description: fn.description,
          parameters: fn.parameters
        })),
        function_call: options.functionCall || 'auto',
        temperature: options.temperature ?? 0.3,
        max_tokens: options.maxTokens ?? 4096,
        top_p: options.topP ?? 1.0
      });

      const choice = response.choices[0];
      const usage = response.usage;
      const functionCall = choice.message.function_call;

      return {
        content: choice.message.content || '',
        functionCall: functionCall ? {
          name: functionCall.name,
          arguments: functionCall.arguments
        } : undefined,
        usage: usage ? {
          inputTokens: usage.prompt_tokens,
          outputTokens: usage.completion_tokens,
          totalCost: calculateCost(usage.prompt_tokens, usage.completion_tokens, this)
        } : undefined
      };
    } catch (error) {
      console.error('[DEEPSEEK PROVIDER] Structured generation error:', error);
      throw new Error(`DeepSeek structured generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Helper: Parse function call result to JSON
   */
  static parseFunctionCall<T>(result: LLMCompletionResult): T {
    if (!result.functionCall) {
      throw new Error('No function call in response');
    }

    try {
      return JSON.parse(result.functionCall.arguments);
    } catch (error) {
      console.error('[DEEPSEEK PROVIDER] Failed to parse function call:', result.functionCall.arguments);
      throw new Error('Invalid JSON in function call arguments');
    }
  }
}

/**
 * Convenience function to create DeepSeek provider with cost logging
 */
export function createDeepSeekProvider(model: 'deepseek-chat' | 'deepseek-reasoner' = 'deepseek-chat'): DeepSeekProvider {
  const provider = new DeepSeekProvider(model);

  console.log(`[DEEPSEEK PROVIDER] Initialized: ${model}`);
  console.log(`  - Input cost: $${provider.costPer1MInputTokens}/1M tokens`);
  console.log(`  - Output cost: $${provider.costPer1MOutputTokens}/1M tokens`);
  console.log(`  - Average cost per 50K enrichment: ~$${((50000 * provider.costPer1MInputTokens + 10000 * provider.costPer1MOutputTokens) / 1000000).toFixed(4)}`);
  console.log(`  - Cache hit available: 50-75% discount during off-peak (16:30-00:30 UTC)`);

  if (model === 'deepseek-reasoner') {
    console.warn(`  ⚠️  Note: deepseek-reasoner does not support function calling`);
  }

  return provider;
}
