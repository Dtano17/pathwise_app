/**
 * Category Matching Service
 *
 * Uses Levenshtein distance for fuzzy string matching to prevent duplicate
 * categories, subcategories, venues, and URLs.
 *
 * TWO-LEVEL HIERARCHY:
 * - Primary Categories: Stable containers (limited set, fuzzy matched)
 * - Subcategories: Unlimited specializations (fuzzy matched within primary)
 */

export interface DeduplicationConfig {
  categoryThreshold: number;     // 0.75-0.95 (default 0.85)
  urlThreshold: number;          // 0.90-0.99 (default 0.95)
  venueNameThreshold: number;    // 0.85-0.95 (default 0.90)
}

export const DEFAULT_DEDUP_CONFIG: DeduplicationConfig = {
  categoryThreshold: 0.85,
  urlThreshold: 0.95,  // USER PREFERENCE: Strict URL deduplication
  venueNameThreshold: 0.90
};

/**
 * Calculate Levenshtein distance between two strings
 * Returns the minimum number of single-character edits needed to transform str1 into str2
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,    // deletion
          dp[i][j - 1] + 1,    // insertion
          dp[i - 1][j - 1] + 1 // substitution
        );
      }
    }
  }

  return dp[m][n];
}

/**
 * Calculate similarity score between two strings (0-1, where 1 is identical)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const norm1 = str1.toLowerCase().trim();
  const norm2 = str2.toLowerCase().trim();

  if (norm1 === norm2) return 1.0;
  if (!norm1 || !norm2) return 0.0;

  const maxLen = Math.max(norm1.length, norm2.length);
  const distance = levenshteinDistance(norm1, norm2);

  return 1 - (distance / maxLen);
}

/**
 * Normalize category name for comparison
 * Removes common variations to improve matching
 */
function normalizeCategoryName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, ' ')                    // Normalize whitespace
    .replace(/[^\w\s]/g, '')                 // Remove punctuation
    .replace(/\b(the|a|an)\b/g, '')          // Remove articles
    .replace(/s\b/g, '')                     // Remove trailing 's' (plurals)
    .trim();
}

/**
 * Find similar category using fuzzy matching
 * Returns the matching category if similarity > threshold
 */
export function findSimilarCategory(
  suggestedName: string,
  existingCategories: Array<{id: string; name: string}>,
  config: DeduplicationConfig = DEFAULT_DEDUP_CONFIG
): {id: string; name: string} | null {

  console.log(`[CATEGORY MATCHER] Finding match for: "${suggestedName}"`);
  console.log(`[CATEGORY MATCHER] Checking against ${existingCategories.length} existing categories`);

  const normalizedSuggestion = normalizeCategoryName(suggestedName);
  let bestMatch: {id: string; name: string} | null = null;
  let highestScore = 0;

  for (const existing of existingCategories) {
    const normalizedExisting = normalizeCategoryName(existing.name);
    const similarity = calculateSimilarity(normalizedSuggestion, normalizedExisting);

    console.log(`[CATEGORY MATCHER]   - "${existing.name}" → similarity: ${(similarity * 100).toFixed(1)}%`);

    if (similarity > highestScore) {
      highestScore = similarity;
      bestMatch = existing;
    }
  }

  if (highestScore >= config.categoryThreshold && bestMatch) {
    console.log(`[CATEGORY MATCHER] ✅ Match found: "${bestMatch.name}" (${(highestScore * 100).toFixed(1)}%)`);
    return bestMatch;
  }

  console.log(`[CATEGORY MATCHER] ❌ No match found (best: ${(highestScore * 100).toFixed(1)}% < ${(config.categoryThreshold * 100).toFixed(1)}%)`);
  return null;
}

/**
 * Find similar subcategory within a specific primary category
 * Scoped matching to prevent false positives across different primaries
 */
