import { tavilySearch, isTavilyConfigured } from './tavilyProvider';
import Anthropic from '@anthropic-ai/sdk';
import { UnsplashService } from './unsplashService';
import { pexelsService } from './pexelsService';

interface ImageSearchResult {
  url: string;
  description?: string;
}

export interface BackdropOption {
  url: string;
  source: 'tavily' | 'unsplash' | 'pexels' | 'user';
  label?: string;
}

// Tavily client is now managed by tavilyProvider.ts with automatic key rotation
const unsplashService = new UnsplashService();

// ============================================
// BACKDROP CACHE - Reduces API costs by caching results
// ============================================
interface BackdropCacheEntry {
  options: BackdropOption[];
  timestamp: number;
  hasLocation: boolean; // Track if location was detected (longer TTL for location-specific)
}

class BackdropCache {
  private cache = new Map<string, BackdropCacheEntry>();
  private readonly TAVILY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours for Tavily (location-specific)
  private readonly FREE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours for Unsplash/Pexels
  private readonly MAX_ENTRIES = 500;

  getCacheKey(activityId: string, variation: number): string {
    return `${activityId}:${variation}`;
  }

  get(activityId: string, variation: number): BackdropOption[] | null {
    const key = this.getCacheKey(activityId, variation);
    const entry = this.cache.get(key);
    if (!entry) return null;

    const ttl = entry.hasLocation ? this.TAVILY_TTL_MS : this.FREE_TTL_MS;
    if (Date.now() - entry.timestamp > ttl) {
      this.cache.delete(key);
      return null;
    }
    return entry.options;
  }

  set(activityId: string, variation: number, options: BackdropOption[], hasLocation: boolean): void {
    if (this.cache.size >= this.MAX_ENTRIES) {
      const oldestKey = this.getOldestKey();
      if (oldestKey) this.cache.delete(oldestKey);
    }
    this.cache.set(this.getCacheKey(activityId, variation), {
      options,
      timestamp: Date.now(),
      hasLocation
    });
  }

  private getOldestKey(): string | null {
    let oldest: string | null = null;
    let oldestTime = Date.now();
    this.cache.forEach((entry, key) => {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldest = key;
      }
    });
    return oldest;
  }

  // For debugging/monitoring
  getStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }
}

const backdropCache = new BackdropCache();

// Claude Haiku for fast, cheap location extraction
const CLAUDE_HAIKU = "claude-3-5-haiku-20241022";
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * AI-powered search context extraction using Claude Haiku
 * Intelligently analyzes title, description, and category to generate optimal search terms
 * Returns a comprehensive search query that captures location, event type, mood, and aesthetics
 */
async function extractSearchContextWithAI(
  title: string,
  description?: string,
  category?: string
): Promise<{ searchQuery: string; hasLocation: boolean } | null> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('[WebImageSearch] ANTHROPIC_API_KEY not configured - skipping AI context extraction');
    return null;
  }

  const combinedText = `Title: ${title}
Description: ${description || 'None'}
Category: ${category || 'general'}`;

  const prompt = `Analyze this activity and generate the best image search query for finding a beautiful, relevant backdrop photo.

${combinedText}

Consider:
1. If there's a specific location (city, landmark, country), include it prominently
2. If there's an event or occasion (New Year's Eve, wedding, birthday), include the celebration/event context
3. Include mood/aesthetic keywords (scenic, beautiful, cinematic, elegant, vibrant, etc.)
4. Exclude people-focused terms (we want landscapes/scenes, not portraits)

Respond in this exact format:
SEARCH_QUERY: [your optimized search query, 5-12 words]
HAS_LOCATION: [YES or NO]

Examples:
- "NYE in NYC" → SEARCH_QUERY: New York City Times Square New Years Eve celebration fireworks scenic
HAS_LOCATION: YES
- "Morning yoga routine" → SEARCH_QUERY: yoga meditation peaceful sunrise nature scenic wellness
HAS_LOCATION: NO
- "Trip to Tokyo" → SEARCH_QUERY: Tokyo Japan cityscape scenic beautiful travel destination
HAS_LOCATION: YES`;

  try {
    const response = await anthropic.messages.create({
      model: CLAUDE_HAIKU,
      max_tokens: 150,
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: prompt }]
        }
      ]
    });

    const content = response.content[0];
    if (content && content.type === 'text') {
      const text = content.text.trim();

      // Parse the response
      const searchQueryMatch = text.match(/SEARCH_QUERY:\s*(.+)/i);
      const hasLocationMatch = text.match(/HAS_LOCATION:\s*(YES|NO)/i);

      if (searchQueryMatch) {
        const searchQuery = searchQueryMatch[1].trim();
        const hasLocation = hasLocationMatch ? hasLocationMatch[1].toUpperCase() === 'YES' : false;

        console.log(`[WebImageSearch] AI extracted search context: "${searchQuery}" (hasLocation: ${hasLocation})`);
        return { searchQuery, hasLocation };
      }
    }
    console.log('[WebImageSearch] AI could not extract search context');
    return null;
  } catch (error) {
    console.error('[WebImageSearch] AI context extraction failed:', error);
    return null;
  }
}

