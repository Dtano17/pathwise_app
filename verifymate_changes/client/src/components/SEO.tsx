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
    // Core Brand
    'JournalMate',
    'JournalMate.ai',

    // Core Features: Plan, Track, Discover
    'plan tracker',
    'track plans',
    'discover plans',
    'AI plan tracker',
    'plan tracking app',
    'plan and track',
    'track shared plans',
    'track birthday plans',
    'track group activities',

    // Goal & Activity Tracking
    'goal tracker',
    'activity planner',
    'task tracker',
    'progress tracker',
    'activity tracker',

    // Sharing & Collaboration
    'share plan',
    'share plans online',
    'group plan',
    'group planning',
    'collaborative planning',
    'share goals with friends',
    'group goals',
    'team planning app',
    'group activities',
    'track group activities',

    // AI Integration Keywords
    'AI integration',
    'AI planner',
    'AI planning assistant',
    'ChatGPT import',
    'ChatGPT plan tracker',
    'ChatGPT to tasks',
    'Claude AI plans',
    'Claude integration',
    'Gemini plans',
    'Google Gemini planner',
    'Perplexity AI tracker',
    'AI conversation import',
    'AI task generator',
    'use AI plan online',
    'AI plan iterations',

    // Travel & Budget
    'AI travel planner',
    'AI travel budget',
    'travel budget tracker',
    'trip planner with budget',
    'travel itinerary tracker',
    'vacation planner',
    'travel planning app',

    // Social Media Integration
    'social media saver',
    'Instagram content tracker',
    'TikTok plans',
    'Pinterest plan tracker',
    'YouTube content saver',
    'save social media content',
    'Instagram saver app',
    'use online post to plan',
    'plan from social media',

    // Journaling
    'AI journaling',
    'auto journal',
    'digital journal',
    'smart journal',
    'goal journal',

    // Lifestyle Planning
    'workout planner',
    'meal planner',
    'date night planner',
    'weekend plans',
    'lifestyle planner',
    'birthday plans',
    'birthday plan tracker',
    'anniversary planner',

    // Discovery
    'discover plans',
    'community plans',
    'plan templates',
    'remix plans',

    // Major Holidays & Events (All Year)
    // Q1
    'New Year plans',
    'New Year activities',
    'track New Year plans',
    'Valentine Day plans',
    'Valentine plans',
    'Presidents Day activities',
    'St Patrick Day plans',
    'Easter plans',
    'spring plans',

    // Q2
    'Mother Day plans',
    'Memorial Day activities',
    'Father Day plans',
    'Independence Day plans',
    'July 4th plans',
    'summer vacation plans',
    'summer activities',

    // Q3
    'Labor Day plans',
    'back to school planning',
    'summer adventure ideas',
    'Halloween plans',
    'Halloween party ideas',
    'fall activities',

    // Q4
    'Veterans Day activities',
    'Thanksgiving plans',
    'Black Friday plans',
    'Christmas plans',
    'track Christmas plans',
    'Christmas activity ideas',
    'Hanukkah plans',
    'New Years Eve plans',
    'holiday planning',
    'winter plans',

    // Special Occasions
    'birthday party planning',
    'wedding planning',
    'baby shower ideas',
    'graduation celebration',
    'anniversary ideas',
    'reunion planning',

    // Activity Types
    'family activities',
    'family vacation planning',
    'game day planning',
    'concert planning',
    'festival planning',
    'road trip planning',
    'weekend getaway ideas'
  ];

  const allKeywords = Array.from(new Set([...defaultKeywords, ...keywords]));

  // JSON-LD Schema for Google/AI
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'JournalMate',
    url: BASE_URL,
    logo: `${BASE_URL}/journalmate-logo-email.png`,
    description: DEFAULT_DESCRIPTION,
    sameAs: [
      'https://twitter.com/journalmate',
      'https://instagram.com/journalmate',
    ],
  };

  const applicationSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'JournalMate',
    description: DEFAULT_DESCRIPTION,
    url: BASE_URL,
    image: `${BASE_URL}/journalmate-logo-email.png`,
    operatingSystem: ['ANDROID', 'IOS', 'WEB'],
    applicationCategory: 'ProductivityApplication',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '500',
    },
  };

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'JournalMate',
    url: BASE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${BASE_URL}/discover?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  const breadcrumbSchema = url ? {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: BASE_URL,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: pageTitle,
        item: `${BASE_URL}${url}`,
      },
    ],
  } : null;

  return (
    <Helmet>
      <title>{pageTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={allKeywords.join(', ')} />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="theme-color" content="#5B21B6" />
      <meta name="google-site-verification" content="Wx6Fja6gSxhMT7IokfvL0UmfI9LbFZCzQDZkVA9hngQ" />
      <link rel="icon" href="/favicon.ico" />
      <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={fullImageUrl} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImageUrl} />
      <meta name="twitter:site" content="@journalmate" />

      {author && <meta name="author" content={author} />}
      {publishedTime && <meta property="article:published_time" content={publishedTime} />}
      {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}

      <link rel="alternate" type="application/rss+xml" title="JournalMate Plans Feed" href="/feed.xml" />
      <link rel="search" type="application/opensearchdescription+xml" title="Search JournalMate" href="/opensearch.xml" />

      <script type="application/ld+json">
        {JSON.stringify(organizationSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(applicationSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(websiteSchema)}
      </script>
      {breadcrumbSchema && (
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema)}
        </script>
      )}
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
