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

    // Create a search query combining title and category for better relevance
    const searchQuery = `${activityTitle} ${category} high quality image`;

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
 * Search for multiple backdrop options (for image picker UI)
 * Returns up to 8 options: Tavily results + HD fallbacks
 * Uses activity description/planSummary for more specific search queries
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
      // Build a more specific search query using description
      let searchContext = activityTitle;
      if (description) {
        // Extract first 150 chars of description for better context
        const snippet = description.substring(0, 150).replace(/\s+/g, ' ').trim();
        searchContext = `${activityTitle} ${snippet}`;
      }
      const searchQuery = `${searchContext} ${category} beautiful scenic photo`;
      console.log(`[WebImageSearch] Searching backdrop options for: "${searchQuery}"`);

      const response = await tavilyClient.search(searchQuery, {
        searchDepth: 'advanced',
        maxResults: 6,
        includeImages: true,
        includeAnswer: false,
      });

      const images = response.images || [];
      for (const img of images.slice(0, 6)) {
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
    console.error('[WebImageSearch] Error fetching Tavily images:', error);
  }

  // Add HD Unsplash fallbacks to fill remaining slots
  const fallbacks = getMultipleFallbackImages(category, activityTitle, maxOptions - options.length);
  options.push(...fallbacks);

  console.log(`[WebImageSearch] Returning ${options.length} backdrop options`);
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
