/**
 * Google Places API Service for Restaurant Photos
 *
 * Uses Google Places API (New) to fetch accurate restaurant photos
 * that match the actual venue, not random web images.
 *
 * Pricing:
 * - Place Search (Text): $32/1000 requests
 * - Place Details: $17/1000 requests
 * - Place Photos: $7/1000 requests
 *
 * We use the same GOOGLE_API_KEY as Gemini.
 */

interface PlacePhoto {
  url: string;
  width: number;
  height: number;
  attributions: string[];
}

interface PlaceResult {
  placeId: string;
  name: string;
  address?: string;
  rating?: number;
  userRatingsTotal?: number;
  priceLevel?: number;
  photos: PlacePhoto[];
  types?: string[];
  openNow?: boolean;
  website?: string;
  phoneNumber?: string;
}

interface PlaceSearchOptions {
  location?: { latitude: number; longitude: number };
  radius?: number; // in meters, max 50000
  type?: string; // e.g., 'restaurant', 'bar', 'cafe'
  minRating?: number;
}

// Cache for place results to reduce API costs
const placeCache = new Map<string, { result: PlaceResult | null; timestamp: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Check if Google Places API is configured
 */
export function isGooglePlacesConfigured(): boolean {
  return !!process.env.GOOGLE_API_KEY;
}

/**
 * Search for a place by name and get its photos
 * This is the main function for getting restaurant images
 */
export async function searchPlaceWithPhotos(
  query: string,
  options: PlaceSearchOptions = {}
): Promise<PlaceResult | null> {
  if (!isGooglePlacesConfigured()) {
    console.log('[GOOGLE_PLACES] API key not configured');
    return null;
  }

  // Check cache first
  const cacheKey = `${query}:${options.location?.latitude || ''}:${options.location?.longitude || ''}`;
  const cached = placeCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    console.log(`[GOOGLE_PLACES] Cache HIT for "${query}"`);
    return cached.result;
  }

  const apiKey = process.env.GOOGLE_API_KEY!;

  try {
    // Step 1: Text Search to find the place
    const searchUrl = new URL('https://places.googleapis.com/v1/places:searchText');

    const searchBody: any = {
      textQuery: query,
      languageCode: 'en',
      maxResultCount: 1,
    };

    // Add location bias if provided
    if (options.location) {
      searchBody.locationBias = {
        circle: {
          center: {
            latitude: options.location.latitude,
            longitude: options.location.longitude,
          },
          radius: options.radius || 50000, // 50km default
        },
      };
    }

    // Add type filter if provided
    if (options.type) {
      searchBody.includedType = options.type;
    }

    console.log(`[GOOGLE_PLACES] Searching for: "${query}"`);

    const searchResponse = await fetch(searchUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.priceLevel,places.photos,places.types,places.currentOpeningHours,places.websiteUri,places.nationalPhoneNumber',
      },
      body: JSON.stringify(searchBody),
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error(`[GOOGLE_PLACES] Search failed: ${searchResponse.status} - ${errorText}`);
      placeCache.set(cacheKey, { result: null, timestamp: Date.now() });
      return null;
    }

    const searchData = await searchResponse.json();

    if (!searchData.places || searchData.places.length === 0) {
      console.log(`[GOOGLE_PLACES] No results for "${query}"`);
      placeCache.set(cacheKey, { result: null, timestamp: Date.now() });
      return null;
    }

    const place = searchData.places[0];
    console.log(`[GOOGLE_PLACES] Found: ${place.displayName?.text} (${place.photos?.length || 0} photos)`);

    // Step 2: Get photo URLs
    const photos: PlacePhoto[] = [];

    if (place.photos && place.photos.length > 0) {
      // Get up to 3 photos
      const photosToFetch = place.photos.slice(0, 3);

      for (const photo of photosToFetch) {
        // Extract photo reference from the name (format: places/{place_id}/photos/{photo_reference})
        const photoName = photo.name;

        // Build the photo URL using Places API (New)
        // The photo URL format for the new API
        const photoUrl = `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=800&maxWidthPx=1200&key=${apiKey}`;

        photos.push({
          url: photoUrl,
          width: photo.widthPx || 1200,
          height: photo.heightPx || 800,
          attributions: photo.authorAttributions?.map((a: any) => a.displayName) || [],
        });
      }
    }

    const result: PlaceResult = {
      placeId: place.id,
      name: place.displayName?.text || query,
      address: place.formattedAddress,
      rating: place.rating,
      userRatingsTotal: place.userRatingCount,
      priceLevel: place.priceLevel ? parsePriceLevel(place.priceLevel) : undefined,
      photos,
      types: place.types,
      openNow: place.currentOpeningHours?.openNow,
      website: place.websiteUri,
      phoneNumber: place.nationalPhoneNumber,
    };

    // Cache the result
    placeCache.set(cacheKey, { result, timestamp: Date.now() });

    console.log(`[GOOGLE_PLACES] Returning ${photos.length} photos for "${result.name}"`);
    return result;

  } catch (error: any) {
    console.error(`[GOOGLE_PLACES] Error searching for "${query}":`, error.message);
    placeCache.set(cacheKey, { result: null, timestamp: Date.now() });
    return null;
  }
}