/**
 * Extracts meaningful keywords from activity description for image search
 * Uses stop word filtering and prioritizes nouns/adjectives
 */
function extractDescriptionKeywords(description: string, maxKeywords: number = 8): string[] {
  if (!description || description.trim().length === 0) {
    return [];
  }

  // Common stop words to exclude from search
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'from', 'by', 'about', 'as', 'into', 'through', 'during',
    'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further',
    'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all',
    'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor',
    'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'can',
    'will', 'just', 'don', 'should', 'now', 'my', 'your', 'our', 'their', 'this',
    'that', 'these', 'those', 'am', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'would', 'could', 'should'
  ]);

  // Clean and tokenize description
  const words = description
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .split(/\s+/) // Split on whitespace
    .filter(word =>
      word.length >= 3 && // At least 3 characters
      !stopWords.has(word) && // Not a stop word
      !/^\d+$/.test(word) // Not purely numeric
    );

  // Count word frequency (simple TF approach)
  const wordFreq = new Map<string, number>();
  words.forEach(word => {
    wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
  });

  // Sort by frequency, take top keywords
  const keywords = Array.from(wordFreq.entries())
    .sort((a, b) => b[1] - a[1]) // Sort by frequency descending
    .slice(0, maxKeywords) // Take top N
    .map(([word]) => word);

  return keywords;
}

// Note: Removed hardcoded isLocationDependent() and detectLocationCheap() functions
// Now using AI-powered extractSearchContextWithAI() for intelligent context analysis

// ============================================
// FREE PROVIDER IMAGES - Unsplash + Pexels round-robin
// ============================================

/**
 * Get images from free providers (Unsplash + Pexels) with round-robin for variety
 * This is used when no location is detected to avoid expensive Tavily calls
 */
async function getFreeProviderImages(
  category: string,
  activityTitle: string | undefined,
  count: number,
  variation: number
): Promise<BackdropOption[]> {
  const options: BackdropOption[] = [];
  const useUnsplashFirst = variation % 2 === 0;

  // Split count between providers for variety
  const firstProviderCount = Math.ceil(count / 2);
  const secondProviderCount = count - firstProviderCount;

  try {
    if (useUnsplashFirst) {
      // Unsplash first, then Pexels
      console.log('[WebImageSearch] Fetching from Unsplash (primary) + Pexels (secondary)');

      const unsplashImages = await unsplashService.getSuggestedBackdrops(
        category,
        activityTitle,
        'landscape',
        firstProviderCount
      );
      options.push(...unsplashImages.map(img => ({
        url: img.url,
        source: 'unsplash' as const,
        label: img.description || img.altDescription || 'HD Unsplash'
      })));

      if (secondProviderCount > 0) {
        const pexelsImages = await pexelsService.getSuggestedBackdrops(
          category,
          activityTitle,
          'landscape',
          secondProviderCount
        );
        options.push(...pexelsImages.map(img => ({
          url: img.url,
          source: 'pexels' as const,
          label: img.description || 'HD Pexels'
        })));
      }
    } else {
      // Pexels first, then Unsplash
      console.log('[WebImageSearch] Fetching from Pexels (primary) + Unsplash (secondary)');

      const pexelsImages = await pexelsService.getSuggestedBackdrops(
        category,
        activityTitle,
        'landscape',
        firstProviderCount
      );
      options.push(...pexelsImages.map(img => ({
        url: img.url,
        source: 'pexels' as const,
        label: img.description || 'HD Pexels'
      })));

      if (secondProviderCount > 0) {
        const unsplashImages = await unsplashService.getSuggestedBackdrops(
          category,
          activityTitle,
          'landscape',
          secondProviderCount
        );
        options.push(...unsplashImages.map(img => ({
          url: img.url,
          source: 'unsplash' as const,
          label: img.description || img.altDescription || 'HD Unsplash'
        })));
      }
    }

    console.log(`[WebImageSearch] Free providers returned ${options.length} images`);
  } catch (error) {
    console.error('[WebImageSearch] Error fetching from free providers:', error);
    // Fall back to curated defaults
    const fallbacks = getMultipleFallbackImages(category, activityTitle, count);
    options.push(...fallbacks);
  }

  return options;
}

