/**
 * Dynamic Context-Aware Categorization Service
 *
 * Uses AI to extract rich context signals and score matches dynamically.
 * No hardcoded keywords - all categorization is context-driven.
 *
 * Key principles:
 * 1. Extract rich entity metadata using AI (type, year, location, attributes)
 * 2. Score API results against extracted context (like TMDB scoring)
 * 3. Validate enrichment matches original intent
 * 4. Use recency, popularity, and relevance signals
 */

import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

// Lazy initialization
let openaiClient: OpenAI | null = null;
let anthropicClient: Anthropic | null = null;

function getOpenAI(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

function getAnthropic(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
  if (!apiKey) return null;
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey });
  }
  return anthropicClient;
}

/**
 * Extracted context from user input - rich metadata for matching
 */
export interface ExtractedContext {
  // Core entity identification
  entityType: 'movie' | 'tv_show' | 'book' | 'music' | 'restaurant' | 'bar_club' | 'event' | 'fitness' | 'travel' | 'product' | 'unknown';
  entityName: string;           // Clean name without qualifiers
  originalQuery: string;        // Original input for reference

  // Temporal signals
  year?: number;                // Release year, publication year, event year
  season?: number;              // TV season number
  episode?: number;             // TV episode number
  isRecent: boolean;            // Likely refers to recent/current content

  // Source/Platform signals
  platform?: string;            // HBO, Netflix, Spotify, Yelp, etc.
  mediaFormat?: string;         // Movie, Series, Album, Single, etc.

  // Location signals (for restaurants, bars, events, travel)
  location?: string;            // City or specific location
  cuisine?: string;             // Italian, Japanese, etc.
  neighborhood?: string;        // Specific area like "SoHo", "Meatpacking"
  isNearMe: boolean;            // "near me", "nearby", "around here"
  venueType?: string;           // Bar type: rooftop, speakeasy, sports bar, lounge, nightclub

  // Activity signals (for fitness, hobbies)
  activityType?: string;        // Yoga, HIIT, Running, etc.
  equipment?: string[];         // Dumbbells, Treadmill, etc.
  muscleGroups?: string[];      // Chest, Back, Legs, etc.

  // Event signals
  eventType?: string;           // Concert, festival, comedy show, sports game, etc.
  eventDate?: string;           // Tonight, this weekend, specific date

  // Quality/popularity signals
  isPopular: boolean;           // Mentions trending, popular, viral, etc.
  hasAwards: boolean;           // Oscar, Grammy, Michelin, etc.

  // Confidence in extraction
  confidence: number;           // 0-1 how confident we are in this extraction

  // Additional context tags
  tags: string[];               // Any other relevant signals
}

/**
 * Scoring result for a candidate match
 */
export interface ScoredCandidate {
  id: string;
  name: string;
  score: number;
  matchDetails: {
    nameMatch: number;
    yearMatch: number;
    recencyBonus: number;
    popularityBonus: number;
    platformMatch: number;
    contextAlignment: number;
  };
  metadata: Record<string, any>;
}

/**
 * Validation result after enrichment
 */
export interface ValidationResult {
  isValid: boolean;
  confidence: number;
  reason: string;
  suggestedCategory?: string;
}

