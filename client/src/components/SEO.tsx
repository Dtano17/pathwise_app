import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'product';
  noIndex?: boolean;
  keywords?: string[];
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
}

const DEFAULT_TITLE = 'JournalMate.ai - Discover plans. Make them yours. Share the journey.';
const DEFAULT_DESCRIPTION = 'Import & track plans from ANY AI (ChatGPT, Claude, Gemini, Perplexity), save social media inspiration (Instagram, TikTok, Pinterest), plan as a group, remix community plans, share with friends, and auto-journal your journey with AI.';
const DEFAULT_IMAGE = 'https://journalmate.ai/journalmate-logo-email.png';
const SITE_NAME = 'JournalMate.ai';
const BASE_URL = 'https://journalmate.ai';

export function SEO({
  title,
  description = DEFAULT_DESCRIPTION,
  image = DEFAULT_IMAGE,
  url,
  type = 'website',
  noIndex = false,
  keywords = [],
  author,
  publishedTime,
  modifiedTime,
}: SEOProps) {
  const pageTitle = title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE;
  const canonicalUrl = url ? `${BASE_URL}${url}` : undefined;
  const fullImageUrl = image.startsWith('http') ? image : `${BASE_URL}${image}`;

  const defaultKeywords = [
    'JournalMate',
    'AI plan tracker',
    'ChatGPT import',
    'Claude AI plans',
    'activity planner',
    'social media saver',
    'Instagram content tracker',
    'TikTok plans',
    'group planning',
    'AI journaling'
  ];

  const allKeywords = [...new Set([...defaultKeywords, ...keywords])];

  return (
    <Helmet>
      <title>{pageTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={allKeywords.join(', ')} />

      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={fullImageUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImageUrl} />

      {author && <meta name="author" content={author} />}
      {publishedTime && <meta property="article:published_time" content={publishedTime} />}
      {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}
    </Helmet>
  );
}

export const PAGE_SEO = {
  home: {
    title: undefined,
    description: DEFAULT_DESCRIPTION,
    url: '/',
  },
  discover: {
    title: 'Discover Community Plans',
    description: 'Browse and copy amazing plans from the community. Find travel itineraries, workout routines, meal plans, date night ideas, and more. Import any plan and make it your own.',
    url: '/discover',
    keywords: ['community plans', 'plan templates', 'travel itineraries', 'workout plans', 'meal prep', 'date night ideas'],
  },
  importPlan: {
    title: 'Import Plans from Any Source',
    description: 'Import plans from ChatGPT, Claude, Gemini, Perplexity, Instagram, TikTok, or any URL. Paste content and let AI convert it into actionable tasks you can track.',
    url: '/import-plan',
    keywords: ['import plans', 'ChatGPT export', 'Claude plans', 'AI conversation import', 'URL to tasks'],
  },
  chatgptTracker: {
    title: 'ChatGPT Plan Tracker',
    description: 'Import and track your ChatGPT conversations as actionable plans. Copy your ChatGPT output and convert it into tasks with automatic progress tracking.',
    url: '/chatgpt-plan-tracker',
    keywords: ['ChatGPT tracker', 'ChatGPT to tasks', 'ChatGPT export', 'AI plan tracker'],
  },
  claudeIntegration: {
    title: 'Claude AI Integration',
    description: 'Import plans from Claude AI conversations. Transform Claude\'s detailed responses into structured tasks and track your progress automatically.',
    url: '/claude-ai-integration',
    keywords: ['Claude AI', 'Claude plans', 'Anthropic', 'Claude to tasks'],
  },
  geminiImporter: {
    title: 'Google Gemini Plan Importer',
    description: 'Import plans from Google Gemini conversations. Convert Gemini AI responses into trackable tasks and activities.',
    url: '/gemini-plan-importer',
    keywords: ['Gemini AI', 'Google Gemini', 'Gemini plans', 'Bard import'],
  },
  perplexityPlans: {
    title: 'Perplexity Plans',
    description: 'Import research and plans from Perplexity AI. Turn Perplexity\'s sourced answers into actionable tasks with references.',
    url: '/perplexity-plans',
    keywords: ['Perplexity AI', 'Perplexity import', 'research to tasks'],
  },
  socialMediaSaver: {
    title: 'Save Social Media Content',
    description: 'Save and track content from Instagram, TikTok, Pinterest, and YouTube. Convert social media inspiration into actionable plans.',
    url: '/save-social-media',
    keywords: ['Instagram saver', 'TikTok tracker', 'Pinterest plans', 'YouTube content', 'social media to tasks'],
  },
  weekendPlans: {
    title: 'Weekend Plans & Ideas',
    description: 'Find and plan the perfect weekend activities. Browse community weekend plans or create your own with AI assistance.',
    url: '/weekend-plans',
    keywords: ['weekend plans', 'weekend activities', 'weekend ideas', 'weekend trip'],
  },
  dateNight: {
    title: 'Date Night Ideas',
    description: 'Discover romantic date night ideas and plan the perfect evening. Browse community date plans or create custom ones.',
    url: '/date-night-ideas',
    keywords: ['date night', 'romantic plans', 'date ideas', 'couple activities'],
  },
  dashboard: {
    title: 'Dashboard',
    description: 'Your personal planning dashboard. Track progress, manage tasks, and review your activities.',
    url: '/dashboard',
    noIndex: true,
  },
  settings: {
    title: 'Settings',
    description: 'Manage your JournalMate account settings and preferences.',
    url: '/settings',
    noIndex: true,
  },
  profile: {
    title: 'Profile',
    description: 'Your JournalMate profile and activity history.',
    url: '/profile',
    noIndex: true,
  },
  faq: {
    title: 'Frequently Asked Questions',
    description: 'Get answers to common questions about JournalMate. Learn how to import plans, track progress, share with friends, and more.',
    url: '/faq',
    keywords: ['FAQ', 'help', 'support', 'how to use JournalMate'],
  },
  support: {
    title: 'Support',
    description: 'Get help with JournalMate. Contact support, report issues, or browse our help documentation.',
    url: '/support',
    keywords: ['support', 'help', 'contact', 'customer service'],
  },
  privacy: {
    title: 'Privacy Policy',
    description: 'JournalMate privacy policy. Learn how we protect your data, what information we collect, and your rights.',
    url: '/privacy',
    keywords: ['privacy policy', 'data protection', 'GDPR', 'user rights'],
  },
  terms: {
    title: 'Terms of Service',
    description: 'JournalMate terms of service. Read our terms and conditions for using the platform.',
    url: '/terms',
    keywords: ['terms of service', 'terms and conditions', 'user agreement'],
  },
  updates: {
    title: 'Product Updates & Changelog',
    description: 'Stay up to date with the latest JournalMate features, improvements, and bug fixes. See what\'s new.',
    url: '/updates',
    keywords: ['updates', 'changelog', 'new features', 'release notes'],
  },
  login: {
    title: 'Sign In',
    description: 'Sign in to JournalMate to access your plans, track progress, and manage your activities.',
    url: '/login',
    noIndex: true,
  },
  signup: {
    title: 'Create Account',
    description: 'Join JournalMate for free. Create an account to start planning, tracking, and achieving your goals.',
    url: '/signup',
    keywords: ['sign up', 'create account', 'register', 'free account'],
  },
  groups: {
    title: 'Group Goals & Collaborative Planning',
    description: 'Plan and achieve goals together. Create groups, invite friends, and track progress as a team.',
    url: '/groups',
    keywords: ['group goals', 'collaborative planning', 'team goals', 'shared plans'],
  },
  sharedActivity: {
    title: 'Shared Plan',
    description: 'View and copy this shared plan. Import it into your JournalMate account to track your own progress.',
    url: '/share',
  },
};

export default SEO;
