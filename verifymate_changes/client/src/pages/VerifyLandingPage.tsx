import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Shield,
  ShieldCheck,
  ShieldX,
  ShieldAlert,
  Search,
  ArrowRight,
  CheckCircle2,
  Brain,
  Globe,
  Zap,
  Star,
  Download,
  Bot,
  TrendingUp,
  Building2,
  Scale,
  Sparkles,
  Link as LinkIcon,
  X,
  Crown,
  Gift,
  Infinity as InfinityIcon,
  AlertTriangle,
  Eye,
  Share2,
  Users,
  Award,
  Smartphone,
} from "lucide-react";
import { SiApple, SiGoogleplay, SiInstagram, SiTiktok, SiYoutube } from "react-icons/si";
import { motion, AnimatePresence } from "framer-motion";
import ThemeToggle from "@/components/ThemeToggle";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const features = [
  {
    icon: ShieldCheck,
    title: "Fact-Check Any Post",
    description:
      "Verify claims from social media posts against reliable sources using AI-powered web grounding.",
    color: "text-emerald-500",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
  },
  {
    icon: Bot,
    title: "AI Content Detection",
    description:
      "Detect AI-generated text, images, and deepfake videos using SynthID and pattern analysis.",
    color: "text-purple-500",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
  },
  {
    icon: Building2,
    title: "Business Verification",
    description:
      "Verify promoted businesses against BBB, Trustpilot, and WHOIS records to avoid scams.",
    color: "text-blue-500",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
  },
  {
    icon: Scale,
    title: "Bias Analysis",
    description:
      "Understand political bias, sensationalism, and emotional manipulation in content.",
    color: "text-orange-500",
    bgColor: "bg-orange-100 dark:bg-orange-900/30",
  },
  {
    icon: Eye,
    title: "Bot Detection",
    description:
      "Identify suspicious accounts and bot behavior patterns to filter out fake engagement.",
    color: "text-pink-500",
    bgColor: "bg-pink-100 dark:bg-pink-900/30",
  },
  {
    icon: Share2,
    title: "Share Results",
    description:
      "Share verification results with friends and family to help them make informed decisions.",
    color: "text-cyan-500",
    bgColor: "bg-cyan-100 dark:bg-cyan-900/30",
  },
];

const stats = [
  { value: "50K+", label: "Verifications" },
  { value: "95%", label: "Accuracy Rate" },
  { value: "< 30s", label: "Analysis Time" },
  { value: "4.9", label: "App Rating" },
];

const supportedPlatforms = [
  { name: "Instagram", icon: SiInstagram, color: "text-pink-500" },
  { name: "TikTok", icon: SiTiktok, color: "text-foreground" },
  { name: "YouTube", icon: SiYoutube, color: "text-red-500" },
  { name: "X (Twitter)", icon: X, color: "text-foreground" },
  { name: "Facebook", icon: Users, color: "text-blue-600" },
  { name: "News Sites", icon: Globe, color: "text-green-500" },
];

const pricingPlans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for casual fact-checking",
    features: [
      "5 verifications per month",
      "Basic fact-checking",
      "AI content detection",
      "Share results",
    ],
    cta: "Get Started",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$9.99",
    period: "per month",
    description: "For power users who verify often",
    features: [
      "Unlimited verifications",
      "Advanced business verification",
      "Priority processing",
      "Detailed bias analysis",
      "Bot detection",
      "API access",
      "Creator verification badge",
    ],
    cta: "Start Free Trial",
    highlighted: true,
  },
];

