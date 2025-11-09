import { tavily } from '@tavily/core';

interface ImageSearchResult {
  url: string;
  description?: string;
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