/**
 * Search for relevant images based on activity title and category
 * Uses Tavily API to find high-quality, relevant images
 */
export async function searchActivityImage(
  activityTitle: string,
  category: string,
  description?: string
): Promise<string | null> {
  try {
    // Skip if no API key configured
    if (!isTavilyConfigured()) {
      console.warn('Tavily not configured - skipping web image search');
      return null;
    }

    // Build a comprehensive search query using full title and description
    // This allows Tavily to find the exact event images just like a manual Google search
    const searchQuery = `${activityTitle} ${category} ${description || ''} high quality photography`.trim();

    console.log(`[WebImageSearch] Searching for: "${searchQuery}"`);

    // Search using Tavily with image search enabled and advanced depth
    const response = await tavilySearch(searchQuery, {
      searchDepth: 'advanced',
      maxResults: 8,
      includeImages: true,
    });

    // Extract images from response
    const images = response.images || [];

    if (images.length === 0) {
      console.log('[WebImageSearch] No images found');
      return null;
    }

    // Return the first high-quality image URL
    const selectedImage = images[0].url;
    console.log(`[WebImageSearch] Found image: ${selectedImage}`);

    return selectedImage;
  } catch (error) {
    console.error('[WebImageSearch] Error searching for images:', error);
    return null;
  }
}

// Note: Removed hardcoded extractLocationKeywords() with static city list
// Location detection is now handled by AI in extractSearchContextWithAI()

/**
 * Extract event/occasion keywords from text for more specific image searches
 * These keywords help find contextually relevant images (e.g., NYE celebrations, not just city skylines)
 */
