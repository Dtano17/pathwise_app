// Journal @tag mappings to categories
// Tags allow grouping multiple categories for holistic experiences

export const TAG_CATEGORY_MAPPINGS: Record<string, string[]> = {
  // Vacation/Trip tags
  '@vacation': ['Travel & Places', 'Restaurants & Food', 'Activities & Events'],
  '@trip': ['Travel & Places', 'Restaurants & Food', 'Activities & Events'],
  '@holiday': ['Travel & Places', 'Restaurants & Food', 'Activities & Events', 'Shopping & Purchases'],
  
  // Social experience tags
  '@datenight': ['Restaurants & Food', 'Activities & Events', 'Fashion & Style'],
  '@nightout': ['Restaurants & Food', 'Activities & Events', 'Movies & TV Shows'],
  '@weekend': ['Activities & Events', 'Restaurants & Food', 'Travel & Places'],
  
  // Wellness tags
  '@selfcare': ['Health & Fitness', 'Restaurants & Food', 'Shopping & Purchases'],
  '@wellness': ['Health & Fitness', 'Books & Learning'],
  
  // Creative tags
  '@creative': ['Books & Learning', 'Movies & TV Shows', 'Music & Concerts'],
  '@entertainment': ['Movies & TV Shows', 'Music & Concerts', 'Activities & Events'],
  
  // Individual category keywords (for single-category detection)
  '@restaurants': ['Restaurants & Food'],
  '@restaurant': ['Restaurants & Food'],
  '@food': ['Restaurants & Food'],
  '@dining': ['Restaurants & Food'],
  
  '@travel': ['Travel & Places'],
  '@places': ['Travel & Places'],
  '@place': ['Travel & Places'],
  
  '@activities': ['Activities & Events'],
  '@activity': ['Activities & Events'],
  '@events': ['Activities & Events'],
  '@event': ['Activities & Events'],
  
  '@music': ['Music & Concerts'],
  '@concerts': ['Music & Concerts'],
  '@concert': ['Music & Concerts'],
  
  '@movies': ['Movies & TV Shows'],
  '@movie': ['Movies & TV Shows'],
  '@shows': ['Movies & TV Shows'],
  '@show': ['Movies & TV Shows'],
  '@tv': ['Movies & TV Shows'],
  
  '@shopping': ['Shopping & Purchases'],
  '@purchases': ['Shopping & Purchases'],
  '@purchase': ['Shopping & Purchases'],
  
  '@books': ['Books & Learning'],
  '@book': ['Books & Learning'],
  '@learning': ['Books & Learning'],
  
  '@fitness': ['Health & Fitness'],
  '@health': ['Health & Fitness'],
  '@workout': ['Health & Fitness'],
  '@hike': ['Activities & Events'],
  '@hiking': ['Activities & Events'],
  '@outdoor': ['Activities & Events'],
  '@party': ['Activities & Events'],
  '@celebration': ['Activities & Events'],
  '@nightlife': ['Activities & Events'],
  '@concert': ['Activities & Events'],
  
  '@fashion': ['Fashion & Style'],
  '@style': ['Fashion & Style'],
  '@outfit': ['Fashion & Style'],
  
  // Daily review and reflection tags
  '@dailyreview': ['Personal Notes'],
  '@reflection': ['Personal Notes'],
  '@review': ['Personal Notes'],
  '@notes': ['Personal Notes'],
};

// Extract tags from text
export function extractTags(text: string): string[] {
  const tagPattern = /@[\w]+/g;
  const matches = text.match(tagPattern) || [];
  return matches.map(tag => tag.trim().toLowerCase());
}

// Get categories for detected tags
export function getTagCategories(tags: string[]): {
  tag: string;
  categories: string[];
  isGroupTag: boolean;
}[] {
  return tags.map(tag => {
    const categories = TAG_CATEGORY_MAPPINGS[tag] || [];
    return {
      tag,
      categories,
      isGroupTag: categories.length > 1
    };
  });
}

