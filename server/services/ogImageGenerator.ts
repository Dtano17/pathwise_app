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

  // Truncate title if too long (max 45 chars for better display)
  const displayTitle = title.length > 45 ? title.substring(0, 42) + '...' : title;
  
  // Truncate description if present (max 80 chars)
  const displayDescription = description.length > 80 ? description.substring(0, 77) + '...' : description;

  // Get first 3 tasks to display
  const displayTasks = tasks.slice(0, 3);
  const taskStartY = description ? 360 : 330;
  const taskItems = displayTasks.map((task, index) => {
    const icon = task.completed ? '✅' : '▢';
    const taskTitle = task.title.length > 50 ? task.title.substring(0, 47) + '...' : task.title;
    const yPosition = taskStartY + (index * 50);
    return `
      <text x="60" y="${yPosition}" font-family="Arial, sans-serif" font-size="26" fill="white" font-weight="400" style="text-shadow: 2px 2px 4px rgba(0,0,0,0.5);">
        ${icon} ${taskTitle}
      </text>
    `;
  }).join('');

  const moreTasksText = tasks.length > 3
    ? `<text x="60" y="${description ? 510 : 480}" font-family="Arial, sans-serif" font-size="24" fill="rgba(255,255,255,0.85)" font-style="italic" style="text-shadow: 2px 2px 4px rgba(0,0,0,0.5);">
        ... ${tasks.length - 3} more ${tasks.length - 3 === 1 ? 'task' : 'tasks'}
      </text>`
    : '';

  return `
    <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <!-- Dark gradient overlay for readability -->
      <defs>
        <linearGradient id="darkGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:rgba(0,0,0,0.70);stop-opacity:1" />
          <stop offset="50%" style="stop-color:rgba(0,0,0,0.80);stop-opacity:1" />
          <stop offset="100%" style="stop-color:rgba(0,0,0,0.85);stop-opacity:1" />
        </linearGradient>
      </defs>

      <!-- Overlay gradient -->
      <rect width="1200" height="630" fill="url(#darkGradient)" />

      <!-- Header Section with Emoji and Title -->
      <text x="60" y="110" font-family="Arial, sans-serif" font-size="90" fill="white" style="text-shadow: 3px 3px 6px rgba(0,0,0,0.6);">
        ${emoji}
      </text>

      <text x="60" y="200" font-family="Arial, sans-serif" font-size="56" font-weight="bold" fill="white" style="text-shadow: 2px 2px 4px rgba(0,0,0,0.6);">
        ${displayTitle}
      </text>

      ${description ? `
      <text x="60" y="245" font-family="Arial, sans-serif" font-size="26" fill="rgba(255,255,255,0.95)" font-weight="400" style="text-shadow: 1px 1px 3px rgba(0,0,0,0.5);">
        ${displayDescription}
      </text>
      ` : ''}

      <!-- Category Badge and Progress -->
      <rect x="60" y="${description ? 270 : 230}" width="${Math.max(category.length * 14 + 30, 100)}" height="36" fill="rgba(255,255,255,0.25)" rx="18" />
      <text x="75" y="${description ? 293 : 253}" font-family="Arial, sans-serif" font-size="18" fill="white" font-weight="600">
        ${category.toUpperCase()}
      </text>

      <!-- Progress Percentage Badge -->
      <rect x="${100 + Math.max(category.length * 14 + 30, 100)}" y="${description ? 270 : 230}" width="${progressPercent === 100 ? 140 : 110}" height="36" fill="rgba(16, 185, 129, 0.3)" rx="18" />
      <text x="${115 + Math.max(category.length * 14 + 30, 100)}" y="${description ? 293 : 253}" font-family="Arial, sans-serif" font-size="18" fill="white" font-weight="700">
        ${progressPercent}% ${progressPercent === 100 ? 'COMPLETE' : 'DONE'}
      </text>

      <!-- Tasks Section -->
      ${taskItems}
      ${moreTasksText}

      <!-- Bottom Stats Bar -->
      <rect x="0" y="540" width="1200" height="90" fill="rgba(0,0,0,0.6)" />
      
      <text x="60" y="575" font-family="Arial, sans-serif" font-size="26" fill="white" font-weight="600">
        📊 ${completedTasks} / ${totalTasks} tasks completed
      </text>

      <!-- JournalMate Branding -->
      <text x="60" y="610" font-family="Arial, sans-serif" font-size="20" fill="rgba(255,255,255,0.85)" font-weight="500">
        JournalMate — Plan and Share Your Activities
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
