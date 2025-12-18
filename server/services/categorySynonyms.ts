/**
 * Category Synonyms - Maps various terms to standard journal categories
 * This ensures content like "entertainment", "films", "cinema" all map to "Movies & TV Shows"
 */

// Standard category names (must match PersonalJournal component exactly)
export const STANDARD_CATEGORIES = {
  RESTAURANTS: 'Restaurants & Food',
  MOVIES: 'Movies & TV Shows',
  MUSIC: 'Music & Artists',
  BOOKS: 'Books & Reading',
  HOBBIES: 'Hobbies & Interests',
  TRAVEL: 'Travel & Places',
  STYLE: 'Personal Style',
  FAVORITES: 'Favorite Things',
  NOTES: 'Personal Notes',
  // Additional standard categories
  FITNESS: 'Health & Fitness',
  ACTIVITIES: 'Activities & Events',
  SHOPPING: 'Shopping & Purchases',
} as const;

// Canonical JournalCategory values (the only valid category IDs)
export type JournalCategoryId = 'restaurants' | 'movies' | 'music' | 'books' | 'hobbies' | 'travel' | 'style' | 'favorites' | 'notes';

// Category ID to display name mapping - only canonical JournalCategory IDs
export const CATEGORY_ID_TO_NAME: Record<JournalCategoryId, string> = {
  'restaurants': STANDARD_CATEGORIES.RESTAURANTS,
  'movies': STANDARD_CATEGORIES.MOVIES,
  'music': STANDARD_CATEGORIES.MUSIC,
  'books': STANDARD_CATEGORIES.BOOKS,
  'hobbies': STANDARD_CATEGORIES.HOBBIES,
  'travel': STANDARD_CATEGORIES.TRAVEL,
  'style': STANDARD_CATEGORIES.STYLE,
  'favorites': STANDARD_CATEGORIES.FAVORITES,
  'notes': STANDARD_CATEGORIES.NOTES,
};

// Maps extended standard category names to canonical JournalCategory IDs
// This ensures categories like "Health & Fitness" map to "hobbies" not "fitness"
const EXTENDED_CATEGORY_TO_CANONICAL: Record<string, JournalCategoryId> = {
  [STANDARD_CATEGORIES.RESTAURANTS]: 'restaurants',
  [STANDARD_CATEGORIES.MOVIES]: 'movies',
  [STANDARD_CATEGORIES.MUSIC]: 'music',
  [STANDARD_CATEGORIES.BOOKS]: 'books',
  [STANDARD_CATEGORIES.HOBBIES]: 'hobbies',
  [STANDARD_CATEGORIES.TRAVEL]: 'travel',
  [STANDARD_CATEGORIES.STYLE]: 'style',
  [STANDARD_CATEGORIES.FAVORITES]: 'favorites',
  [STANDARD_CATEGORIES.NOTES]: 'notes',
  // Extended categories collapse to canonical IDs
  [STANDARD_CATEGORIES.FITNESS]: 'hobbies',
  [STANDARD_CATEGORIES.ACTIVITIES]: 'hobbies',
  [STANDARD_CATEGORIES.SHOPPING]: 'favorites',
};

