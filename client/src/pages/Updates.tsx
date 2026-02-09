import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Home,
  Sparkles,
  ImagePlus,
  Combine,
  Share2,
  Smartphone,
  Globe,
  Star,
  Calendar,
  Zap,
  BarChart3,
  Moon,
  LayoutGrid,
  Smile,
  Search,
  Clock,
  Bell,
  Tv
} from "lucide-react";
import { motion } from "framer-motion";

interface UpdateEntry {
  id: string;
  date: string;
  title: string;
  category: 'feature' | 'improvement' | 'fix' | 'announcement';
  description: string;
  highlights: string[];
  icon: React.ReactNode;
  isNew?: boolean;
}

const updates: UpdateEntry[] = [
  {
    id: 'smart-notifications',
    date: 'February 2026',
    title: 'Smart Notifications & Scheduling',
    category: 'improvement',
    description: 'Smarter notification delivery with intelligent scheduling, quiet hours support, and real-time bell icon updates so you never miss what matters.',
    highlights: [
      'Real-time notification badge updates',
      'Smart time extraction from task descriptions for reminders',
      'Quiet hours automatically reschedule notifications',
      'Duplicate notification prevention'
    ],
    icon: <Bell className="w-6 h-6 text-rose-500" />,
    isNew: true
  },
  {
    id: 'unified-widgets',
    date: 'February 2026',
    title: 'Unified Home Screen Widgets',
    category: 'improvement',
    description: 'Redesigned widgets for iOS and Android with consistent stats that match your Reports dashboard — streak, tasks, plans, and completion rate at a glance.',
    highlights: [
      'Widget stats now match Reports page exactly',
      'iOS widgets: small, medium, large, and Lock Screen sizes',
      'Android widgets: 2x2 and 4x2 layouts with category icons',
      'Real-time sync when you complete tasks'
    ],
    icon: <LayoutGrid className="w-6 h-6 text-blue-500" />,
    isNew: true
  },
  {
    id: 'journal-enrichment-v2',
    date: 'February 2026',
    title: 'Enhanced Journal Enrichment',
    category: 'improvement',
    description: 'Journal entries for movies, TV shows, books, restaurants, and more now get richer details — better poster art, streaming availability, and smarter name matching.',
    highlights: [
      'Google Search-powered name standardization for accurate results',
      'Improved movie and TV show poster matching via TMDB',
      'See where to stream movies and shows you journal about',
      'Better cover art for books, albums, and venues'
    ],
    icon: <Search className="w-6 h-6 text-teal-500" />,
    isNew: true
  },
  {
    id: 'emoji-plan-titles',
    date: 'February 2026',
    title: 'AI Emoji Plan Titles',
    category: 'feature',
    description: 'Your activity plans now get fun, contextual emoji automatically added to their titles by AI — making your plan list more visual and easier to scan.',
    highlights: [
      'AI picks the perfect emoji for each plan',
      'Works with all plan types (Quick, Smart, Direct)',
      'Emoji reflects the activity category and mood'
    ],
    icon: <Smile className="w-6 h-6 text-amber-500" />,
    isNew: true
  },
  {
    id: 'quick-plan-ux',
    date: 'February 2026',
    title: 'Quick Plan UX Improvements',
    category: 'improvement',
    description: 'The Quick Plan flow is now smoother with a clearer confirmation step, better location suggestions, and cleaner error messages.',
    highlights: [
      'Redesigned plan confirmation screen',
      'Improved location and venue hints',
      'Cleaner error messages without technical jargon',
      'Better header and navigation during planning'
    ],
    icon: <Zap className="w-6 h-6 text-yellow-500" />,
    isNew: true
  },
  {
    id: 'reports-dashboard',
    date: 'February 2026',
    title: 'Reports & Progress Dashboard',
    category: 'feature',
    description: 'A comprehensive Reports tab with detailed progress tracking, activity insights, badges, and the End of Day Review - all in one place.',
    highlights: [
      'Overview with streak, tasks completed, and completion rate',
      'Activity-level progress tracking with task breakdown',
      'Badges and achievements with unlock progress',
      'End of Day Review - swipe through completed tasks',
      'Time range filtering (7/30/90/365 days)',
      'Category filtering for focused insights',
      'Widget sync for home screen stats'
    ],
    icon: <BarChart3 className="w-6 h-6 text-indigo-500" />
  },
  {
    id: 'end-of-day-review',
    date: 'February 2026',
    title: 'End of Day Review',
    category: 'feature',
    description: 'Reflect on your day with a Tinder-style swipe interface. Rate how each task went and automatically generate a daily journal entry.',
    highlights: [
      'Swipe right for tasks that went well',
      'Swipe left for tasks you struggled with',
      'Swipe up to mark tasks you loved',
      'Auto-generates daily journal entry',
      'Celebration confetti on completion'
    ],
    icon: <Moon className="w-6 h-6 text-purple-500" />
  },
  {
    id: 'social-media-import',
    date: 'November 2025',
    title: 'Social Media Import',
    category: 'feature',
    description: 'Share TikTok videos, Instagram Reels, posts, stories, and content from anywhere you get inspiration. We\'ll journal it for you so you can plan with it and track your progress.',
    highlights: [
      'Share videos and images from TikTok, Instagram, and more',
      'Automatically creates journal entries from your shared content',
      'Turn saved inspiration into actionable plans',
      'Track your progress on activities you discover'
    ],
    icon: <ImagePlus className="w-6 h-6 text-pink-500" />
  },
  {
    id: 'plan-remix',
    date: 'November 2025',
    title: 'Plan Remix',
    category: 'feature',
    description: 'Combine multiple community plans into one personalized plan. Select 2-10 plans and create a cohesive action plan that works for you.',
    highlights: [
      'Choose multiple plans from Discover to remix',
      'Automatically removes duplicate tasks',
      'Credits original plan creators',
      'Reorder tasks before saving'
    ],
    icon: <Combine className="w-6 h-6 text-violet-500" />
  },
  {
    id: 'cross-platform-import',
    date: 'October 2025',
    title: 'Cross-Platform AI Import',
    category: 'feature',
    description: 'Import AI-generated plans from ChatGPT, Claude, Gemini, and any other AI assistant. Copy and paste or share directly to JournalMate.',
    highlights: [
      'Works with any AI assistant output',
      'Paste or share plans directly',
      'Automatically organizes tasks for you',
      'Start planning immediately'
    ],
    icon: <Sparkles className="w-6 h-6 text-purple-500" />
  },
  {
    id: 'community-plans',
    date: 'September 2025',
    title: 'Community Plans Discovery',
    category: 'feature',
    description: 'Browse and copy plans shared by other JournalMate users. Find inspiration for fitness routines, meal prep, productivity systems, and more.',
    highlights: [
      'Trending and popular plans',
      'Category filters',
      'One-click copy to your account',
      'Share your own plans with the community'
    ],
    icon: <Globe className="w-6 h-6 text-emerald-500" />
  },
  {
    id: 'mobile-apps',
    date: 'August 2025',
    title: 'Native Mobile Apps',
    category: 'feature',
    description: 'JournalMate is now available as a native app for iOS and Android with exclusive mobile features.',
    highlights: [
      'Home screen widgets',
      'Push notifications',
      'Biometric authentication',
      'Voice-to-text journaling'
    ],
    icon: <Smartphone className="w-6 h-6 text-blue-500" />
  }
];

