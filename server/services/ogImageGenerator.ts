import sharp from 'sharp';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import type { Activity, Task } from '@shared/schema';
import { getActivityImage } from './webImageSearch';

export interface OGImageOptions {
  activity: Activity;
  tasks: Task[];
  baseUrl?: string;
}

const categoryEmojis: Record<string, string> = {
  fitness: '💪',
  health: '🏥',
  career: '💼',
  learning: '📚',
  finance: '💰',
  relationships: '❤️',
  creativity: '🎨',
  travel: '✈️',
  home: '🏠',
  personal: '⭐',
  other: '📋'
};

/**
 * Load image from URL or local file path and return as Buffer
 * Security: Only allows loading from attached_assets directory to prevent path traversal
 */
async function loadImage(imageSource: string): Promise<Buffer> {
  try {
    // Check if it's a URL
    if (imageSource.startsWith('http://') || imageSource.startsWith('https://')) {
      // Download from URL
      const response = await axios.get(imageSource, {
        responseType: 'arraybuffer',
        timeout: 10000,
        headers: {
          'User-Agent': 'JournalMate/1.0'
        }
      });
      return Buffer.from(response.data);
    } else {
      // Load from local file system (SECURITY: restrict to attached_assets only)
      
      // Reject absolute paths and path traversal attempts
      if (path.isAbsolute(imageSource) || imageSource.includes('..')) {
        console.error(`[OGImage] Security: Rejected unsafe path: ${imageSource}`);
        throw new Error('Invalid image path: only relative paths within attached_assets are allowed');
      }

      // Only allow files within attached_assets
      const allowedBaseDir = path.join(process.cwd(), 'attached_assets');
      
      // Try common subdirectories
      const possiblePaths = [
        path.join(allowedBaseDir, 'stock_images', imageSource),
        path.join(allowedBaseDir, imageSource)
      ];

      for (const filePath of possiblePaths) {
        // Resolve to absolute path and verify it's within allowed directory
        const resolvedPath = path.resolve(filePath);
        const resolvedBaseDir = path.resolve(allowedBaseDir);
        
        if (!resolvedPath.startsWith(resolvedBaseDir)) {
          console.error(`[OGImage] Security: Path outside allowed directory: ${resolvedPath}`);
          continue;
        }

        try {
          const fileBuffer = await fs.readFile(resolvedPath);
          console.log(`[OGImage] Loaded image from: ${resolvedPath}`);
          return fileBuffer;
        } catch (err) {
          // Try next path
          continue;
        }
      }

      throw new Error(`File not found in attached_assets: ${imageSource}`);
    }
  } catch (error) {
    console.error('[OGImage] Error loading image:', error);
    throw new Error('Failed to load backdrop image');
  }
}

/**
 * Check if a code point is an emoji base character
 */
function isEmojiBase(code: number): boolean {
  return (
    (code >= 0x1F300 && code <= 0x1F9FF) || // Misc symbols, emoticons, transport, food, etc.
    (code >= 0x2600 && code <= 0x26FF) ||   // Misc symbols (sun, moon, stars, etc.)
    (code >= 0x2700 && code <= 0x27BF) ||   // Dingbats (scissors, checkmarks, etc.)
    (code >= 0x231A && code <= 0x231B) ||   // Watch, hourglass
    (code >= 0x23E9 && code <= 0x23F3) ||   // Media controls
    (code >= 0x25AA && code <= 0x25AB) ||   // Squares
    (code >= 0x25FB && code <= 0x25FE) ||   // Squares and circles
    (code >= 0x2B50 && code <= 0x2B55) ||   // Stars
    (code >= 0x3030 && code <= 0x303D) ||   // Wavy dash
    (code >= 0x1F004 && code <= 0x1F0CF) || // Mahjong, playing cards
    (code >= 0x1F170 && code <= 0x1F251) || // Enclosed characters
    (code >= 0x1FA00 && code <= 0x1FAFF) || // Symbols & Pictographs Extended-A
    (code >= 0x1F900 && code <= 0x1F9FF)    // Supplemental symbols
  );
}

