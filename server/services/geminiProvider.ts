/**
 * Gemini Provider with Google Search and Maps Grounding
 *
 * Provides real-time data through:
 * - Google Search grounding: Weather, prices, availability, news
 * - Google Maps grounding: Venues, restaurants, directions, hours
 *
 * Used by Quick Plan and Smart Plan for hallucination-free planning.
 */

import { GoogleGenAI, Type } from '@google/genai';

// Types
export interface GeminiGroundingConfig {
  enableGoogleSearch?: boolean;
  enableGoogleMaps?: boolean;
  userLocation?: {
    latitude: number;
    longitude: number;
    city?: string;
  };
}

export interface GeminiMessage {
  role: 'user' | 'model';
  content: string;
}

export interface GroundingMetadata {
  searchQueries?: string[];
  sources?: Array<{
    url: string;
    title: string;
    snippet?: string;
  }>;
  mapsResults?: Array<{
    name: string;
    address?: string;
    rating?: number;
    url?: string;
  }>;
}

export interface GeminiResponse {
  content: string;
  groundingMetadata?: GroundingMetadata;
  finishReason?: string;
}

// Default model for planning
const DEFAULT_MODEL = 'gemini-2.5-flash';

/**
 * Create a Gemini client with grounding capabilities
 */
export function createGeminiClient() {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY environment variable is not set');
  }
  return new GoogleGenAI({ apiKey });
}

/**
 * Check if Gemini is configured
 */
export function isGeminiConfigured(): boolean {
  return !!process.env.GOOGLE_API_KEY;
}

/**
 * Generate a completion with Gemini and optional grounding
 */
export async function generateWithGrounding(
  messages: GeminiMessage[],
  systemPrompt: string,
  config: GeminiGroundingConfig = {},
  model: string = DEFAULT_MODEL
): Promise<GeminiResponse> {
  const client = createGeminiClient();

  // Build the tools array based on config
  const tools: any[] = [];

  // Add Google Search grounding
  if (config.enableGoogleSearch !== false) {
    tools.push({ googleSearch: {} });
  }

  // Add Google Maps grounding if location is available
  if (config.enableGoogleMaps && config.userLocation) {
    tools.push({ googleMaps: {} });
  }

  // Build tool config with location if available
  let toolConfig: any = undefined;
  if (config.userLocation && config.enableGoogleMaps) {
    toolConfig = {
      retrievalConfig: {
        latLng: {
          latitude: config.userLocation.latitude,
          longitude: config.userLocation.longitude,
        },
      },
    };
  }

  // Format messages for Gemini
  const contents = messages.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }],
  }));

  try {
    const response = await client.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction: systemPrompt,
        tools: tools.length > 0 ? tools : undefined,
        toolConfig,
      },
    });

    // Extract the text response
    const textContent = response.text || '';

    // Parse grounding metadata if available
    const groundingMetadata = parseGroundingMetadata(response);

    return {
      content: textContent,
      groundingMetadata,
      finishReason: response.candidates?.[0]?.finishReason,
    };
  } catch (error: any) {
    console.error('[GEMINI] Error generating content:', error.message);
    throw error;
  }
}

/**
 * Generate structured output with Gemini (for plan objects)
 */
export async function generateStructuredWithGrounding<T>(
  messages: GeminiMessage[],
  systemPrompt: string,
  schema: any,
  config: GeminiGroundingConfig = {},
  model: string = DEFAULT_MODEL
): Promise<{ data: T; groundingMetadata?: GroundingMetadata }> {
  const client = createGeminiClient();

  // Build the tools array
  const tools: any[] = [];

  if (config.enableGoogleSearch !== false) {
    tools.push({ googleSearch: {} });
  }

  if (config.enableGoogleMaps && config.userLocation) {
    tools.push({ googleMaps: {} });
  }

  // Format messages
  const contents = messages.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }],
  }));

  try {
    const response = await client.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction: systemPrompt,
        tools: tools.length > 0 ? tools : undefined,
        responseMimeType: 'application/json',
        responseSchema: schema,
      },
    });

    const textContent = response.text || '{}';
    const data = JSON.parse(textContent) as T;
    const groundingMetadata = parseGroundingMetadata(response);

    return { data, groundingMetadata };
  } catch (error: any) {
    console.error('[GEMINI] Error generating structured content:', error.message);
    throw error;
  }
}

/**
 * Parse grounding metadata from Gemini response
 */
function parseGroundingMetadata(response: any): GroundingMetadata | undefined {
  const candidate = response.candidates?.[0];
  if (!candidate?.groundingMetadata) {
    return undefined;
  }

  const metadata = candidate.groundingMetadata;
  const result: GroundingMetadata = {};

  // Extract search queries
  if (metadata.webSearchQueries && metadata.webSearchQueries.length > 0) {
    result.searchQueries = metadata.webSearchQueries;
  }

  // Extract grounding chunks (sources)
  if (metadata.groundingChunks && metadata.groundingChunks.length > 0) {
    result.sources = [];
    result.mapsResults = [];

    for (const chunk of metadata.groundingChunks) {
      if (chunk.web) {
        result.sources.push({
          url: chunk.web.uri || '',
          title: chunk.web.title || '',
          snippet: chunk.web.snippet,
        });
      }
      if (chunk.maps) {
        result.mapsResults.push({
          name: chunk.maps.title || '',
          address: chunk.maps.address,
          rating: chunk.maps.rating,
          url: chunk.maps.uri,
        });
      }
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

/**
 * Format grounding sources as markdown for plan output
 */
export function formatGroundingSources(metadata?: GroundingMetadata): string {
  if (!metadata) return '';

  let output = '';

  if (metadata.sources && metadata.sources.length > 0) {
    output += '\n\n**Sources:**\n';
    for (const source of metadata.sources.slice(0, 5)) {
      output += `- [${source.title}](${source.url})\n`;
    }
  }

  if (metadata.mapsResults && metadata.mapsResults.length > 0) {
    output += '\n**Venues from Google Maps:**\n';
    for (const venue of metadata.mapsResults.slice(0, 5)) {
      const rating = venue.rating ? ` ⭐${venue.rating}` : '';
      output += `- ${venue.name}${rating}${venue.address ? ` - ${venue.address}` : ''}\n`;
    }
  }

  return output;
}

/**
 * Simple test function to verify Gemini grounding is working
 */
export async function testGeminiGrounding(query: string, location?: { latitude: number; longitude: number }): Promise<void> {
  console.log('\n=== Testing Gemini with Grounding ===\n');
  console.log(`Query: "${query}"`);
  if (location) {
    console.log(`Location: ${location.latitude}, ${location.longitude}`);
  }
  console.log('');

  const response = await generateWithGrounding(
    [{ role: 'user', content: query }],
    'You are a helpful planning assistant. Provide accurate, real-time information.',
    {
      enableGoogleSearch: true,
      enableGoogleMaps: !!location,
      userLocation: location,
    }
  );

  console.log('Response:');
  console.log(response.content);
  console.log('');

  if (response.groundingMetadata) {
    console.log('Grounding Metadata:');
    if (response.groundingMetadata.searchQueries) {
      console.log('  Search Queries:', response.groundingMetadata.searchQueries);
    }
    if (response.groundingMetadata.sources) {
      console.log('  Sources:', response.groundingMetadata.sources.length, 'found');
    }
    if (response.groundingMetadata.mapsResults) {
      console.log('  Maps Results:', response.groundingMetadata.mapsResults.length, 'found');
    }
  }

  console.log('\n=== Test Complete ===\n');
}

// Export types for use in planner
export type { Type };
