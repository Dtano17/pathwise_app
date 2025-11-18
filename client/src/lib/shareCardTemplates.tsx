/**
 * Share Card Platform Templates
 *
 * Platform-specific dimensions and styling configurations for social media share cards
 */

export interface PlatformTemplate {
  id: string;
  name: string;
  icon: string;
  width: number;
  height: number;
  aspectRatio: string;
  captionLimit: number;
  recommendedHashtags: number;
  description: string;
  exportFormats: ('png' | 'jpg' | 'pdf')[];
}

export const PLATFORM_TEMPLATES: Record<string, PlatformTemplate> = {
  // Instagram
  instagram_story: {
    id: 'instagram_story',
    name: 'Instagram Story',
    icon: 'SiInstagram',
    width: 1080,
    height: 1920,
    aspectRatio: '9:16',
    captionLimit: 2200,
    recommendedHashtags: 10,
    description: 'Vertical format for Instagram Stories',
    exportFormats: ['png', 'jpg'],
  },
  instagram_feed: {
    id: 'instagram_feed',
    name: 'Instagram Feed (Square)',
    icon: 'SiInstagram',
    width: 1080,
    height: 1080,
    aspectRatio: '1:1',
    captionLimit: 2200,
    recommendedHashtags: 30,
    description: 'Square format for Instagram feed posts',
    exportFormats: ['png', 'jpg'],
  },
  instagram_portrait: {
    id: 'instagram_portrait',
    name: 'Instagram Feed (Portrait)',
    icon: 'SiInstagram',
    width: 1080,
    height: 1350,
    aspectRatio: '4:5',
    captionLimit: 2200,
    recommendedHashtags: 30,
    description: 'Portrait format for Instagram feed',
    exportFormats: ['png', 'jpg'],
  },

  // TikTok
  tiktok: {
    id: 'tiktok',
    name: 'TikTok',
    icon: 'SiTiktok',
    width: 1080,
    height: 1920,
    aspectRatio: '9:16',
    captionLimit: 150,
    recommendedHashtags: 5,
    description: 'Vertical format for TikTok videos',
    exportFormats: ['png', 'jpg'],
  },

  // Twitter/X
  twitter: {
    id: 'twitter',
    name: 'Twitter/X',
    icon: 'SiX',
    width: 1200,
    height: 675,
    aspectRatio: '16:9',
    captionLimit: 280,
    recommendedHashtags: 2,
    description: 'Landscape format for Twitter cards',
    exportFormats: ['png', 'jpg'],
  },

  // Facebook
  facebook: {
    id: 'facebook',
    name: 'Facebook',
    icon: 'SiFacebook',
    width: 1200,
    height: 630,
    aspectRatio: '1.91:1',
    captionLimit: 63206,
    recommendedHashtags: 3,
    description: 'Landscape format for Facebook link previews',
    exportFormats: ['png', 'jpg'],
  },

  // LinkedIn
  linkedin: {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: 'SiLinkedin',
    width: 1200,
    height: 627,
    aspectRatio: '1.91:1',
    captionLimit: 3000,
    recommendedHashtags: 5,
    description: 'Landscape format for LinkedIn posts',
    exportFormats: ['png', 'jpg'],
  },

  // Pinterest
  pinterest: {
    id: 'pinterest',
    name: 'Pinterest',
    icon: 'SiPinterest',
    width: 1000,
    height: 1500,
    aspectRatio: '2:3',
    captionLimit: 500,
    recommendedHashtags: 20,
    description: 'Vertical format for Pinterest pins',
    exportFormats: ['png', 'jpg'],
  },

  // WhatsApp/SMS
  whatsapp: {
    id: 'whatsapp',
    name: 'WhatsApp',
    icon: 'SiWhatsapp',
    width: 1200,
    height: 630,
    aspectRatio: '1.91:1',
    captionLimit: 65536,
    recommendedHashtags: 0,
    description: 'Landscape format for WhatsApp rich previews',
    exportFormats: ['png', 'jpg'],
  },

  // Print/PDF
  print: {
    id: 'print',
    name: 'Print (A4)',
    icon: 'printer',
    width: 2480,
    height: 3508,
    aspectRatio: 'A4',
    captionLimit: 0,
    recommendedHashtags: 0,
    description: '300 DPI A4 format for printing',
    exportFormats: ['pdf', 'png'],
  },

  // General/Universal
  universal: {
    id: 'universal',
    name: 'Universal',
    icon: 'globe',
    width: 1920,
    height: 1080,
    aspectRatio: '16:9',
    captionLimit: 500,
    recommendedHashtags: 5,
    description: 'HD landscape format for general use',
    exportFormats: ['png', 'jpg', 'pdf'],
  },
};