/**
 * Check if a code point is an emoji modifier (skin tone, variation selector, ZWJ, etc.)
 */
function isEmojiModifier(code: number): boolean {
  return (
    (code >= 0x1F3FB && code <= 0x1F3FF) || // Skin tone modifiers
    code === 0x200D ||                       // Zero-width joiner
    code === 0xFE0F ||                       // Variation selector
    (code >= 0xE0020 && code <= 0xE007F)    // Tag characters
  );
}

/**
 * Extract the first emoji from a string
 * Returns the full emoji sequence including modifiers/joiners, or null if none
 * Properly handles surrogate pairs and complex emoji sequences (ZWJ, skin tones, etc.)
 */
function extractFirstEmoji(text: string): string | null {
  if (!text || text.length === 0) return null;
  
  // Convert to array of Unicode code points (handles surrogate pairs correctly)
  const codePoints = Array.from(text);
  
  let emojiSequence = '';
  let foundEmoji = false;
  
  // Iterate through code points (not UTF-16 code units)
  for (const codePoint of codePoints) {
    const code = codePoint.codePointAt(0);
    
    if (!code) continue;
    
    // Check if this is an emoji base character or a modifier following an emoji
    if (isEmojiBase(code) || (foundEmoji && isEmojiModifier(code))) {
      emojiSequence += codePoint;
      foundEmoji = true;
    } else if (foundEmoji) {
      // We've found an emoji sequence and hit a non-emoji character
      break;
    }
  }
  
  return foundEmoji ? emojiSequence : null;
}

/**
 * Create SVG text overlay with activity details
 */
function createTextOverlay(
  activity: Activity,
  tasks: Task[],
  emoji: string
): string {
  const title = activity.shareTitle || activity.planSummary || activity.title || 'Shared Activity';
  const description = activity.description || '';
  const category = activity.category || 'other';

  // Calculate progress
  const completedTasks = tasks.filter(t => t.completed).length;
  const totalTasks = tasks.length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Extract emoji from title if present, otherwise use the provided emoji
  const extractedEmoji = extractFirstEmoji(title);
  const displayEmoji = extractedEmoji || emoji;
  
  // Remove emoji from title if it was extracted
  const titleWithoutEmoji = extractedEmoji ? title.replace(extractedEmoji, '').trim() : title;
  
  // Truncate title if too long (max 50 chars for better display)
  const displayTitle = titleWithoutEmoji.length > 50 ? titleWithoutEmoji.substring(0, 47) + '...' : titleWithoutEmoji;
  
  // Create description with task summary
  let displayDescription = '';
  if (description) {
    const shortDesc = description.length > 60 ? description.substring(0, 57) + '...' : description;
    displayDescription = `${shortDesc} • ${totalTasks} ${totalTasks === 1 ? 'task' : 'tasks'} • ${completedTasks} completed`;
  } else {
    displayDescription = `${totalTasks} ${totalTasks === 1 ? 'task' : 'tasks'} • ${completedTasks} completed`;
  }

  // Progress percentage text for prominent display
  const progressText = progressPercent === 100 ? `${progressPercent}% complete!` : `${progressPercent}% complete!`;

  return `
    <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <!-- Dark gradient overlay for text readability -->
      <defs>
        <linearGradient id="darkGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:rgba(0,0,0,0.75);stop-opacity:1" />
          <stop offset="40%" style="stop-color:rgba(0,0,0,0.65);stop-opacity:1" />
          <stop offset="100%" style="stop-color:rgba(0,0,0,0.80);stop-opacity:1" />
        </linearGradient>
        
        <!-- Multi-layer text shadow filter for maximum readability -->
        <filter id="strongShadow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
          <feOffset dx="2" dy="2" result="offsetblur"/>
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.8"/>
          </feComponentTransfer>
          <feMerge>
            <feMergeNode/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      <!-- Overlay gradient -->
      <rect width="1200" height="630" fill="url(#darkGradient)" />

      <!-- Top Branding Bar -->
      <text x="60" y="45" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="white" style="text-shadow: 0 2px 8px rgba(0,0,0,0.8), 0 0 2px rgba(0,0,0,0.9);">
        JournalMate
      </text>
      <text x="200" y="45" font-family="Arial, sans-serif" font-size="18" fill="rgba(255,255,255,0.90)" style="text-shadow: 0 2px 6px rgba(0,0,0,0.7);">
        Adaptive Planning Engine | Transform Dreams into Reality
      </text>

      <!-- Main Content: Emoji and Title -->
      <text x="60" y="145" font-family="Arial, sans-serif" font-size="85" fill="white" style="text-shadow: 0 4px 12px rgba(0,0,0,0.9), 0 2px 4px rgba(0,0,0,0.8);">
        ${displayEmoji}
      </text>

      <text x="60" y="235" font-family="Arial, sans-serif" font-size="58" font-weight="bold" fill="white" style="text-shadow: 0 4px 12px rgba(0,0,0,0.9), 0 2px 6px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.5);">
        ${displayTitle}
      </text>

      <!-- Description with task summary -->
      <text x="60" y="285" font-family="Arial, sans-serif" font-size="24" fill="rgba(255,255,255,0.95)" font-weight="400" style="text-shadow: 0 3px 8px rgba(0,0,0,0.8), 0 1px 3px rgba(0,0,0,0.9);">
        ${displayDescription}
      </text>

      <!-- Prominent Progress Display -->
      <text x="60" y="360" font-family="Arial, sans-serif" font-size="48" font-weight="700" fill="white" style="text-shadow: 0 4px 12px rgba(0,0,0,0.9), 0 2px 6px rgba(0,0,0,0.8);">
        ${progressText}
      </text>

      <!-- Bottom Branding Bar with subtle gradient -->
      <rect x="0" y="550" width="1200" height="80" fill="rgba(0,0,0,0.70)" />
      
      <!-- JournalMate tagline -->
      <text x="60" y="590" font-family="Arial, sans-serif" font-size="24" fill="white" font-weight="600" style="text-shadow: 0 2px 6px rgba(0,0,0,0.8);">
        JournalMate
      </text>
      <text x="230" y="590" font-family="Arial, sans-serif" font-size="22" fill="rgba(255,255,255,0.90)" style="text-shadow: 0 2px 6px rgba(0,0,0,0.7);">
        Plan → Execute → Reflect → Share with AI-powered adaptive intelligence
      </text>
    </svg>
  `;
}