// Synonym mappings - all terms that should resolve to each standard category
// Keys are normalized (lowercase, singular forms)
export const CATEGORY_SYNONYMS: Record<string, string[]> = {
  // Movies & TV Shows - entertainment, streaming, cinema, etc.
  [STANDARD_CATEGORIES.MOVIES]: [
    'movie', 'movies', 'film', 'films', 'cinema', 'theater', 'theatre',
    'entertainment', 'entertainments', 'streaming', 'netflix', 'hulu', 'disney',
    'tv', 'television', 'series', 'show', 'shows', 'watch', 'watching',
    'actor', 'actress', 'director', 'documentary', 'documentaries',
    'anime', 'cartoon', 'animation', 'sitcom', 'drama', 'comedy',
    'horror', 'thriller', 'action', 'romance', 'scifi', 'sci-fi',
    'binge', 'bingewatch', 'binge-watch', 'stream',
    'paramount', 'hbo', 'max', 'prime video', 'apple tv',
    'blockbuster', 'premiere', 'screening', 'imax',
  ],
  
  // Restaurants & Food
  [STANDARD_CATEGORIES.RESTAURANTS]: [
    'restaurant', 'restaurants', 'food', 'foods', 'dining', 'dine',
    'eat', 'eating', 'meal', 'meals', 'cuisine', 'cuisines',
    'cafe', 'cafes', 'coffee', 'bakery', 'bakeries', 'pastry',
    'brunch', 'breakfast', 'lunch', 'dinner', 'supper',
    'chef', 'cook', 'cooking', 'recipe', 'recipes',
    'bistro', 'eatery', 'grill', 'steakhouse', 'pizzeria',
    'sushi', 'ramen', 'italian', 'mexican', 'chinese', 'indian', 'thai',
    'fast food', 'takeout', 'delivery', 'ubereats', 'doordash',
    'bar food', 'pub food', 'gastropub',
  ],
  
  // Music & Artists
  [STANDARD_CATEGORIES.MUSIC]: [
    'music', 'song', 'songs', 'artist', 'artists', 'band', 'bands',
    'album', 'albums', 'playlist', 'playlists', 'spotify', 'soundcloud',
    'concert', 'concerts', 'gig', 'gigs', 'live music', 'festival',
    'singer', 'singers', 'musician', 'musicians', 'rapper', 'dj',
    'pop', 'rock', 'jazz', 'classical', 'hip hop', 'hiphop', 'r&b', 'rnb',
    'country', 'electronic', 'edm', 'indie', 'folk', 'metal',
    'vinyl', 'record', 'records', 'track', 'tracks', 'tune', 'tunes',
    'apple music', 'pandora', 'tidal', 'deezer',
  ],
  
  // Books & Reading
  [STANDARD_CATEGORIES.BOOKS]: [
    'book', 'books', 'reading', 'read', 'novel', 'novels',
    'author', 'authors', 'writer', 'writers', 'literature',
    'library', 'libraries', 'bookstore', 'bookshop',
    'fiction', 'nonfiction', 'non-fiction', 'memoir', 'memoirs',
    'biography', 'biographies', 'autobiography',
    'bestseller', 'bestsellers', 'kindle', 'ebook', 'ebooks',
    'audiobook', 'audiobooks', 'audible', 'podcast', 'podcasts',
    'magazine', 'magazines', 'article', 'articles',
    'learning', 'education', 'study', 'studying',
    'chapter', 'page', 'paperback', 'hardcover',
  ],
  
  // Hobbies & Interests
  [STANDARD_CATEGORIES.HOBBIES]: [
    'hobby', 'hobbies', 'interest', 'interests', 'passion', 'passions',
    'craft', 'crafts', 'diy', 'create', 'creating', 'creative',
    'art', 'arts', 'painting', 'drawing', 'sketch', 'sketching',
    'photography', 'photo', 'photos', 'camera',
    'gaming', 'game', 'games', 'video game', 'videogame', 'esports',
    'collection', 'collecting', 'collector',
    'garden', 'gardening', 'plants', 'plant',
    'cooking hobby', 'baking', 'woodwork', 'woodworking',
    'knitting', 'sewing', 'quilting', 'crochet',
    'bar', 'bars', 'pub', 'pubs', 'club', 'clubs', 'nightclub', 'nightlife',
    'lounge', 'brewery', 'breweries', 'winery', 'wineries',
    'spa', 'wellness', 'massage', 'relaxation',
  ],
  
  // Travel & Places
  [STANDARD_CATEGORIES.TRAVEL]: [
    'travel', 'traveling', 'travelling', 'trip', 'trips', 'vacation',
    'holiday', 'holidays', 'destination', 'destinations',
    'flight', 'flights', 'airline', 'airport', 'plane',
    'hotel', 'hotels', 'resort', 'resorts', 'hostel', 'airbnb',
    'accommodation', 'stay', 'lodging', 'motel', 'inn',
    'tour', 'tours', 'tourism', 'tourist', 'sightseeing',
    'adventure', 'adventures', 'explore', 'exploring', 'exploration',
    'landmark', 'landmarks', 'monument', 'monuments', 'attraction',
    'museum', 'museums', 'gallery', 'galleries',
    'beach', 'beaches', 'mountain', 'mountains', 'hiking', 'hike',
    'camping', 'camp', 'outdoor', 'outdoors', 'nature', 'park', 'parks',
    'country', 'countries', 'city', 'cities', 'place', 'places',
    'road trip', 'roadtrip', 'backpacking', 'backpack',
  ],
  
  // Personal Style
  [STANDARD_CATEGORIES.STYLE]: [
    'style', 'fashion', 'outfit', 'outfits', 'clothing', 'clothes',
    'wardrobe', 'dress', 'dresses', 'wear', 'wearing',
    'brand', 'brands', 'designer', 'designers', 'luxury',
    'accessory', 'accessories', 'jewelry', 'jewellery',
    'shoes', 'sneakers', 'boots', 'heels', 'footwear',
    'bag', 'bags', 'purse', 'handbag', 'backpack',
    'watch', 'watches', 'sunglasses', 'glasses',
    'makeup', 'cosmetics', 'beauty', 'skincare', 'grooming',
    'hair', 'hairstyle', 'haircut', 'salon',
    'aesthetic', 'aesthetics', 'look', 'looks', 'trend', 'trends',
  ],
  
  // Favorite Things
  [STANDARD_CATEGORIES.FAVORITES]: [
    'favorite', 'favorites', 'favourite', 'favourites',
    'best', 'top', 'love', 'loved', 'loving', 'like', 'liked',
    'recommend', 'recommendation', 'recommendations',
    'must have', 'must-have', 'essential', 'essentials',
    'wishlist', 'wish list', 'want', 'wanted', 'desire',
    'collection', 'save', 'saved', 'saving', 'bookmark', 'bookmarked',
    'treasure', 'treasures', 'gem', 'gems', 'find', 'finds',
    'discovery', 'discoveries', 'discover', 'discovered',
  ],
  
  // Health & Fitness
  [STANDARD_CATEGORIES.FITNESS]: [
    'fitness', 'fit', 'gym', 'workout', 'workouts', 'exercise',
    'health', 'healthy', 'wellness', 'wellbeing', 'well-being',
    'running', 'run', 'jogging', 'jog', 'walking', 'walk',
    'yoga', 'pilates', 'stretch', 'stretching', 'meditation',
    'weight', 'weights', 'lifting', 'strength', 'cardio',
    'sports', 'sport', 'athletic', 'athlete', 'training',
    'diet', 'nutrition', 'calories', 'protein', 'supplement',
    'crossfit', 'hiit', 'spin', 'cycling', 'bike', 'biking',
    'swim', 'swimming', 'pool', 'marathon', 'triathlon',
  ],
  
  // Activities & Events
  [STANDARD_CATEGORIES.ACTIVITIES]: [
    'activity', 'activities', 'event', 'events', 'thing to do',
    'things to do', 'fun', 'experience', 'experiences',
    'party', 'parties', 'celebration', 'celebrate', 'birthday',
    'wedding', 'anniversary', 'graduation', 'reunion',
    'meetup', 'meet-up', 'gathering', 'hangout', 'hang out',
    'class', 'classes', 'workshop', 'workshops', 'lesson', 'lessons',
    'game night', 'trivia', 'karaoke', 'bowling', 'arcade',
    'escape room', 'mini golf', 'laser tag', 'paintball',
    'amusement park', 'theme park', 'fair', 'carnival', 'circus',
  ],
  
  // Shopping & Purchases
  [STANDARD_CATEGORIES.SHOPPING]: [
    'shopping', 'shop', 'shops', 'store', 'stores', 'mall',
    'purchase', 'purchases', 'buy', 'buying', 'bought',
    'retail', 'boutique', 'boutiques', 'market', 'markets',
    'deal', 'deals', 'sale', 'sales', 'discount', 'discounts',
    'amazon', 'ebay', 'etsy', 'online shopping', 'ecommerce',
    'product', 'products', 'item', 'items', 'goods',
    'order', 'orders', 'delivery', 'package', 'packages',
    'gift', 'gifts', 'present', 'presents',
  ],
};

