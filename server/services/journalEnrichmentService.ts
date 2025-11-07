import { executeLLMCall, type ILLMProvider } from './llmProvider';

/**
 * Journal Enrichment Service
 * Automatically extracts structured insights, keywords, and preferences from journal entries
 * to power personalized AI planning
 */

export interface EnrichedJournalData {
  keywords: string[];
  extractedData: {
    // Common fields across all categories
    location?: string;
    city?: string;
    neighborhood?: string;
    priceRange?: '$' | '$$' | '$$$' | '$$$$';
    vibe?: string[];
    occasion?: string[];
    
    // Category-specific fields
    // Restaurants
    cuisine?: string[];
    dishTypes?: string[];
    restaurantType?: string; // casual, fine-dining, fast-casual, etc.
    
    // Travel
    accommodationType?: string; // hotel, airbnb, resort, hostel, etc.
    travelStyle?: string[]; // adventure, luxury, budget, cultural, etc.
    activities?: string[];
    transportation?: string[];
    
    // Books & Movies
    genre?: string[];
    mood?: string[];
    rating?: number;
    
    // Shopping
    brand?: string;
    category?: string;
    style?: string[];
    
    // Self-care
    activityType?: string[];
    duration?: string;
    
    // Work
    projectType?: string;
    skills?: string[];
  };
  aiConfidence: number;
  suggestions?: string[]; // AI-generated suggestions based on this entry
}

/**
 * Enrich a journal entry with AI-extracted insights
 */