// Context extraction prompt - AI-driven, no hardcoded patterns
const CONTEXT_EXTRACTION_PROMPT = `You are an entity recognition and context extraction specialist. Analyze the input and extract rich metadata.

INPUT:
---
{input}
---

Extract the following information as JSON:

{
  "entityType": "movie | tv_show | book | music | restaurant | bar_club | event | fitness | travel | product | unknown",
  "entityName": "The clean name of the entity (e.g., 'Industry' not 'Industry Season 4 - HBO')",
  "year": null or number (release year, publication year, event date year),
  "season": null or number (TV season if mentioned),
  "episode": null or number (TV episode if mentioned),
  "isRecent": true if this refers to recent/current/new content (2023+),
  "platform": null or string (HBO, Netflix, Spotify, Hulu, Disney+, Apple TV+, Max, Amazon, YouTube, Yelp, etc.),
  "mediaFormat": null or string (Movie, Series, Limited Series, Documentary, Album, Single, EP, etc.),
  "location": null or string (city, address, or area - extract from context),
  "cuisine": null or string (for restaurants: Italian, Japanese, Mexican, etc.),
  "neighborhood": null or string (specific area like "SoHo", "West Village", "Meatpacking"),
  "isNearMe": true if query contains "near me", "nearby", "around here", "close by", "in my area",
  "venueType": null or string (for bars/clubs: rooftop, speakeasy, sports bar, lounge, nightclub, dive bar, cocktail bar, wine bar, brewery, pub),
  "activityType": null or string (for fitness: Yoga, HIIT, Running, Weightlifting, etc.),
  "equipment": [] or array of strings (Dumbbells, Barbell, Treadmill, etc.),
  "muscleGroups": [] or array of strings (Chest, Back, Legs, Arms, Core, etc.),
  "eventType": null or string (for events: concert, festival, comedy show, sports game, art exhibit, networking, party, etc.),
  "eventDate": null or string (tonight, this weekend, tomorrow, specific date if mentioned),
  "isPopular": true if mentions trending, popular, viral, #1, top, best, etc.,
  "hasAwards": true if mentions Oscar, Emmy, Grammy, Michelin, James Beard, etc.,
  "confidence": 0.0 to 1.0 how confident you are in this analysis,
  "tags": [] additional relevant context tags
}

ENTITY TYPE RULES:
1. "bar_club": bars, nightclubs, lounges, pubs, breweries, wine bars, speakeasies, rooftop bars
2. "event": concerts, festivals, shows, games, exhibits, parties, networking events
3. "restaurant": places primarily for dining (cafes, restaurants, eateries)
4. "tv_show": content with "Season X", streaming platforms (HBO, Netflix, etc.)
5. "movie": theatrical releases, films
6. "fitness": workouts, exercises, gym activities
7. "travel": hotels, destinations, attractions, landmarks

LOCATION HANDLING:
- "near me" / "nearby" → isNearMe: true
- Extract city/neighborhood even if implicit ("best bars in Brooklyn" → location: "Brooklyn")
- For "near me" queries, entityName should be the type of venue, not "near me"

EXAMPLES:
- "Industry Season 4 - HBO" → entityType: "tv_show", entityName: "Industry", season: 4, platform: "HBO"
- "Best rooftop bars near me" → entityType: "bar_club", entityName: "rooftop bars", venueType: "rooftop", isNearMe: true
- "Clubs in Miami Beach tonight" → entityType: "bar_club", entityName: "clubs", venueType: "nightclub", location: "Miami Beach", eventDate: "tonight"
- "Comedy shows this weekend NYC" → entityType: "event", entityName: "comedy shows", eventType: "comedy show", eventDate: "this weekend", location: "NYC"
- "Speakeasy bars Lower East Side" → entityType: "bar_club", entityName: "speakeasy bars", venueType: "speakeasy", neighborhood: "Lower East Side"
- "Jazz clubs near me" → entityType: "bar_club", entityName: "jazz clubs", venueType: "lounge", isNearMe: true, tags: ["jazz", "live music"]
- "Best ramen in NYC Lower East Side" → entityType: "restaurant", cuisine: "Japanese", location: "NYC", neighborhood: "Lower East Side"
- "Concerts happening tonight" → entityType: "event", entityName: "concerts", eventType: "concert", eventDate: "tonight"

Return ONLY valid JSON.`;

/**
 * Extract rich context from user input using AI
 */
export async function extractContext(input: string): Promise<ExtractedContext> {
  const openai = getOpenAI();
  const anthropic = getAnthropic();

  if (!openai && !anthropic) {
    console.warn("[DYNAMIC_CAT] No AI provider - using basic extraction");
    return basicContextExtraction(input);
  }

  const prompt = CONTEXT_EXTRACTION_PROMPT.replace("{input}", input);

  try {
    let result: string;

    if (openai) {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a JSON-only entity extraction API. Return only valid JSON." },
          { role: "user", content: prompt }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      });
      result = response.choices[0].message.content || "{}";
    } else if (anthropic) {
      const message = await anthropic.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
        system: "You are a JSON-only entity extraction API. Return only valid JSON, no markdown."
      });
      result = message.content[0].type === 'text' ? message.content[0].text : "{}";
    } else {
      return basicContextExtraction(input);
    }

    return parseContextResponse(result, input);
  } catch (error) {
    console.error("[DYNAMIC_CAT] Context extraction error:", error);
    return basicContextExtraction(input);
  }
}