/**
 * Generate Open Graph image with activity backdrop and details overlay
 */
export async function generateOGImage(options: OGImageOptions): Promise<Buffer> {
  const { activity, tasks, baseUrl } = options;

  try {
    // Get the best available image (user backdrop > web search > category fallback)
    const imageUrl = await getActivityImage(
      activity.title,
      activity.category || 'other',
      activity.backdrop || undefined,
      baseUrl
    );

    console.log(`[OGImage] Using image: ${imageUrl}`);

    // Load the backdrop image (from URL or local file)
    const backdropBuffer = await loadImage(imageUrl);

    // Get category emoji
    const category = activity.category?.toLowerCase() || 'other';
    const emoji = categoryEmojis[category] || '✨';

    // Create SVG overlay with activity details
    const svgOverlay = createTextOverlay(activity, tasks, emoji);

    // Composite the backdrop with the text overlay
    const finalImage = await sharp(backdropBuffer)
      .resize(1200, 630, {
        fit: 'cover',
        position: 'center'
      })
      .composite([
        {
          input: Buffer.from(svgOverlay),
          top: 0,
          left: 0
        }
      ])
      .png()
      .toBuffer();

    console.log('[OGImage] Successfully generated OG image');
    return finalImage;

  } catch (error) {
    console.error('[OGImage] Error generating OG image:', error);

    // Fallback: Create a simple gradient image with text if image processing fails
    return createFallbackImage(activity, tasks);
  }
}

/**
 * Create a fallback OG image when backdrop processing fails
 */
