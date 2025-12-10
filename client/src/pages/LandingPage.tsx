import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Sparkles, 
  Target, 
  BarChart3, 
  Users, 
  Share2, 
  Smartphone,
  ArrowRight,
  CheckCircle2,
  Brain,
  Globe,
  Zap,
  Star,
  Download,
  Cpu,
  TrendingUp,
  Instagram,
  BookMarked,
  Lightbulb,
  Clock,
  Puzzle,
  Megaphone,
  Compass,
  Upload,
  Loader2,
  Link as LinkIcon,
  X,
  Crown,
  Gift,
  Infinity as InfinityIcon,
  Bell,
  Calendar,
  LayoutGrid,
  Award,
  Trophy
} from "lucide-react";
import { SiApple, SiGoogleplay, SiTiktok, SiYoutube } from "react-icons/si";
import { motion, AnimatePresence } from "framer-motion";
import ThemeToggle from "@/components/ThemeToggle";
import { SEO, PAGE_SEO } from "@/components/SEO";

const features = [
  {
    icon: Target,
    title: "Activate Your Goals",
    description: "Turn AI suggestions into real action items with deadlines, priorities, and categories.",
    color: "text-emerald-500",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30"
  },
  {
    icon: BarChart3,
    title: "Track Your Progress",
    description: "Visual dashboards, completion streaks, and insights to keep you motivated and on track.",
    color: "text-blue-500",
    bgColor: "bg-blue-100 dark:bg-blue-900/30"
  },
  {
    icon: BookMarked,
    title: "AI Auto-Journal",
    description: "Automatically create journal entries as you complete tasks, capturing your achievements and growth.",
    color: "text-orange-500",
    bgColor: "bg-orange-100 dark:bg-orange-900/30"
  },
  {
    icon: Share2,
    title: "Discover & Remix Plans",
    description: "Download plans from other users, discover trending plans, and remix multiple plans to create your perfect routine.",
    color: "text-pink-500",
    bgColor: "bg-pink-100 dark:bg-pink-900/30"
  },
  {
    icon: Globe,
    title: "Find What's Nearby",
    description: "Discover emergency plans and trending activities near you. Connect with local community goals.",
    color: "text-violet-500",
    bgColor: "bg-violet-100 dark:bg-violet-900/30"
  },
  {
    icon: TrendingUp,
    title: "Share Plans & Get Rewards",
    description: "Share your plans on Instagram, TikTok, LinkedIn, X, and Facebook. Tag @JournalMate and unlock rewards.",
    color: "text-rose-500",
    bgColor: "bg-rose-100 dark:bg-rose-900/30"
  },
  {
    icon: Instagram,
    title: "Integrate & Transform Content",
    description: "Share TikTok videos, Instagram Reels, posts, stories, and content from anywhere you get inspiration. We'll journal it for you so you can plan with it and track your progress.",
    color: "text-cyan-500",
    bgColor: "bg-cyan-100 dark:bg-cyan-900/30"
  }
];

const stats = [
  { value: "10K+", label: "Active Users" },
  { value: "50K+", label: "Plans Created" },
  { value: "1M+", label: "Tasks Completed" },
  { value: "4.8", label: "App Rating" }
];

// Detect platform from URL
function detectPlatform(url: string): { platform: string; icon: any; color: string } | null {
  const urlLower = url.toLowerCase();
  if (urlLower.includes('instagram.com') || urlLower.includes('instagr.am')) {
    return { platform: 'Instagram', icon: Instagram, color: 'text-pink-500' };
  }
  if (urlLower.includes('tiktok.com') || urlLower.includes('vm.tiktok.com')) {
    return { platform: 'TikTok', icon: SiTiktok, color: 'text-black dark:text-white' };
  }
  if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) {
    return { platform: 'YouTube', icon: SiYoutube, color: 'text-red-500' };
  }
  if (urlLower.includes('twitter.com') || urlLower.includes('x.com')) {
    return { platform: 'X/Twitter', icon: null, color: 'text-foreground' };
  }
  if (urlLower.includes('facebook.com') || urlLower.includes('fb.com')) {
    return { platform: 'Facebook', icon: null, color: 'text-blue-600' };
  }
  if (urlLower.includes('reddit.com')) {
    return { platform: 'Reddit', icon: null, color: 'text-orange-500' };
  }
  return null;
}