/**
 * Parse AI response into ExtractedContext
 */
function parseContextResponse(response: string, originalInput: string): ExtractedContext {
  try {
    let jsonStr = response.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
    }

    const parsed = JSON.parse(jsonStr);

    return {
      entityType: parsed.entityType || 'unknown',
      entityName: parsed.entityName || originalInput,
      originalQuery: originalInput,
      year: parsed.year || undefined,
      season: parsed.season || undefined,
      episode: parsed.episode || undefined,
      isRecent: parsed.isRecent ?? true,
      platform: parsed.platform || undefined,
      mediaFormat: parsed.mediaFormat || undefined,
      location: parsed.location || undefined,
      cuisine: parsed.cuisine || undefined,
      neighborhood: parsed.neighborhood || undefined,
      isNearMe: parsed.isNearMe ?? false,
      venueType: parsed.venueType || undefined,
      activityType: parsed.activityType || undefined,
      equipment: parsed.equipment || [],
      muscleGroups: parsed.muscleGroups || [],
      eventType: parsed.eventType || undefined,
      eventDate: parsed.eventDate || undefined,
      isPopular: parsed.isPopular ?? false,
      hasAwards: parsed.hasAwards ?? false,
      confidence: parsed.confidence ?? 0.5,
      tags: parsed.tags || []
    };
  } catch (error) {
    console.error("[DYNAMIC_CAT] Failed to parse context:", error);
    return basicContextExtraction(originalInput);
  }
}

/**
 * Basic fallback extraction without AI
 */
