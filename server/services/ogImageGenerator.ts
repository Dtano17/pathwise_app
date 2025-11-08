import { createCanvas, registerFont } from 'canvas';
import type { Activity, ActivityTask } from '@shared/schema';

export interface OGImageOptions {
  activity: Activity;
  tasks: ActivityTask[];
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

export async function generateOGImage(options: OGImageOptions): Promise<Buffer> {
  const { activity, tasks } = options;
  
  // Standard Open Graph image size: 1200x630
  const width = 1200;
  const height = 630;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // Get category data
  const category = activity.category?.toLowerCase() || 'other';
  const emoji = categoryEmojis[category] || '✨';
  const gradient = categoryGradients[category] || categoryGradients.other;
  
  // Calculate progress
  const completedTasks = tasks.filter(t => t.completed).length;
  const totalTasks = tasks.length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  // Draw gradient background
  const bgGradient = ctx.createLinearGradient(0, 0, width, height);
  bgGradient.addColorStop(0, gradient.start);
  bgGradient.addColorStop(1, gradient.end);
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);
  
  // Add subtle pattern overlay
  ctx.globalAlpha = 0.1;
  for (let i = 0; i < width; i += 40) {
    for (let j = 0; j < height; j += 40) {
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(i, j, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  
  // Draw white card container with rounded corners and shadow
  const cardPadding = 60;
  const cardX = cardPadding;
  const cardY = cardPadding;
  const cardWidth = width - (cardPadding * 2);
  const cardHeight = height - (cardPadding * 2);
  const borderRadius = 24;
  
  // Shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 10;
  
  // Card background
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardWidth, cardHeight, borderRadius);
  ctx.fill();
  
  // Reset shadow
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  
  // Draw emoji (large, top left)
  const emojiSize = 120;
  ctx.font = `${emojiSize}px Arial`;
  ctx.fillText(emoji, cardX + 50, cardY + 130);
  
  // Draw activity title (next to emoji, wrapped)
  const titleX = cardX + 200;
  const titleY = cardY + 80;
  const titleMaxWidth = cardWidth - 250;
  
  ctx.fillStyle = '#1A1A1A';
  ctx.font = 'bold 56px Arial';
  
  const title = activity.shareTitle || activity.planSummary || activity.title || 'Shared Activity';
  const words = title.split(' ');
  let line = '';
  let lineY = titleY;
  const lineHeight = 65;
  let lineCount = 0;
  const maxLines = 2;
  
  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + ' ';
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width > titleMaxWidth && i > 0) {
      if (lineCount < maxLines - 1) {
        ctx.fillText(line, titleX, lineY);
        line = words[i] + ' ';
        lineY += lineHeight;
        lineCount++;
      } else {
        // Truncate with ellipsis
        ctx.fillText(line.trim() + '...', titleX, lineY);
        break;
      }
    } else {
      line = testLine;
    }
  }
  
  // Draw last line if we haven't exceeded maxLines
  if (lineCount < maxLines && line.length > 0) {
    ctx.fillText(line, titleX, lineY);
  }
  
  // Draw progress bar
  const progressBarY = cardY + cardHeight - 200;
  const progressBarWidth = cardWidth - 100;
  const progressBarHeight = 20;
  const progressBarX = cardX + 50;
  
  // Progress bar background
  ctx.fillStyle = '#E8E8E8';
  ctx.beginPath();
  ctx.roundRect(progressBarX, progressBarY, progressBarWidth, progressBarHeight, 10);
  ctx.fill();
  
  // Progress bar fill
  if (progressPercent > 0) {
    const fillGradient = ctx.createLinearGradient(progressBarX, 0, progressBarX + progressBarWidth, 0);
    fillGradient.addColorStop(0, gradient.start);
    fillGradient.addColorStop(1, gradient.end);
    ctx.fillStyle = fillGradient;
    
    const fillWidth = (progressBarWidth * progressPercent) / 100;
    ctx.beginPath();
    ctx.roundRect(progressBarX, progressBarY, fillWidth, progressBarHeight, 10);
    ctx.fill();
  }
  
  // Draw progress text
  ctx.fillStyle = '#1A1A1A';
  ctx.font = 'bold 36px Arial';
  ctx.fillText(`${progressPercent}% Complete`, progressBarX, progressBarY - 15);
  
  // Draw task stats
  const statsY = cardY + cardHeight - 100;
  ctx.fillStyle = '#666666';
  ctx.font = '32px Arial';
  
  const taskStatsText = `${completedTasks} of ${totalTasks} tasks completed`;
  ctx.fillText(taskStatsText, progressBarX, statsY);
  
  // Draw category badge (bottom right)
  const badgeText = category.charAt(0).toUpperCase() + category.slice(1);
  ctx.font = 'bold 28px Arial';
  const badgeMetrics = ctx.measureText(badgeText);
  const badgePadding = 20;
  const badgeWidth = badgeMetrics.width + (badgePadding * 2);
  const badgeHeight = 50;
  const badgeX = cardX + cardWidth - badgeWidth - 50;
  const badgeY = cardY + cardHeight - badgeHeight - 40;
  
  // Badge background
  ctx.fillStyle = gradient.start;
  ctx.globalAlpha = 0.15;
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 25);
  ctx.fill();
  ctx.globalAlpha = 1;
  
  // Badge text
  ctx.fillStyle = gradient.start;
  ctx.fillText(badgeText, badgeX + badgePadding, badgeY + 35);
  
  // Draw JournalMate branding (bottom left)
  ctx.fillStyle = '#999999';
  ctx.font = '24px Arial';
  ctx.fillText('JournalMate', cardX + 50, cardY + cardHeight - 40);
  
  // Convert canvas to buffer
  return canvas.toBuffer('image/png');
}