/**
 * Get just the primary photo URL for a restaurant
 * Optimized for journal enrichment - single photo
 */
export async function getRestaurantPhoto(
  restaurantName: string,
  location?: string,
  coordinates?: { latitude: number; longitude: number }
): Promise<string | null> {
  // Build search query
  let query = restaurantName;
  if (location) {
    query += ` ${location}`;
  }
  query += ' restaurant'; // Add restaurant to improve accuracy

  const result = await searchPlaceWithPhotos(query, {
    location: coordinates,
    type: 'restaurant',
  });

  if (result && result.photos.length > 0) {
    return result.photos[0].url;
  }

  return null;
}

/**
 * Get multiple photos for a restaurant (for image picker)
 */
export async function getRestaurantPhotos(
  restaurantName: string,
  location?: string,
  coordinates?: { latitude: number; longitude: number },
  maxPhotos: number = 3
): Promise<PlacePhoto[]> {
  let query = restaurantName;
  if (location) {
    query += ` ${location}`;
  }

  const result = await searchPlaceWithPhotos(query, {
    location: coordinates,
  });

  if (result && result.photos.length > 0) {
    return result.photos.slice(0, maxPhotos);
  }

  return [];
}

/**
 * Get full place details including photos for a venue
 */
export async function getVenueDetails(
  venueName: string,
  venueType: 'restaurant' | 'bar' | 'cafe' | 'hotel' | 'attraction',
  location?: string,
  coordinates?: { latitude: number; longitude: number }
): Promise<PlaceResult | null> {
  let query = venueName;
  if (location) {
    query += ` ${location}`;
  }

  return searchPlaceWithPhotos(query, {
    location: coordinates,
    type: venueType,
  });
}

/**
 * Parse Google's price level enum to number
 */
function parsePriceLevel(priceLevel: string): number {
  const levels: Record<string, number> = {
    'PRICE_LEVEL_FREE': 0,
    'PRICE_LEVEL_INEXPENSIVE': 1,
    'PRICE_LEVEL_MODERATE': 2,
    'PRICE_LEVEL_EXPENSIVE': 3,
    'PRICE_LEVEL_VERY_EXPENSIVE': 4,
  };
  return levels[priceLevel] ?? 2;
}

/**
 * Convert price level to dollar signs
 */
export function priceLevelToSymbol(priceLevel: number | undefined): string {
  if (priceLevel === undefined) return '';
  return '$'.repeat(Math.max(1, Math.min(4, priceLevel)));
}

/**
 * Clear the cache (for testing)
 */
export function clearPlaceCache(): void {
  placeCache.clear();
  console.log('[GOOGLE_PLACES] Cache cleared');
}

/**
 * Get cache stats (for debugging)
 */
export function getPlaceCacheStats(): { size: number; keys: string[] } {
  return {
    size: placeCache.size,
    keys: Array.from(placeCache.keys()),
  };
}
