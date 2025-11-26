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
  BookMarked
} from "lucide-react";
import { SiApple, SiGoogleplay } from "react-icons/si";
import { motion } from "framer-motion";
import ThemeToggle from "@/components/ThemeToggle";
import logoImg from "@assets/image_1764121826058.png";

const features = [
  {
    icon: Brain,
    title: "AI-Powered Planning",
    description: "Import plans from ChatGPT, Claude, or any AI. Our smart parser extracts actionable tasks automatically.",
    color: "text-purple-500",
    bgColor: "bg-purple-100 dark:bg-purple-900/30"
  },
  {
    icon: Target,
    title: "Activate Your Plans",
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
    icon: Users,
    title: "Track as a Group",
    description: "Create groups with friends and family. Share goals, track progress together, and celebrate wins.",
    color: "text-pink-500",
    bgColor: "bg-pink-100 dark:bg-pink-900/30"
  },
  {
    icon: Share2,
    title: "Share with Friends",
    description: "Share your plans on social media, invite friends to join, and discover community plans.",
    color: "text-orange-500",
    bgColor: "bg-orange-100 dark:bg-orange-900/30"
  },
  {
    icon: Globe,
    title: "Community Plans",
    description: "Browse trending plans from the community. Remix multiple plans into your perfect routine.",
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
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={logoImg} alt="JournalMate" className="w-8 h-8 rounded-lg" />
            <span className="font-bold text-xl">JournalMate</span>
          </div>
          <div className="flex items-center gap-3">
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
            <ThemeToggle />
            <Link href="/login">
              <Button size="sm" data-testid="button-login-landing">
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
              Import plans from ChatGPT, Claude, or social media. Track progress with friends. 
              Celebrate achievements together.
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
              { step: "1", title: "Import Your Plan", description: "Paste from ChatGPT, Claude, or share from social media. Our AI extracts tasks automatically." },
              { step: "2", title: "Track Progress", description: "Check off tasks, view your dashboard, and stay motivated with streaks and achievements." },
              { step: "3", title: "Celebrate Together", description: "Share wins with friends, earn badges, and discover what's working for others." }
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

      {/* Advanced Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Powerful Features for Every Goal</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Advanced tools to import, share, monetize, and automate your planning journey.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* AI Planning Agent */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0 }}
            >
              <Card className="h-full hover-elevate">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4">
                    <Cpu className="w-6 h-6 text-purple-500" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Dedicated AI Planning Agent</h3>
                  <p className="text-muted-foreground mb-4">
                    Leverage Claude, ChatGPT, or DeepSeek to generate intelligent, context-aware plans tailored to your goals.
                  </p>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      Multi-AI support
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      Intelligent task extraction
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Share & Commercialize */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              <Card className="h-full hover-elevate">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
                    <TrendingUp className="w-6 h-6 text-emerald-500" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Share & Commercialize</h3>
                  <p className="text-muted-foreground mb-4">
                    Share your plans with the community and unlock monetization opportunities through premium plans.
                  </p>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      Community sharing
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      Revenue generation
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Social Media Import */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <Card className="h-full hover-elevate">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center mb-4">
                    <Instagram className="w-6 h-6 text-pink-500" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Copy Plans from Social Media</h3>
                  <p className="text-muted-foreground mb-4">
                    Import plans directly from Instagram, TikTok, and other platforms with OCR and video transcription.
                  </p>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      Multi-platform support
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      OCR & video transcription
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Auto-Journal */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
            >
              <Card className="h-full hover-elevate">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
                    <BookMarked className="w-6 h-6 text-blue-500" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Auto-Journal Your Progress</h3>
                  <p className="text-muted-foreground mb-4">
                    Automatically create journal entries as you complete goals, capturing your journey and insights.
                  </p>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      Automated logging
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      Personal insights
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
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
              Download our native app for iOS and Android with home screen widgets, push notifications, and offline support.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href="https://apps.apple.com/app/journalmate" 
                target="_blank" 
                rel="noopener noreferrer"
                data-testid="link-app-store-bottom"
              >
                <div className="flex items-center gap-2 bg-black text-white px-6 py-4 rounded-xl hover:bg-gray-800 transition-colors">
                  <SiApple className="w-8 h-8" />
                  <div className="text-left">
                    <div className="text-xs">Download on the</div>
                    <div className="text-xl font-semibold -mt-1">App Store</div>
                  </div>
                </div>
              </a>
              <a 
                href="https://play.google.com/store/apps/details?id=ai.journalmate.app" 
                target="_blank" 
                rel="noopener noreferrer"
                data-testid="link-play-store-bottom"
              >
                <div className="flex items-center gap-2 bg-black text-white px-6 py-4 rounded-xl hover:bg-gray-800 transition-colors">
                  <SiGoogleplay className="w-7 h-7" />
                  <div className="text-left">
                    <div className="text-xs">GET IT ON</div>
                    <div className="text-xl font-semibold -mt-1">Google Play</div>
                  </div>
                </div>
              </a>
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
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
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
