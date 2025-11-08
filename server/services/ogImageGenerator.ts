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
  const category = activity.category || 'other';

  // Calculate progress
  const completedTasks = tasks.filter(t => t.completed).length;
  const totalTasks = tasks.length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Truncate title if too long (max 50 chars)
  const displayTitle = title.length > 50 ? title.substring(0, 47) + '...' : title;

  // Get first 3-4 tasks to display
  const displayTasks = tasks.slice(0, 4);
  const taskItems = displayTasks.map((task, index) => {
    const icon = task.completed ? '✅' : '◻️';
    const taskTitle = task.title.length > 40 ? task.title.substring(0, 37) + '...' : task.title;
    return `
      <text x="60" y="${320 + (index * 45)}" font-family="Arial, sans-serif" font-size="24" fill="white" font-weight="400">
        ${icon} ${taskTitle}
      </text>
    `;
  }).join('');

  const moreTasksText = tasks.length > 4
    ? `<text x="60" y="${320 + (4 * 45)}" font-family="Arial, sans-serif" font-size="22" fill="rgba(255,255,255,0.8)" font-style="italic">
        +${tasks.length - 4} more tasks...
      </text>`
    : '';

  // Calculate progress bar width (max 1080px with 60px padding on each side)
  const progressBarWidth = 1080;
  const progressFillWidth = (progressBarWidth * progressPercent) / 100;

  return `
    <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <!-- Dark gradient overlay for readability -->
      <defs>
        <linearGradient id="darkGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:rgba(0,0,0,0.75);stop-opacity:1" />
          <stop offset="100%" style="stop-color:rgba(0,0,0,0.9);stop-opacity:1" />
        </linearGradient>
      </defs>

      <!-- Overlay gradient -->
      <rect width="1200" height="630" fill="url(#darkGradient)" />

      <!-- Emoji and Title Section -->
      <text x="60" y="100" font-family="Arial, sans-serif" font-size="80" fill="white">
        ${emoji}
      </text>

      <text x="60" y="180" font-family="Arial, sans-serif" font-size="52" font-weight="bold" fill="white">
        ${displayTitle}
      </text>

      <!-- Category Badge -->
      <rect x="60" y="210" width="${category.length * 16 + 40}" height="40" fill="rgba(255,255,255,0.2)" rx="20" />
      <text x="80" y="235" font-family="Arial, sans-serif" font-size="20" fill="white" font-weight="500">
        ${category.toUpperCase()}
      </text>

      <!-- Tasks Section -->
      ${taskItems}
      ${moreTasksText}

      <!-- Progress Bar Section -->
      <text x="60" y="${tasks.length > 0 ? 500 : 320}" font-family="Arial, sans-serif" font-size="28" fill="white" font-weight="600">
        ${progressPercent}% Complete
      </text>

      <!-- Progress Bar Background -->
      <rect x="60" y="${tasks.length > 0 ? 515 : 335}" width="${progressBarWidth}" height="20" fill="rgba(255,255,255,0.3)" rx="10" />

      <!-- Progress Bar Fill -->
      ${progressPercent > 0 ? `
        <rect x="60" y="${tasks.length > 0 ? 515 : 335}" width="${progressFillWidth}" height="20" fill="white" rx="10" />
      ` : ''}

      <!-- Task Stats -->
      <text x="60" y="${tasks.length > 0 ? 570 : 390}" font-family="Arial, sans-serif" font-size="24" fill="rgba(255,255,255,0.9)">
        ${completedTasks} of ${totalTasks} tasks completed
      </text>

      <!-- JournalMate Branding -->
      <text x="60" y="600" font-family="Arial, sans-serif" font-size="22" fill="rgba(255,255,255,0.8)" font-weight="500">
        JournalMate | Own, Edit &amp; Share Your Plans
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

  const svg = `
    <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${gradient.start};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${gradient.end};stop-opacity:1" />
        </linearGradient>
      </defs>

      <rect width="1200" height="630" fill="url(#bgGradient)" />

      <text x="60" y="100" font-family="Arial, sans-serif" font-size="80" fill="white">
        ${emoji}
      </text>

      <text x="60" y="200" font-family="Arial, sans-serif" font-size="52" font-weight="bold" fill="white">
        ${displayTitle}
      </text>

      <text x="60" y="400" font-family="Arial, sans-serif" font-size="36" fill="white" font-weight="600">
        ${progressPercent}% Complete
      </text>

      <text x="60" y="450" font-family="Arial, sans-serif" font-size="28" fill="rgba(255,255,255,0.9)">
        ${completedTasks} of ${totalTasks} tasks completed
      </text>

      <text x="60" y="580" font-family="Arial, sans-serif" font-size="24" fill="rgba(255,255,255,0.9)" font-weight="500">
        JournalMate | Own, Edit &amp; Share Your Plans
      </text>
    </svg>
  `;

  return sharp(Buffer.from(svg))
    .png()
    .toBuffer();
}
