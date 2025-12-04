import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

// Lazy initialization of clients - only create when API keys are available
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

// Check if any AI provider is configured
export function isCategorizationAvailable(): boolean {
  return !!(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY);
}

// Error result for when categorization is unavailable
export interface CategorizationError {
  success: false;
  error: string;
  code: 'NO_API_KEY' | 'API_ERROR' | 'PARSE_ERROR';
}

export interface CategorizationSuccess {
  success: true;
  data: CategorizedContent;
}

export type CategorizationResult = CategorizationSuccess | CategorizationError;

export interface CategorizedContent {
  location: string | null;
  city: string | null;
  country: string | null;
  neighborhood: string | null;
  category: ContentCategory;
  subcategory: string | null;
  venues: VenueInfo[];
  budgetTier: BudgetTier | null;
  estimatedCost: number | null;
  title: string | null;
  tags: string[];
}

export interface VenueInfo {
  name: string;
  type: string;
  location?: string;
  priceRange?: string;
  priceAmount?: number;
  description?: string;
  address?: string;
}

export type ContentCategory = 
  | "restaurants"
  | "bars_nightlife"
  | "cafes"
  | "hotels_accommodation"
  | "attractions_activities"
  | "shopping"
  | "wellness_spa"
  | "outdoor_nature"
  | "entertainment"
  | "travel_itinerary"
  | "food_cooking"
  | "fitness"
  | "other";

export type BudgetTier = "budget" | "moderate" | "luxury" | "ultra_luxury";

const CATEGORIZATION_PROMPT = `You are a content categorization specialist. Analyze the extracted content from a social media post or article and categorize it.

CONTENT TO ANALYZE:
---
{content}
---

PLATFORM: {platform}

Extract and return a JSON object with the following structure:
{
  "location": "Full location name (e.g., 'Lagos, Nigeria' or 'West Hollywood, Los Angeles')",
  "city": "City name only (e.g., 'Lagos' or 'Los Angeles')",
  "country": "Country name (e.g., 'Nigeria' or 'USA')",
  "neighborhood": "Specific area/neighborhood if mentioned (e.g., 'Victoria Island' or 'Malibu')",
  "category": "One of: restaurants, bars_nightlife, cafes, hotels_accommodation, attractions_activities, shopping, wellness_spa, outdoor_nature, entertainment, travel_itinerary, food_cooking, fitness, other",
  "subcategory": "More specific type (e.g., 'rooftop bars', 'fine dining', 'beach clubs')",
  "venues": [
    {
      "name": "Exact venue name from content",
      "type": "Type of venue (restaurant, bar, hotel, attraction, etc.)",
      "location": "Address or area within the city",
      "priceRange": "$, $$, $$$, or $$$$",
      "priceAmount": null or number if specific price mentioned,
      "description": "Brief description from content"
    }
  ],
  "budgetTier": "One of: budget (under $50/person), moderate ($50-150/person), luxury ($150-400/person), ultra_luxury ($400+/person) - based on venues mentioned",
  "estimatedCost": null or estimated cost per person in USD,
  "title": "A descriptive title for this saved content (e.g., 'Lagos Rooftop Bars & Nightlife')",
  "tags": ["array", "of", "relevant", "tags", "for", "searchability"]
}

RULES:
1. Extract ONLY information explicitly mentioned in the content
2. For venues, capture EXACT names as written (preserve spelling, capitalization)
3. If price is mentioned (e.g., "$50 per person", "₦15,000"), include in priceAmount
4. For multi-location content, use the PRIMARY destination
5. Category should reflect the MAIN focus of the content
6. Tags should include: city name, venue types, specific activities, cuisine types
7. If information is not available, use null (don't guess)
8. For social media content, venues are usually in OCR text or caption mentions

IMPORTANT: Return ONLY valid JSON, no markdown formatting or explanation.`;