// Validate URL format
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export default function LandingPage() {
  const [, navigate] = useLocation();
  const [importUrl, setImportUrl] = useState('');
  const [showExtractingOverlay, setShowExtractingOverlay] = useState(false);
  const [extractionPhase, setExtractionPhase] = useState<'extracting' | 'detected' | 'error'>('extracting');
  const [detectedPlatform, setDetectedPlatform] = useState<{ platform: string; icon: any; color: string } | null>(null);

  const handleImportSubmit = () => {
    if (!importUrl.trim()) return;
    
    // Validate URL
    if (!isValidUrl(importUrl)) {
      setExtractionPhase('error');
      setShowExtractingOverlay(true);
      return;
    }

    // Detect platform
    const platform = detectPlatform(importUrl);
    if (!platform) {
      setExtractionPhase('error');
      setShowExtractingOverlay(true);
      return;
    }

    setDetectedPlatform(platform);
    setExtractionPhase('extracting');
    setShowExtractingOverlay(true);

    // Simulate extraction animation, then show detected state
    setTimeout(() => {
      setExtractionPhase('detected');
    }, 2000);
  };

  const handleSignInToProcess = () => {
    // Save URL to localStorage for post-login processing
    localStorage.setItem('journalmate.pendingImportUrl', importUrl);
    localStorage.setItem('journalmate.pendingImportTimestamp', Date.now().toString());
    
    // Redirect to login
    navigate('/login');
  };

  const closeOverlay = () => {
    setShowExtractingOverlay(false);
    setExtractionPhase('extracting');
    setDetectedPlatform(null);
  };

  return (
    <div className="h-screen overflow-auto bg-background text-foreground">
      <SEO {...PAGE_SEO.home} />
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <img src="/icons/web/android-chrome-192x192.png" alt="JournalMate.ai - AI-powered plan tracker and journaling app" className="w-8 h-8 rounded-lg flex-shrink-0" loading="eager" data-testid="img-logo-header" />
            <span className="font-bold text-lg sm:text-xl truncate hidden sm:block">JournalMate</span>
          </div>
          
          {/* Feature Navigation - Prominent pills with icons */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-1 justify-center max-w-lg">
            <Link href="/updates">
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-1.5 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 border-orange-200 dark:border-orange-800 hover:border-orange-300 dark:hover:border-orange-700 text-orange-700 dark:text-orange-300 text-xs sm:text-sm px-2.5 sm:px-3"
                data-testid="link-updates"
              >
                <Megaphone className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Updates</span>
              </Button>
            </Link>
            <Link href="/discover">
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-1.5 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border-blue-200 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-700 text-blue-700 dark:text-blue-300 text-xs sm:text-sm px-2.5 sm:px-3"
                data-testid="link-discover"
              >
                <Compass className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Discover</span>
              </Button>
            </Link>
            <Link href="/import-plan">
              <Button 
                size="sm" 
                className="gap-1.5 bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white text-xs sm:text-sm px-2.5 sm:px-3 relative"
                data-testid="link-import"
              >
                <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Import</span>
                <Badge className="absolute -top-2 -right-2 bg-emerald-500 text-white text-xs px-1.5 py-0 h-4 border-0">
                  New
                </Badge>
              </Button>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/login">
              <Button size="sm" variant="outline" data-testid="button-login-landing">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-emerald-500/10" />
        <div className="container mx-auto px-4 py-20 md:py-32 relative">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-4xl mx-auto"
          >
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-purple-600 via-violet-600 to-emerald-500 bg-clip-text text-transparent leading-tight py-1">
              Execute your plans, track and share your progress
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Create plans with our AI agent, or import from ChatGPT, Claude, and social media. 
              JournalMate devises and tracks your plan to help you achieve your goals.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Link href="/login">
                <Button size="lg" className="gap-2 bg-gradient-to-r from-purple-500 to-violet-600 text-white" data-testid="button-get-started">
                  Get Started Free
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/discover">
                <Button size="lg" variant="outline" className="gap-2" data-testid="button-browse-plans">
                  <Globe className="w-4 h-4" />
                  Browse Community Plans
                </Button>
              </Link>
            </div>

            {/* App Store Badges */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <a 
                href="https://apps.apple.com/app/journalmate" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block"
                data-testid="link-app-store"
              >
                <div className="flex items-center gap-2 bg-black text-white px-5 py-3 rounded-xl hover:bg-gray-800 transition-colors">
                  <SiApple className="w-7 h-7" />
                  <div className="text-left">
                    <div className="text-xs">Download on the</div>
                    <div className="text-lg font-semibold -mt-1">App Store</div>
                  </div>
                </div>
              </a>
              <a 
                href="https://play.google.com/store/apps/details?id=ai.journalmate.app" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block"
                data-testid="link-play-store"
              >
                <div className="flex items-center gap-2 bg-black text-white px-5 py-3 rounded-xl hover:bg-gray-800 transition-colors">
                  <SiGoogleplay className="w-6 h-6" />
                  <div className="text-left">
                    <div className="text-xs">GET IT ON</div>
                    <div className="text-lg font-semibold -mt-1">Google Play</div>
                  </div>
                </div>
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y bg-card/50">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div 
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className="text-3xl md:text-4xl font-bold text-primary mb-1">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything You Need to Succeed</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              From AI-powered planning to group accountability, JournalMate has all the tools to help you achieve your goals.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full hover-elevate" data-testid={`feature-card-${index}`}>
                  <CardContent className="p-6">
                    <div className={`w-12 h-12 rounded-xl ${feature.bgColor} flex items-center justify-center mb-4`}>
                      <feature.icon className={`w-6 h-6 ${feature.color}`} />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-card/50">
        <div className="container mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Get started in minutes with our simple three-step process.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { step: "1", title: "Create or Integrate", description: "Use our AI agent for Quick/Smart Plan, or paste from ChatGPT, Claude, Perplexity, and social media." },
              { step: "2", title: "We Devise Your Plan", description: "JournalMate transforms raw ideas into actionable tasks, priorities, and deadlines tailored to your goals." },
              { step: "3", title: "Track & Celebrate", description: "Check off tasks, view your progress dashboard, and share wins with friends. Earn badges and streaks." }
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
                className="text-center"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 text-white flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Group Planning Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Plan Together, Achieve Together</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Create group plans, track progress in real-time, and celebrate wins together with friends and team members.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { 
                step: "1", 
                icon: Users,
                title: "Plan as a Group", 
                description: "Create a shared plan with team members or friends. Everyone contributes ideas and helps shape the perfect strategy.",
                color: "text-emerald-500",
                bgColor: "bg-emerald-100 dark:bg-emerald-900/30"
              },
              { 
                step: "2", 
                icon: TrendingUp,
                title: "Track Progress Together", 
                description: "See real-time updates as group members complete tasks. Stay motivated with shared progress dashboards and achievements.",
                color: "text-blue-500",
                bgColor: "bg-blue-100 dark:bg-blue-900/30"
              },
              { 
                step: "3", 
                icon: Share2,
                title: "Share & Celebrate", 
                description: "Share your group's success with permanent links. Invite others to join and build an even larger community around your goals.",
                color: "text-purple-500",
                bgColor: "bg-purple-100 dark:bg-purple-900/30"
              }
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
              >
                <Card className="h-full hover-elevate">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="flex-shrink-0">
                        <div className={`w-12 h-12 rounded-xl ${item.bgColor} flex items-center justify-center`}>
                          <item.icon className={`w-6 h-6 ${item.color}`} />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className={`text-sm font-bold ${item.color} mb-1`}>Step {item.step}</div>
                        <h3 className="text-lg font-semibold">{item.title}</h3>
                      </div>
                    </div>
                    <p className="text-muted-foreground text-sm">{item.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="text-center mt-12"
          >
            <p className="text-muted-foreground max-w-2xl mx-auto mb-6">
              Share permanent links that never expire. Recipients can view your plan, join your group, and track progress together in real-time.
            </p>
            <Link href="/login">
              <Button size="lg" variant="outline" className="gap-2" data-testid="button-start-group">
                <Users className="w-4 h-4" />
                Create Your First Group Plan
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Dedicated AI Planning Agent Section */}
      <section className="py-20 bg-card/50">
        <div className="container mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Your Dedicated AI Planning Agent</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Choose between Quick Plan for fast results or Smart Plan for comprehensive analysis.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
            {/* Quick Plan */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0 }}
            >
              <Card className="h-full hover-elevate border-2 border-blue-200 dark:border-blue-900">
                <CardContent className="p-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <Clock className="w-6 h-6 text-blue-500" />
                    </div>
                    <h3 className="text-2xl font-bold">Quick Plan</h3>
                  </div>
                  <p className="text-muted-foreground mb-6">
                    Get faster results with our dedicated AI agent methodology that adapts to your unique situation and goals.
                  </p>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-500" />
                      <span>Rapid planning</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-500" />
                      <span>AI-adaptive methodology</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-500" />
                      <span>Instant actionable tasks</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Smart Plan */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              <Card className="h-full hover-elevate border-2 border-purple-200 dark:border-purple-900">
                <CardContent className="p-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                      <Lightbulb className="w-6 h-6 text-purple-500" />
                    </div>
                    <h3 className="text-2xl font-bold">Smart Plan</h3>
                  </div>
                  <p className="text-muted-foreground mb-6">
                    Get comprehensive, sophisticated plans with our dedicated AI agent methodology for complex goals.
                  </p>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-purple-500" />
                      <span>Deep analysis</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-purple-500" />
                      <span>Context-aware methodology</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-purple-500" />
                      <span>Detailed roadmaps</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Integrations & Extension Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h3 className="text-2xl font-bold mb-6">Two Ways to Create Your Plan</h3>
            <div className="grid md:grid-cols-3 gap-6">
              {/* Use AI Agent */}
              <Card className="hover-elevate border-2 border-blue-200 dark:border-blue-900">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-4">
                    <Cpu className="w-6 h-6 text-blue-500" />
                  </div>
                  <h4 className="font-semibold mb-2">Use Our AI Agent</h4>
                  <p className="text-sm text-muted-foreground">
                    Quick Plan or Smart Plan - let our dedicated AI agent create your personalized plan
                  </p>
                </CardContent>
              </Card>

              {/* Paste from AI Platforms */}
              <Card className="hover-elevate">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mx-auto mb-4">
                    <Brain className="w-6 h-6 text-purple-500" />
                  </div>
                  <h4 className="font-semibold mb-2">Paste from AI Platforms</h4>
                  <p className="text-sm text-muted-foreground">
                    Copy from ChatGPT, Claude, Perplexity, Gemini, or other AI tools
                  </p>
                </CardContent>
              </Card>

              {/* Social Media */}
              <Card className="hover-elevate">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center mx-auto mb-4">
                    <Instagram className="w-6 h-6 text-pink-500" />
                  </div>
                  <h4 className="font-semibold mb-2">Integrate Social Media</h4>
                  <p className="text-sm text-muted-foreground">
                    Share from Instagram, TikTok, LinkedIn, and other platforms
                  </p>
                </CardContent>
              </Card>

              {/* Browser Extension */}
              <Card className="hover-elevate border-2 border-emerald-200 dark:border-emerald-900">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
                    <Puzzle className="w-6 h-6 text-emerald-500" />
                  </div>
                  <h4 className="font-semibold mb-2">Browser Extension</h4>
                  <p className="text-sm text-muted-foreground">
                    Save plans with one click using our Chrome extension
                  </p>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Feedback Section */}
      <section className="py-20 bg-card/50">
        <div className="container mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Card className="border-2 border-purple-200 dark:border-purple-900 overflow-hidden">
              <CardContent className="p-8 md:p-12 text-center">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Have a Feature Request?</h2>
                <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
                  We'd love to hear your ideas for making JournalMate even better.
                </p>
                <a href="mailto:support@journalmate.ai">
                  <Button size="lg" className="gap-2 bg-gradient-to-r from-purple-500 to-violet-600 text-white" data-testid="button-share-feedback">
                    <Share2 className="w-4 h-4" />
                    Share Your Feedback
                  </Button>
                </a>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20" id="pricing">
        <div className="container mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-100 to-violet-100 dark:from-purple-900/30 dark:to-violet-900/30 mb-6">
              <Crown className="w-5 h-5 text-purple-500" />
              <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                Simple Pricing
              </span>
            </div>
            
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Choose Your Plan</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-4">
              Social media imports let you analyze, plan, and track progress with any post or inspiration online.
            </p>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto">
              Supports 7 social platforms and 8 AI apps and counting
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {/* Free Plan */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0 }}
            >
              <Card className="h-full hover-elevate" data-testid="pricing-card-free">
                <CardContent className="p-6">
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold mb-1">Free</h3>
                    <p className="text-muted-foreground text-sm">Get started</p>
                    <div className="mt-4">
                      <span className="text-4xl font-bold">$0</span>
                      <span className="text-muted-foreground">/forever</span>
                    </div>
                  </div>
                  
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-2">
                      <Upload className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
                      <span>3 social media imports/month</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Cpu className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
                      <span>5 AI service imports (8+ AI apps supported)</span>
                    </div>
                    <div className="flex items-start gap-2 bg-emerald-50 dark:bg-emerald-900/20 -mx-2 px-2 py-1.5 rounded-lg">
                      <Gift className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span className="text-emerald-700 dark:text-emerald-300">
                        <strong>+2 bonus</strong> every time you publish to Discovery!
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Brain className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
                      <span>Dedicated AI agent for Quick & Smart Plans</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <BookMarked className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
                      <span>Smart categorization & automated journaling</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Zap className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
                      <span>Live updates to tasks and plans</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Share2 className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
                      <span>Post plans for others to adopt in community</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
                      <span>Free media edits before sharing to social</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <TrendingUp className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
                      <span>Create compelling plans, share to community, and earn rewards when used</span>
                    </div>
                    
                    <div className="flex items-start gap-2 text-muted-foreground">
                      <X className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <span className="line-through">No group planning with friends</span>
                    </div>
                  </div>

                  <div className="mt-6">
                    <Link href="/login">
                      <Button variant="outline" className="w-full" data-testid="button-pricing-free">
                        Get Started
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Pro Monthly Plan */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              <Card className="h-full hover-elevate border-2 border-blue-200 dark:border-blue-900" data-testid="pricing-card-pro-monthly">
                <CardContent className="p-6">
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold mb-1">Pro Monthly</h3>
                    <p className="text-muted-foreground text-sm">For active planners</p>
                    <div className="mt-4">
                      <span className="text-4xl font-bold">$6.99</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                  </div>
                  
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-2">
                      <Upload className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                      <span className="font-medium">10 social media imports/month</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                      <span>Everything in Free</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                      <span>Remix social plans with your flavor</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Lightbulb className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                      <span>Plan using inspiration from imports</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <BarChart3 className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                      <span>Task progress & analytics</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                      <span>Journal insights</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                      <span>Export all your data</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                      <span>Priority support</span>
                    </div>
                  </div>

                  <div className="mt-6">
                    <Link href="/login">
                      <Button className="w-full bg-blue-500 hover:bg-blue-600" data-testid="button-pricing-pro-monthly">
                        Start Free Trial
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Pro Yearly Plan */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <Card className="h-full hover-elevate border-2 border-purple-200 dark:border-purple-900 relative" data-testid="pricing-card-pro-yearly">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-violet-600 text-white px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap">
                  Best Value for Individuals
                </div>
                <CardContent className="p-6">
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold mb-1">Pro Yearly</h3>
                    <p className="text-muted-foreground text-sm">Save 30%</p>
                    <div className="mt-4">
                      <span className="text-4xl font-bold">$58.99</span>
                      <span className="text-muted-foreground">/year</span>
                    </div>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                      ~$4.92/month
                    </p>
                  </div>
                  
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-2 font-medium">
                      <InfinityIcon className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
                      <span className="text-purple-700 dark:text-purple-300">Unlimited social media imports</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
                      <span>Everything in Pro Monthly</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
                      <span>Remix social plans with your flavor</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
                      <span>No monthly limits</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
                      <span>Priority support</span>
                    </div>
                  </div>

                  <div className="mt-6">
                    <Link href="/login">
                      <Button className="w-full bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700" data-testid="button-pricing-pro-yearly">
                        Start Free Trial
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Family Plan */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
            >
              <Card className="h-full hover-elevate border-2 border-pink-200 dark:border-pink-900 relative" data-testid="pricing-card-family">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-pink-500 to-rose-600 text-white px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap">
                  Best Value for Groups
                </div>
                <CardContent className="p-6">
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold mb-1">Family & Friends</h3>
                    <p className="text-muted-foreground text-sm">Plan, track & share together</p>
                    <div className="mt-4">
                      <span className="text-4xl font-bold">$125.99</span>
                      <span className="text-muted-foreground">/year</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      or $14.99/month
                    </p>
                  </div>
                  
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-2 font-medium">
                      <InfinityIcon className="w-4 h-4 text-pink-500 flex-shrink-0 mt-0.5" />
                      <span className="text-pink-700 dark:text-pink-300">Unlimited social media imports</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Users className="w-4 h-4 text-pink-500 flex-shrink-0 mt-0.5" />
                      <span>Plan, track & share for 5+ family & friends</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Zap className="w-4 h-4 text-pink-500 flex-shrink-0 mt-0.5" />
                      <span>Real-time group feeds (cancellations, weather, traffic)</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Compass className="w-4 h-4 text-pink-500 flex-shrink-0 mt-0.5" />
                      <span>Discover & remix inspiration from others' plans</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-pink-500 flex-shrink-0 mt-0.5" />
                      <span>Group progress tracking with live updates</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-pink-500 flex-shrink-0 mt-0.5" />
                      <span>Collaborative planning</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-pink-500 flex-shrink-0 mt-0.5" />
                      <span>Priority support</span>
                    </div>
                  </div>

                  <div className="mt-6">
                    <Link href="/login">
                      <Button className="w-full bg-pink-500 hover:bg-pink-600" data-testid="button-pricing-family">
                        Start Free Trial
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="text-center mt-10"
          >
            <p className="text-muted-foreground text-sm">
              7-day free trial on all paid plans. Cancel anytime.
            </p>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-card/50">
        <div className="container mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Card className="bg-gradient-to-r from-purple-500 to-violet-600 border-0 overflow-hidden">
              <CardContent className="p-8 md:p-12 text-center text-white">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Turn Plans Into Action?</h2>
                <p className="text-white/80 max-w-2xl mx-auto mb-8">
                  Join thousands of users who are achieving their goals with JournalMate. Start for free today.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/login">
                    <Button size="lg" variant="secondary" className="gap-2" data-testid="button-cta-start">
                      Start Free Trial
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Link href="/discover">
                    <Button size="lg" variant="outline" className="gap-2 border-white/30 text-white hover:bg-white/10" data-testid="button-cta-explore">
                      Explore Plans
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Latest Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-100 to-cyan-100 dark:from-emerald-900/30 dark:to-cyan-900/30 mb-6">
              <Star className="w-5 h-5 text-emerald-500" />
              <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                Latest Updates - November 2025
              </span>
            </div>
            
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Smart Content Integration & Creative Planning</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Copy any content from social media or AI apps and JournalMate instantly transforms it into actionable plans.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Copy from Social & AI Apps */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0 }}
            >
              <Card className="h-full hover-elevate border-2 border-pink-200 dark:border-pink-900">
                <CardContent className="p-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
                      <Instagram className="w-6 h-6 text-pink-500" />
                    </div>
                    <h3 className="text-2xl font-bold">Copy & Paste Anywhere</h3>
                  </div>
                  <p className="text-muted-foreground mb-6">
                    Share content from Instagram, TikTok, LinkedIn, ChatGPT, Claude, or any AI platform. JournalMate extracts the essence and creates your plan.
                  </p>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-pink-500" />
                      <span>Social media posts</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-pink-500" />
                      <span>AI chatbot outputs</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-pink-500" />
                      <span>Document excerpts</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-pink-500" />
                      <span>Web content</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Creative Planning with Budget */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              <Card className="h-full hover-elevate border-2 border-emerald-200 dark:border-emerald-900">
                <CardContent className="p-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                      <Lightbulb className="w-6 h-6 text-emerald-500" />
                    </div>
                    <h3 className="text-2xl font-bold">Creative Plans</h3>
                  </div>
                  <p className="text-muted-foreground mb-6">
                    AI recommends similar venues, activities, and experiences with researched pricing, budget breakdowns, and clarifying questions.
                  </p>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>Similar alternatives recommended</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>Specific pricing researched</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>Budget breakdowns included</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>Clarifying questions asked</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-center mt-12"
          >
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Example: Share a travel photo from Marrakech → AI generates creative plans with both mentioned venues (Royal Mansour, Comptoir Darna) and similar alternatives with current pricing, tiered budgets, and tailored questions about your preferences.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Mobile Apps Section */}
      <section className="py-20 bg-card/50">
        <div className="container mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-100 to-violet-100 dark:from-purple-900/30 dark:to-violet-900/30 mb-6">
              <Smartphone className="w-5 h-5 text-purple-500" />
              <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                Mobile App Exclusive
              </span>
            </div>
            
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Experience JournalMate on iOS & Android</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-4">
              Powerful mobile features designed to keep you productive on the go.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {[
              {
                icon: LayoutGrid,
                title: "Home Screen Widget",
                description: "Pin your ongoing tasks to your home screen for instant access and progress tracking",
                color: "text-emerald-500",
                bgColor: "bg-emerald-100 dark:bg-emerald-900/30"
              },
              {
                icon: Bell,
                title: "Smart Weather-Aware Updates",
                description: "Real-time adjustments to your ongoing plans and tasks based on weather conditions",
                color: "text-blue-500",
                bgColor: "bg-blue-100 dark:bg-blue-900/30"
              },
              {
                icon: Calendar,
                title: "Calendar Sync",
                description: "Automatically sync your tasks with your device calendar for seamless scheduling",
                color: "text-violet-500",
                bgColor: "bg-violet-100 dark:bg-violet-900/30"
              },
              {
                icon: Target,
                title: "Completion Reviews",
                description: "Get detailed insights and improvement suggestions based on your task completion patterns",
                color: "text-orange-500",
                bgColor: "bg-orange-100 dark:bg-orange-900/30"
              },
              {
                icon: Trophy,
                title: "Share Achievements",
                description: "Unlock badges and share your accomplishments with friends to celebrate wins",
                color: "text-pink-500",
                bgColor: "bg-pink-100 dark:bg-pink-900/30"
              },
              {
                icon: Award,
                title: "Group Badges",
                description: "Earn team and task completion badges when working together with your group",
                color: "text-rose-500",
                bgColor: "bg-rose-100 dark:bg-rose-900/30"
              }
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full hover-elevate" data-testid={`mobile-feature-card-${index}`}>
                  <CardContent className="p-6">
                    <div className={`w-12 h-12 rounded-xl ${feature.bgColor} flex items-center justify-center mb-4`}>
                      <feature.icon className={`w-6 h-6 ${feature.color}`} />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground text-sm">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
              Download now and get instant access to all mobile-exclusive features
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <div className="flex items-center gap-2 bg-gray-200 dark:bg-gray-800 text-foreground px-6 py-4 rounded-xl opacity-60">
                <SiApple className="w-8 h-8" />
                <div className="text-left">
                  <div className="text-xs">Available on the</div>
                  <div className="text-xl font-semibold -mt-1">App Store</div>
                </div>
              </div>
              <a 
                href="https://play.google.com/store/apps/details?id=ai.journalmate.app" 
                target="_blank" 
                rel="noopener noreferrer"
                data-testid="link-play-store-bottom"
              >
                <div className="flex items-center gap-2 bg-black text-white px-6 py-4 rounded-xl hover:bg-gray-800 transition-colors">
                  <SiGoogleplay className="w-7 h-7" />
                  <div className="text-left">
                    <div className="text-xs">Download on</div>
                    <div className="text-xl font-semibold -mt-1">Google Play</div>
                  </div>
                </div>
              </a>
            </div>
            
            <div className="mt-4 text-sm text-muted-foreground">
              <p>iOS App Store coming soon • Android app ready now</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <img src="/icons/web/android-chrome-192x192.png" alt="JournalMate.ai logo - discover and share activity plans" className="w-8 h-8 rounded-lg" loading="lazy" data-testid="img-logo-footer" />
              <span className="font-bold text-xl">JournalMate</span>
            </div>
            
            <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
              <Link href="/updates">
                <span className="hover:text-foreground cursor-pointer" data-testid="footer-link-updates">Updates</span>
              </Link>
              <Link href="/discover">
                <span className="hover:text-foreground cursor-pointer" data-testid="footer-link-discover">Community</span>
              </Link>
              <a href="/terms#privacy-policy" className="hover:text-foreground" data-testid="footer-link-privacy">Privacy</a>
              <a href="/terms#terms-of-service" className="hover:text-foreground" data-testid="footer-link-terms">Terms</a>
              <a href="/support" className="hover:text-foreground" data-testid="footer-link-support">Support</a>
            </div>
            
            <div className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} JournalMate. All rights reserved.
            </div>
          </div>
        </div>
      </footer>

      {/* Extracting Overlay Modal */}
      <AnimatePresence>
        {showExtractingOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4"
            data-testid="extracting-overlay"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", duration: 0.5 }}
            >
              <Card className="w-full max-w-md relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={closeOverlay}
                  data-testid="button-close-overlay"
                >
                  <X className="w-4 h-4" />
                </Button>

                <CardContent className="pt-8 pb-6 px-6">
                  {extractionPhase === 'extracting' && (
                    <div className="text-center space-y-6">
                      <div className="relative w-20 h-20 mx-auto">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          className="absolute inset-0"
                        >
                          <div className="w-full h-full rounded-full border-4 border-purple-200 dark:border-purple-900 border-t-purple-500" />
                        </motion.div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Sparkles className="w-8 h-8 text-purple-500" />
                        </div>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold mb-2">Extracting & Planning...</h3>
                        <p className="text-muted-foreground text-sm">
                          Analyzing your content to create an action plan
                        </p>
                      </div>
                    </div>
                  )}

                  {extractionPhase === 'detected' && detectedPlatform && (
                    <div className="text-center space-y-6">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", duration: 0.5 }}
                        className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-purple-100 to-violet-100 dark:from-purple-900/30 dark:to-violet-900/30 flex items-center justify-center"
                      >
                        {detectedPlatform.icon ? (
                          <detectedPlatform.icon className={`w-10 h-10 ${detectedPlatform.color}`} />
                        ) : (
                          <LinkIcon className={`w-10 h-10 ${detectedPlatform.color}`} />
                        )}
                      </motion.div>
                      <div>
                        <motion.h3
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                          className="text-xl font-bold mb-2"
                        >
                          {detectedPlatform.platform} content detected!
                        </motion.h3>
                        <motion.p
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                          className="text-muted-foreground text-sm mb-6"
                        >
                          Sign in to generate your personalized action plan from this content
                        </motion.p>
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.4 }}
                        >
                          <Button
                            size="lg"
                            onClick={handleSignInToProcess}
                            className="gap-2 bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white w-full"
                            data-testid="button-signin-to-process"
                          >
                            <Sparkles className="w-4 h-4" />
                            Sign In to Create Action Plan
                          </Button>
                        </motion.div>
                      </div>
                    </div>
                  )}

                  {extractionPhase === 'error' && (
                    <div className="text-center space-y-6">
                      <div className="w-20 h-20 mx-auto rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                        <X className="w-10 h-10 text-red-500" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold mb-2">Invalid URL</h3>
                        <p className="text-muted-foreground text-sm mb-6">
                          Please paste a valid Instagram, TikTok, YouTube, Twitter/X, Facebook, or Reddit URL
                        </p>
                        <Button
                          variant="outline"
                          onClick={closeOverlay}
                          className="gap-2"
                          data-testid="button-try-again"
                        >
                          Try Again
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
