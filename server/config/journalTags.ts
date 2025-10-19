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
  
  '@fashion': ['Fashion & Style'],
  '@style': ['Fashion & Style'],
  '@outfit': ['Fashion & Style'],
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
  const uniqueCategories = [...new Set(allCategories)];
  
  // Check if any tag maps to multiple categories (grouped experience)
  const isGrouped = tagData.some(t => t.isGroupTag);
  
  return {
    detectedTags: tags,
    suggestedCategories: uniqueCategories,
    isGroupedExperience: isGrouped
  };
}
