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

  // Telegram
  telegram: {
    id: 'telegram',
    name: 'Telegram',
    icon: 'SiTelegram',
    width: 1280,
    height: 1280,
    aspectRatio: '1:1',
    captionLimit: 4096,
    recommendedHashtags: 5,
    description: 'Square format for Telegram posts',
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
    name: '📸 Social Media Pack',
    platforms: ['instagram_story', 'instagram_feed', 'instagram_portrait'],
  },
  tiktok_pack: {
    name: '🎵 Short Video Pack',
    platforms: ['tiktok', 'instagram_story'], // Same dimensions
  },
  professional_pack: {
    name: '💼 Professional Pack',
    platforms: ['linkedin', 'twitter', 'facebook'],
  },
  creator_bundle: {
    name: '⚡ All Platforms Bundle',
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
 * Smart emoji detection based on activity title content
 * Returns contextual emoji that best represents the activity
 */
export function getContextualEmoji(activityTitle: string, category: string): string {
  const title = activityTitle.toLowerCase();
  
  // Sports & Events
  if (title.includes('fifa') || title.includes('world cup') || title.includes('soccer') || title.includes('football')) return '⚽';
  if (title.includes('basketball') || title.includes('nba')) return '🏀';
  if (title.includes('tennis')) return '🎾';
  if (title.includes('baseball')) return '⚾';
  if (title.includes('golf')) return '⛳';
  if (title.includes('volleyball')) return '🏐';
  if (title.includes('hockey')) return '🏒';
  if (title.includes('cricket')) return '🏏';
  if (title.includes('rugby')) return '🏉';
  if (title.includes('swimming') || title.includes('pool')) return '🏊';
  if (title.includes('running') || title.includes('marathon') || title.includes('race')) return '🏃';
  if (title.includes('cycling') || title.includes('bike')) return '🚴';
  if (title.includes('skiing') || title.includes('snowboard')) return '⛷️';
  if (title.includes('surfing')) return '🏄';
  if (title.includes('climbing') || title.includes('mountain')) return '🧗';
  
  // Music & Entertainment
  if (title.includes('concert') || title.includes('music') || title.includes('festival') || title.includes('show')) return '🎵';
  if (title.includes('movie') || title.includes('cinema') || title.includes('film')) return '🎬';
  if (title.includes('theater') || title.includes('theatre') || title.includes('play')) return '🎭';
  if (title.includes('comedy') || title.includes('standup')) return '🎤';
  if (title.includes('game') || title.includes('gaming') || title.includes('esports')) return '🎮';
  
  // Food & Dining
  if (title.includes('restaurant') || title.includes('dining') || title.includes('dinner')) return '🍽️';
  if (title.includes('pizza')) return '🍕';
  if (title.includes('burger')) return '🍔';
  if (title.includes('sushi') || title.includes('japanese')) return '🍣';
  if (title.includes('coffee') || title.includes('cafe')) return '☕';
  if (title.includes('wine') || title.includes('vineyard')) return '🍷';
  if (title.includes('beer') || title.includes('brewery')) return '🍺';
  if (title.includes('cake') || title.includes('dessert') || title.includes('bakery')) return '🍰';
  if (title.includes('breakfast') || title.includes('brunch')) return '🥐';
  if (title.includes('bbq') || title.includes('barbecue') || title.includes('grill')) return '🍖';
  
  // Travel & Places
  if (title.includes('beach') || title.includes('ocean') || title.includes('sea')) return '🏖️';
  if (title.includes('paris') || title.includes('eiffel')) return '🗼';
  if (title.includes('new york') || title.includes('nyc')) return '🗽';
  if (title.includes('tokyo') || title.includes('japan')) return '🗾';
  if (title.includes('london') || title.includes('uk')) return '🇬🇧';
  if (title.includes('rome') || title.includes('italy')) return '🇮🇹';
  if (title.includes('camping') || title.includes('camp')) return '⛺';
  if (title.includes('hotel') || title.includes('resort')) return '🏨';
  if (title.includes('castle')) return '🏰';
  if (title.includes('museum')) return '🏛️';
  if (title.includes('park') || title.includes('nature')) return '🌳';
  if (title.includes('desert') || title.includes('safari')) return '🏜️';
  if (title.includes('cruise') || title.includes('ship')) return '🚢';
  if (title.includes('flight') || title.includes('airport')) return '✈️';
  if (title.includes('train') || title.includes('rail')) return '🚂';
  if (title.includes('road trip') || title.includes('drive')) return '🚗';
  
  // Celebrations & Events
  if (title.includes('wedding')) return '💒';
  if (title.includes('birthday') || title.includes('bday')) return '🎂';
  if (title.includes('graduation')) return '🎓';
  if (title.includes('anniversary')) return '💝';
  if (title.includes('party') || title.includes('celebration')) return '🎉';
  if (title.includes('christmas') || title.includes('xmas')) return '🎄';
  if (title.includes('halloween')) return '🎃';
  if (title.includes('valentine')) return '💕';
  if (title.includes('new year')) return '🎊';
  
  // Learning & Work
  if (title.includes('conference') || title.includes('summit')) return '💼';
  if (title.includes('workshop') || title.includes('seminar')) return '📊';
  if (title.includes('study') || title.includes('exam') || title.includes('test')) return '📚';
  if (title.includes('coding') || title.includes('programming') || title.includes('hackathon')) return '💻';
  if (title.includes('writing') || title.includes('journal')) return '✍️';
  if (title.includes('meeting')) return '🤝';
  
  // Health & Wellness
  if (title.includes('yoga')) return '🧘';
  if (title.includes('meditation')) return '🧘';
  if (title.includes('spa') || title.includes('massage')) return '💆';
  if (title.includes('doctor') || title.includes('hospital') || title.includes('appointment')) return '🏥';
  if (title.includes('gym') || title.includes('workout') || title.includes('fitness')) return '💪';
  
  // Hobbies & Activities
  if (title.includes('photography') || title.includes('photo')) return '📸';
  if (title.includes('art') || title.includes('paint') || title.includes('drawing')) return '🎨';
  if (title.includes('shopping')) return '🛍️';
  if (title.includes('garden')) return '🌻';
  if (title.includes('cooking') || title.includes('recipe')) return '👨‍🍳';
  if (title.includes('reading') || title.includes('book')) return '📖';
  
  // Fall back to category-based emojis
  const categoryEmojis: Record<string, string> = {
    travel: '✈️',
    fitness: '💪',
    health: '🏥',
    career: '💼',
    learning: '📚',
    finance: '💰',
    relationships: '❤️',
    creativity: '🎨',
    home: '🏠',
    personal: '⭐',
    food: '🍽️',
    other: '📋'
  };
  
  return categoryEmojis[category] || '📋';
}

/**
 * Generate platform-specific caption with character limit
 * Optimized for engagement and brand marketing
 */
export function generatePlatformCaption(
  activityTitle: string,
  category: string,
  platform: string,
  creatorName?: string,
  creatorSocial?: string,
  planSummary?: string,
  activityId?: string
): {
  caption: string;
  hashtags: string[];
  fullText: string;
} {
  const template = PLATFORM_TEMPLATES[platform];
  if (!template) {
    throw new Error(`Unknown platform: ${platform}`);
  }

  const emoji = getContextualEmoji(activityTitle, category);
  const shareUrl = activityId ? `https://journalmate.ai/shared/${activityId}` : 'https://journalmate.ai';

  // Get category-specific and brand hashtags
  const categoryTags = (CATEGORY_HASHTAGS[category] || CATEGORY_HASHTAGS.other).slice(0, Math.min(template.recommendedHashtags, 15));
  const brandTags = ['#JournalMate', '#AIPlanning', '#SmartGoals'];
  const hashtags = [...categoryTags, ...brandTags].slice(0, template.recommendedHashtags);

  let caption = '';

  // Platform-specific caption formats optimized for engagement
  switch (platform) {
    case 'instagram_story':
    case 'instagram_feed':
    case 'instagram_portrait':
      // Instagram: Visual, emoji-rich, storytelling
      caption = `${emoji} ${activityTitle}\n\n`;
      if (planSummary) {
        caption += `${planSummary.substring(0, 150)}${planSummary.length > 150 ? '...' : ''}\n\n`;
      }
      caption += `🎯 Ready to make it happen? This AI-powered plan breaks it down into actionable steps!\n\n`;
      caption += `📥 Own this plan: ${shareUrl}\n\n`;
      caption += `💡 Create your own FREE at JournalMate.ai\n`;
      break;

    case 'twitter':
      // Twitter: Concise, punchy, under 280 chars
      caption = `${emoji} ${activityTitle}\n\n`;
      caption += `📥 Copy this plan and make it yours:\n${shareUrl}\n\n`;
      caption += `Made with @JournalMateAI`;
      break;

    case 'facebook':
      // Facebook: Conversational, community-focused
      caption = `${emoji} Check out my plan: ${activityTitle}\n\n`;
      if (planSummary) {
        caption += `${planSummary}\n\n`;
      }
      caption += `I used JournalMate.ai to create this step-by-step action plan. The AI asks the right questions and builds a personalized roadmap!\n\n`;
      caption += `📥 Copy this plan for yourself: ${shareUrl}\n\n`;
      caption += `✨ Create your own plans FREE at JournalMate.ai`;
      break;

    case 'linkedin':
      // LinkedIn: Professional, value-focused
      caption = `${emoji} ${activityTitle}\n\n`;
      if (planSummary) {
        caption += `${planSummary}\n\n`;
      }
      caption += `I've been using AI-powered planning to turn my goals into actionable steps. This tool asks thoughtful questions and creates a structured roadmap.\n\n`;
      caption += `Key benefits:\n`;
      caption += `• Breaks down complex goals into manageable tasks\n`;
      caption += `• Prioritizes what matters most\n`;
      caption += `• Tracks progress automatically\n\n`;
      caption += `📥 Own this plan: ${shareUrl}\n\n`;
      caption += `Built with JournalMate.ai - Smart Planning for Ambitious Goals`;
      break;

    case 'whatsapp':
    case 'telegram':
      // Messaging: Direct, shareable, action-oriented
      caption = `${emoji} *${activityTitle}*\n\n`;
      if (planSummary) {
        caption += `${planSummary}\n\n`;
      }
      caption += `I created this plan using JournalMate.ai - it's an AI that helps you plan anything!\n\n`;
      caption += `✨ *What you get:*\n`;
      caption += `• Step-by-step action plan\n`;
      caption += `• Smart task prioritization\n`;
      caption += `• Progress tracking\n\n`;
      caption += `📥 *Copy this plan:* ${shareUrl}\n\n`;
      caption += `Create yours FREE at JournalMate.ai`;
      break;

    case 'tiktok':
      // TikTok: Short, trendy, Gen-Z friendly
      caption = `${emoji} POV: You finally have a plan for ${activityTitle.toLowerCase()}\n\n`;
      caption += `AI did the heavy lifting 🤖✨\n\n`;
      caption += `📥 Download this plan - link in bio! #JournalMate`;
      break;

    case 'pinterest':
      // Pinterest: Inspirational, keyword-rich
      caption = `${emoji} ${activityTitle} | AI-Powered Planning\n\n`;
      if (planSummary) {
        caption += `${planSummary}\n\n`;
      }
      caption += `📌 Save this pin and own your copy!\n\n`;
      caption += `📥 Download this plan: ${shareUrl}\n`;
      caption += `✨ Create yours at JournalMate.ai`;
      break;

    default:
      // Generic fallback
      caption = `${emoji} ${activityTitle}\n\n`;
      if (planSummary) {
        caption += `${planSummary}\n\n`;
      }
      caption += `📥 Own this plan at JournalMate.ai\n`;
      caption += `🔗 ${shareUrl}`;
  }

  // Add creator attribution if available
  if (creatorName && creatorSocial) {
    caption += `\n\n📝 Created by ${creatorName} (${creatorSocial})`;
  }

  // Add hashtags for platforms that use them (skip for messaging apps)
  const skipHashtagPlatforms = ['whatsapp', 'telegram', 'print'];
  const hashtagText = !skipHashtagPlatforms.includes(platform) && hashtags.length > 0
    ? `\n\n${hashtags.join(' ')}`
    : '';

  let fullText = caption + hashtagText;

  // Truncate if exceeds limit
  if (fullText.length > template.captionLimit && template.captionLimit > 0) {
    const availableLength = template.captionLimit - hashtagText.length - 3;
    caption = caption.substring(0, availableLength) + '...';
    fullText = caption + hashtagText;
  }

  return {
    caption,
    hashtags,
    fullText,
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
