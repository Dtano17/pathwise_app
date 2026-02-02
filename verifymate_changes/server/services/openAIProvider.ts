/**
 * OpenAI Provider Implementation
 *
 * Supports:
 * - GPT-4o-mini: $0.15/MTok input, $0.60/MTok output (primary for most tasks)
 * - GPT-4o: $2.50/MTok input, $10/MTok output (premium quality)
 *
 * Advantages:
 * - 40% cheaper than Claude Haiku
 * - Better at classification tasks (82% MMLU vs 75%)
 * - Faster (86 tok/s vs 23 tok/s)
 * - Function calling for guaranteed structured outputs
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

export class OpenAIProvider implements ILLMProvider {
  private client: OpenAI;
  public readonly name = 'openai';
  public readonly model: string;
  public readonly costPer1MInputTokens: number;
  public readonly costPer1MOutputTokens: number;

  constructor(model: 'gpt-4o-mini' | 'gpt-4o' = 'gpt-4o-mini') {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    this.model = model;

    // Pricing as of January 2025
    if (model === 'gpt-4o-mini') {
      this.costPer1MInputTokens = 0.15;   // $0.15 per 1M tokens
      this.costPer1MOutputTokens = 0.60;  // $0.60 per 1M tokens
    } else {
      this.costPer1MInputTokens = 2.50;   // $2.50 per 1M tokens
      this.costPer1MOutputTokens = 10.00; // $10.00 per 1M tokens
    }
  }

  isAvailable(): boolean {
    return !!process.env.OPENAI_API_KEY;
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
        max_tokens: options.maxTokens ?? 2000,
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
      console.error('[OPENAI PROVIDER] Completion error:', error);
      throw new Error(`OpenAI completion failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async generateStructured(
    messages: LLMMessage[],
    functions: LLMFunctionDefinition[],
    options: LLMStructuredOptions = {}
  ): Promise<LLMCompletionResult> {
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
        temperature: options.temperature ?? 0.3, // Lower temp for structured outputs
        max_tokens: options.maxTokens ?? 2000,
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
      console.error('[OPENAI PROVIDER] Structured generation error:', error);
      throw new Error(`OpenAI structured generation failed: ${error instanceof Error ? error.message : String(error)}`);
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
      console.error('[OPENAI PROVIDER] Failed to parse function call:', result.functionCall.arguments);
      throw new Error('Invalid JSON in function call arguments');
    }
  }
}

/**
 * Convenience function to create OpenAI provider with cost logging
 */
export function createOpenAIProvider(model: 'gpt-4o-mini' | 'gpt-4o' = 'gpt-4o-mini'): OpenAIProvider {
  const provider = new OpenAIProvider(model);

  console.log(`[OPENAI PROVIDER] Initialized: ${model}`);
  console.log(`  - Input cost: $${provider.costPer1MInputTokens}/1M tokens`);
  console.log(`  - Output cost: $${provider.costPer1MOutputTokens}/1M tokens`);
  console.log(`  - Average cost per 10K conversation: ~$${((10000 * provider.costPer1MInputTokens + 3000 * provider.costPer1MOutputTokens) / 1000000).toFixed(4)}`);

  return provider;
}