// Detect all categories from text (both from tags and AI)
export function detectCategoriesFromTags(text: string): {
  detectedTags: string[];
  suggestedCategories: string[];
  isGroupedExperience: boolean;
} {
  const tags = extractTags(text);
  const tagData = getTagCategories(tags);
  
  // Flatten all categories
  const allCategories = tagData.flatMap(t => t.categories);
  const uniqueCategories = Array.from(new Set(allCategories));
  
  // Check if any tag maps to multiple categories (grouped experience)
  const isGrouped = tagData.some(t => t.isGroupTag);
  
  return {
    detectedTags: tags,
    suggestedCategories: uniqueCategories,
    isGroupedExperience: isGrouped
  };
}

// Category name to ID mapping (for compatibility with PersonalJournal component)
const CATEGORY_NAME_TO_ID: Record<string, string> = {
  'Restaurants & Food': 'restaurants',
  'Movies & TV Shows': 'movies',
  'Music & Artists': 'music',
  'Music & Concerts': 'music',
  'Books & Reading': 'books',
  'Books & Learning': 'books',
  'Hobbies & Interests': 'hobbies',
  'Travel & Places': 'travel',
  'Personal Style': 'style',
  'Fashion & Style': 'style',
  'Favorite Things': 'favorites',
  'Personal Notes': 'notes',
  'Health & Fitness': 'fitness',
  'Activities & Events': 'activities',
  'Shopping & Purchases': 'shopping',
};

// Convert full category names to short IDs used by PersonalJournal
export function normalizeCategoryName(categoryName: string): string {
  return CATEGORY_NAME_TO_ID[categoryName] || categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

// Normalize journal data structure to use slug IDs instead of full category names
export function normalizeJournalData(journalData: Record<string, any[]>): {
  normalized: Record<string, any[]>;
  hasChanges: boolean;
} {
  const normalized: Record<string, any[]> = {};
  let hasChanges = false;

  for (const [categoryKey, entries] of Object.entries(journalData)) {
    const normalizedKey = normalizeCategoryName(categoryKey);
    
    // Track if we're renaming a category
    if (normalizedKey !== categoryKey) {
      hasChanges = true;
    }

    // Fix invalid timestamps in entries
    const cleanedEntries = entries.map((entry: any) => {
      if (!entry.timestamp) {
        hasChanges = true;
        return { ...entry, timestamp: new Date().toISOString() };
      }
      
      // Validate timestamp
      try {
        new Date(entry.timestamp).toISOString();
        return entry;
      } catch (error) {
        hasChanges = true;
        console.warn(`[JOURNAL] Fixing invalid timestamp:`, entry.timestamp);
        return { ...entry, timestamp: new Date().toISOString() };
      }
    });

    // Merge entries if the normalized key already exists
    if (normalized[normalizedKey]) {
      normalized[normalizedKey] = [...normalized[normalizedKey], ...cleanedEntries];
    } else {
      normalized[normalizedKey] = cleanedEntries;
    }
  }

  return { normalized, hasChanges };
}

// Domain-to-Journal-Category mapping for planning personalization
// Maps planning domains to relevant journal categories for intelligent search
export const DOMAIN_TO_JOURNAL_CATEGORIES: Record<string, string[]> = {
  travel: ['travel', 'activities', 'restaurants', 'notes'],
  dining: ['restaurants', 'notes'],
  wellness: ['self-care', 'activities', 'fitness'],
  fitness: ['self-care', 'activities', 'fitness'],
  entertainment: ['movies', 'activities', 'restaurants', 'music'],
  event: ['activities', 'restaurants', 'travel'],
  shopping: ['shopping', 'notes'],
  learning: ['books', 'work', 'notes'],
  social: ['activities', 'restaurants', 'notes'],
  work: ['work', 'notes'],
  other: ['notes', 'activities']
};
