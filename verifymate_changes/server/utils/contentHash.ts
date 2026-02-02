import crypto from 'crypto';

/**
 * Task interface for hash generation
 */
interface TaskForHash {
  title: string;
  description?: string | null;
  order?: number;
}

/**
 * Generates a deterministic SHA-256 content hash from activity tasks.
 * This hash is used for fast duplicate detection - same content = same hash.
 * 
 * The hash is based on:
 * - Task titles (normalized)
 * - Task order
 * - Number of tasks
 * 
 * Performance: ~1-5ms even for large activities
 * Collision resistance: SHA-256 provides excellent protection against accidental duplicates
 * 
 * @param tasks - Array of tasks with at least title and optional order
 * @returns 64-character hexadecimal SHA-256 hash
 * 
 * @example
 * const tasks = [
 *   { title: "Book flight", order: 0 },
 *   { title: "Reserve hotel", order: 1 }
 * ];
 * const hash = generateContentHash(tasks);
 * // Returns: "a3f5b2c1..." (64 chars)
 */
export function generateContentHash(tasks: TaskForHash[]): string {
  // Sort tasks by order to ensure consistent hash
  const sortedTasks = [...tasks].sort((a, b) => (a.order || 0) - (b.order || 0));
  
  // Create a deterministic string representation
  // Format: "title1|title2|title3|..."
  // Normalize titles: lowercase, trim whitespace, remove special characters
  const contentString = sortedTasks
    .map(task => {
      const normalizedTitle = task.title
        .toLowerCase()
        .trim()
        .replace(/[^\w\s]/g, '') // Remove special characters
        .replace(/\s+/g, ' ');   // Normalize whitespace
      return normalizedTitle;
    })
    .filter(title => title.length > 0) // Remove empty titles
    .join('|');
  
  // Add task count as additional uniqueness factor
  const hashInput = `${contentString}|count:${sortedTasks.length}`;
  
  // Generate SHA-256 hash
  return crypto
    .createHash('sha256')
    .update(hashInput)
    .digest('hex');
}

/**
 * Validates if a content hash matches the expected format (64 hex characters)
 */
export function isValidContentHash(hash: string | null | undefined): boolean {
  if (!hash) return false;
  return /^[a-f0-9]{64}$/i.test(hash);
}
