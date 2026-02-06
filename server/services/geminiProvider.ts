/**
 * Gemini Provider with Google Search and Maps Grounding
 *
 * Provides real-time data through:
 * - Google Search grounding: Weather, prices, availability, news
 * - Google Maps grounding: Venues, restaurants, directions, hours
 *
 * Used by Quick Plan and Smart Plan for hallucination-free planning.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
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

/**
 * Task interface for URL injection
 */
interface PlanTask {
  taskName: string;
  duration?: number;
  scheduledDate?: string;
  startTime?: string;
  notes?: string;
  category?: string;
  priority?: 'high' | 'medium' | 'low';
}

/**
 * Inject grounding URLs into task descriptions based on task type
 *
 * This function enriches task notes with relevant URLs from Gemini grounding:
 * - Streaming URLs for movie/watch tasks
 * - Restaurant/venue URLs for dining tasks
 * - Ticket booking URLs for sports/event tasks
 * - Hotel/travel booking URLs for accommodation tasks
 */
export function injectGroundingUrlsIntoTasks(
  tasks: PlanTask[],
  metadata?: GroundingMetadata
): PlanTask[] {
  if (!metadata || !tasks || tasks.length === 0) return tasks;

  console.log(`[GROUNDING_URLS] Processing ${tasks.length} tasks with ${metadata.sources?.length || 0} sources and ${metadata.mapsResults?.length || 0} maps results`);

  return tasks.map(task => {
    const taskNameLower = (task.taskName || '').toLowerCase();
    const notesLower = (task.notes || '').toLowerCase();
    const combinedText = `${taskNameLower} ${notesLower}`;
    const additionalLinks: string[] = [];

    // Movie/streaming tasks
    if (combinedText.match(/movie|watch|stream|film|show|netflix|prime|hulu|disney|cinema|theater|theatre/)) {
      const streamingUrls = metadata.sources
        ?.filter(s => s.url && (
          s.url.includes('netflix') ||
          s.url.includes('amazon') ||
          s.url.includes('primevideo') ||
          s.url.includes('hulu') ||
          s.url.includes('disneyplus') ||
          s.url.includes('disney.com') ||
          s.url.includes('imdb') ||
          s.url.includes('rottentomatoes') ||
          s.url.includes('fandango') ||
          s.url.includes('amc') ||
          s.url.includes('cinemark')
        ))
        ?.slice(0, 3)
        .map(s => `• [${s.title || 'Watch'}](${s.url})`);

      if (streamingUrls?.length) {
        additionalLinks.push('📺 **Streaming/Tickets:**');
        additionalLinks.push(...streamingUrls);
      }
    }

    // Restaurant/dining tasks
    if (combinedText.match(/dinner|lunch|breakfast|brunch|restaurant|eat|food|dining|reservation|cafe|bistro|pizz/)) {
      const venueUrls = metadata.mapsResults
        ?.slice(0, 3)
        .map(r => {
          const rating = r.rating ? ` ⭐${r.rating}` : '';
          const url = r.url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.name + (r.address ? ' ' + r.address : ''))}`;
          return `• [${r.name}${rating}](${url})${r.address ? ` - ${r.address}` : ''}`;
        });

      if (venueUrls?.length) {
        additionalLinks.push('🍽️ **Restaurant Options:**');
        additionalLinks.push(...venueUrls);
      }

      // Also check for OpenTable, Resy, Yelp links
      const reservationUrls = metadata.sources
        ?.filter(s => s.url && (
          s.url.includes('opentable') ||
          s.url.includes('resy') ||
          s.url.includes('yelp')
        ))
        ?.slice(0, 2)
        .map(s => `• [${s.title || 'Reserve'}](${s.url})`);

      if (reservationUrls?.length) {
        additionalLinks.push('📅 **Reservations:**');
        additionalLinks.push(...reservationUrls);
      }
    }

    // Sports/match/game tasks
    if (combinedText.match(/game|match|sports|tickets|stadium|arena|nfl|nba|mlb|nhl|soccer|football|basketball|baseball|hockey/)) {
      const sportsUrls = metadata.sources
        ?.filter(s => s.url && (
          s.url.includes('ticketmaster') ||
          s.url.includes('stubhub') ||
          s.url.includes('seatgeek') ||
          s.url.includes('vivid') ||
          s.url.includes('espn') ||
          s.url.includes('nfl.com') ||
          s.url.includes('nba.com') ||
          s.url.includes('mlb.com')
        ))
        ?.slice(0, 3)
        .map(s => `• [${s.title || 'Tickets/Info'}](${s.url})`);

      if (sportsUrls?.length) {
        additionalLinks.push('🎫 **Tickets & Info:**');
        additionalLinks.push(...sportsUrls);
      }
    }

    // Event/venue/location tasks
    if (combinedText.match(/event|venue|location|visit|tour|museum|park|attraction|concert|show|exhibit/)) {
      const venueUrls = metadata.mapsResults
        ?.slice(0, 3)
        .map(r => {
          const rating = r.rating ? ` ⭐${r.rating}` : '';
          const url = r.url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.name)}`;
          return `• [${r.name}${rating}](${url})`;
        });

      if (venueUrls?.length) {
        additionalLinks.push('📍 **Location:**');
        additionalLinks.push(...venueUrls);
      }

      // Event booking sources
      const eventUrls = metadata.sources
        ?.filter(s => s.url && (
          s.url.includes('eventbrite') ||
          s.url.includes('ticketmaster') ||
          s.url.includes('axs.com')
        ))
        ?.slice(0, 2)
        .map(s => `• [${s.title || 'Get Tickets'}](${s.url})`);

      if (eventUrls?.length) {
        additionalLinks.push('🎟️ **Event Tickets:**');
        additionalLinks.push(...eventUrls);
      }
    }

    // Booking tasks (hotels, flights, travel)
    if (combinedText.match(/book|hotel|flight|travel|accommodation|stay|airbnb|hostel|resort|trip|vacation/)) {
      const bookingUrls = metadata.sources
        ?.filter(s => s.url && (
          s.url.includes('booking.com') ||
          s.url.includes('expedia') ||
          s.url.includes('hotels.com') ||
          s.url.includes('airbnb') ||
          s.url.includes('kayak') ||
          s.url.includes('tripadvisor') ||
          s.url.includes('vrbo') ||
          s.url.includes('google.com/travel')
        ))
        ?.slice(0, 3)
        .map(s => `• [${s.title || 'Book Now'}](${s.url})`);

      if (bookingUrls?.length) {
        additionalLinks.push('🏨 **Booking:**');
        additionalLinks.push(...bookingUrls);
      }
    }

    // Shopping tasks
    if (combinedText.match(/shop|buy|purchase|order|amazon|store|mall/)) {
      const shoppingUrls = metadata.sources
        ?.filter(s => s.url && (
          s.url.includes('amazon') ||
          s.url.includes('target') ||
          s.url.includes('walmart') ||
          s.url.includes('bestbuy')
        ))
        ?.slice(0, 2)
        .map(s => `• [${s.title || 'Shop'}](${s.url})`);

      if (shoppingUrls?.length) {
        additionalLinks.push('🛒 **Shopping:**');
        additionalLinks.push(...shoppingUrls);
      }
    }

    // Inject URLs into notes if any found
    if (additionalLinks.length > 0) {
      const existingNotes = task.notes || '';
      const urlSection = additionalLinks.join('\n');
      task.notes = existingNotes
        ? `${existingNotes}\n\n${urlSection}`
        : urlSection;
      console.log(`[GROUNDING_URLS] Enriched task "${task.taskName}" with ${additionalLinks.length - Math.floor(additionalLinks.length / 4)} URLs`);
    }

    return task;
  });
}

// Export types for use in planner
export type { Type };