/**
 * Normalize a category name for matching
 * - lowercase
 * - remove special characters
 * - trim whitespace
 * - handle common variations
 */
export function normalizeForMatching(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/gi, '') // Remove special chars except hyphen
    .replace(/\s+/g, ' ')           // Collapse multiple spaces
    .trim();
}

/**
 * Resolve a category name to a standard category
 * Returns the standard category name if found, null otherwise
 * 
 * Matching priority:
 * 1. Exact match to standard category name
 * 2. Category ID match (e.g., "movies" -> "Movies & TV Shows")
 * 3. Synonym match
 * 4. Partial/fuzzy match
 */
export function resolveToStandardCategory(inputCategory: string): string | null {
  if (!inputCategory) return null;
  
  const normalized = normalizeForMatching(inputCategory);
  
  // 1. Direct match to standard category names
  for (const standardName of Object.values(STANDARD_CATEGORIES)) {
    if (normalizeForMatching(standardName) === normalized) {
      return standardName;
    }
  }
  
  // 2. Match by category ID (e.g., "movies" -> "Movies & TV Shows")
  const validIds: JournalCategoryId[] = ['restaurants', 'movies', 'music', 'books', 'hobbies', 'travel', 'style', 'favorites', 'notes'];
  if (validIds.includes(normalized as JournalCategoryId)) {
    return CATEGORY_ID_TO_NAME[normalized as JournalCategoryId];
  }
  
  // 3. Synonym match - check if input matches any synonym
  for (const [standardCategory, synonyms] of Object.entries(CATEGORY_SYNONYMS)) {
    for (const synonym of synonyms) {
      const normalizedSynonym = normalizeForMatching(synonym);
      
      // Exact synonym match
      if (normalized === normalizedSynonym) {
        return standardCategory;
      }
      
      // Input contains the synonym as a word
      if (normalized.includes(normalizedSynonym) || normalizedSynonym.includes(normalized)) {
        return standardCategory;
      }
    }
  }
  
  // 4. Fuzzy/partial match - check if any word in input matches a synonym
  const inputWords = normalized.split(' ');
  for (const [standardCategory, synonyms] of Object.entries(CATEGORY_SYNONYMS)) {
    for (const word of inputWords) {
      if (word.length < 3) continue; // Skip short words
      for (const synonym of synonyms) {
        if (normalizeForMatching(synonym) === word) {
          return standardCategory;
        }
      }
    }
  }
  
  return null;
}