export async function categorizeContent(
  extractedContent: string,
  platform: string
): Promise<CategorizedContent> {
  // Check if any AI provider is available
  const openai = getOpenAI();
  const anthropic = getAnthropic();
  
  if (!openai && !anthropic) {
    console.warn("[CATEGORIZATION] No AI provider configured (missing OPENAI_API_KEY and ANTHROPIC_API_KEY). Returning default categorization.");
    return getDefaultCategorization();
  }
  
  const prompt = CATEGORIZATION_PROMPT
    .replace("{content}", extractedContent)
    .replace("{platform}", platform);

  try {
    const useOpenAI = openai && !process.env.PREFER_ANTHROPIC;
    
    if (useOpenAI && openai) {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a JSON-only content categorization API. Return only valid JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      });

      const result = response.choices[0].message.content;
      if (!result) {
        throw new Error("Empty response from OpenAI");
      }

      return parseCategorizationResponse(result);
    } else if (anthropic) {
      const message = await anthropic.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 2000,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        system: "You are a JSON-only content categorization API. Return only valid JSON, no markdown."
      });

      const result = message.content[0].type === 'text' ? message.content[0].text : '';
      return parseCategorizationResponse(result);
    } else {
      console.warn("[CATEGORIZATION] No AI provider available after checks. Returning default.");
      return getDefaultCategorization();
    }
  } catch (error) {
    console.error("[CATEGORIZATION] Error categorizing content:", error);
    return getDefaultCategorization();
  }
}

/**
 * Categorize content with explicit error handling
 * Returns a result object indicating success/failure with details
 */
export async function categorizeContentWithResult(
  extractedContent: string,
  platform: string
): Promise<CategorizationResult> {
  // Check if any AI provider is available
  const openai = getOpenAI();
  const anthropic = getAnthropic();
  
  if (!openai && !anthropic) {
    console.warn("[CATEGORIZATION] No AI provider configured");
    return {
      success: false,
      error: "Content categorization is unavailable. Please configure OPENAI_API_KEY or ANTHROPIC_API_KEY.",
      code: 'NO_API_KEY'
    };
  }
  
  const prompt = CATEGORIZATION_PROMPT
    .replace("{content}", extractedContent)
    .replace("{platform}", platform);

  try {
    const useOpenAI = openai && !process.env.PREFER_ANTHROPIC;
    
    if (useOpenAI && openai) {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a JSON-only content categorization API. Return only valid JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      });

      const result = response.choices[0].message.content;
      if (!result) {
        return {
          success: false,
          error: "Empty response from OpenAI",
          code: 'API_ERROR'
        };
      }

      return {
        success: true,
        data: parseCategorizationResponse(result)
      };
    } else if (anthropic) {
      const message = await anthropic.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 2000,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        system: "You are a JSON-only content categorization API. Return only valid JSON, no markdown."
      });

      const result = message.content[0].type === 'text' ? message.content[0].text : '';
      return {
        success: true,
        data: parseCategorizationResponse(result)
      };
    } else {
      return {
        success: false,
        error: "No AI provider available",
        code: 'NO_API_KEY'
      };
    }
  } catch (error: any) {
    console.error("[CATEGORIZATION] Error categorizing content:", error);
    return {
      success: false,
      error: error.message || "Failed to categorize content",
      code: 'API_ERROR'
    };
  }
}

function parseCategorizationResponse(response: string): CategorizedContent {
  try {
    let jsonStr = response.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
    }
    
    const parsed = JSON.parse(jsonStr);
    
    return {
      location: parsed.location || null,
      city: parsed.city || null,
      country: parsed.country || null,
      neighborhood: parsed.neighborhood || null,
      category: validateCategory(parsed.category),
      subcategory: parsed.subcategory || null,
      venues: Array.isArray(parsed.venues) ? parsed.venues.map(normalizeVenue) : [],
      budgetTier: validateBudgetTier(parsed.budgetTier),
      estimatedCost: typeof parsed.estimatedCost === 'number' ? parsed.estimatedCost : null,
      title: parsed.title || null,
      tags: Array.isArray(parsed.tags) ? parsed.tags : []
    };
  } catch (error) {
    console.error("Error parsing categorization response:", error, response);
    return getDefaultCategorization();
  }
}

