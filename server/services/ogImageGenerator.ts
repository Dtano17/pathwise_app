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
 * Wrap text into multiple lines based on character limit
 * Handles long words by breaking them at the character limit
 */
function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    // If a single word is longer than the limit, break it up
    if (word.length > maxCharsPerLine) {
      // Push current line if it has content
      if (currentLine) {
        lines.push(currentLine);
        currentLine = '';
      }
      
      // Break the long word into chunks
      let remainingWord = word;
      while (remainingWord.length > maxCharsPerLine) {
        lines.push(remainingWord.substring(0, maxCharsPerLine));
        remainingWord = remainingWord.substring(maxCharsPerLine);
      }
      
      // Set the remaining part as the current line
      currentLine = remainingWord;
      continue;
    }
    
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    
    if (testLine.length <= maxCharsPerLine) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
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
  
  // Wrap title to fit (max 2 lines, ~35 chars per line for 58px font)
  const titleLines = wrapText(titleWithoutEmoji, 35);
  let displayTitleLines = titleLines.slice(0, 2); // Max 2 lines for title
  
  // If title was truncated, add ellipsis to last line
  if (titleLines.length > 2 && displayTitleLines.length === 2) {
    const lastLine = displayTitleLines[1];
    displayTitleLines[1] = lastLine.substring(0, Math.max(0, lastLine.length - 3)) + '...';
  }
  
  // Create description with task summary
  let fullDescription = '';
  if (description) {
    fullDescription = `${description} • ${totalTasks} ${totalTasks === 1 ? 'task' : 'tasks'} • ${completedTasks} completed`;
  } else {
    fullDescription = `${totalTasks} ${totalTasks === 1 ? 'task' : 'tasks'} • ${completedTasks} completed`;
  }
  
  // Wrap description (max 2 lines, ~70 chars per line for 24px font)
  const descriptionLines = wrapText(fullDescription, 70);
  let displayDescriptionLines = descriptionLines.slice(0, 2); // Max 2 lines for description
  
  // If description was truncated, add ellipsis to last line
  if (descriptionLines.length > 2 && displayDescriptionLines.length === 2) {
    const lastLine = displayDescriptionLines[1];
    displayDescriptionLines[1] = lastLine.substring(0, Math.max(0, lastLine.length - 3)) + '...';
  }

  // Progress percentage text for prominent display
  const progressText = progressPercent === 100 ? `${progressPercent}% complete!` : `${progressPercent}% complete!`;

  // Generate title tspans for multi-line text
  const titleTspans = displayTitleLines.map((line, index) => 
    `<tspan x="60" dy="${index === 0 ? '0' : '65'}">${escapeXml(line)}</tspan>`
  ).join('');

  // Generate description tspans for multi-line text
  const descriptionTspans = displayDescriptionLines.map((line, index) => 
    `<tspan x="60" dy="${index === 0 ? '0' : '32'}">${escapeXml(line)}</tspan>`
  ).join('');

  // Calculate vertical spacing based on number of lines
  const titleHeight = 180 + (displayTitleLines.length - 1) * 65;
  const descriptionY = titleHeight + 80;
  const progressY = descriptionY + (displayDescriptionLines.length) * 32 + 60;

  return `
    <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <!-- Dark gradient overlay for text readability -->
      <defs>
        <linearGradient id="darkGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:rgba(0,0,0,0.75);stop-opacity:1" />
          <stop offset="40%" style="stop-color:rgba(0,0,0,0.65);stop-opacity:1" />
          <stop offset="100%" style="stop-color:rgba(0,0,0,0.80);stop-opacity:1" />
        </linearGradient>
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

      <!-- Main Content: Emoji -->
      <text x="60" y="145" font-family="Arial, sans-serif" font-size="85" fill="white" style="text-shadow: 0 4px 12px rgba(0,0,0,0.9), 0 2px 4px rgba(0,0,0,0.8);">
        ${escapeXml(displayEmoji)}
      </text>

      <!-- Title (multi-line with tspan) -->
      <text x="60" y="235" font-family="Arial, sans-serif" font-size="58" font-weight="bold" fill="white" style="text-shadow: 0 4px 12px rgba(0,0,0,0.9), 0 2px 6px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.5);">
        ${titleTspans}
      </text>

      <!-- Description with task summary (multi-line with tspan) -->
      <text x="60" y="${descriptionY}" font-family="Arial, sans-serif" font-size="24" fill="rgba(255,255,255,0.95)" font-weight="400" style="text-shadow: 0 3px 8px rgba(0,0,0,0.8), 0 1px 3px rgba(0,0,0,0.9);">
        ${descriptionTspans}
      </text>

      <!-- Prominent Progress Display -->
      <text x="60" y="${progressY}" font-family="Arial, sans-serif" font-size="48" font-weight="700" fill="white" style="text-shadow: 0 4px 12px rgba(0,0,0,0.9), 0 2px 6px rgba(0,0,0,0.8);">
        ${escapeXml(progressText)}
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
 * Escape XML special characters for SVG text content
 */
function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
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
  
  // Wrap title to fit (max 2 lines, ~35 chars per line for 58px font)
  const titleLines = wrapText(titleWithoutEmoji, 35);
  let displayTitleLines = titleLines.slice(0, 2);
  
  // If title was truncated, add ellipsis to last line
  if (titleLines.length > 2 && displayTitleLines.length === 2) {
    const lastLine = displayTitleLines[1];
    displayTitleLines[1] = lastLine.substring(0, Math.max(0, lastLine.length - 3)) + '...';
  }

  // Create description with task summary
  const taskSummary = `${totalTasks} ${totalTasks === 1 ? 'task' : 'tasks'} • ${completedTasks} completed`;
  const progressText = `${progressPercent}% complete!`;

  // Generate title tspans for multi-line text
  const titleTspans = displayTitleLines.map((line, index) => 
    `<tspan x="60" dy="${index === 0 ? '0' : '65'}">${escapeXml(line)}</tspan>`
  ).join('');

  // Calculate vertical spacing
  const titleHeight = 180 + (displayTitleLines.length - 1) * 65;
  const taskSummaryY = titleHeight + 80;
  const progressY = taskSummaryY + 75;

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
        ${escapeXml(displayEmoji)}
      </text>

      <!-- Title (multi-line with tspan) -->
      <text x="60" y="235" font-family="Arial, sans-serif" font-size="58" font-weight="bold" fill="white" style="text-shadow: 0 4px 12px rgba(0,0,0,0.6);">
        ${titleTspans}
      </text>

      <text x="60" y="${taskSummaryY}" font-family="Arial, sans-serif" font-size="24" fill="rgba(255,255,255,0.95)" style="text-shadow: 0 3px 8px rgba(0,0,0,0.5);">
        ${escapeXml(taskSummary)}
      </text>

      <text x="60" y="${progressY}" font-family="Arial, sans-serif" font-size="48" fill="white" font-weight="700" style="text-shadow: 0 4px 12px rgba(0,0,0,0.6);">
        ${escapeXml(progressText)}
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
    .jpeg({ quality: 85, progressive: true })
    .toBuffer();
}