function basicContextExtraction(input: string): ExtractedContext {
  const lower = input.toLowerCase();

  // Detect entity type from context
  let entityType: ExtractedContext['entityType'] = 'unknown';
  let venueType: string | undefined;
  let eventType: string | undefined;

  // Bar/Club signals (check before restaurant)
  if (/\bbar\b|\bclub\b|\blounge\b|\bpub\b|\bnightclub\b|\brooftop\b|\bspeakeasy\b|\bbrewery\b|\bwine\s*bar\b/i.test(input)) {
    entityType = 'bar_club';
    if (/rooftop/i.test(input)) venueType = 'rooftop';
    else if (/speakeasy/i.test(input)) venueType = 'speakeasy';
    else if (/nightclub|club/i.test(input)) venueType = 'nightclub';
    else if (/lounge/i.test(input)) venueType = 'lounge';
    else if (/brewery/i.test(input)) venueType = 'brewery';
    else if (/wine\s*bar/i.test(input)) venueType = 'wine bar';
    else if (/pub/i.test(input)) venueType = 'pub';
    else venueType = 'bar';
  }
  // Event signals
  else if (/\bconcert\b|\bfestival\b|\bshow\b|\btickets\b|\bevent\b|\bcomedy\b|\bexhibit\b/i.test(input)) {
    entityType = 'event';
    if (/concert/i.test(input)) eventType = 'concert';
    else if (/festival/i.test(input)) eventType = 'festival';
    else if (/comedy/i.test(input)) eventType = 'comedy show';
    else if (/exhibit/i.test(input)) eventType = 'art exhibit';
    else eventType = 'event';
  }
  // TV show signals
  else if (/season\s*\d+|episode\s*\d+|\bHBO\b|\bNetflix\b|\bseries\b/i.test(input)) {
    entityType = 'tv_show';
  }
  // Movie signals
  else if (/\bmovie\b|\bfilm\b|\bcinema\b|\btheater\b/i.test(input)) {
    entityType = 'movie';
  }
  // Fitness signals
  else if (/workout|exercise|gym|yoga|hiit|cardio|muscle|reps|sets/i.test(input)) {
    entityType = 'fitness';
  }
  // Restaurant signals
  else if (/restaurant|cafe|dinner|lunch|cuisine|reservation|brunch|breakfast/i.test(input)) {
    entityType = 'restaurant';
  }
  // Music signals
  else if (/album|song|artist|spotify|playlist/i.test(input)) {
    entityType = 'music';
  }
  // Book signals
  else if (/book|novel|author|reading|memoir|bestseller/i.test(input)) {
    entityType = 'book';
  }
  // Travel signals
  else if (/hotel|travel|trip|vacation|flight|destination/i.test(input)) {
    entityType = 'travel';
  }

  // Detect "near me" queries
  const isNearMe = /near\s*me|nearby|around\s*here|close\s*by|in\s*my\s*area/i.test(input);

  // Extract location
  const locationMatch = input.match(/\bin\s+([A-Z][a-zA-Z\s]+?)(?:\s+near|\s+tonight|\s+this|\s*$)/i);
  const location = locationMatch ? locationMatch[1].trim() : undefined;

  // Extract neighborhood
  const neighborhoods = ['soho', 'tribeca', 'les', 'lower east side', 'west village', 'east village', 'meatpacking', 'chelsea', 'midtown', 'brooklyn', 'williamsburg', 'bushwick'];
  const neighborhoodMatch = neighborhoods.find(n => lower.includes(n));
  const neighborhood = neighborhoodMatch ? neighborhoodMatch.charAt(0).toUpperCase() + neighborhoodMatch.slice(1) : undefined;

  // Extract event date
  let eventDate: string | undefined;
  if (/tonight/i.test(input)) eventDate = 'tonight';
  else if (/this\s*weekend/i.test(input)) eventDate = 'this weekend';
  else if (/tomorrow/i.test(input)) eventDate = 'tomorrow';

  // Extract year
  const yearMatch = input.match(/\b(19|20)\d{2}\b/);
  const year = yearMatch ? parseInt(yearMatch[0], 10) : undefined;

  // Extract season
  const seasonMatch = input.match(/season\s*(\d+)/i);
  const season = seasonMatch ? parseInt(seasonMatch[1], 10) : undefined;

  // Extract platform
  const platformMatch = input.match(/\b(HBO|Netflix|Disney\+?|Hulu|Amazon|Apple\s*TV\+?|Paramount\+?|Max|Peacock|Spotify|YouTube)\b/i);
  const platform = platformMatch ? platformMatch[1] : undefined;

  // Clean entity name
  let entityName = input
    .replace(/\s*[-–—]\s*.*$/i, '')
    .replace(/\s*season\s*\d+.*$/i, '')
    .replace(/\s*\(.*\)\s*$/i, '')
    .replace(/\b(HBO|Netflix|Disney\+?|Hulu|Amazon|Max|Spotify)\b/gi, '')
    .replace(/\bnear\s*me\b|\bnearby\b/gi, '')
    .replace(/\btonight\b|\bthis\s*weekend\b|\btomorrow\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    entityType,
    entityName: entityName || input,
    originalQuery: input,
    year,
    season,
    isRecent: year ? year >= 2023 : true,
    platform,
    location,
    neighborhood,
    isNearMe,
    venueType,
    eventType,
    eventDate,
    isPopular: /trending|popular|viral|#1|top\s+\d|best/i.test(input),
    hasAwards: /oscar|emmy|grammy|golden\s*globe|michelin|james\s*beard/i.test(input),
    confidence: 0.3,
    tags: []
  };
}

/**
 * Score a candidate against extracted context
 * Uses the same multi-signal approach as TMDB scoring
 */