async function createFallbackImage(activity: Activity, tasks: Task[]): Promise<Buffer> {
  const category = activity.category?.toLowerCase() || 'other';
  const categoryEmoji = categoryEmojis[category] || '✨';

  const categoryGradients: Record<string, { start: string; end: string }> = {
    fitness: { start: '#FF6B6B', end: '#FF8E53' },
    health: { start: '#4ECDC4', end: '#44A08D' },
    career: { start: '#667EEA', end: '#764BA2' },
    learning: { start: '#F093FB', end: '#F5576C' },
    finance: { start: '#43E97B', end: '#38F9D7' },
    relationships: { start: '#FA709A', end: '#FEE140' },
    creativity: { start: '#A8EDEA', end: '#FED6E3' },
    travel: { start: '#FF9A9E', end: '#FAD0C4' },
    home: { start: '#FEC163', end: '#DE4313' },
    personal: { start: '#C471F5', end: '#FA71CD' },
    other: { start: '#667EEA', end: '#764BA2' }
  };

  const gradient = categoryGradients[category] || categoryGradients.other;

  const completedTasks = tasks.filter(t => t.completed).length;
  const totalTasks = tasks.length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const title = activity.shareTitle || activity.planSummary || activity.title || 'Shared Activity';
  
  // Extract emoji from title if present, otherwise use category emoji
  const extractedEmoji = extractFirstEmoji(title);
  const displayEmoji = extractedEmoji || categoryEmoji;
  
  // Remove emoji from title if it was extracted
  const titleWithoutEmoji = extractedEmoji ? title.replace(extractedEmoji, '').trim() : title;
  const displayTitle = titleWithoutEmoji.length > 50 ? titleWithoutEmoji.substring(0, 47) + '...' : titleWithoutEmoji;

  // Create description with task summary
  const taskSummary = `${totalTasks} ${totalTasks === 1 ? 'task' : 'tasks'} • ${completedTasks} completed`;
  const progressText = `${progressPercent}% complete!`;

  const svg = `
    <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${gradient.start};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${gradient.end};stop-opacity:1" />
        </linearGradient>
      </defs>

      <rect width="1200" height="630" fill="url(#bgGradient)" />

      <!-- Top Branding Bar -->
      <text x="60" y="45" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="white" style="text-shadow: 0 2px 8px rgba(0,0,0,0.6);">
        JournalMate
      </text>
      <text x="200" y="45" font-family="Arial, sans-serif" font-size="18" fill="rgba(255,255,255,0.95)" style="text-shadow: 0 2px 6px rgba(0,0,0,0.5);">
        Adaptive Planning Engine | Transform Dreams into Reality
      </text>

      <!-- Main Content -->
      <text x="60" y="145" font-family="Arial, sans-serif" font-size="85" fill="white" style="text-shadow: 0 4px 12px rgba(0,0,0,0.6);">
        ${displayEmoji}
      </text>

      <text x="60" y="235" font-family="Arial, sans-serif" font-size="58" font-weight="bold" fill="white" style="text-shadow: 0 4px 12px rgba(0,0,0,0.6);">
        ${displayTitle}
      </text>

      <text x="60" y="285" font-family="Arial, sans-serif" font-size="24" fill="rgba(255,255,255,0.95)" style="text-shadow: 0 3px 8px rgba(0,0,0,0.5);">
        ${taskSummary}
      </text>

      <text x="60" y="360" font-family="Arial, sans-serif" font-size="48" fill="white" font-weight="700" style="text-shadow: 0 4px 12px rgba(0,0,0,0.6);">
        ${progressText}
      </text>

      <!-- Bottom Branding Bar -->
      <rect x="0" y="550" width="1200" height="80" fill="rgba(0,0,0,0.25)" />
      
      <text x="60" y="590" font-family="Arial, sans-serif" font-size="24" fill="white" font-weight="600" style="text-shadow: 0 2px 6px rgba(0,0,0,0.5);">
        JournalMate
      </text>
      <text x="230" y="590" font-family="Arial, sans-serif" font-size="22" fill="rgba(255,255,255,0.95)" style="text-shadow: 0 2px 6px rgba(0,0,0,0.5);">
        Plan → Execute → Reflect → Share with AI-powered adaptive intelligence
      </text>
    </svg>
  `;

  return sharp(Buffer.from(svg))
    .png()
    .toBuffer();
}