// Validate URL format
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export default function VerifyLandingPage() {
  const [, navigate] = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [urlInput, setUrlInput] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [showDemo, setShowDemo] = useState(false);

  // Handle URL from query params (share sheet)
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const sharedUrl = searchParams.get('url');
    const sharedText = searchParams.get('text');

    if (sharedUrl || sharedText) {
      // User shared content - redirect to verify page (will handle auth there)
      if (isAuthenticated) {
        navigate(`/verify?${searchParams.toString()}`);
      } else {
        // Store in session and redirect to login
        sessionStorage.setItem('pendingVerification', JSON.stringify({ url: sharedUrl, text: sharedText }));
        navigate('/verify/login');
      }
    }
  }, [isAuthenticated, navigate]);

  const handleVerifyClick = () => {
    if (!urlInput.trim()) {
      toast({
        title: "Enter a URL",
        description: "Paste a social media post URL to verify",
        variant: "destructive",
      });
      return;
    }

    if (!isValidUrl(urlInput)) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid URL",
        variant: "destructive",
      });
      return;
    }

    if (isAuthenticated) {
      navigate(`/verify?url=${encodeURIComponent(urlInput)}`);
    } else {
      sessionStorage.setItem('pendingVerification', JSON.stringify({ url: urlInput }));
      navigate('/verify/login');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <SEO
        title="VerifyMate - Verify Before You Trust"
        description="AI-powered fact-checking for social media. Verify posts, detect AI content, and expose scams before you share or believe."
        path="/"
      />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-lg bg-white/80 dark:bg-slate-900/80 border-b border-slate-200/50 dark:border-slate-700/50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Shield className="w-8 h-8 text-sky-500" />
            <span className="text-xl font-bold text-slate-800 dark:text-white">VerifyMate</span>
          </Link>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            {!authLoading && (
              isAuthenticated ? (
                <Button onClick={() => navigate('/verify')}>
                  Open App
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              ) : (
                <Button onClick={() => navigate('/verify/login')}>
                  Sign In
                </Button>
              )
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <Badge className="mb-4 bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300 hover:bg-sky-100">
              <Sparkles className="w-3 h-3 mr-1" />
              AI-Powered Fact Checking
            </Badge>

            <h1 className="text-4xl md:text-6xl font-bold text-slate-900 dark:text-white mb-4">
              Verify Before You{" "}
              <span className="bg-gradient-to-r from-sky-500 to-emerald-500 bg-clip-text text-transparent">
                Trust
              </span>
            </h1>

            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto mb-8">
              Don't get fooled by misinformation. VerifyMate uses AI to fact-check social media posts,
              detect AI-generated content, and verify businesses in seconds.
            </p>

            {/* Quick Verify Input */}
            <div className="max-w-xl mx-auto">
              <div className="flex gap-2 p-2 rounded-2xl bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700">
                <Input
                  placeholder="Paste a URL to verify..."
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleVerifyClick()}
                  className="flex-1 border-0 bg-transparent focus-visible:ring-0 text-lg"
                />
                <Button
                  size="lg"
                  onClick={handleVerifyClick}
                  disabled={isVerifying}
                  className="bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-600 hover:to-emerald-600"
                >
                  {isVerifying ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Search className="w-5 h-5 mr-2" />
                      Verify
                    </>
                  )}
                </Button>
              </div>

              {/* Supported Platforms */}
              <div className="flex items-center justify-center gap-4 mt-4 text-sm text-slate-500 dark:text-slate-400">
                <span>Works with:</span>
                <div className="flex items-center gap-3">
                  {supportedPlatforms.slice(0, 4).map((platform) => (
                    <div key={platform.name} className="flex items-center gap-1">
                      <platform.icon className={`w-4 h-4 ${platform.color}`} />
                    </div>
                  ))}
                  <span>& more</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Demo Result Preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="max-w-3xl mx-auto"
          >
            <Card className="border-2 border-sky-200 dark:border-sky-800 overflow-hidden shadow-2xl">
              <div className="bg-gradient-to-r from-sky-500/10 to-emerald-500/10 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                      <ShieldCheck className="w-8 h-8 text-emerald-500" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-emerald-500">Mostly True</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Largely accurate with minor issues</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-bold text-emerald-500">78</div>
                    <p className="text-xs text-slate-500">Trust Score</p>
                  </div>
                </div>
              </div>

              <CardContent className="p-6">
                <p className="text-slate-700 dark:text-slate-300 mb-4">
                  "This post contains 3 verifiable claims. 2 were confirmed accurate, 1 contains minor exaggeration about the timeline."
                </p>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800">
                    <div className="text-lg font-bold text-sky-500">3</div>
                    <p className="text-xs text-slate-500">Claims Found</p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800">
                    <div className="text-lg font-bold text-emerald-500">2</div>
                    <p className="text-xs text-slate-500">Verified</p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800">
                    <div className="text-lg font-bold text-amber-500">1</div>
                    <p className="text-xs text-slate-500">Exaggerated</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 px-4 bg-slate-900 dark:bg-slate-950">
        <div className="container mx-auto max-w-4xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className="text-3xl md:text-4xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-slate-400 text-sm">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Everything You Need to Verify Content
            </h2>
            <p className="text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
              Comprehensive verification tools powered by Google Gemini AI with real-time web grounding.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow border-slate-200 dark:border-slate-700">
                  <CardContent className="p-6">
                    <div className={`w-12 h-12 rounded-xl ${feature.bgColor} flex items-center justify-center mb-4`}>
                      <feature.icon className={`w-6 h-6 ${feature.color}`} />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 text-sm">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 bg-slate-100 dark:bg-slate-900/50">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              How It Works
            </h2>
            <p className="text-slate-600 dark:text-slate-300">
              Verify any content in three simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Share or Paste",
                description: "Share a post directly from any app or paste a URL",
                icon: LinkIcon,
              },
              {
                step: "2",
                title: "AI Analysis",
                description: "Our AI extracts claims and verifies against web sources",
                icon: Brain,
              },
              {
                step: "3",
                title: "Get Results",
                description: "Receive a detailed trust score and verdict breakdown",
                icon: ShieldCheck,
              },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.2 }}
                className="text-center"
              >
                <div className="relative inline-block mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500 to-emerald-500 flex items-center justify-center">
                    <item.icon className="w-8 h-8 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center text-sm font-bold">
                    {item.step}
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  {item.title}
                </h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm">
                  {item.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-slate-600 dark:text-slate-300">
              Start free, upgrade when you need more
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={`h-full ${plan.highlighted ? 'border-2 border-sky-500 shadow-xl' : 'border-slate-200 dark:border-slate-700'}`}>
                  {plan.highlighted && (
                    <div className="bg-gradient-to-r from-sky-500 to-emerald-500 text-white text-center py-2 text-sm font-medium">
                      Most Popular
                    </div>
                  )}
                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                      {plan.name}
                    </h3>
                    <div className="mb-4">
                      <span className="text-4xl font-bold text-slate-900 dark:text-white">{plan.price}</span>
                      <span className="text-slate-500 dark:text-slate-400 ml-2">/{plan.period}</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 mb-6">
                      {plan.description}
                    </p>
                    <ul className="space-y-3 mb-6">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Button
                      className={`w-full ${plan.highlighted ? 'bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-600 hover:to-emerald-600' : ''}`}
                      variant={plan.highlighted ? 'default' : 'outline'}
                      onClick={() => navigate('/verify/login')}
                    >
                      {plan.cta}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Mobile Apps Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-sky-500 to-emerald-500">
        <div className="container mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            <Smartphone className="w-16 h-16 text-white mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Download the App
            </h2>
            <p className="text-white/90 mb-8 max-w-xl mx-auto">
              Verify content on the go. Share directly from any app to instantly fact-check posts, videos, and claims.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" variant="secondary" className="gap-2">
                <SiApple className="w-5 h-5" />
                App Store
              </Button>
              <Button size="lg" variant="secondary" className="gap-2">
                <SiGoogleplay className="w-5 h-5" />
                Google Play
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-2xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            <Shield className="w-16 h-16 text-sky-500 mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Ready to Verify?
            </h2>
            <p className="text-slate-600 dark:text-slate-300 mb-8">
              Join thousands who trust VerifyMate to separate fact from fiction.
            </p>
            <Button
              size="lg"
              onClick={() => navigate('/verify/login')}
              className="bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-600 hover:to-emerald-600"
            >
              Get Started Free
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-slate-200 dark:border-slate-800">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-sky-500" />
              <span className="font-semibold text-slate-800 dark:text-white">VerifyMate</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-slate-600 dark:text-slate-400">
              <Link href="/privacy" className="hover:text-slate-900 dark:hover:text-white">Privacy</Link>
              <Link href="/terms" className="hover:text-slate-900 dark:hover:text-white">Terms</Link>
              <Link href="/support" className="hover:text-slate-900 dark:hover:text-white">Support</Link>
            </div>
            <div className="text-sm text-slate-500">
              © 2024 VerifyMate. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