export function scoreCandidate(
  candidate: { name: string; year?: number; popularity?: number; voteCount?: number; [key: string]: any },
  context: ExtractedContext
): ScoredCandidate {
  let score = 0;
  const matchDetails = {
    nameMatch: 0,
    yearMatch: 0,
    recencyBonus: 0,
    popularityBonus: 0,
    platformMatch: 0,
    contextAlignment: 0
  };

  // 1. Name similarity (0-1)
  matchDetails.nameMatch = calculateNameSimilarity(context.entityName, candidate.name);
  score += matchDetails.nameMatch;

  // 2. Year matching
  if (context.year && candidate.year) {
    if (candidate.year === context.year) {
      matchDetails.yearMatch = 0.25;
    } else if (Math.abs(candidate.year - context.year) <= 1) {
      matchDetails.yearMatch = 0.1;
    } else {
      matchDetails.yearMatch = -0.2; // Penalty for wrong year
    }
    score += matchDetails.yearMatch;
  }

  // 3. Recency bonus (for content expected to be recent)
  if (context.isRecent && candidate.year) {
    if (candidate.year >= 2020) {
      matchDetails.recencyBonus = 0.15;
    } else if (candidate.year < 2000) {
      matchDetails.recencyBonus = -0.25; // Penalty for old content when expecting recent
    }
    score += matchDetails.recencyBonus;
  }

  // 4. Popularity bonus
  if (candidate.popularity && candidate.popularity > 50) {
    matchDetails.popularityBonus = 0.1;
  } else if (candidate.voteCount && candidate.voteCount > 500) {
    matchDetails.popularityBonus = 0.1;
  } else if (candidate.voteCount && candidate.voteCount > 100) {
    matchDetails.popularityBonus = 0.05;
  }
  score += matchDetails.popularityBonus;

  // 5. Platform/source alignment
  if (context.platform && candidate.networks) {
    const networks = Array.isArray(candidate.networks)
      ? candidate.networks.map((n: any) => (n.name || n).toLowerCase())
      : [];
    if (networks.some((n: string) => n.includes(context.platform!.toLowerCase()))) {
      matchDetails.platformMatch = 0.15;
      score += matchDetails.platformMatch;
    }
  }

  // 6. Context alignment (fitness: muscle groups, restaurant: cuisine, etc.)
  if (context.entityType === 'fitness' && context.muscleGroups?.length) {
    const candidateText = JSON.stringify(candidate).toLowerCase();
    const matches = context.muscleGroups.filter(mg =>
      candidateText.includes(mg.toLowerCase())
    );
    matchDetails.contextAlignment = matches.length / context.muscleGroups.length * 0.2;
    score += matchDetails.contextAlignment;
  }

  if (context.entityType === 'restaurant' && context.cuisine) {
    const candidateText = JSON.stringify(candidate).toLowerCase();
    if (candidateText.includes(context.cuisine.toLowerCase())) {
      matchDetails.contextAlignment = 0.2;
      score += matchDetails.contextAlignment;
    }
  }

  return {
    id: candidate.id || candidate.name,
    name: candidate.name,
    score,
    matchDetails,
    metadata: candidate
  };
}

/**
 * Calculate name similarity between two strings
 * Uses word-based matching like TMDB service
 */
function calculateNameSimilarity(query: string, candidate: string): number {
  const normalize = (s: string) => s.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const queryNorm = normalize(query);
  const candidateNorm = normalize(candidate);

  // Exact match
  if (queryNorm === candidateNorm) return 1.0;

  // Word-based matching
  const queryWords = queryNorm.split(' ').filter(w => w.length > 1);
  const candidateWords = candidateNorm.split(' ').filter(w => w.length > 1);

  if (queryWords.length === 0) return 0;

  let matches = 0;
  for (const qWord of queryWords) {
    if (candidateWords.some(cWord =>
      cWord === qWord || cWord.includes(qWord) || qWord.includes(cWord)
    )) {
      matches++;
    }
  }

  return matches / queryWords.length;
}

/**
 * Validate that an enrichment result matches the original intent
 */
