import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Puzzle
} from "lucide-react";
import { SiApple, SiGoogleplay } from "react-icons/si";
import { motion } from "framer-motion";
import ThemeToggle from "@/components/ThemeToggle";

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
  }
];

const stats = [
  { value: "10K+", label: "Active Users" },
  { value: "50K+", label: "Plans Created" },
  { value: "1M+", label: "Tasks Completed" },
  { value: "4.8", label: "App Rating" }
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <img src="/icons/web/android-chrome-192x192.png" alt="JournalMate" className="w-8 h-8 rounded-lg flex-shrink-0" />
            <span className="font-bold text-lg sm:text-xl truncate">JournalMate</span>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Link href="/updates">
              <Button variant="ghost" size="sm" data-testid="link-updates">
                Updates
              </Button>
            </Link>
            <Link href="/discover">
              <Button variant="ghost" size="sm" data-testid="link-discover">
                Discover
              </Button>
            </Link>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <ThemeToggle />
            <Link href="/login" className="hidden sm:block">
              <Button size="sm" data-testid="button-login-landing">
                Sign In
              </Button>
            </Link>
            <Link href="/login" className="sm:hidden">
              <Button size="sm" variant="default" data-testid="button-login-landing-mobile">
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
            <Badge className="mb-6 bg-gradient-to-r from-purple-500 to-violet-600 text-white px-4 py-1">
              <Zap className="w-3 h-3 mr-1" />
              AI-Powered Planning
            </Badge>
            
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-purple-600 via-violet-600 to-emerald-500 bg-clip-text text-transparent">
              Turn Your AI Plans Into Action
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Create plans with our AI agent, or import from ChatGPT, Claude, and social media. 
              JournalMate devises and tracks your plan to help you achieve your goals.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
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
              { step: "1", title: "Create or Import", description: "Use our AI agent for Quick/Smart Plan, or paste from ChatGPT, Claude, Perplexity, and social media." },
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

          {/* Import & Extension Section */}
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
                  <h4 className="font-semibold mb-2">Import from Social Media</h4>
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

      {/* Mobile Apps Section */}
      <section className="py-20 bg-card/50">
        <div className="container mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-100 to-violet-100 dark:from-purple-900/30 dark:to-violet-900/30 mb-6">
              <Smartphone className="w-5 h-5 text-purple-500" />
              <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                Available on Mobile
              </span>
            </div>
            
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Take JournalMate Everywhere</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
              Download our Android app with home screen widgets, push notifications, biometric auth, and offline support. iOS coming soon.
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

            <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Home Screen Widgets
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Push Notifications
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Biometric Auth
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Voice-to-Text
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Calendar Sync
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <img src="/icons/web/android-chrome-192x192.png" alt="JournalMate" className="w-8 h-8 rounded-lg" />
              <span className="font-bold text-xl">JournalMate</span>
            </div>
            
            <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
              <Link href="/updates">
                <span className="hover:text-foreground cursor-pointer" data-testid="footer-link-updates">Updates</span>
              </Link>
              <Link href="/discover">
                <span className="hover:text-foreground cursor-pointer" data-testid="footer-link-discover">Community</span>
              </Link>
              <a href="#" className="hover:text-foreground">Privacy</a>
              <a href="#" className="hover:text-foreground">Terms</a>
              <a href="mailto:support@journalmate.ai" className="hover:text-foreground">Support</a>
            </div>
            
            <div className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} JournalMate. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
