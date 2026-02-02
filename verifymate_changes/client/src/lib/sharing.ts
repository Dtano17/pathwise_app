/**
 * Native Social Sharing for Capacitor
 *
 * Provides native share functionality for activities, journal entries,
 * and achievements across social media and messaging apps
 */

import { Share, type ShareOptions, type ShareResult } from '@capacitor/share';
import { isNative } from './platform';

export interface ShareContentOptions {
  title?: string;
  text?: string;
  url?: string;
  files?: string[]; // File URLs or data URLs
  dialogTitle?: string;
}

export interface ShareActivityOptions {
  activityId: string;
  activityName: string;
  description?: string;
  shareUrl: string;
  imageUrl?: string;
}

export interface ShareJournalOptions {
  journalId: string;
  excerpt: string;
  shareUrl: string;
  mood?: string;
}

export interface ShareAchievementOptions {
  achievementName: string;
  description: string;
  shareUrl: string;
  imageUrl?: string;
}

/**
 * Generic share function - uses native share sheet on mobile, web share API on web
 */
export async function share(options: ShareContentOptions): Promise<ShareResult | null> {
  // Check if sharing is available
  const canShare = await canShareContent();
  if (!canShare) {
    console.warn('Sharing not available on this platform');
    return null;
  }

  try {
    if (isNative()) {
      // Use Capacitor Share plugin for native platforms
      const shareOptions: ShareOptions = {
        title: options.title,
        text: options.text,
        url: options.url,
        dialogTitle: options.dialogTitle || 'Share via',
      };

      // Note: Capacitor Share doesn't support files yet
      // For file sharing, consider @capacitor-community/file-opener
      if (options.files && options.files.length > 0) {
        console.warn('File sharing not yet supported via Capacitor Share');
      }

      const result = await Share.share(shareOptions);
      return result;
    } else {
      // Use Web Share API for browsers
      if (navigator.share) {
        const shareData: ShareData = {
          title: options.title,
          text: options.text,
          url: options.url,
        };

        await navigator.share(shareData);
        return { activityType: 'web-share' };
      } else {
        // Fallback: Copy to clipboard
        if (options.url) {
          await navigator.clipboard.writeText(options.url);
          alert('Link copied to clipboard!');
          return { activityType: 'clipboard' };
        }
      }
    }

    return null;
  } catch (error: any) {
    if (error.message !== 'Share canceled') {
      console.error('Share failed:', error);
    }
    return null;
  }
}

/**
 * Share an activity with friends
 */
export async function shareActivity(options: ShareActivityOptions): Promise<ShareResult | null> {
  const shareText = options.description
    ? `Check out my activity: ${options.activityName}\n\n${options.description}`
    : `Check out my activity: ${options.activityName}!`;

  return await share({
    title: `JournalMate Activity: ${options.activityName}`,
    text: shareText,
    url: options.shareUrl,
    dialogTitle: 'Share Activity',
  });
}

/**
 * Share a journal entry (with privacy in mind)
 */
export async function shareJournal(options: ShareJournalOptions): Promise<ShareResult | null> {
  const moodEmoji = options.mood ? getMoodEmoji(options.mood) : '';
  const shareText = `${moodEmoji} ${options.excerpt}`;

  return await share({
    title: 'My Journal Entry on JournalMate',
    text: shareText,
    url: options.shareUrl,
    dialogTitle: 'Share Journal Entry',
  });
}

/**
 * Share an achievement or milestone
 */
export async function shareAchievement(options: ShareAchievementOptions): Promise<ShareResult | null> {
  const shareText = `🎉 Achievement Unlocked: ${options.achievementName}!\n\n${options.description}`;

  return await share({
    title: `JournalMate Achievement`,
    text: shareText,
    url: options.shareUrl,
    dialogTitle: 'Share Achievement',
  });
}

/**
 * Share app invitation/referral
 */
