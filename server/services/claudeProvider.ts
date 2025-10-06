/**
 * Claude Provider Implementation
 *
 * Supports:
 * - Claude Sonnet-4: $3.00/MTok input, $15.00/MTok output (best creative writing)
 * - Claude Haiku: $0.25/MTok input, $1.25/MTok output (fast, cheap)
 *
 * Advantages:
 * - Sonnet-4: Best at creative long-form content (plan synthesis)
 * - Haiku: Larger context window (200K tokens vs 128K)
 * - Good at following complex instructions
 *
 * Use Cases:
 * - Plan synthesis (Sonnet-4)
 * - Fallback for other tasks (Haiku)
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  ILLMProvider,
  LLMMessage,
  LLMCompletionOptions,
  LLMCompletionResult,
  LLMFunctionDefinition,
  LLMStructuredOptions
} from './llmProvider';
import { calculateCost } from './llmProvider';

export class ClaudeProvider implements ILLMProvider {
  private client: Anthropic;
  public readonly name = 'claude';
  public readonly model: string;
  public readonly costPer1MInputTokens: number;
  public readonly costPer1MOutputTokens: number;

  constructor(model: 'claude-sonnet-4-20250514' | 'claude-3-5-haiku-20241022' = 'claude-sonnet-4-20250514') {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });

    this.model = model;

    // Pricing as of January 2025
    if (model === 'claude-sonnet-4-20250514') {
      this.costPer1MInputTokens = 3.00;   // $3.00 per 1M tokens
      this.costPer1MOutputTokens = 15.00; // $15.00 per 1M tokens
    } else {
      this.costPer1MInputTokens = 0.25;   // $0.25 per 1M tokens (Haiku)
      this.costPer1MOutputTokens = 1.25;  // $1.25 per 1M tokens
    }
  }

  isAvailable(): boolean {
    return !!process.env.ANTHROPIC_API_KEY;
  }

  async generateCompletion(
    messages: LLMMessage[],
    options: LLMCompletionOptions = {}
  ): Promise<LLMCompletionResult> {
    try {
      // Claude requires system message to be separate
      const systemMessage = messages.find(m => m.role === 'system')?.content;
      const conversationMessages = messages
        .filter(m => m.role !== 'system')
        .map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        }));

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: options.maxTokens ?? 4096,
        temperature: options.temperature ?? 0.7,
        top_p: options.topP ?? 1.0,
        stop_sequences: options.stopSequences,
        system: systemMessage,
        messages: conversationMessages
      });

      const content = response.content[0];
      const contentText = content.type === 'text' ? content.text : '';

      return {
        content: contentText,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          totalCost: calculateCost(
            response.usage.input_tokens,
            response.usage.output_tokens,
            this
          )
        }
      };
    } catch (error) {
      console.error('[CLAUDE PROVIDER] Completion error:', error);
      throw new Error(`Claude completion failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async generateStructured(
    messages: LLMMessage[],
    functions: LLMFunctionDefinition[],
    options: LLMStructuredOptions = {}
  ): Promise<LLMCompletionResult> {
    // Claude uses tool calling instead of function calling
    // Convert function definitions to tools
    const tools = functions.map(fn => ({
      name: fn.name,
      description: fn.description,
      input_schema: fn.parameters
    }));

    try {
      const systemMessage = messages.find(m => m.role === 'system')?.content;
      const conversationMessages = messages
        .filter(m => m.role !== 'system')
        .map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        }));

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: options.maxTokens ?? 4096,
        temperature: options.temperature ?? 0.3,
        top_p: options.topP ?? 1.0,
        system: systemMessage,
        messages: conversationMessages,
        tools: tools as any
      });

      const content = response.content[0];
      let contentText = '';
      let functionCall;

      if (content.type === 'text') {
        contentText = content.text;
      } else if (content.type === 'tool_use') {
        functionCall = {
          name: content.name,
          arguments: JSON.stringify(content.input)
        };
      }

      return {
        content: contentText,
        functionCall,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          totalCost: calculateCost(
            response.usage.input_tokens,
            response.usage.output_tokens,
            this
          )
        }
      };
    } catch (error) {
      console.error('[CLAUDE PROVIDER] Structured generation error:', error);
      throw new Error(`Claude structured generation failed: ${error instanceof Error ? error.message : String(error)}`);
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
      console.error('[CLAUDE PROVIDER] Failed to parse function call:', result.functionCall.arguments);
      throw new Error('Invalid JSON in function call arguments');
    }
  }
}

/**
 * Convenience function to create Claude provider with cost logging
 */
export function createClaudeProvider(
  model: 'claude-sonnet-4-20250514' | 'claude-3-5-haiku-20241022' = 'claude-sonnet-4-20250514'
): ClaudeProvider {
  const provider = new ClaudeProvider(model);

  console.log(`[CLAUDE PROVIDER] Initialized: ${model}`);
  console.log(`  - Input cost: $${provider.costPer1MInputTokens}/1M tokens`);
  console.log(`  - Output cost: $${provider.costPer1MOutputTokens}/1M tokens`);
  console.log(`  - Context window: ${model.includes('haiku') ? '200K' : '200K'} tokens`);

  return provider;
}