export async function validateEnrichment(
  context: ExtractedContext,
  enrichmentResult: any,
  enrichmentSource: string
): Promise<ValidationResult> {
  // Quick validation checks

  // 1. Year mismatch check
  if (context.year && enrichmentResult.year) {
    const resultYear = typeof enrichmentResult.year === 'string'
      ? parseInt(enrichmentResult.year, 10)
      : enrichmentResult.year;

    if (Math.abs(context.year - resultYear) > 2) {
      return {
        isValid: false,
        confidence: 0.9,
        reason: `Year mismatch: expected ${context.year}, got ${resultYear}`
      };
    }
  }

  // 2. Entity type mismatch check
  if (context.entityType === 'tv_show' && enrichmentSource === 'tmdb_movie') {
    return {
      isValid: false,
      confidence: 0.95,
      reason: 'Expected TV show but got movie result'
    };
  }

  if (context.entityType === 'movie' && enrichmentSource === 'tmdb_tv') {
    return {
      isValid: true,
      confidence: 0.7,
      reason: 'Movie query matched TV result - may be correct for limited series'
    };
  }

  // 3. Name similarity check
  const nameSimilarity = calculateNameSimilarity(
    context.entityName,
    enrichmentResult.title || enrichmentResult.name || ''
  );

  if (nameSimilarity < 0.5) {
    return {
      isValid: false,
      confidence: 0.85,
      reason: `Name mismatch: "${context.entityName}" vs "${enrichmentResult.title || enrichmentResult.name}"`
    };
  }

  // 4. Recency check for expected recent content
  if (context.isRecent && enrichmentResult.year) {
    const resultYear = typeof enrichmentResult.year === 'string'
      ? parseInt(enrichmentResult.year, 10)
      : enrichmentResult.year;

    if (resultYear < 2000 && !context.year) {
      return {
        isValid: false,
        confidence: 0.8,
        reason: `Expected recent content but got ${resultYear} result`
      };
    }
  }

  // All checks passed
  return {
    isValid: true,
    confidence: Math.max(0.6, nameSimilarity),
    reason: 'Enrichment matches context'
  };
}

/**
 * Build a location-aware search query
 */
function buildLocationQuery(context: ExtractedContext): string {
  let query = context.entityName;

  // Add venue type for specificity
  if (context.venueType && !query.toLowerCase().includes(context.venueType.toLowerCase())) {
    query = `${context.venueType} ${query}`;
  }

  // Add location context
  if (context.neighborhood) {
    query += ` ${context.neighborhood}`;
  } else if (context.location) {
    query += ` ${context.location}`;
  }

  // Add event date for time-sensitive queries
  if (context.eventDate) {
    query += ` ${context.eventDate}`;
  }

  return query.trim();
}

/**
 * Get the best API to use for enrichment based on context
 */
export function selectEnrichmentAPI(context: ExtractedContext): {
  primary: string;
  fallback: string;
  searchParams: Record<string, any>;
} {
  const searchParams: Record<string, any> = {
    query: context.entityName,
    year: context.year
  };

  switch (context.entityType) {
    case 'movie':
      return {
        primary: 'tmdb_movie',
        fallback: 'tavily',
        searchParams: { ...searchParams, type: 'movie' }
      };

    case 'tv_show':
      return {
        primary: 'tmdb_tv',
        fallback: 'tavily',
        searchParams: {
          ...searchParams,
          type: 'tv',
          season: context.season
        }
      };

    case 'book':
      return {
        primary: 'google_books',
        fallback: 'tavily',
        searchParams
      };

    case 'music':
      return {
        primary: 'spotify',
        fallback: 'tavily',
        searchParams: {
          ...searchParams,
          artist: context.tags.find(t => t.startsWith('artist:'))?.replace('artist:', '')
        }
      };

    case 'restaurant':
      return {
        primary: 'tavily',
        fallback: 'tavily',
        searchParams: {
          query: buildLocationQuery(context),
          location: context.location,
          neighborhood: context.neighborhood,
          cuisine: context.cuisine,
          isNearMe: context.isNearMe,
          domains: ['yelp.com', 'tripadvisor.com', 'opentable.com', 'resy.com', 'google.com/maps']
        }
      };

    case 'bar_club':
      return {
        primary: 'tavily',
        fallback: 'tavily',
        searchParams: {
          query: buildLocationQuery(context),
          location: context.location,
          neighborhood: context.neighborhood,
          venueType: context.venueType,
          isNearMe: context.isNearMe,
          eventDate: context.eventDate,
          // Bars/clubs: use nightlife-focused domains
          domains: [
            'yelp.com',
            'timeout.com',
            'thrillist.com',
            'infatuation.com',
            'foursquare.com',
            'tripadvisor.com',
            'google.com/maps'
          ]
        }
      };

    case 'event':
      return {
        primary: 'tavily',
        fallback: 'tavily',
        searchParams: {
          query: buildLocationQuery(context),
          location: context.location,
          neighborhood: context.neighborhood,
          eventType: context.eventType,
          eventDate: context.eventDate,
          isNearMe: context.isNearMe,
          // Events: use ticketing and event discovery domains
          domains: [
            'eventbrite.com',
            'ticketmaster.com',
            'stubhub.com',
            'dice.fm',
            'seetickets.com',
            'songkick.com',
            'bandsintown.com',
            'timeout.com'
          ]
        }
      };

    case 'fitness':
      return {
        primary: 'tavily',
        fallback: 'ai_generate',
        searchParams: {
          ...searchParams,
          activityType: context.activityType,
          muscleGroups: context.muscleGroups,
          equipment: context.equipment,
          domains: ['muscleandstrength.com', 'bodybuilding.com', 'exrx.net', 'acefitness.org']
        }
      };

    case 'travel':
      return {
        primary: 'tavily',
        fallback: 'tavily',
        searchParams: {
          query: buildLocationQuery(context),
          location: context.location,
          neighborhood: context.neighborhood,
          domains: ['tripadvisor.com', 'booking.com', 'hotels.com', 'expedia.com', 'lonelyplanet.com']
        }
      };

    default:
      return {
        primary: 'tavily',
        fallback: 'ai_generate',
        searchParams
      };
  }
}

