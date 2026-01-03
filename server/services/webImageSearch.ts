import { tavily } from '@tavily/core';

interface ImageSearchResult {
  url: string;
  description?: string;
}

export interface BackdropOption {
  url: string;
  source: 'tavily' | 'unsplash' | 'user';
  label?: string;
}

const tavilyClient = tavily({ apiKey: process.env.TAVILY_API_KEY });

/**
 * Search for relevant images based on activity title and category
 * Uses Tavily API to find high-quality, relevant images
 */
export async function searchActivityImage(
  activityTitle: string,
  category: string
): Promise<string | null> {
  try {
    // Skip if no API key configured
    if (!process.env.TAVILY_API_KEY) {
      console.warn('TAVILY_API_KEY not configured - skipping web image search');
      return null;
    }

    // Create a search query combining title and category with HD/4K emphasis
    const searchQuery = `${activityTitle} ${category} 4K HD wallpaper high resolution photography`;

    console.log(`[WebImageSearch] Searching for: "${searchQuery}"`);

    // Search using Tavily with image search enabled
    const response = await tavilyClient.search(searchQuery, {
      searchDepth: 'basic',
      maxResults: 5,
      includeImages: true,
      includeAnswer: false,
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

/**
 * Extract location keywords from text (cities, countries, landmarks)
 * Uses word boundary matching to avoid false positives (e.g., "la" in "Daily")
 */
function extractLocationKeywords(text: string): string[] {
  const locations: string[] = [];
  
  // Common cities and landmarks with word boundary matching
  // Note: Short abbreviations like 'la' removed (matches inside "daily", "formula")
  // But 'nyc' is safe (no common words contain 'nyc')
  const knownLocations = [
    'new york city', 'new york', 'nyc', 'manhattan', 'brooklyn', 'times square', 'central park',
    'los angeles', 'hollywood', 'santa monica', 'venice beach', 'sf', 'san fran',
    'paris', 'eiffel tower', 'louvre', 'champs elysees',
    'london', 'big ben', 'tower bridge', 'buckingham palace',
    'tokyo', 'shibuya', 'shinjuku', 'kyoto', 'osaka',
    'rome', 'colosseum', 'vatican', 'venice', 'florence',
    'barcelona', 'madrid', 'lisbon', 'amsterdam', 'berlin',
    'dubai', 'abu dhabi', 'singapore', 'hong kong', 'bangkok',
    'sydney', 'melbourne', 'auckland', 'bali', 'phuket',
    'miami', 'san francisco', 'chicago', 'boston', 'seattle',
    'hawaii', 'maui', 'cancun', 'caribbean', 'bahamas',
    'big bear', 'lake tahoe', 'aspen', 'colorado', 'yellowstone',
    'grand canyon', 'yosemite', 'zion', 'glacier', 'acadia',
    'maldives', 'santorini', 'amalfi', 'capri', 'monaco',
    'mexico city', 'lagos', 'cairo', 'marrakech', 'cape town'
  ];
  
  // Use word boundary regex to avoid false positives like "la" matching in "Daily"
  for (const loc of knownLocations) {
    const regex = new RegExp(`\\b${loc}\\b`, 'i');
    if (regex.test(text)) {
      locations.push(loc);
    }
  }
  
  return locations;
}

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
 * Search for multiple backdrop options (for image picker UI)
 * Returns up to 8 options: Tavily results + HD fallbacks
 * Uses activity description/planSummary for more specific search queries
 * Enhanced with location extraction and cinematic keywords
 */
export async function searchBackdropOptions(
  activityTitle: string,
  category: string,
  description?: string,
  maxOptions: number = 8
): Promise<BackdropOption[]> {
  const options: BackdropOption[] = [];

  try {
    // Try Tavily search first
    if (process.env.TAVILY_API_KEY) {
      // Combine title and description for location and event extraction
      const fullContext = `${activityTitle} ${description || ''}`;
      
      // Extract location and event keywords
      const locations = extractLocationKeywords(fullContext);
      const locationStr = locations.length > 0 ? locations.slice(0, 2).join(' ') : '';
      const eventKeywords = extractEventKeywords(fullContext);
      const eventStr = eventKeywords.length > 0 ? eventKeywords[0] : '';
      
      // Get category-specific aesthetic keywords
      const aestheticKeywords = getCategoryAestheticKeywords(category);
      
      // Build search query: ALWAYS use title as the PRIMARY search term
      // Location and event keywords ENHANCE the search, they don't replace the title
      // This ensures "7 Daily Habits of Warren Buffett" searches for "Warren Buffett" not "Los Angeles"
      
      // Extract meaningful keywords from title (remove common words, keep nouns/names)
      const titleKeywords = activityTitle
        .substring(0, 60)
        .replace(/[^\w\s]/g, ' ')
        .replace(/\b(the|a|an|of|to|for|and|or|in|on|at|by|with|from|how|what|why|my|your|our)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      // Build query: Title first, then location/event context, then quality modifiers
      let searchQuery = titleKeywords;
      
      if (locationStr) {
        searchQuery += ` ${locationStr}`;
      }
      if (eventStr) {
        searchQuery += ` ${eventStr}`;
      }
      
      // Add quality modifiers for better image results
      searchQuery += ` ${aestheticKeywords} 4K HD wallpaper`;
      
      console.log(`[WebImageSearch] Searching backdrop options:`);
      console.log(`  - Title: "${activityTitle}"`);
      console.log(`  - Locations found: ${locations.length > 0 ? locations.join(', ') : 'none'}`);
      console.log(`  - Events found: ${eventStr || 'none'}`);
      console.log(`  - Query: "${searchQuery}"`);

      const response = await tavilyClient.search(searchQuery, {
        searchDepth: 'advanced',
        maxResults: 8,
        includeImages: true,
        includeAnswer: false,
      });

      const images = response.images || [];
      console.log(`[WebImageSearch] Tavily returned ${images.length} images`);
      
      // Use all available images up to maxOptions for more variety
      for (const img of images.slice(0, maxOptions)) {
        if (img.url) {
          // Create a descriptive label from title keywords (first 3-4 words)
          // This shows what the image is actually about, not a location that might not be relevant
          const titleWords = titleKeywords.split(' ').filter(w => w.length > 2).slice(0, 3);
          let label = titleWords.length > 0 
            ? titleWords.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
            : 'Web Result';
          
          // Add location context if found (but only as suffix)
          if (locationStr && locations.length > 0) {
            const locationLabel = locations[0].split(' ')
              .map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            label = `${label} - ${locationLabel}`;
          }
          
          options.push({
            url: img.url,
            source: 'tavily',
            label
          });
        }
      }
    } else {
      console.log('[WebImageSearch] TAVILY_API_KEY not configured');
    }
  } catch (error) {
    console.error('[WebImageSearch] Error fetching Tavily images:', error);
  }

  // Add HD Unsplash fallbacks to fill remaining slots
  const fallbacks = getMultipleFallbackImages(category, activityTitle, maxOptions - options.length);
  options.push(...fallbacks);

  console.log(`[WebImageSearch] Returning ${options.length} backdrop options (${options.filter(o => o.source === 'tavily').length} from Tavily)`);
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
 * Priority: 1) User's custom backdrop, 2) Web search, 3) Category fallback
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

  // Priority 2: Search for relevant image via Tavily
  const searchedImage = await searchActivityImage(activityTitle, category);
  if (searchedImage) {
    return searchedImage;
  }

  // Priority 3: City/category-based fallback with title detection
  console.log('[WebImageSearch] Using category/city fallback image');
  return getCategoryFallbackImage(category, activityTitle);
}
