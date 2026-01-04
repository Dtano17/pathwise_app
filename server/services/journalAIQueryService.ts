import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

export type EnrichmentAPI = 'tmdb' | 'google_books' | 'spotify' | 'tavily' | 'ai_query';

export interface AIQueryResult {
  recommendedAPI: EnrichmentAPI;  // Which API/approach to use
  searchQuery: string;             // Optimized search query for the recommended API
  contentType: string;             // Detected content type (movie, book, music, outdoor_event, etc.)
  confidence: number;              // 0.0 - 1.0
  reasoning: string;               // Why AI chose this API and query
  extractedTitle?: string;         // Extracted movie/book/song title (if applicable)
  extractedDetails?: string;       // Author/artist/director (if applicable)
}

/**
 * Uses AI to analyze journal entry and generate optimal image search query
 * Replaces static keyword-based queries with context-aware queries
 */
export async function generateSmartImageQuery(
  entryText: string,
  category: string,
  venueName?: string
): Promise<AIQueryResult> {
  const prompt = `You are an expert at analyzing journal entries and recommending the best data source for finding relevant images.

Journal Entry: "${entryText}"
Category: ${category}
${venueName ? `Detected Venue/Title: "${venueName}"` : ''}

Available APIs:
1. TMDB (The Movie Database) - For movies, TV shows, documentaries
2. Google Books - For books, novels, textbooks, magazines
3. Spotify - For music, albums, songs, concerts, music events
4. Tavily - General web search for any other content
5. AI Query - Custom AI-generated query for web search when content is ambiguous

Analyze this entry and determine:
1. What is the PRIMARY subject? (movie, book, music, restaurant, outdoor event, fitness, etc.)
2. Which API would provide the BEST, most accurate image for this entry?
3. Extract specific details (title, author/artist/director, year) if it's media content
4. Generate an optimized search query for the recommended API

Decision Guidelines:
- Choose TMDB if: Entry clearly mentions watching/seeing a movie, TV show, or documentary
- Choose Google Books if: Entry clearly mentions reading a book, novel, or publication
- Choose Spotify if: Entry mentions listening to music, attending a concert, or specific songs/albums
- Choose Tavily if: Entry is about restaurants, travel, activities, events, fitness, or general experiences
- Choose AI Query if: Content is ambiguous and needs custom intelligent query generation

For TMDB/Books/Spotify:
- Extract the exact title from the entry
- Extract author/artist/director if mentioned
- searchQuery should be the clean title for API lookup

For Tavily/AI Query:
- Generate a detailed, context-rich search query
- Include location, time of day, activity type, visual elements
- Focus on what cameras can capture

Return JSON:
{
  "recommendedAPI": "tmdb" | "google_books" | "spotify" | "tavily" | "ai_query",
  "searchQuery": "optimized query for the recommended API",
  "contentType": "movie|book|music|restaurant|outdoor_event|fitness|etc",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation of why this API was chosen",
  "extractedTitle": "exact title if media content, otherwise omit",
  "extractedDetails": "author/artist/director if known, otherwise omit"
}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 500,
      temperature: 0.3, // Low temp for consistent results
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const content = response.content[0];
    if (content.type === 'text') {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]) as AIQueryResult;
        console.log('[AI Query Generator]', {
          entry: entryText.substring(0, 50),
          query: result.searchQuery,
          type: result.contentType,
          confidence: result.confidence
        });
        return result;
      }
    }

    throw new Error('Failed to parse AI response');
  } catch (error) {
    console.error('[AI Query Generator] Error:', error);
    // Fallback to Tavily with basic query
    return {
      recommendedAPI: 'tavily',
      searchQuery: venueName || entryText.substring(0, 50),
      contentType: 'unknown',
      confidence: 0.5,
      reasoning: 'Fallback to Tavily due to AI error'
    };
  }
}

/**
 * Cache AI results to avoid repeated calls for similar entries
 */
const queryCache = new Map<string, AIQueryResult>();

export async function generateSmartImageQueryCached(
  entryText: string,
  category: string,
  venueName?: string
): Promise<AIQueryResult> {
  const cacheKey = `${entryText.substring(0, 100)}_${category}`;

  if (queryCache.has(cacheKey)) {
    console.log('[AI Query Generator] Cache hit');
    return queryCache.get(cacheKey)!;
  }

  const result = await generateSmartImageQuery(entryText, category, venueName);
  queryCache.set(cacheKey, result);

  // Limit cache size to 1000 entries
  if (queryCache.size > 1000) {
    const firstKey = queryCache.keys().next().value;
    queryCache.delete(firstKey);
  }

  return result;
}