/**
 * Platform packs for batch downloads
 */
export const PLATFORM_PACKS = {
  instagram_pack: {
    name: 'Instagram Pack',
    platforms: ['instagram_story', 'instagram_feed', 'instagram_portrait'],
  },
  tiktok_pack: {
    name: 'TikTok Pack',
    platforms: ['tiktok', 'instagram_story'], // Same dimensions
  },
  professional_pack: {
    name: 'Professional Pack',
    platforms: ['linkedin', 'twitter', 'facebook'],
  },
  creator_bundle: {
    name: 'Creator Bundle (All Platforms)',
    platforms: Object.keys(PLATFORM_TEMPLATES),
  },
};

/**
 * Category-specific hashtag suggestions
 */
export const CATEGORY_HASHTAGS: Record<string, string[]> = {
  travel: [
    '#travel',
    '#wanderlust',
    '#travelgram',
    '#instatravel',
    '#explore',
    '#adventure',
    '#vacation',
    '#travelphotography',
    '#traveltheworld',
    '#bucketlist',
  ],
  fitness: [
    '#fitness',
    '#workout',
    '#gym',
    '#fitfam',
    '#health',
    '#motivation',
    '#exercise',
    '#training',
    '#fitspo',
    '#fitnessmotivation',
  ],
  health: [
    '#health',
    '#wellness',
    '#healthy',
    '#healthylifestyle',
    '#selfcare',
    '#mindfulness',
    '#mentalhealth',
    '#wellbeing',
    '#meditation',
    '#balance',
  ],
  work: [
    '#productivity',
    '#work',
    '#career',
    '#business',
    '#entrepreneur',
    '#hustle',
    '#success',
    '#goals',
    '#mindset',
    '#worklife',
  ],
  creativity: [
    '#creative',
    '#art',
    '#design',
    '#inspiration',
    '#create',
    '#artist',
    '#creativity',
    '#artsy',
    '#aesthetic',
    '#creative',
  ],
  food: [
    '#food',
    '#foodie',
    '#foodporn',
    '#instafood',
    '#yummy',
    '#delicious',
    '#foodstagram',
    '#foodphotography',
    '#cooking',
    '#recipe',
  ],
  learning: [
    '#learning',
    '#education',
    '#study',
    '#knowledge',
    '#growth',
    '#development',
    '#skills',
    '#learneveryday',
    '#mindset',
    '#selfimprovement',
  ],
  other: [
    '#lifestyle',
    '#daily',
    '#life',
    '#inspiration',
    '#motivation',
    '#goals',
    '#planning',
    '#organize',
    '#productivity',
    '#success',
  ],
};

/**
 * Generate platform-specific caption with character limit
 */
export function generatePlatformCaption(
  activityTitle: string,
  category: string,
  platform: string,
  creatorName?: string,
  creatorSocial?: string
): {
  caption: string;
  hashtags: string[];
  fullText: string;
} {
  const template = PLATFORM_TEMPLATES[platform];
  if (!template) {
    throw new Error(`Unknown platform: ${platform}`);
  }

  const hashtags = (CATEGORY_HASHTAGS[category] || CATEGORY_HASHTAGS.other).slice(
    0,
    template.recommendedHashtags
  );

  let caption = `${activityTitle}\n\n`;

  // Add creator attribution if available
  if (creatorName && creatorSocial) {
    caption += `Created by ${creatorName} (${creatorSocial})\n\n`;
  }

  // Add call-to-action
  caption += `Plan your next adventure with JournalMate.ai\n`;

  // Add hashtags for platforms that use them
  const hashtagText = hashtags.length > 0 ? `\n${hashtags.join(' ')}` : '';
  const fullText = caption + hashtagText;

  // Truncate if exceeds limit
  if (fullText.length > template.captionLimit) {
    const availableLength = template.captionLimit - hashtagText.length - 3; // Reserve space for "..."
    caption = caption.substring(0, availableLength) + '...';
  }

  return {
    caption,
    hashtags,
    fullText: caption + hashtagText,
  };
}

/**
 * Get recommended export format for platform
 */
export function getRecommendedFormat(platform: string): 'png' | 'jpg' | 'pdf' {
  const template = PLATFORM_TEMPLATES[platform];
  if (!template) return 'png';

  // Prefer PNG for images with transparency or text overlays
  if (['instagram_story', 'tiktok'].includes(platform)) {
    return 'png';
  }

  // Prefer JPG for photo-heavy platforms (smaller file size)
  if (['facebook', 'linkedin', 'whatsapp'].includes(platform)) {
    return 'jpg';
  }

  // PDF for print
  if (platform === 'print') {
    return 'pdf';
  }

  return 'png'; // Default
}
