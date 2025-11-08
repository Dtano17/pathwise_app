import sharp from 'sharp';
import axios from 'axios';
import type { Activity, Task } from '@shared/schema';
import { getActivityImage } from './webImageSearch';

export interface OGImageOptions {
  activity: Activity;
  tasks: Task[];
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
 * Download image from URL and return as Buffer
 */
async function downloadImage(url: string): Promise<Buffer> {
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 10000,
      headers: {
        'User-Agent': 'JournalMate/1.0'
      }
    });
    return Buffer.from(response.data);
  } catch (error) {
    console.error('[OGImage] Error downloading image:', error);
    throw new Error('Failed to download backdrop image');
  }
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

  // Truncate title if too long (max 50 chars for better display)
  const displayTitle = title.length > 50 ? title.substring(0, 47) + '...' : title;
  
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
        ${emoji}
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
  const { activity, tasks } = options;

  try {
    // Get the best available image (user backdrop > web search > category fallback)
    const imageUrl = await getActivityImage(
      activity.title,
      activity.category || 'other',
      activity.backdrop || undefined
    );

    console.log(`[OGImage] Using image: ${imageUrl}`);

    // Download the backdrop image
    const backdropBuffer = await downloadImage(imageUrl);

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
  const emoji = categoryEmojis[category] || '✨';

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
  const displayTitle = title.length > 50 ? title.substring(0, 47) + '...' : title;

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
        ${emoji}
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
