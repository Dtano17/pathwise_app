/**
 * LLM Providers Initialization
 *
 * Registers all available LLM providers and provides convenience functions
 * for common operations.
 */

import { registerProvider } from './llmProvider';
import { createOpenAIProvider } from './openAIProvider';
import { createClaudeProvider } from './claudeProvider';
import { createDeepSeekProvider } from './deepSeekProvider';

/**
 * Initialize all LLM providers
 * Call this once at application startup
 */
export function initializeLLMProviders() {
  console.log('\n===== INITIALIZING LLM PROVIDERS =====');

  // Register OpenAI (primary for most tasks)
  if (process.env.OPENAI_API_KEY) {
    const openai = createOpenAIProvider('gpt-4o-mini');
    registerProvider('openai', openai);
    registerProvider('openai-mini', openai); // Alias

    // Also register GPT-4o for premium tasks if needed
    const openaiPremium = createOpenAIProvider('gpt-4o');
    registerProvider('openai-premium', openaiPremium);
  } else {
    console.warn('⚠️  OPENAI_API_KEY not configured - OpenAI provider unavailable');
  }

  // Register Claude (for creative synthesis)
  if (process.env.ANTHROPIC_API_KEY) {
    const claude = createClaudeProvider('claude-sonnet-4-20250514');
    registerProvider('claude', claude);
    registerProvider('claude-sonnet', claude); // Alias

    // Also register Haiku for faster tasks
    const claudeHaiku = createClaudeProvider('claude-3-5-haiku-20241022');
    registerProvider('claude-haiku', claudeHaiku);
  } else {
    console.warn('⚠️  ANTHROPIC_API_KEY not configured - Claude provider unavailable');
  }

  // Register DeepSeek (for cost-optimized bulk operations)
  if (process.env.DEEPSEEK_API_KEY) {
    const deepseek = createDeepSeekProvider('deepseek-chat');
    registerProvider('deepseek', deepseek);

    const deepseekReasoner = createDeepSeekProvider('deepseek-reasoner');
    registerProvider('deepseek-reasoner', deepseekReasoner);
  } else {
    console.warn('⚠️  DEEPSEEK_API_KEY not configured - DeepSeek provider unavailable');
  }

  console.log('===== LLM PROVIDERS INITIALIZED =====\n');
}

/**
 * Example usage in your server startup (server/index.ts):
 *
 * ```typescript
 * import { initializeLLMProviders } from './services/llmProviders';
 *
 * // Initialize providers before starting server
 * initializeLLMProviders();
 *
 * app.listen(PORT, () => {
 *   console.log(`Server running on port ${PORT}`);
 * });
 * ```
 */

/**
 * Example usage in your services:
 *
 * ```typescript
 * import { executeLLMCall } from './llmProvider';
 *
 * // Automatic provider selection based on task
 * const result = await executeLLMCall(
 *   'gap_analysis',
 *   async (provider) => {
 *     return await provider.generateStructured(messages, functions);
 *   }
 * );
 *
 * // Or use specific provider with fallback
 * const result = await executeLLMCall(
 *   'enrichment',
 *   async (provider) => {
 *     return await provider.generateCompletion(messages);
 *   },
 *   {
 *     customStrategy: {
 *       primary: 'deepseek',
 *       fallback: 'openai',
 *       reason: 'Using DeepSeek for cost savings'
 *     }
 *   }
 * );
 * ```
 */
