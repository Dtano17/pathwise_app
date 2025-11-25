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
  Video,
  Smartphone,
  Globe,
  Star,
  Calendar,
  Zap
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
    id: 'social-media-import',
    date: 'November 2025',
    title: 'Social Media Import',
    category: 'feature',
    description: 'Import plans directly from Instagram, TikTok, and other social media apps. Share images or videos with captions to JournalMate and our AI will extract actionable tasks automatically.',
    highlights: [
      'Share images with text overlays - AI reads them with OCR',
      'Share videos with spoken content - AI transcribes and extracts tasks',
      'Caption text is automatically merged with extracted content',
      'Works with any app that supports Android/iOS share sheets'
    ],
    icon: <ImagePlus className="w-6 h-6 text-pink-500" />,
    isNew: true
  },
  {
    id: 'plan-remix',
    date: 'November 2025',
    title: 'Plan Remix',
    category: 'feature',
    description: 'Combine multiple community plans into one personalized plan. Select 2-10 plans, and our AI will intelligently merge tasks, remove duplicates, and create a cohesive action plan.',
    highlights: [
      'Multi-select mode in Discover - choose plans to remix',
      'Smart duplicate detection - no repeated tasks',
      'Attribution to original creators',
      'Drag-and-drop task reordering before saving'
    ],
    icon: <Combine className="w-6 h-6 text-violet-500" />,
    isNew: true
  },
  {
    id: 'cross-platform-import',
    date: 'October 2025',
    title: 'Cross-Platform AI Import',
    category: 'feature',
    description: 'Import AI-generated plans from ChatGPT, Claude, Gemini, and any other AI assistant. Our universal parser works with any format.',
    highlights: [
      'Browser extension for Chrome, Firefox, Edge',
      'Mobile share integration for iOS and Android',
      'Automatic source detection',
      'High-confidence task extraction'
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
    <div className="min-h-screen bg-background text-foreground">
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