function CategoryBadge({ category }: { category: UpdateEntry['category'] }) {
  const styles = {
    feature: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    improvement: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    fix: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    announcement: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
  };

  const labels = {
    feature: 'New Feature',
    improvement: 'Improvement',
    fix: 'Bug Fix',
    announcement: 'Announcement'
  };

  return (
    <Badge className={styles[category]} variant="secondary">
      {category === 'feature' && <Sparkles className="w-3 h-3 mr-1" />}
      {labels[category]}
    </Badge>
  );
}

function UpdateCard({ update, index }: { update: UpdateEntry; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card className={`overflow-hidden ${update.isNew ? 'ring-2 ring-purple-500/50' : ''}`} data-testid={`update-card-${update.id}`}>
        <CardHeader className="pb-4">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800">
              {update.icon}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <CategoryBadge category={update.category} />
                {update.isNew && (
                  <Badge className="bg-gradient-to-r from-pink-500 to-violet-500 text-white">
                    <Zap className="w-3 h-3 mr-1" />
                    Just Released
                  </Badge>
                )}
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {update.date}
                </span>
              </div>
              <CardTitle className="text-xl">{update.title}</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-base mb-4">
            {update.description}
          </CardDescription>
          <ul className="space-y-2">
            {update.highlights.map((highlight, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                <Star className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                {highlight}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function UpdatesPage() {
  return (
    <div className="h-screen overflow-auto bg-background text-foreground">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex gap-2 mb-6">
          <Link href="/">
            <Button variant="outline" size="sm" className="gap-2" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </Link>
          <Link href="/">
            <Button variant="outline" size="sm" className="gap-2" data-testid="button-home">
              <Home className="w-4 h-4" />
              Home
            </Button>
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-100 to-violet-100 dark:from-purple-900/30 dark:to-violet-900/30 mb-4">
            <Sparkles className="w-5 h-5 text-purple-500" />
            <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
              Product Updates
            </span>
          </div>
          <h1 className="text-3xl font-bold mb-4">What's New in JournalMate</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            We're constantly improving JournalMate to help you plan better and achieve more. 
            Here's what's new and what's coming next.
          </p>
        </motion.div>

        <div className="space-y-6">
          {updates.map((update, index) => (
            <UpdateCard key={update.id} update={update} index={index} />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 text-center"
        >
          <Card className="bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 border-purple-200 dark:border-purple-800">
            <CardContent className="py-8">
              <h3 className="text-xl font-semibold mb-2">Have a Feature Request?</h3>
              <p className="text-muted-foreground mb-4">
                We'd love to hear your ideas for making JournalMate even better.
              </p>
              <Button className="bg-gradient-to-r from-purple-500 to-violet-600 text-white" data-testid="button-feedback">
                <Share2 className="w-4 h-4 mr-2" />
                Share Your Feedback
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
