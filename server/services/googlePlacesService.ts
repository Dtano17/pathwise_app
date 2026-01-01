import axios from 'axios';

/**
 * Google Places Service
 * 
 * Provides official business details, photos, and ratings for restaurants and venues.
 * Requires GOOGLE_PLACES_API_KEY secret.
 */

export interface PlaceDetails {
  name: string;
  rating?: number;
  user_ratings_total?: number;
  formatted_address?: string;
  photo_url?: string;
  price_level?: number;
  website?: string;
  business_status?: string;
  place_id: string;
}

class GooglePlacesService {
  private get apiKey() {
    return process.env.GOOGLE_PLACES_API_KEY;
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }

  async searchRestaurant(query: string): Promise<PlaceDetails | null> {
    if (!this.apiKey) {
      console.warn('[GOOGLE_PLACES] API key not configured');
      return null;
    }

    try {
      console.log(`[GOOGLE_PLACES] Searching for restaurant: "${query}"`);
      
      // 1. Find Place ID
      const searchUrl = 'https://maps.googleapis.com/maps/api/place/findplacefromtext/json';
      const searchRes = await axios.get(searchUrl, {
        params: {
          input: query,
          inputtype: 'textquery',
          fields: 'place_id,name',
          key: this.apiKey
        }
      });

      const candidates = searchRes.data.candidates;
      if (!candidates || candidates.length === 0) {
        console.warn(`[GOOGLE_PLACES] No restaurant found for: "${query}"`);
        return null;
      }

      const placeId = candidates[0].place_id;

      // 2. Get Details and Photo
      const detailsUrl = 'https://maps.googleapis.com/maps/api/place/details/json';
      const detailsRes = await axios.get(detailsUrl, {
        params: {
          place_id: placeId,
          fields: 'name,rating,user_ratings_total,formatted_address,photos,price_level,website,business_status,place_id',
          key: this.apiKey
        }
      });

      const place = detailsRes.data.result;
      if (!place) return null;

      let photoUrl: string | undefined;
      if (place.photos && place.photos.length > 0) {
        const photoReference = place.photos[0].photo_reference;
        photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1200&photo_reference=${photoReference}&key=${this.apiKey}`;
      }

      return {
        name: place.name,
        rating: place.rating,
        user_ratings_total: place.user_ratings_total,
        formatted_address: place.formatted_address,
        photo_url: photoUrl,
        price_level: place.price_level,
        website: place.website,
        business_status: place.business_status,
        place_id: place.place_id
      };
    } catch (error) {
      console.error('[GOOGLE_PLACES] Search failed:', error);
      return null;
    }
  }
}

export const googlePlacesService = new GooglePlacesService();
