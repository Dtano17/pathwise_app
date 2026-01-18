/**
 * Tavily API Provider with Key Rotation
 *
 * Tries multiple API keys in order and uses the first one that actually works
 * (returns valid search results, not just 200 OK).
 *
 * Key order: TAVILY_API_KEY_1 → _2 → _3 → TAVILY_API_KEY (fallback)
 */

import { tavily, TavilyClient } from '@tavily/core';

// Collect all available Tavily keys in priority order
const TAVILY_KEYS = [
  process.env.TAVILY_API_KEY_1,
  process.env.TAVILY_API_KEY_2,
  process.env.TAVILY_API_KEY_3,
  process.env.TAVILY_API_KEY,  // Fallback - original key
].filter(Boolean) as string[];

// Cache for the active working client
let activeClient: TavilyClient | null = null;
let activeKeyIndex: number = -1;
let lastKeyTestTime: number = 0;
const KEY_TEST_CACHE_MS = 5 * 60 * 1000; // Re-test keys every 5 minutes

/**
 * Test if a key ACTUALLY WORKS by making a real search and verifying results
 * This ensures we use a key with credits, not just one that returns 200
 */
async function testKey(apiKey: string, keyNumber: number): Promise<boolean> {
  try {
    const client = tavily({ apiKey });
    // Make a real search query and verify we get actual results back
    const result = await client.search('weather today', { maxResults: 1 });

    // Verify the response has actual content (not empty/error response)
    const isWorking = !!(
      result &&
      result.results &&
      Array.isArray(result.results) &&
      result.results.length > 0 &&
      result.results[0].content // Has actual content
    );

    if (isWorking) {
      console.log(`[TAVILY] Key ${keyNumber} test SUCCESS - got ${result.results.length} results`);
    } else {
      console.log(`[TAVILY] Key ${keyNumber} test FAILED - empty or invalid response`);
    }

    return isWorking;
  } catch (error: any) {
    console.log(`[TAVILY] Key ${keyNumber} test FAILED - error: ${error?.message || error}`);
    return false;
  }
}

/**
 * Get a working Tavily client, cycling through keys if needed
 * Caches the working client to avoid repeated testing
 */
export async function getTavilyClient(): Promise<TavilyClient | null> {
  if (TAVILY_KEYS.length === 0) {
    console.warn('[TAVILY] No API keys configured');
    return null;
  }

  const now = Date.now();

  // Return cached client if still valid and not expired
  if (activeClient && activeKeyIndex >= 0 && (now - lastKeyTestTime) < KEY_TEST_CACHE_MS) {
    return activeClient;
  }

  // Try each key in order
  console.log(`[TAVILY] Testing ${TAVILY_KEYS.length} available keys...`);

  for (let i = 0; i < TAVILY_KEYS.length; i++) {
    const key = TAVILY_KEYS[i];
    const keyLabel = i < 3 ? `TAVILY_API_KEY_${i + 1}` : 'TAVILY_API_KEY (fallback)';
    console.log(`[TAVILY] Testing ${keyLabel}...`);

    if (await testKey(key, i + 1)) {
      activeClient = tavily({ apiKey: key });
      activeKeyIndex = i;
      lastKeyTestTime = now;
      console.log(`[TAVILY] ✓ Using ${keyLabel} (${key.substring(0, 12)}...)`);
      return activeClient;
    }
  }

  console.warn('[TAVILY] ✗ All keys exhausted, no working key found');
  activeClient = null;
  activeKeyIndex = -1;
  return null;
}

/**
 * Reset client (force re-test keys on next call)
 * Call this when a key fails mid-operation
 */
export function resetTavilyClient(): void {
  console.log('[TAVILY] Resetting client, will re-test keys on next call');
  activeClient = null;
  activeKeyIndex = -1;
  lastKeyTestTime = 0;
}

/**
 * Wrapper for Tavily search with automatic key rotation on failure
 */
export async function tavilySearch(
  query: string,
  options?: {
    searchDepth?: 'basic' | 'advanced';
    maxResults?: number;
    includeImages?: boolean;
    includeAnswer?: boolean;
    includeRawContent?: boolean;
    includeDomains?: string[];
    excludeDomains?: string[];
  }
): Promise<any> {
  const client = await getTavilyClient();
  if (!client) {
    throw new Error('No valid Tavily API key available');
  }

  try {
    return await client.search(query, options);
  } catch (error: any) {
    // If the key fails mid-operation, reset and retry with next key
    if (error?.status === 401 || error?.status === 403 || error?.message?.includes('unauthorized')) {
      console.log('[TAVILY] Key rejected during search, rotating...');
      resetTavilyClient();
      const newClient = await getTavilyClient();
      if (newClient) {
        return await newClient.search(query, options);
      }
    }
    throw error;
  }
}

/**
 * Wrapper for Tavily extract with automatic key rotation on failure
 */
export async function tavilyExtract(
  urls: string[],
  options?: {
    extractDepth?: 'basic' | 'advanced';
  }
): Promise<any> {
  const client = await getTavilyClient();
  if (!client) {
    throw new Error('No valid Tavily API key available');
  }

  try {
    return await client.extract(urls, options);
  } catch (error: any) {
    // If the key fails mid-operation, reset and retry with next key
    if (error?.status === 401 || error?.status === 403 || error?.message?.includes('unauthorized')) {
      console.log('[TAVILY] Key rejected during extract, rotating...');
      resetTavilyClient();
      const newClient = await getTavilyClient();
      if (newClient) {
        return await newClient.extract(urls, options);
      }
    }
    throw error;
  }
}

/**
 * Check if any Tavily key is configured
 */
export function isTavilyConfigured(): boolean {
  return TAVILY_KEYS.length > 0;
}

/**
 * Get info about current key status (for debugging/status endpoints)
 */
export function getTavilyStatus(): {
  configured: boolean;
  totalKeys: number;
  activeKeyIndex: number | null;
  message: string;
} {
  return {
    configured: TAVILY_KEYS.length > 0,
    totalKeys: TAVILY_KEYS.length,
    activeKeyIndex: activeKeyIndex >= 0 ? activeKeyIndex + 1 : null,
    message: TAVILY_KEYS.length > 0
      ? `${TAVILY_KEYS.length} Tavily keys configured${activeKeyIndex >= 0 ? `, using key ${activeKeyIndex + 1}` : ''}`
      : 'No Tavily API keys configured'
  };
}