/**
 * Get the canonical category ID for a standard category name
 * e.g., "Movies & TV Shows" -> "movies"
 * Also handles extended categories: "Health & Fitness" -> "hobbies"
 * 
 * @returns A canonical JournalCategoryId (restaurants, movies, music, books, hobbies, travel, style, favorites, notes)
 */
export function getStandardCategoryId(standardCategoryName: string): JournalCategoryId | null {
  // First check the EXTENDED_CATEGORY_TO_CANONICAL which handles all categories
  const canonicalId = EXTENDED_CATEGORY_TO_CANONICAL[standardCategoryName];
  if (canonicalId) {
    return canonicalId;
  }
  
  // Fallback: try matching against CATEGORY_ID_TO_NAME values
  for (const [id, name] of Object.entries(CATEGORY_ID_TO_NAME)) {
    if (name === standardCategoryName) {
      return id as JournalCategoryId;
    }
  }
  return null;
}

/**
 * Check if a category name is already a standard category
 */
export function isStandardCategory(categoryName: string): boolean {
  return Object.values(STANDARD_CATEGORIES).includes(categoryName as any);
}

/**
 * Get all standard category names
 */
export function getAllStandardCategories(): string[] {
  return Object.values(STANDARD_CATEGORIES);
}

/**
 * Map an AI-generated category to a canonical JournalCategory ID
 * This is the main function to use when categorizing content
 * 
 * @returns A canonical JournalCategoryId (restaurants, movies, music, books, hobbies, travel, style, favorites, notes) or null if no match
 */
export function mapToStandardCategoryId(aiCategory: string): JournalCategoryId | null {
  const standardCategory = resolveToStandardCategory(aiCategory);
  if (!standardCategory) return null;
  return getStandardCategoryId(standardCategory);
}