function extractEventKeywords(text: string): string[] {
  const events: string[] = [];
  const textLower = text.toLowerCase();
  
  // Event/occasion patterns - order matters (more specific first)
  const eventPatterns: Array<{ pattern: RegExp; keywords: string }> = [
    // New Year's Eve / NYE
    { pattern: /\b(nye|new year'?s? eve|new year celebration|countdown)\b/i, keywords: 'New Years Eve celebration fireworks countdown' },
    { pattern: /\bnew year\b/i, keywords: 'New Year celebration' },
    
    // Holidays
    { pattern: /\b(christmas|xmas|holiday season)\b/i, keywords: 'Christmas holiday festive lights' },
    { pattern: /\b(thanksgiving)\b/i, keywords: 'Thanksgiving holiday celebration' },
    { pattern: /\b(halloween)\b/i, keywords: 'Halloween spooky festive' },
    { pattern: /\b(valentines?|valentine'?s? day)\b/i, keywords: 'Valentines romantic love' },
    { pattern: /\b(fourth of july|4th of july|independence day)\b/i, keywords: 'July 4th fireworks patriotic celebration' },
    
    // Party/celebration events
    { pattern: /\b(party|parties|celebration|gala|soiree)\b/i, keywords: 'party celebration nightlife festive' },
    { pattern: /\b(club|clubbing|nightclub|nightlife|lounge)\b/i, keywords: 'nightclub nightlife party atmosphere' },
    { pattern: /\b(concert|live music|show|performance)\b/i, keywords: 'concert live music performance' },
    { pattern: /\b(festival|fest)\b/i, keywords: 'festival celebration crowd' },
    
    // Wedding/special occasions
    { pattern: /\b(wedding|bridal|bachelorette|bachelor)\b/i, keywords: 'wedding elegant celebration' },
    { pattern: /\b(birthday|anniversary)\b/i, keywords: 'celebration festive party' },
    
    // Food/dining events
    { pattern: /\b(brunch|dinner|restaurant|dining)\b/i, keywords: 'dining restaurant elegant' },
    { pattern: /\b(cocktail|bar|drinks)\b/i, keywords: 'cocktail bar nightlife' },
  ];
  
  for (const { pattern, keywords } of eventPatterns) {
    if (pattern.test(textLower)) {
      events.push(keywords);
      break; // Only add the first (most specific) match
    }
  }
  
  return events;
}

/**
 * Get category-specific aesthetic keywords for better image results
 * Enhanced with HD/4K quality modifiers for premium backdrop images
 */
function getCategoryAestheticKeywords(category: string): string {
  const categoryKeywords: Record<string, string> = {
    'travel': 'scenic destination landscape cinematic 4K ultra HD wallpaper',
    'fitness': 'athletic outdoor nature wellness high resolution photography',
    'health': 'wellness spa nature peaceful 4K desktop wallpaper',
    'career': 'professional modern architecture HD cityscape',
    'learning': 'education library academic aesthetic HD photography',
    'finance': 'business urban skyline modern 4K wallpaper',
    'relationships': 'romantic scenic sunset beautiful HD photography',
    'creativity': 'artistic colorful creative design 4K desktop',
    'home': 'cozy interior modern lifestyle HD photography',
    'personal': 'inspirational scenic beautiful 4K wallpaper',
    'other': 'scenic beautiful landscape ultra HD desktop'
  };
  
  return categoryKeywords[category.toLowerCase()] || 'scenic beautiful 4K HD wallpaper';
}

/**
 * Shuffle an array using Fisher-Yates algorithm with a seed
 */
function shuffleWithSeed<T>(array: T[], seed: number): T[] {
  const result = [...array];
  let currentSeed = seed;
  
  // Simple seeded random
  const seededRandom = () => {
    currentSeed = (currentSeed * 9301 + 49297) % 233280;
    return currentSeed / 233280;
  };
  
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Get variation-specific modifiers to get different results on each refresh
 */
function getVariationModifiers(variation: number): { suffix: string; offset: number } {
  const modifierSets = [
    { suffix: 'scenic photography no people', offset: 0 },
    { suffix: 'aesthetic wallpaper landscape', offset: 2 },
    { suffix: 'cinematic view background', offset: 4 },
    { suffix: 'beautiful scenery photo', offset: 1 },
    { suffix: 'professional backdrop image', offset: 3 },
    { suffix: 'artistic photograph', offset: 5 },
    { suffix: 'high resolution background', offset: 6 },
    { suffix: 'stunning visual scene', offset: 7 },
  ];
  return modifierSets[variation % modifierSets.length];
}

/**
 * Search for multiple backdrop options (for image picker UI)
 *
 * TAVILY-FIRST PROVIDER STRATEGY:
 * 1. Check cache first (FREE, instant)
 * 2. Use AI to extract intelligent search context from title + description
 * 3. Try Tavily with AI-generated search query (PRIMARY)
 * 4. IF Tavily fails/unavailable → Fall back to Unsplash/Pexels (SECONDARY)
 * 5. Cache results with appropriate TTL
 *
 * This prioritizes contextually relevant images over cost optimization
 */
export async function searchBackdropOptions(
  activityTitle: string,
  category: string,
  description?: string,
  maxOptions: number = 8,
  variation: number = 0,
  activityId?: string // Optional: for caching
): Promise<BackdropOption[]> {

  // ========================================
  // STEP 1: Check cache first (FREE, instant)
  // ========================================
  if (activityId) {
    const cached = backdropCache.get(activityId, variation);
    if (cached) {
      console.log(`[WebImageSearch] ✅ Cache HIT for activity ${activityId}, variation ${variation}`);
      return cached;
    }
    console.log(`[WebImageSearch] Cache MISS for activity ${activityId}, variation ${variation}`);
  }

  const options: BackdropOption[] = [];
  let hasLocation = false;

  // ========================================
  // STEP 2: Try Tavily FIRST (PRIMARY provider)
  // ========================================
  if (isTavilyConfigured()) {
    console.log('[WebImageSearch] 🔍 Using Tavily as primary image provider');

    try {
      // Use AI to extract intelligent search context
      const searchContext = await extractSearchContextWithAI(activityTitle, description, category);

      if (searchContext) {
        hasLocation = searchContext.hasLocation;
        const variationMod = getVariationModifiers(variation);

        // Build the final search query with variation modifiers
        let searchQuery = `${searchContext.searchQuery} ${variationMod.suffix} -people -faces -crowd -portrait`;

        console.log('🔍 Tavily Search Query:', searchQuery);

        const response = await tavilySearch(searchQuery, {
          searchDepth: 'advanced',
          maxResults: maxOptions,
          includeImages: true,
        });

        const images = response.images || [];
        console.log(`[WebImageSearch] Tavily returned ${images.length} images`);

        for (const img of images.slice(0, maxOptions)) {
          if (img.url) {
            // Create a meaningful label from the search query
            const queryWords = searchContext.searchQuery.split(' ')
              .filter((w: string) => w.length > 2)
              .slice(0, 3);
            const label = queryWords.length > 0
              ? queryWords.map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
              : 'Web Result';

            options.push({
              url: img.url,
              source: 'tavily',
              label
            });
          }
        }
      } else {
        // AI extraction failed, try basic Tavily search
        console.log('[WebImageSearch] AI context extraction failed, trying basic Tavily search');
        const basicQuery = `${activityTitle} ${category} beautiful scenic backdrop photography`;

        const response = await tavilySearch(basicQuery, {
          searchDepth: 'advanced',
          maxResults: maxOptions,
          includeImages: true,
        });

        const images = response.images || [];
        console.log(`[WebImageSearch] Basic Tavily returned ${images.length} images`);

        for (const img of images.slice(0, maxOptions)) {
          if (img.url) {
            options.push({
              url: img.url,
              source: 'tavily',
              label: 'Web Result'
            });
          }
        }
      }
    } catch (error) {
      console.error('[WebImageSearch] Tavily search failed:', error);
      // Will fall through to free providers below
    }
  } else {
    console.log('[WebImageSearch] Tavily not configured, using free providers as fallback');
  }

  // ========================================
  // STEP 3: Fall back to FREE providers if Tavily didn't provide enough results
  // ========================================
  const remainingSlots = maxOptions - options.length;
  if (remainingSlots > 0) {
    console.log(`[WebImageSearch] 📷 Tavily returned ${options.length} images, filling ${remainingSlots} slots with Unsplash/Pexels fallback`);
    try {
      const freeOptions = await getFreeProviderImages(category, activityTitle, remainingSlots, variation);
      options.push(...freeOptions);
    } catch (error) {
      console.error('[WebImageSearch] Free providers failed:', error);
      // Fall back to curated fallback images
      const fallbacks = getMultipleFallbackImages(category, activityTitle, remainingSlots);
      options.push(...fallbacks);
    }
  }

  // ========================================
  // STEP 4: Cache results with appropriate TTL
  // ========================================
  if (activityId && options.length > 0) {
    backdropCache.set(activityId, variation, options, hasLocation);
    console.log(`[WebImageSearch] 💾 Cached ${options.length} options (hasLocation: ${hasLocation})`);
  }

  const tavilyCount = options.filter(o => o.source === 'tavily').length;
  const freeCount = options.filter(o => o.source === 'unsplash' || o.source === 'pexels').length;
  console.log(`[WebImageSearch] Returning ${options.length} options (${tavilyCount} Tavily, ${freeCount} fallback)`);

  return options.slice(0, maxOptions);
}

/**
 * Get multiple HD fallback images for the picker
 */
function getMultipleFallbackImages(category: string, activityTitle?: string, count: number = 3): BackdropOption[] {
  const options: BackdropOption[] = [];
  const addedUrls = new Set<string>();

  // City-specific HD images
  const cityImages: Record<string, { url: string; label: string }[]> = {
    'new york': [
      { url: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=1200&h=630&fit=crop&q=80', label: 'NYC Skyline' },
      { url: 'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=1200&h=630&fit=crop&q=80', label: 'Manhattan Bridge' },
      { url: 'https://images.unsplash.com/photo-1522083165195-3424ed129620?w=1200&h=630&fit=crop&q=80', label: 'Central Park' },
    ],
    'paris': [
      { url: 'https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=1200&h=630&fit=crop&q=80', label: 'Eiffel Tower' },
      { url: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&h=630&fit=crop&q=80', label: 'Paris Streets' },
    ],
    'tokyo': [
      { url: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1200&h=630&fit=crop&q=80', label: 'Tokyo Tower' },
      { url: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=1200&h=630&fit=crop&q=80', label: 'Shibuya Crossing' },
    ],
    'big bear': [
      { url: 'https://images.unsplash.com/photo-1489392191049-fc10c97e64b6?w=1200&h=630&fit=crop&q=80', label: 'Mountain View' },
      { url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=630&fit=crop&q=80', label: 'Mountain Peaks' },
    ],
    'beach': [
      { url: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1200&h=630&fit=crop&q=80', label: 'Tropical Beach' },
      { url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&h=630&fit=crop&q=80', label: 'Ocean View' },
    ],
  };

  // Check for city matches in title
  if (activityTitle) {
    const titleLower = activityTitle.toLowerCase();
    for (const [city, images] of Object.entries(cityImages)) {
      if (titleLower.includes(city)) {
        for (const img of images) {
          if (!addedUrls.has(img.url) && options.length < count) {
            options.push({ url: img.url, source: 'unsplash', label: img.label });
            addedUrls.add(img.url);
          }
        }
      }
    }
  }

  // Category-based HD images
  const categoryImages: Record<string, { url: string; label: string }[]> = {
    fitness: [
      { url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&h=630&fit=crop&q=80', label: 'Gym' },
      { url: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1200&h=630&fit=crop&q=80', label: 'Workout' },
    ],
    travel: [
      { url: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&h=630&fit=crop&q=80', label: 'Travel' },
      { url: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&h=630&fit=crop&q=80', label: 'Road Trip' },
    ],
    romance: [
      { url: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=1200&h=630&fit=crop&q=80', label: 'Romantic' },
      { url: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=1200&h=630&fit=crop&q=80', label: 'Date Night' },
    ],
    adventure: [
      { url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=630&fit=crop&q=80', label: 'Adventure' },
      { url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&h=630&fit=crop&q=80', label: 'Mountains' },
    ],
    wellness: [
      { url: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=1200&h=630&fit=crop&q=80', label: 'Wellness' },
      { url: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1200&h=630&fit=crop&q=80', label: 'Meditation' },
    ],
    personal: [
      { url: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1200&h=630&fit=crop&q=80', label: 'Productivity' },
      { url: 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=1200&h=630&fit=crop&q=80', label: 'Planning' },
    ],
  };

  // Add category images
  const catLower = category.toLowerCase();
  const catImages = categoryImages[catLower] || categoryImages.personal;
  for (const img of catImages) {
    if (!addedUrls.has(img.url) && options.length < count) {
      options.push({ url: img.url, source: 'unsplash', label: img.label });
      addedUrls.add(img.url);
    }
  }

  return options;
}

/**
 * Get fallback image URL based on activity title and category
 * Uses curated Unsplash images with city-specific detection
 */
export function getCategoryFallbackImage(category: string, activityTitle?: string): string {
  // City/location-specific images (if title matches)
  if (activityTitle) {
    const title = activityTitle.toLowerCase();
    
    if (title.includes('new year') && (title.includes('new york') || title.includes('nyc'))) {
      return 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=1200&h=630&fit=crop&q=80'; // Times Square NYE
    } else if (title.includes('new york') || title.includes('nyc')) {
      return 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=1200&h=630&fit=crop&q=80';
    } else if (title.includes('paris')) {
      return 'https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=1200&h=630&fit=crop&q=80';
    } else if (title.includes('tokyo')) {
      return 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1200&h=630&fit=crop&q=80';
    } else if (title.includes('london')) {
      return 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1200&h=630&fit=crop&q=80';
    } else if (title.includes('lagos')) {
      return 'https://images.unsplash.com/photo-1578846967126-11ec89440219?w=1200&h=630&fit=crop&q=80';
    } else if (title.includes('miami')) {
      return 'https://images.unsplash.com/photo-1533106418989-88406c7cc8ca?w=1200&h=630&fit=crop&q=80';
    } else if (title.includes('hawaii')) {
      return 'https://images.unsplash.com/photo-1542259009477-d625272157b7?w=1200&h=630&fit=crop&q=80';
    } else if (title.includes('colorado')) {
      return 'https://images.unsplash.com/photo-1489392191049-fc10c97e64b6?w=1200&h=630&fit=crop&q=80';
    } else if (title.includes('beach') || title.includes('tropical')) {
      return 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1200&h=630&fit=crop&q=80';
    } else if (title.includes('mountain') || title.includes('hiking')) {
      return 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=630&fit=crop&q=80';
    }
  }
  
  // Category-based fallback images
  const fallbackImages: Record<string, string> = {
    fitness: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&h=630&fit=crop&q=80',
    health: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=1200&h=630&fit=crop&q=80',
    career: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&h=630&fit=crop&q=80',
    learning: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=1200&h=630&fit=crop&q=80',
    finance: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=1200&h=630&fit=crop&q=80',
    relationships: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=1200&h=630&fit=crop&q=80',
    creativity: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=1200&h=630&fit=crop&q=80',
    travel: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&h=630&fit=crop&q=80',
    home: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1200&h=630&fit=crop&q=80',
    personal: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1200&h=630&fit=crop&q=80',
    other: 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=1200&h=630&fit=crop&q=80'
  };

  return fallbackImages[category.toLowerCase()] || fallbackImages.other;
}

/**
 * Get the best available image for an activity
 * Priority: 1) User's custom backdrop, 2) Tavily search, 3) Unsplash/Pexels fallback, 4) Category fallback
 */
export async function getActivityImage(
  activityTitle: string,
  category: string,
  userBackdrop?: string,
  baseUrl?: string
): Promise<string> {
  // Priority 1: User's custom backdrop
  if (userBackdrop) {
    console.log('[WebImageSearch] Using user-provided backdrop');

    // If backdrop starts with /community-backdrops/, convert to absolute URL
    if (userBackdrop.startsWith('/community-backdrops/')) {
      const publicBaseUrl = baseUrl || process.env.PUBLIC_BASE_URL || 'http://localhost:5000';
      const absoluteUrl = `${publicBaseUrl}${userBackdrop}`;
      console.log('[WebImageSearch] Converting community backdrop to absolute URL:', absoluteUrl);
      return absoluteUrl;
    }

    return userBackdrop;
  }

  // Priority 2: Search for relevant image via Tavily (PRIMARY)
  const searchedImage = await searchActivityImage(activityTitle, category);
  if (searchedImage) {
    return searchedImage;
  }

  // Priority 3: Fallback to Unsplash/Pexels if Tavily fails
  console.log('[WebImageSearch] Tavily failed, trying Unsplash/Pexels fallback');
  try {
    const freeOptions = await getFreeProviderImages(category, activityTitle, 1, 0);
    if (freeOptions.length > 0 && freeOptions[0].url) {
      console.log('[WebImageSearch] Using fallback image from:', freeOptions[0].source);
      return freeOptions[0].url;
    }
  } catch (error) {
    console.error('[WebImageSearch] Free providers fallback failed:', error);
  }

  // Priority 4: City/category-based fallback with title detection
  console.log('[WebImageSearch] Using category/city fallback image');
  return getCategoryFallbackImage(category, activityTitle);
}