export function findSimilarSubcategory(
  suggestedName: string,
  existingSubcategories: Array<{id: string; name: string}>,
  config: DeduplicationConfig = DEFAULT_DEDUP_CONFIG
): {id: string; name: string} | null {

  console.log(`[SUBCATEGORY MATCHER] Finding match for: "${suggestedName}"`);
  console.log(`[SUBCATEGORY MATCHER] Checking against ${existingSubcategories.length} existing subcategories`);

  const normalizedSuggestion = normalizeCategoryName(suggestedName);
  let bestMatch: {id: string; name: string} | null = null;
  let highestScore = 0;

  for (const existing of existingSubcategories) {
    const normalizedExisting = normalizeCategoryName(existing.name);
    const similarity = calculateSimilarity(normalizedSuggestion, normalizedExisting);

    console.log(`[SUBCATEGORY MATCHER]   - "${existing.name}" → similarity: ${(similarity * 100).toFixed(1)}%`);

    if (similarity > highestScore) {
      highestScore = similarity;
      bestMatch = existing;
    }
  }

  if (highestScore >= config.categoryThreshold && bestMatch) {
    console.log(`[SUBCATEGORY MATCHER] ✅ Match found: "${bestMatch.name}" (${(highestScore * 100).toFixed(1)}%)`);
    return bestMatch;
  }

  console.log(`[SUBCATEGORY MATCHER] ❌ No match found (best: ${(highestScore * 100).toFixed(1)}% < ${(config.categoryThreshold * 100).toFixed(1)}%)`);
  return null;
}

/**
 * Check if venue already exists using fuzzy matching
 */
export function findDuplicateVenue(
  venueName: string,
  existingVenues: Array<{name: string; id?: string}>,
  config: DeduplicationConfig = DEFAULT_DEDUP_CONFIG
): {name: string; id?: string} | null {

  for (const existing of existingVenues) {
    const similarity = calculateSimilarity(venueName, existing.name);

    if (similarity >= config.venueNameThreshold) {
      console.log(`[VENUE DEDUP] Duplicate found: "${venueName}" → "${existing.name}" (${(similarity * 100).toFixed(1)}%)`);
      return existing;
    }
  }

  return null;
}

/**
 * Check if URL has already been shared
 * Normalizes URLs to handle minor variations
 */
export function checkDuplicateURL(
  url: string,
  existingURLs: string[],
  config: DeduplicationConfig = DEFAULT_DEDUP_CONFIG
): boolean {

  // Normalize URL (remove protocol, query params, trailing slashes, fragments)
  const normalize = (u: string) => u
    .replace(/^https?:\/\//i, '')           // Remove protocol
    .replace(/\/+$/, '')                    // Remove trailing slashes
    .replace(/\?.*$/, '')                   // Remove query params
    .replace(/#.*$/, '')                    // Remove fragments
    .toLowerCase();

  const normalizedUrl = normalize(url);

  // Check for exact matches first
  const exactMatch = existingURLs.some(existing => normalize(existing) === normalizedUrl);
  if (exactMatch) {
    console.log(`[URL DEDUP] Exact duplicate found: ${url}`);
    return true;
  }

  // Check for fuzzy matches (typos, slight variations)
  for (const existing of existingURLs) {
    const similarity = calculateSimilarity(normalizedUrl, normalize(existing));

    if (similarity >= config.urlThreshold) {
      console.log(`[URL DEDUP] Similar URL found: "${url}" → "${existing}" (${(similarity * 100).toFixed(1)}%)`);
      return true;
    }
  }

  return false;
}

/**
 * Generate category ID from name
 * Primary categories: "primary-{slug}"
 * Subcategories: "subcat-{slug}"
 */
export function generatePrimaryCategoryId(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')  // Collapse multiple underscores
    .replace(/^_|_$/g, ''); // Trim underscores

  return `primary-${slug}`;
}

export function generateSubcategoryId(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

  return `subcat-${slug}`;
}

/**
 * Generate a random color gradient for new categories
 * Returns Tailwind gradient class
 */
export function generateColorGradient(): string {
  const gradients = [
    'from-amber-500 to-orange-500',
    'from-sky-500 to-blue-500',
    'from-fuchsia-500 to-pink-500',
    'from-emerald-500 to-green-500',
    'from-violet-500 to-purple-500',
    'from-rose-500 to-red-500',
    'from-cyan-500 to-teal-500',
    'from-indigo-500 to-blue-500'
  ];

  return gradients[Math.floor(Math.random() * gradients.length)];
}