export async function enrichJournalEntry(
  text: string,
  category: string,
  existingKeywords?: string[]
): Promise<EnrichedJournalData> {
  
  console.log(`[JOURNAL ENRICHMENT] Enriching entry for category: ${category}`);
  
  // Build category-specific extraction prompt
  const prompt = buildEnrichmentPrompt(text, category, existingKeywords);
  
  try {
    const result = await executeLLMCall(
      'slot_extraction',
      async (provider: ILLMProvider) => {
        return await provider.generateStructured(
          [
            {
              role: 'system',
              content: `You are a journal enrichment expert. Extract structured insights from user journal entries to power personalized recommendations.
              
Your task is to analyze the text and extract:
1. Keywords (5-10 relevant terms)
2. Structured data specific to the category
3. Confidence score (0-1) on extraction accuracy
4. Optional: 1-2 brief suggestions for future activities

Be precise but generous - if the user mentions something implicitly, extract it.
Example: "Loved the rooftop at sunset" → location: rooftop, vibe: [romantic, scenic], occasion: [date, evening]`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          [
            {
              name: 'extract_journal_insights',
              description: 'Extract structured insights from journal entry',
              parameters: {
                type: 'object',
                properties: {
                  keywords: {
                    type: 'array',
                    items: { type: 'string' },
                    description: '5-10 relevant keywords extracted from the text'
                  },
                  extractedData: {
                    type: 'object',
                    description: 'Structured data specific to the category',
                    properties: getCategorySchema(category)
                  },
                  aiConfidence: {
                    type: 'number',
                    description: 'Confidence score from 0 to 1'
                  },
                  suggestions: {
                    type: 'array',
                    items: { type: 'string' },
                    description: '1-2 brief suggestions for similar future activities (optional)'
                  }
                },
                required: ['keywords', 'extractedData', 'aiConfidence']
              }
            }
          ],
          { functionCall: { name: 'extract_journal_insights' } }
        );
      },
      { retries: 2 }
    );
    
    // Parse the function call result
    let parsedResult: any;
    if (result.functionCall) {
      parsedResult = JSON.parse(result.functionCall.arguments);
    } else {
      // Fallback: try to parse from content
      parsedResult = JSON.parse(result.content);
    }
    
    console.log(`[JOURNAL ENRICHMENT] Extracted ${parsedResult.keywords?.length || 0} keywords, confidence: ${parsedResult.aiConfidence}`);
    
    return {
      keywords: parsedResult.keywords || [],
      extractedData: parsedResult.extractedData || {},
      aiConfidence: parsedResult.aiConfidence || 0.5,
      suggestions: parsedResult.suggestions
    };
    
  } catch (error) {
    console.error('[JOURNAL ENRICHMENT] Error enriching entry:', error);
    
    // Fallback: Basic keyword extraction using simple NLP
    return {
      keywords: extractBasicKeywords(text),
      extractedData: {},
      aiConfidence: 0.3,
    };
  }
}

/**
 * Build category-specific enrichment prompt
 */
function buildEnrichmentPrompt(text: string, category: string, existingKeywords?: string[]): string {
  const categoryGuides: Record<string, string> = {
    restaurants: `Extract:
- cuisine types (Italian, Mexican, fusion, etc.)
- price range ($, $$, $$$, $$$$)
- restaurant type (casual, fine-dining, fast-casual, food-truck)
- vibe (romantic, family-friendly, trendy, cozy, upscale)
- dish types mentioned
- location details (city, neighborhood)
- occasion suitability (date-night, business-lunch, celebration)`,

    travel: `Extract:
- destination (city, country, region)
- accommodation type (hotel, airbnb, resort, hostel, camping)
- travel style (adventure, luxury, budget, cultural, relaxation)
- activities done or planned
- transportation used
- vibe and atmosphere
- occasion (vacation, business, weekend-getaway)`,

    books: `Extract:
- genre (fiction, non-fiction, mystery, romance, sci-fi, etc.)
- mood/tone (inspiring, dark, lighthearted, thought-provoking)
- themes
- rating (1-5 if mentioned)
- occasion when read (vacation, commute, bedtime)`,

    movies: `Extract:
- genre (action, comedy, drama, documentary, etc.)
- mood/tone
- themes
- rating (1-5 if mentioned)
- viewing context (theater, streaming, date-night)`,

    shopping: `Extract:
- brand names
- product category (clothing, electronics, home, beauty)
- style (minimalist, trendy, classic, bohemian)
- price range
- occasion (everyday, special-event, gift)`,

    notes: `Extract:
- topics/themes
- context (work, personal, learning)
- mood if mentioned
- any goals or intentions`,

    'self-care': `Extract:
- activity type (meditation, spa, exercise, therapy, journaling)
- duration if mentioned
- location (home, studio, outdoors)
- mood/feeling before and after
- occasion (weekly-routine, stress-relief, celebration)`,

    work: `Extract:
- project type
- skills used or learned
- collaboration context (solo, team, client)
- industry/domain
- achievement or challenge mentioned`,

    activities: `Extract:
- activity type(s) (hiking, concert, gaming, photography, cooking, etc.)
- location details (city, venue, environment)
- participants (solo, partner, group, family, friends)
- duration if mentioned
- difficulty (easy, moderate, challenging) if applicable
- vibe/mood
- occasion
- price range if mentioned`
  };

  const categoryNormalized = category.toLowerCase().replace(/[^a-z]/g, '-');
  const guide = categoryGuides[categoryNormalized] || categoryGuides['notes'];

  let prompt = `Category: ${category}\n\nJournal Entry:\n"${text}"\n\n${guide}`;
  
  if (existingKeywords && existingKeywords.length > 0) {
    prompt += `\n\nExisting keywords to consider: ${existingKeywords.join(', ')}`;
  }
  
  return prompt;
}

/**
 * Get JSON schema for category-specific extraction
 */
function getCategorySchema(category: string): Record<string, any> {
  const baseSchema = {
    location: { type: 'string' },
    city: { type: 'string' },
    neighborhood: { type: 'string' },
    priceRange: { 
      type: 'string',
      enum: ['$', '$$', '$$$', '$$$$']
    },
    vibe: {
      type: 'array',
      items: { type: 'string' }
    },
    occasion: {
      type: 'array',
      items: { type: 'string' }
    }
  };

  const categorySchemas: Record<string, any> = {
    restaurants: {
      ...baseSchema,
      cuisine: {
        type: 'array',
        items: { type: 'string' }
      },
      dishTypes: {
        type: 'array',
        items: { type: 'string' }
      },
      restaurantType: { type: 'string' }
    },
    
    travel: {
      ...baseSchema,
      accommodationType: { type: 'string' },
      travelStyle: {
        type: 'array',
        items: { type: 'string' }
      },
      activities: {
        type: 'array',
        items: { type: 'string' }
      },
      transportation: {
        type: 'array',
        items: { type: 'string' }
      }
    },
    
    books: {
      genre: {
        type: 'array',
        items: { type: 'string' }
      },
      mood: {
        type: 'array',
        items: { type: 'string' }
      },
      rating: {
        type: 'number',
        minimum: 1,
        maximum: 5
      }
    },
    
    movies: {
      genre: {
        type: 'array',
        items: { type: 'string' }
      },
      mood: {
        type: 'array',
        items: { type: 'string' }
      },
      rating: {
        type: 'number',
        minimum: 1,
        maximum: 5
      }
    },
    
    shopping: {
      ...baseSchema,
      brand: { type: 'string' },
      category: { type: 'string' },
      style: {
        type: 'array',
        items: { type: 'string' }
      }
    },
    
    'self-care': {
      activityType: {
        type: 'array',
        items: { type: 'string' }
      },
      duration: { type: 'string' },
      location: { type: 'string' }
    },
    
    work: {
      projectType: { type: 'string' },
      skills: {
        type: 'array',
        items: { type: 'string' }
      }
    },
    
    activities: {
      ...baseSchema,
      activityType: {
        type: 'array',
        items: { type: 'string' }
      },
      participants: {
        type: 'string',
        description: 'Who participated (solo, partner, group, family, friends)'
      },
      duration: { type: 'string' },
      difficulty: { 
        type: 'string',
        enum: ['easy', 'moderate', 'challenging']
      }
    }
  };

  const categoryNormalized = category.toLowerCase().replace(/[^a-z]/g, '-');
  return categorySchemas[categoryNormalized] || baseSchema;
}

/**
 * Fallback: Extract basic keywords using simple text analysis
 */
function extractBasicKeywords(text: string): string[] {
  // Remove common words and extract meaningful terms
  const commonWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'was', 'were', 'is', 'are', 'been', 'be',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those',
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'my', 'your', 'his',
    'her', 'its', 'our', 'their', 'me', 'him', 'us', 'them'
  ]);

  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !commonWords.has(word));

  // Count frequency
  const frequency = new Map<string, number>();
  words.forEach(word => {
    frequency.set(word, (frequency.get(word) || 0) + 1);
  });

  // Get top 5 most frequent words
  return Array.from(frequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);
}

/**
 * Batch enrich multiple journal entries (for migration/bulk processing)
 */
export async function batchEnrichJournalEntries(
  entries: Array<{ text: string; category: string; id: string }>
): Promise<Map<string, EnrichedJournalData>> {
  console.log(`[JOURNAL ENRICHMENT] Batch enriching ${entries.length} entries`);
  
  const results = new Map<string, EnrichedJournalData>();
  
  // Process in batches of 5 to avoid rate limits
  const batchSize = 5;
  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);
    
    const batchResults = await Promise.all(
      batch.map(async (entry) => {
        const enriched = await enrichJournalEntry(entry.text, entry.category);
        return { id: entry.id, enriched };
      })
    );
    
    batchResults.forEach(({ id, enriched }) => {
      results.set(id, enriched);
    });
    
    // Small delay between batches
    if (i + batchSize < entries.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log(`[JOURNAL ENRICHMENT] Batch enrichment complete: ${results.size} entries processed`);
  return results;
}