/**
 * Get dynamic threshold based on context
 * Short names need higher thresholds, popular content can be slightly lower
 */
export function getDynamicThreshold(context: ExtractedContext): number {
  const wordCount = context.entityName.split(/\s+/).filter(w => w.length > 1).length;

  // Base threshold
  let threshold = 0.6;

  // Short titles need stricter matching
  if (wordCount <= 2) {
    threshold = 0.75;
  }

  // If we have strong context signals, we can be slightly more lenient
  if (context.year || context.platform || context.season) {
    threshold -= 0.05;
  }

  // Popular content with awards should match closely
  if (context.hasAwards) {
    threshold += 0.05;
  }

  return Math.max(0.5, Math.min(0.85, threshold));
}

/**
 * Map extracted entity type to journal category
 */
export function mapEntityTypeToCategory(entityType: ExtractedContext['entityType']): string {
  const mapping: Record<ExtractedContext['entityType'], string> = {
    'movie': 'movies',
    'tv_show': 'movies',
    'book': 'books',
    'music': 'music',
    'restaurant': 'restaurants',
    'bar_club': 'hobbies',  // Bars/clubs go to hobbies (nightlife activities)
    'event': 'hobbies',     // Events go to hobbies (activities)
    'fitness': 'hobbies',
    'travel': 'travel',
    'product': 'favorites',
    'unknown': 'notes'
  };

  return mapping[entityType] || 'notes';
}

/**
 * Main entry point: Extract context and determine best categorization approach
 */
export async function analyzeAndCategorize(input: string): Promise<{
  context: ExtractedContext;
  suggestedCategory: string;
  enrichmentStrategy: ReturnType<typeof selectEnrichmentAPI>;
  threshold: number;
}> {
  console.log(`[DYNAMIC_CAT] Analyzing: "${input}"`);

  const context = await extractContext(input);
  console.log(`[DYNAMIC_CAT] Extracted context:`, JSON.stringify(context, null, 2));

  const suggestedCategory = mapEntityTypeToCategory(context.entityType);
  const enrichmentStrategy = selectEnrichmentAPI(context);
  const threshold = getDynamicThreshold(context);

  console.log(`[DYNAMIC_CAT] Strategy: category=${suggestedCategory}, api=${enrichmentStrategy.primary}, threshold=${threshold}`);

  return {
    context,
    suggestedCategory,
    enrichmentStrategy,
    threshold
  };
}