export async function shareAppInvite(referralCode?: string): Promise<ShareResult | null> {
  const appUrl = referralCode
    ? `https://journalmate.ai?ref=${referralCode}`
    : 'https://journalmate.ai';

  const shareText =
    `I'm using JournalMate to plan my day and reflect on my journey! 🚀\n\n` +
    `It helps me turn goals into reality with AI-powered planning and smart journaling.\n\n` +
    `Join me!`;

  return await share({
    title: 'Try JournalMate',
    text: shareText,
    url: appUrl,
    dialogTitle: 'Invite Friends',
  });
}

/**
 * Share to specific social platforms (deep links)
 */
export async function shareToSocialMedia(
  platform: 'facebook' | 'twitter' | 'whatsapp' | 'instagram' | 'linkedin',
  options: ShareContentOptions
): Promise<void> {
  const text = encodeURIComponent(options.text || '');
  const url = encodeURIComponent(options.url || '');

  let shareUrl: string;

  switch (platform) {
    case 'facebook':
      shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
      break;
    case 'twitter':
      shareUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
      break;
    case 'whatsapp':
      shareUrl = `https://wa.me/?text=${text}%20${url}`;
      break;
    case 'linkedin':
      shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
      break;
    case 'instagram':
      // Instagram doesn't support web share links - use native share instead
      await share(options);
      return;
    default:
      console.warn(`Platform ${platform} not supported`);
      return;
  }

  if (isNative()) {
    // Open in external browser or app
    window.open(shareUrl, '_blank');
  } else {
    // Open in new window
    window.open(shareUrl, '_blank', 'width=600,height=400');
  }
}

/**
 * Check if sharing is available on current platform
 */
export async function canShareContent(): Promise<boolean> {
  if (isNative()) {
    // Capacitor Share is always available on native platforms
    return true;
  } else {
    // Check if Web Share API is available
    return !!(navigator.share || navigator.clipboard);
  }
}

/**
 * Generate shareable link for activity
 */
export function generateActivityShareLink(activityId: string): string {
  const baseUrl = window.location.origin;
  return `${baseUrl}/shared/activity/${activityId}`;
}

/**
 * Generate shareable link for journal entry
 */
export function generateJournalShareLink(journalId: string): string {
  const baseUrl = window.location.origin;
  return `${baseUrl}/shared/journal/${journalId}`;
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

/**
 * Share with native contacts (SMS, Email, etc.)
 */
export async function shareViaMessage(
  options: ShareContentOptions,
  method: 'sms' | 'email' = 'sms'
): Promise<void> {
  const text = options.text || '';
  const url = options.url || '';
  const fullText = url ? `${text}\n\n${url}` : text;

  if (method === 'sms') {
    // SMS deep link
    const smsUrl = `sms:?body=${encodeURIComponent(fullText)}`;
    window.location.href = smsUrl;
  } else if (method === 'email') {
    // Email deep link
    const subject = encodeURIComponent(options.title || 'Check this out!');
    const body = encodeURIComponent(fullText);
    const emailUrl = `mailto:?subject=${subject}&body=${body}`;
    window.location.href = emailUrl;
  }
}

/**
 * Get mood emoji for journal sharing
 */
function getMoodEmoji(mood: string): string {
  const moodMap: Record<string, string> = {
    happy: '😊',
    sad: '😢',
    excited: '🎉',
    anxious: '😰',
    calm: '😌',
    angry: '😠',
    grateful: '🙏',
    motivated: '💪',
    tired: '😴',
    stressed: '😓',
  };

  return moodMap[mood.toLowerCase()] || '✨';
}

/**
 * Social media platform helpers
 */
export const SocialPlatforms = {
  FACEBOOK: 'facebook' as const,
  TWITTER: 'twitter' as const,
  WHATSAPP: 'whatsapp' as const,
  INSTAGRAM: 'instagram' as const,
  LINKEDIN: 'linkedin' as const,
};

export default {
  share,
  shareActivity,
  shareJournal,
  shareAchievement,
  shareAppInvite,
  shareToSocialMedia,
  shareViaMessage,
  canShareContent,
  generateActivityShareLink,
  generateJournalShareLink,
  copyToClipboard,
  SocialPlatforms,
};