function validateCategory(category: string): ContentCategory {
  const validCategories: ContentCategory[] = [
    "restaurants", "bars_nightlife", "cafes", "hotels_accommodation",
    "attractions_activities", "shopping", "wellness_spa", "outdoor_nature",
    "entertainment", "travel_itinerary", "food_cooking", "fitness", "other"
  ];
  return validCategories.includes(category as ContentCategory) 
    ? category as ContentCategory 
    : "other";
}

function validateBudgetTier(tier: string | null): BudgetTier | null {
  const validTiers: BudgetTier[] = ["budget", "moderate", "luxury", "ultra_luxury"];
  return tier && validTiers.includes(tier as BudgetTier) 
    ? tier as BudgetTier 
    : null;
}

function normalizeVenue(venue: any): VenueInfo {
  return {
    name: venue.name || "Unknown Venue",
    type: venue.type || "unknown",
    location: venue.location || undefined,
    priceRange: venue.priceRange || undefined,
    priceAmount: typeof venue.priceAmount === 'number' ? venue.priceAmount : undefined,
    description: venue.description || undefined,
    address: venue.address || undefined
  };
}

function getDefaultCategorization(): CategorizedContent {
  return {
    location: null,
    city: null,
    country: null,
    neighborhood: null,
    category: "other",
    subcategory: null,
    venues: [],
    budgetTier: null,
    estimatedCost: null,
    title: null,
    tags: []
  };
}

export function detectPlatform(url: string): string {
  const normalizedUrl = url.toLowerCase();
  
  if (normalizedUrl.includes('instagram.com') || normalizedUrl.includes('instagram.')) {
    return 'instagram';
  }
  if (normalizedUrl.includes('tiktok.com') || normalizedUrl.includes('tiktok.')) {
    return 'tiktok';
  }
  if (normalizedUrl.includes('youtube.com') || normalizedUrl.includes('youtu.be')) {
    return 'youtube';
  }
  if (normalizedUrl.includes('twitter.com') || normalizedUrl.includes('x.com')) {
    return 'twitter';
  }
  if (normalizedUrl.includes('facebook.com') || normalizedUrl.includes('fb.com')) {
    return 'facebook';
  }
  if (normalizedUrl.includes('pinterest.com')) {
    return 'pinterest';
  }
  
  return 'web';
}

export function isSocialMediaUrl(url: string): boolean {
  const socialPlatforms = ['instagram', 'tiktok', 'youtube', 'twitter', 'facebook', 'pinterest'];
  const platform = detectPlatform(url);
  return socialPlatforms.includes(platform);
}

export function formatCategoryForDisplay(category: ContentCategory): string {
  const displayNames: Record<ContentCategory, string> = {
    restaurants: "Restaurants",
    bars_nightlife: "Bars & Nightlife",
    cafes: "Cafes & Coffee",
    hotels_accommodation: "Hotels & Stays",
    attractions_activities: "Things to Do",
    shopping: "Shopping",
    wellness_spa: "Wellness & Spa",
    outdoor_nature: "Outdoor & Nature",
    entertainment: "Entertainment",
    travel_itinerary: "Travel Guides",
    food_cooking: "Food & Recipes",
    fitness: "Fitness",
    other: "Other"
  };
  return displayNames[category] || "Other";
}

export function formatBudgetTierForDisplay(tier: BudgetTier | null): string {
  if (!tier) return "Unknown";
  const displayNames: Record<BudgetTier, string> = {
    budget: "Budget ($)",
    moderate: "Moderate ($$)",
    luxury: "Luxury ($$$)",
    ultra_luxury: "Ultra Luxury ($$$$)"
  };
  return displayNames[tier];
}
