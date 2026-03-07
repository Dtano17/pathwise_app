import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Sparkles,
  Bot,
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
  ChevronDown,
  Crown,
  Gift,
  Infinity as InfinityIcon,
  Bell,
  Calendar,
  LayoutGrid,
  Award,
  Trophy,
  Shield,
  Trash2,
  Heart,
  Leaf,
  LogIn,
} from "lucide-react";
import { SiApple, SiGoogleplay, SiTiktok, SiYoutube } from "react-icons/si";
import { motion, AnimatePresence } from "framer-motion";
import ThemeToggle from "@/components/ThemeToggle";
import { SEO, PAGE_SEO } from "@/components/SEO";
import { useTheme, PresetTheme } from "@/components/ThemeProvider";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// Photorealistic Images for Hero
import photoYoga from "../assets/photorealistic_yoga.png";
import photoJournaling from "../assets/photorealistic_journaling.png";
import photoCelebrating from "../assets/photorealistic_celebrating.png";

const allHeroVideos = [
  {
    src: "https://storage.googleapis.com/pathwise-media/public/hero_video.mp4",
    srcDesktop: "https://storage.googleapis.com/pathwise-media/public/hero_video.mp4",
    srcMobile: "https://storage.googleapis.com/pathwise-media/public/hero_video.mp4",
    caption: "The ultimate planning copilot. Turn inspiration into action."
  }
];

const heroRotatingCaptions = [
  "See a trip on Instagram? Share it with the app, adapt it, and make it yours.",
  "Plan a date night — let them know exactly what to expect, how to dress, and when to arrive.",
  "Your data never leaves your device. Plan privately, or share securely with personal info redacted.",
  "Create plans for the community. When others use them, you earn rewards.",
  "Discover trending plans and emergency-ready guides near you.",
  "Already planning elsewhere? Import your plans and let the app hold you accountable.",
  "Plan as a group, track each other's progress, and celebrate every win together.",
  "Turn any social media post or AI conversation into a trackable, shareable plan.",
];

const presetData: Record<string, { verb: string; noun: string; image: string[]; video?: { src?: string; srcDesktop?: string; srcMobile?: string; caption: string }[]; fonts: { heading: string; drama: string; data: string } }> = {
  "golden-hour": {
    verb: "Celebrate your",
    noun: "Moments.",
    image: [photoCelebrating, photoJournaling, photoYoga, photoCelebrating],
    video: allHeroVideos,
    fonts: {
      heading: "font-['Plus_Jakarta_Sans']",
      drama: "font-['Fraunces'] italic",
      data: "font-['DM_Mono']"
    }
  },
  "neon-pulse": {
    verb: "Activate your",
    noun: "Energy.",
    image: [photoYoga, photoCelebrating, photoJournaling, photoYoga],
    video: allHeroVideos,
    fonts: {
      heading: "font-['Space_Grotesk']",
      drama: "font-['Instrument_Serif'] italic",
      data: "font-['JetBrains_Mono']"
    }
  },
  "soft-focus": {
    verb: "Reflect on",
    noun: "Growth.",
    image: [photoJournaling, photoYoga, photoCelebrating, photoJournaling],
    video: allHeroVideos,
    fonts: {
      heading: "font-['Outfit']",
      drama: "font-['Lora'] italic",
      data: "font-['IBM_Plex_Mono']"
    }
  },
  "terra": {
    verb: "Ground your",
    noun: "Ambition.",
    image: [photoYoga, photoCelebrating, photoJournaling, photoYoga],
    video: allHeroVideos,
    fonts: {
      heading: "font-['Nunito_Sans']",
      drama: "font-['Cormorant_Garamond'] italic",
      data: "font-['Fira_Code']"
    }
  },
  "default": {
    verb: "Plan your",
    noun: "Tomorrow.",
    image: [photoJournaling, photoCelebrating, photoYoga, photoJournaling],
    video: allHeroVideos,
    fonts: {
      heading: "font-sans",
      drama: "font-serif italic",
      data: "font-mono"
    }
  }
};

const features = [
  {
    icon: Target,
    title: "Plan with anything you find online",
    description:
      "Come across a trip to Marrakech on Instagram? A workout routine on TikTok? Share it with JournalMate and we turn it into a personalized plan you can adapt, track, and complete — solo or with your group.",
    color: "text-emerald-500",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
  },
  {
    icon: Users,
    title: "Built-in accountability engine",
    description:
      "No more plans that collect dust. The app keeps you on track with smart follow-ups, progress tracking, and gentle nudges on your deliverables — so your plans actually meet reality, not just your notes app.",
    color: "text-blue-500",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
  },
  {
    icon: Share2,
    title: "Collaborate and plan as a group",
    description:
      "Create group plans, invite friends or family, assign tasks, and track each other's progress in real time. Planning a date? Let them know exactly what to expect. Coordinating a trip? Keep everyone synced and accountable.",
    color: "text-amber-500",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
  },
  {
    icon: BookMarked,
    title: "Every experience, auto-journaled",
    description:
      "As you complete plans and hit milestones, JournalMate automatically journals every event into a timeline. Share your journal securely for fun, or keep it completely private — your call.",
    color: "text-orange-500",
    bgColor: "bg-orange-100 dark:bg-orange-900/30",
  },
  {
    icon: Compass,
    title: "Discover plans, earn rewards",
    description:
      "Browse trending plans near you, find local experiences, or discover emergency and life-saving guides from the community. Create your own plans for others to adopt — and earn rewards every time they do.",
    color: "text-pink-500",
    bgColor: "bg-pink-100 dark:bg-pink-900/30",
  },
  {
    icon: Shield,
    title: "Data privacy is our #1 priority",
    description:
      "Your plans and data stay on your device. No ads. No data selling. Ever. When you choose to share, we auto-redact personal information so others can use your plan safely. Request data deletion anytime — it's gone instantly.",
    color: "text-violet-500",
    bgColor: "bg-violet-100 dark:bg-violet-900/30",
  }
];

const stats = [
  { value: "10K+", label: "Active Users" },
  { value: "50K+", label: "Plans Created" },
  { value: "1M+", label: "Tasks Completed" },
  { value: "4.8", label: "App Rating" },
];

// Detect platform from URL
function detectPlatform(
  url: string,
): { platform: string; icon: any; color: string } | null {
  const urlLower = url.toLowerCase();
  if (urlLower.includes("instagram.com") || urlLower.includes("instagr.am")) {
    return { platform: "Instagram", icon: Instagram, color: "text-pink-500" };
  }
  if (urlLower.includes("tiktok.com") || urlLower.includes("vm.tiktok.com")) {
    return {
      platform: "TikTok",
      icon: SiTiktok,
      color: "text-black dark:text-white",
    };
  }
  if (urlLower.includes("youtube.com") || urlLower.includes("youtu.be")) {
    return { platform: "YouTube", icon: SiYoutube, color: "text-red-500" };
  }
  if (urlLower.includes("twitter.com") || urlLower.includes("x.com")) {
    return { platform: "X/Twitter", icon: null, color: "text-foreground" };
  }
  if (urlLower.includes("facebook.com") || urlLower.includes("fb.com")) {
    return { platform: "Facebook", icon: null, color: "text-blue-600" };
  }
  if (urlLower.includes("reddit.com")) {
    return { platform: "Reddit", icon: null, color: "text-orange-500" };
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
  const { preset } = useTheme();
  const currentPresetData = presetData[preset] || presetData["default"];

  const heroRef = useRef<HTMLDivElement>(null);
  const textRefs = useRef<(HTMLElement | null)[]>([]);
  const imageRef = useRef<HTMLDivElement>(null); // This ref is now less critical for background, but kept for potential other animations
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0); // Combined index for images/videos
  const [captionIndex, setCaptionIndex] = useState(0);

  // Video retry state — handles the production startup window where disk cache isn't ready yet
  const [videoRetryCount, setVideoRetryCount] = useState(0);
  const [videoForcedFallback, setVideoForcedFallback] = useState(false);
  const videoRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleVideoError = useCallback(() => {
    setVideoRetryCount((prev) => {
      if (prev >= 3) {
        setVideoForcedFallback(true);
        return prev;
      }
      // Schedule a remount in 10 seconds — the server's disk cache should be ready by then
      if (videoRetryTimerRef.current) clearTimeout(videoRetryTimerRef.current);
      videoRetryTimerRef.current = setTimeout(() => {
        setVideoRetryCount((c) => c + 1);
      }, 10000);
      return prev;
    });
  }, []);

  useEffect(() => {
    return () => {
      if (videoRetryTimerRef.current) clearTimeout(videoRetryTimerRef.current);
    };
  }, []);

  // Rotate hero captions every 6 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCaptionIndex((prev) => (prev + 1) % heroRotatingCaptions.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  // Reset media index when preset changes
  useEffect(() => {
    if (currentPresetData.video && currentPresetData.video.length > 0) {
      setCurrentMediaIndex(Math.floor(Math.random() * currentPresetData.video.length));
    } else {
      setCurrentMediaIndex(0);
    }
  }, [preset, currentPresetData.video]);

  // Handle video ending to transition to a random next video
  const handleVideoEnded = () => {
    if (currentPresetData.video && currentPresetData.video.length > 0) {
      setCurrentMediaIndex((prev) => {
        const length = currentPresetData.video!.length;
        if (length <= 1) return 0;
        let nextIndex = prev;
        while (nextIndex === prev) {
          nextIndex = Math.floor(Math.random() * length);
        }
        return nextIndex;
      });
    }
  };

  // Media Rotation for presets with multiple images/videos
  useEffect(() => {
    // We only want a time-based interval if we are showing images.
    // Videos will turn over automatically via the onEnded event.
    if (currentPresetData.video && currentPresetData.video.length > 0) {
      return;
    }

    const mediaArray = currentPresetData.image;
    if (!mediaArray || mediaArray.length <= 1) return;

    // Rotate every 15 seconds for images
    const interval = setInterval(() => {
      setCurrentMediaIndex((prev) => (prev + 1) % mediaArray.length);
    }, 15000);

    return () => clearInterval(interval);
  }, [currentPresetData.video, currentPresetData.image]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Text stagger animation
      const validTextRefs = textRefs.current.filter(Boolean);
      if (validTextRefs.length > 0) {
        gsap.from(validTextRefs, {
          y: 40,
          opacity: 0,
          duration: 0.8,
          stagger: 0.1,
          ease: "elastic.out(1, 0.75)"
        });
      }

      // Image float animation (if imageRef is still used for foreground elements)
      if (imageRef.current) {
        gsap.from(imageRef.current, {
          opacity: 0,
          x: 40,
          duration: 1,
          ease: "power2.out"
        });
        gsap.fromTo(imageRef.current,
          { y: 0 },
          { y: -12, duration: 3.5, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 1 }
        );
      }
    }, heroRef);
    return () => ctx.revert();
  }, [preset]);

  // Auto theme switcher removed to allow hero videos to properly cycle every 15s without interruption.
  // The user can still change themes manually via the ThemeToggle in the navbar.


  const [importUrl, setImportUrl] = useState("");
  const [showExtractingOverlay, setShowExtractingOverlay] = useState(false);
  const [extractionPhase, setExtractionPhase] = useState<
    "extracting" | "detected" | "error"
  >("extracting");
  const [detectedPlatform, setDetectedPlatform] = useState<{
    platform: string;
    icon: any;
    color: string;
  } | null>(null);

  const handleImportSubmit = () => {
    if (!importUrl.trim()) {
      navigate("/login");
      return;
    }

    // Validate URL
    if (!isValidUrl(importUrl)) {
      setExtractionPhase("error");
      setShowExtractingOverlay(true);
      return;
    }

    // Detect platform
    const platform = detectPlatform(importUrl);
    if (!platform) {
      setExtractionPhase("error");
      setShowExtractingOverlay(true);
      return;
    }

    setDetectedPlatform(platform);
    setExtractionPhase("extracting");
    setShowExtractingOverlay(true);

    // Simulate extraction animation, then show detected state
    setTimeout(() => {
      setExtractionPhase("detected");
    }, 2000);
  };

  const handleSignInToProcess = () => {
    // Save URL to localStorage for post-login processing
    localStorage.setItem("journalmate.pendingImportUrl", importUrl);
    localStorage.setItem(
      "journalmate.pendingImportTimestamp",
      Date.now().toString(),
    );

    // Redirect to login
    navigate("/login");
  };

  const closeOverlay = () => {
    setShowExtractingOverlay(false);
    setExtractionPhase("extracting");
    setDetectedPlatform(null);
  };

  return (
    <div className="h-screen w-full overflow-y-auto overflow-x-hidden bg-background text-foreground touch-pan-y scroll-smooth">
      <SEO {...PAGE_SEO.home} />
      {/* Header - Adaptive (Native Mobile vs Web Pill) */}
      <header className="fixed top-0 sm:top-6 left-0 sm:left-1/2 sm:-translate-x-1/2 z-50 w-full sm:w-[95%] sm:max-w-4xl bg-background sm:bg-background/80 sm:backdrop-blur-md sm:rounded-full shadow-sm sm:shadow-lg border-b sm:border border-border/10 sm:border-border/50 transition-all duration-300 pt-[env(safe-area-inset-top)] sm:pt-0">
        <div className="flex flex-col sm:flex-row items-center justify-between w-full h-full">

          {/* Top Row / Desktop Content */}
          <div className="px-4 py-3 sm:px-6 sm:py-3 flex items-center justify-between w-full sm:h-16 relative">

            {/* Logo container */}
            <div className="flex items-center min-w-0 gap-2 z-10">
              <img src="/icons/web/android-chrome-192x192.png" alt="JournalMate Icon" className="h-7 w-7 sm:h-8 sm:w-8 object-contain shrink-0" />
              <span className="font-bold text-[19px] sm:text-xl tracking-tight cursor-pointer hover:opacity-80 transition-opacity whitespace-nowrap text-foreground flex items-center pt-0.5">
                JournalMate
              </span>
            </div>

            {/* Desktop Center Nav (Hidden on Mobile) */}
            <div className="hidden sm:flex items-center gap-1 absolute left-1/2 -translate-x-1/2 w-max">
              <Link href="/discover">
                <Button variant="ghost" size="sm" className="rounded-full hover:bg-muted font-medium text-sm px-4" data-testid="link-discover">
                  Discover
                </Button>
              </Link>
              <Link href="/import-plan">
                <Button variant="ghost" size="sm" className="rounded-full hover:bg-muted font-medium text-sm px-4" data-testid="link-import">
                  Import
                </Button>
              </Link>
              <Link href="/updates">
                <Button variant="ghost" size="sm" className="rounded-full hover:bg-muted font-medium text-sm px-4" data-testid="link-updates">
                  Updates
                </Button>
              </Link>
            </div>

            {/* Auth/Theme Menu */}
            <div className="flex items-center gap-3 sm:gap-2 z-10">
              <ThemeToggle />
              <Link href="/login" className="flex items-center">
                {/* Mobile Button - Outline slightly rounded */}
                <Button size="sm" variant="outline" className="sm:hidden rounded-lg bg-transparent hover:bg-muted font-semibold px-4 h-8 text-[13px] border-border/50 text-foreground" data-testid="button-login-landing-mobile">
                  Sign In
                </Button>
                {/* Desktop Button - Solid pill */}
                <Button size="sm" className="hidden sm:flex rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 h-9 text-sm shadow-sm hover:shadow-md transition-shadow" data-testid="button-login-landing-desktop">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>

          {/* Mobile Bottom Row (Links) - Displayed below top-row */}
          <div className="sm:hidden w-full">
            {/* Inset elegant divider */}
            <div className="mx-6 h-px bg-border/30"></div>
            {/* Centered action buttons */}
            <div className="flex items-center justify-center py-3 gap-2.5">
              <Link href="/discover">
                <Button variant="outline" size="sm" className="h-8 px-3.5 rounded-full bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800/50 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/40 font-medium text-[13px] shadow-sm flex items-center transition-colors" data-testid="link-discover-mobile">
                  <Compass className="h-3.5 w-3.5 mr-1.5" />
                  Discover
                </Button>
              </Link>
              <Link href="/import-plan">
                <Button variant="outline" size="sm" className="h-8 px-3.5 rounded-full bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-800/50 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/40 font-medium text-[13px] shadow-sm flex items-center transition-colors" data-testid="link-import-mobile">
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                  Import
                </Button>
              </Link>
              <Link href="/updates">
                <Button variant="outline" size="sm" className="h-8 px-3.5 rounded-full bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800/50 text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/40 font-medium text-[13px] shadow-sm flex items-center transition-colors" data-testid="link-updates-mobile">
                  <Megaphone className="h-3.5 w-3.5 mr-1.5" />
                  Updates
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-[100dvh] flex flex-col justify-center items-center overflow-hidden">
        {/* Ambient Full-Screen Background */}
        <div className="absolute inset-0 z-0 bg-black">
          <AnimatePresence mode="wait">
            {(!currentPresetData.video || currentPresetData.video.length === 0) && (
              <motion.img
                key={`img-${currentMediaIndex}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1 }}
                src={currentPresetData.image[currentMediaIndex % currentPresetData.image.length]}
                alt="Ambient Background"
                className="absolute inset-0 w-full h-full object-cover object-center z-10"
              />
            )}
            {currentPresetData.video && currentPresetData.video.length > 0 && !videoForcedFallback && (() => {
              const currentVideo = currentPresetData.video[currentMediaIndex % currentPresetData.video.length];
              const isDesktopSource = !!currentVideo.srcDesktop;

              return (
                <>
                  <motion.video
                    key={`video-desktop-${preset}-${currentMediaIndex}-r${videoRetryCount}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1 }}
                    autoPlay
                    muted
                    playsInline
                    poster="/hero_poster.jpg"
                    loop={currentPresetData.video.length === 1}
                    onEnded={currentPresetData.video.length > 1 ? handleVideoEnded : undefined}
                    onError={handleVideoError}
                    className={`absolute inset-0 w-full h-full object-cover object-center z-10 ${isDesktopSource ? 'hidden md:block' : ''}`}
                  >
                    <source src={isDesktopSource ? currentVideo.srcDesktop : currentVideo.src} type="video/mp4" />
                  </motion.video>
                  {isDesktopSource && (
                    <>
                      {/* Mobile blurred backdrop — fills black letterbox areas */}
                      <video
                        key={`video-mobile-blur-${preset}-${currentMediaIndex}-r${videoRetryCount}`}
                        autoPlay
                        muted
                        playsInline
                        loop={currentPresetData.video.length === 1}
                        onError={handleVideoError}
                        className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-90 z-10 block md:hidden"
                      >
                        <source src={currentVideo.srcMobile} type="video/mp4" />
                      </video>
                      {/* Mobile main video — contained so full frame is visible */}
                      <motion.video
                        key={`video-mobile-${preset}-${currentMediaIndex}-r${videoRetryCount}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1 }}
                        autoPlay
                        muted
                        playsInline
                        poster="/hero_poster.jpg"
                        loop={currentPresetData.video.length === 1}
                        onEnded={currentPresetData.video.length > 1 ? handleVideoEnded : undefined}
                        onError={handleVideoError}
                        className="absolute inset-0 w-full h-full object-contain object-center z-[11] block md:hidden"
                      >
                        <source src={currentVideo.srcMobile} type="video/mp4" />
                      </motion.video>
                    </>
                  )}
                </>
              );
            })()}
          </AnimatePresence>

          {/* Dark Overlay for Text Readability */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-20" />
          {/* Bottom fade to content area */}
          <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-background to-transparent z-20" />
        </div>

        <div className="container mx-auto px-4 relative z-10 flex flex-col items-center justify-center text-center pt-32 sm:pt-24 pb-8 sm:pb-16 mt-0 sm:mt-12">
          <div className="flex flex-col items-center gap-1 sm:gap-2 mb-4 sm:mb-6 max-w-4xl w-full">
            <h1
              ref={el => { textRefs.current[0] = el; }}
              className="text-4xl sm:text-7xl md:text-[6rem] lg:text-[7.5rem] font-bold tracking-tight text-white leading-[1.05] drop-shadow-md"
            >
              {currentPresetData.verb}
            </h1>
            <span
              ref={el => { textRefs.current[1] = el; }}
              className="text-[3.5rem] sm:text-7xl md:text-[6.5rem] lg:text-[7.5rem] font-drama italic text-primary leading-[1] ml-[-0.02em]"
              style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.3))" }}
            >
              {currentPresetData.noun}
            </span>
          </div>

          <p
            ref={el => { textRefs.current[2] = el; }}
            className="text-base md:text-xl text-white/90 mb-6 sm:mb-8 max-w-2xl font-medium leading-relaxed px-2 lg:px-0 drop-shadow-md"
          >
            The planning and accountability engine for the social media age. See something you love online? Turn it into a real plan in seconds. Go solo or rally your crew — our built-in accountability engine keeps everyone on track while auto-journaling every win along the way. This is where plans meet reality.
          </p>

          <div
            ref={el => { textRefs.current[3] = el; }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto px-4 lg:px-0 mb-6 sm:mb-8"
          >
            <Link href="/login">
              <Button
                size="lg"
                className="rounded-full hover-squish bg-primary hover:bg-primary/90 text-primary-foreground shadow-diffuse-primary h-14 px-10 text-lg font-semibold w-full sm:w-auto relative overflow-hidden group border-0"
              >
                <span className="relative z-10">Start for Free</span>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,theme(colors.white)_0%,transparent_100%)] opacity-0 group-hover:opacity-20 transition-opacity duration-500 scale-150" />
              </Button>
            </Link>
          </div>

          {/* URL to Plan Input */}
          <div
            ref={el => { textRefs.current[4] = el; }}
            className="w-full max-w-2xl lg:max-w-3xl relative group px-2 lg:px-0 mt-1 sm:mt-2 mb-6 sm:mb-8"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary via-accent to-primary rounded-full blur opacity-40 group-hover:opacity-70 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative flex items-center bg-black/40 backdrop-blur-md rounded-full border border-white/20 shadow-xl p-1.5 focus-within:ring-2 focus-within:ring-primary/50 transition-all focus-within:bg-black/60">
              <div className="pl-3 sm:pl-4 pr-1 sm:pr-2 text-primary">
                <LinkIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              {/* Mobile input */}
              <input
                type="url"
                placeholder="Paste any idea from social media..."
                className="flex-1 bg-transparent border-none focus:outline-none text-xs placeholder:text-white/50 w-full text-white min-w-0 sm:hidden"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleImportSubmit()}
              />
              {/* Desktop input */}
              <input
                type="url"
                placeholder="Paste or copy any idea from social media or the web and start planning..."
                className="flex-1 bg-transparent border-none focus:outline-none text-sm placeholder:text-white/50 w-full text-white min-w-0 hidden sm:block"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleImportSubmit()}
              />
              <Button
                size="sm"
                className="rounded-full bg-white text-black hover:bg-white/90 font-semibold px-4 sm:px-5 h-9 sm:h-10 ml-1 transition-transform hover:scale-105 border-0 shadow-lg shrink-0 text-xs sm:text-sm"
                onClick={handleImportSubmit}
              >
                Create Plan
              </Button>
            </div>
          </div>

          <div
            ref={el => { textRefs.current[5] = el; }}
            className="flex items-center gap-3 bg-black/30 rounded-full py-1.5 px-5 backdrop-blur-md border border-white/10 shadow-lg"
          >
            <div className="flex -space-x-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-[#1a1a1a] overflow-hidden bg-muted">
                  <img src={`https://i.pravatar.cc/100?img=${i + 15}`} alt="User star" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
            <span className="text-sm font-medium text-white/90 whitespace-nowrap">
              Trusted by <span className="text-white font-bold">10K+ planners</span>
            </span>
          </div>

          {/* Rotating Hero Captions */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`caption-${captionIndex}`}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.8 }}
              className="mt-6 sm:mt-8 px-4 sm:px-6 py-2 bg-black/20 backdrop-blur-sm rounded-full border border-white/5 shadow-diffuse-primary max-w-2xl"
            >
              <p className="text-xs sm:text-base text-white/80 font-medium italic tracking-wide max-w-[280px] sm:max-w-full mx-auto line-clamp-2 sm:line-clamp-none">
                "{heroRotatingCaptions[captionIndex]}"
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Privacy Trust Bar */}
          <div className="mt-6 sm:mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-5 px-4">
            {[
              { icon: Shield, text: "Your data stays on your device" },
              { icon: Shield, text: "No ads, ever" },
              { icon: Trash2, text: "Request deletion anytime — it's gone" },
              { icon: Shield, text: "We never sell your data" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-1.5 text-white/70 text-[11px] sm:text-xs font-medium">
                <item.icon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white/50 shrink-0" />
                <span>{item.text}</span>
              </div>
            ))}
          </div>

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
                <div className="text-3xl md:text-4xl font-bold text-primary mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Domains / Categories Section */}
      <section className="py-24 bg-background overflow-hidden relative">
        <div className="container mx-auto px-4 mb-12 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col md:flex-row md:items-end justify-between gap-6"
          >
            <div className="max-w-2xl">
              <h2 className={`text-3xl md:text-5xl font-bold mb-4 italic text-primary tracking-tight ${currentPresetData.fonts.drama}`}>
                Plan every part of your life
              </h2>
              <p className="text-muted-foreground text-lg">
                Whether you're organizing a weekend getaway, a new fitness routine, or a romantic evening, we have the perfect canvas for your journey.
              </p>
            </div>
            <div className="hidden md:flex gap-2">
              <Link href="/discover"><Button variant="outline" className="rounded-full h-12 px-6 hover-squish border-border/50 shadow-sm">Explore all domains <ArrowRight className="w-4 h-4 ml-2" /></Button></Link>
            </div>
          </motion.div>
        </div>

        {/* Horizontal Card Scroll */}
        <div className="w-full relative z-10 flex gap-4 px-4 pb-8 overflow-x-auto snap-x snap-mandatory no-scrollbar md:container md:mx-auto">
          {[
            { tag: "Travel", title: "Weekend Escapes to Global Adventures", img: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80" },
            { tag: "Fitness", title: "Marathon Prep to Daily Movement", img: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80" },
            { tag: "Date Night", title: "Cozy Dinners to Grand Gestures", img: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80" },
            { tag: "Career", title: "Project Sprints to Skill Building", img: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=800&q=80" },
            { tag: "Wellness", title: "Morning Rituals to Deep Rest", img: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80" }
          ].map((domain, i) => (
            <motion.div
              key={domain.tag}
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="relative shrink-0 w-[85vw] sm:w-[320px] h-[340px] sm:h-[480px] rounded-[2rem] overflow-hidden snap-center group shadow-diffuse-primary border border-border/10 cursor-pointer hover:-translate-y-2 transition-transform duration-500"
              onClick={() => navigate('/discover')}
            >
              <img src={domain.img} alt={domain.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute inset-0 p-6 sm:p-8 flex flex-col justify-between text-white">
                <div className="self-start px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-xs font-semibold uppercase tracking-wider">
                  {domain.tag}
                </div>
                <div className="translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                  <h3 className="text-xl sm:text-2xl font-bold leading-tight mb-4 drop-shadow-md">{domain.title}</h3>
                  <Button size="sm" variant="ghost" className="rounded-full text-white bg-white/10 hover:bg-white/20 hover:text-white backdrop-blur-md border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    See templates <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
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
            <h2 className="text-3xl md:text-5xl font-bold mb-4 font-drama italic text-primary tracking-tight">
              Everything you need to plan, do, and share
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              We built JournalMate to be your smart AI-powered planning, journaling, and accountability companion for the social media age.
              Here's how we help you turn your feed into your future.
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
                <Card
                  className="h-full hover-elevate"
                  data-testid={`feature-card-${index}`}
                >
                  <CardContent className="p-6">
                    <div
                      className={`w-12 h-12 rounded-xl ${feature.bgColor} flex items-center justify-center mb-4`}
                    >
                      <feature.icon className={`w-6 h-6 ${feature.color}`} />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Consolidated Journey & Community Section */}
      <section className="py-24 border-b border-border/50 relative overflow-hidden bg-background">
        <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }}></div>

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className={`text-3xl md:text-5xl lg:text-6xl font-bold mb-6 italic text-primary tracking-tight ${currentPresetData.fonts.drama}`}>
              Your Journey, Shared.
            </h2>
            <p className={`text-muted-foreground max-w-2xl mx-auto text-lg md:text-xl leading-relaxed ${currentPresetData.fonts.data}`}>
              Stop dreaming, start doing. Turn any idea — from social media, AI tools, or your own imagination — into a plan you actually follow through on. Go solo or build a crew that holds each other to every deliverable.
            </p>
          </motion.div>

          <div className="flex flex-col lg:flex-row gap-12 items-center max-w-7xl mx-auto">
            {/* Dynamic Large Image Left Side */}
            <div className="w-full lg:w-1/2 relative lg:pr-8">
              <div className="relative w-full aspect-[3/4] sm:aspect-square lg:aspect-[4/5] rounded-[2rem] sm:rounded-[3rem] overflow-hidden shadow-2xl group border border-border/20">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={`journey-img-${currentMediaIndex}`}
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.8 }}
                    src={currentPresetData.image[(currentMediaIndex) % currentPresetData.image.length]}
                    alt="Friends planning together"
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
                  />
                </AnimatePresence>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none z-10"></div>

                <div className="absolute bottom-5 left-5 right-5 sm:bottom-8 sm:left-8 sm:right-8 z-20">
                  <div className="bg-white/20 backdrop-blur-md rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/30 text-white shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                    <p className="text-base sm:text-lg font-medium drop-shadow-sm">"Morning wellness check-in complete! We finally booked the trip!" 🎉</p>
                    <div className="flex items-center gap-3 mt-4">
                      <div className="flex -space-x-2">
                        <img src="https://i.pravatar.cc/100?img=1" className="w-8 h-8 rounded-full border-2 border-white/50" />
                        <img src="https://i.pravatar.cc/100?img=5" className="w-8 h-8 rounded-full border-2 border-white/50" />
                        <img src="https://i.pravatar.cc/100?img=9" className="w-8 h-8 rounded-full border-2 border-white/50" />
                      </div>
                      <span className="text-sm font-semibold opacity-90 drop-shadow-sm">Sara & 2 others cheering</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Steps Right Side */}
            <div className="w-full lg:w-1/2 flex flex-col gap-8">
              {[
                {
                  step: "1",
                  icon: Lightbulb,
                  title: "Spark it from anywhere",
                  description: "See a post on TikTok, a recipe on Instagram, or a travel idea on the web? Paste the link or describe your goal — the app takes it from there.",
                  color: "text-purple-500",
                  bgColor: "bg-purple-100 dark:bg-purple-900/40",
                },
                {
                  step: "2",
                  icon: Bot,
                  title: "AI builds your plan",
                  description: "Our AI agent turns your inspiration into a structured plan with tasks, timelines, and real-time updates for weather, traffic, and local conditions.",
                  color: "text-emerald-500",
                  bgColor: "bg-emerald-100 dark:bg-emerald-900/40",
                },
                {
                  step: "3",
                  icon: Users,
                  title: "Plan with your circle",
                  description: "Invite friends or family, assign roles, and stay perfectly synced. Plan a date and let them know exactly what to expect — or coordinate a group trip with full visibility.",
                  color: "text-amber-500",
                  bgColor: "bg-amber-100 dark:bg-amber-900/40",
                },
                {
                  step: "4",
                  icon: Target,
                  title: "Watch your plan meet reality",
                  description: "The accountability engine holds you and your group to every deliverable — tracking progress, sending follow-ups, and auto-journaling every completed milestone into a timeline you can share or keep private.",
                  color: "text-rose-500",
                  bgColor: "bg-rose-100 dark:bg-rose-900/40",
                }
              ].map((item, index) => (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.15 }}
                  className="flex gap-6 group cursor-pointer"
                >
                  <div className="shrink-0 relative">
                    <div className={`w-14 h-14 rounded-2xl ${item.bgColor} flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                      <item.icon className={`w-6 h-6 ${item.color}`} />
                    </div>
                    {/* Connecting line */}
                    {index !== 3 && (
                      <div className="absolute top-14 bottom-[-2rem] left-1/2 w-0.5 -translate-x-1/2 bg-border group-hover:bg-primary/50 transition-colors"></div>
                    )}
                  </div>
                  <div>
                    <div className={`text-sm font-bold ${item.color} mb-1`}>
                      Step {item.step}
                    </div>
                    <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">{item.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{item.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="text-center mt-16"
          >
            <p className="text-muted-foreground max-w-2xl mx-auto mb-6">
              Share plans with permanent links that never expire. Personal information is auto-redacted so others can safely adopt your plan, join your group, and track progress in real-time.
            </p>
            <Link href="/login">
              <Button
                size="lg"
                className="gap-2 rounded-full"
                data-testid="button-start-group"
              >
                <Users className="w-5 h-5" />
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
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Your Dedicated AI Planning Agent
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Choose between Quick Plan for fast results or Smart Plan for
              comprehensive analysis.
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
                    Get faster results with our dedicated AI agent methodology
                    that adapts to your unique situation and goals.
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
                    Get comprehensive, sophisticated plans with our dedicated AI
                    agent methodology for complex goals.
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
            <h3 className="text-2xl font-bold mb-6">
              Two Ways to Create Your Plan
            </h3>
            <div className="grid md:grid-cols-3 gap-6">
              {/* Use AI Agent */}
              <Card className="hover-elevate border-2 border-blue-200 dark:border-blue-900">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-4">
                    <Cpu className="w-6 h-6 text-blue-500" />
                  </div>
                  <h4 className="font-semibold mb-2">Use Our AI Agent</h4>
                  <p className="text-sm text-muted-foreground">
                    Quick Plan or Smart Plan - let our dedicated AI agent create
                    your personalized plan
                  </p>
                </CardContent>
              </Card>

              {/* Paste from AI Platforms */}
              <Card className="hover-elevate">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mx-auto mb-4">
                    <Brain className="w-6 h-6 text-purple-500" />
                  </div>
                  <h4 className="font-semibold mb-2">
                    Paste from AI Platforms
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Copy from ChatGPT, Claude, Perplexity, Gemini, or other AI
                    tools
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
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Have a Feature Request?
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
                  We'd love to hear your ideas for making JournalMate even
                  better.
                </p>
                <a href="mailto:support@journalmate.ai">
                  <Button
                    size="lg"
                    className="gap-2 bg-gradient-to-r from-purple-500 to-violet-600 text-white"
                    data-testid="button-share-feedback"
                  >
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

            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Choose Your Plan
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-4">
              Social media imports let you analyze, plan, and track progress
              with any post or inspiration online.
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
              <Card
                className="h-full hover-elevate"
                data-testid="pricing-card-free"
              >
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
                        <strong>+2 bonus</strong> every time you publish to
                        Discovery!
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
                      <span>
                        Create compelling plans, share to community, and earn
                        rewards when used
                      </span>
                    </div>

                    <div className="flex items-start gap-2 text-muted-foreground">
                      <X className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <span className="line-through">
                        No group planning with friends
                      </span>
                    </div>
                  </div>

                  <div className="mt-6">
                    <Link href="/login">
                      <Button
                        variant="outline"
                        className="w-full"
                        data-testid="button-pricing-free"
                      >
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
              <Card
                className="h-full hover-elevate border-2 border-blue-200 dark:border-blue-900"
                data-testid="pricing-card-pro-monthly"
              >
                <CardContent className="p-6">
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold mb-1">Pro Monthly</h3>
                    <p className="text-muted-foreground text-sm">
                      For active planners
                    </p>
                    <div className="mt-4">
                      <span className="text-4xl font-bold">$6.99</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-2">
                      <Upload className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                      <span className="font-medium">
                        10 social media imports/month
                      </span>
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
                      <Button
                        className="w-full bg-blue-500 hover:bg-blue-600"
                        data-testid="button-pricing-pro-monthly"
                      >
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
              <Card
                className="h-full hover-elevate border-2 border-purple-200 dark:border-purple-900 relative"
                data-testid="pricing-card-pro-yearly"
              >
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
                      <span className="text-purple-700 dark:text-purple-300">
                        Unlimited social media imports
                      </span>
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
                      <Button
                        className="w-full bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700"
                        data-testid="button-pricing-pro-yearly"
                      >
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
              <Card
                className="h-full hover-elevate border-2 border-pink-200 dark:border-pink-900 relative"
                data-testid="pricing-card-family"
              >
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-pink-500 to-rose-600 text-white px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap">
                  Best Value for Groups
                </div>
                <CardContent className="p-6">
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold mb-1">Family & Friends</h3>
                    <p className="text-muted-foreground text-sm">
                      Plan, track & share together
                    </p>
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
                      <span className="text-pink-700 dark:text-pink-300">
                        Unlimited social media imports
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Users className="w-4 h-4 text-pink-500 flex-shrink-0 mt-0.5" />
                      <span>Plan, track & share for 5+ family & friends</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Zap className="w-4 h-4 text-pink-500 flex-shrink-0 mt-0.5" />
                      <span>
                        Real-time group feeds (cancellations, weather, traffic)
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Compass className="w-4 h-4 text-pink-500 flex-shrink-0 mt-0.5" />
                      <span>
                        Discover & remix inspiration from others' plans
                      </span>
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
                      <Button
                        className="w-full bg-pink-500 hover:bg-pink-600"
                        data-testid="button-pricing-family"
                      >
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
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Ready to Turn Plans Into Action?
                </h2>
                <p className="text-white/80 max-w-2xl mx-auto mb-8">
                  Join thousands of users who are achieving their goals with
                  JournalMate. Start for free today.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/login">
                    <Button
                      size="lg"
                      variant="secondary"
                      className="gap-2"
                      data-testid="button-cta-start"
                    >
                      Start Free Trial
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Link href="/discover">
                    <Button
                      size="lg"
                      variant="outline"
                      className="gap-2 border-white/30 text-white hover:bg-white/10"
                      data-testid="button-cta-explore"
                    >
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

            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Smart Content Integration & Creative Planning
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Copy any content from social media or AI apps and JournalMate
              instantly transforms it into actionable plans.
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
                    <h3 className="text-2xl font-bold">
                      Copy & Paste Anywhere
                    </h3>
                  </div>
                  <p className="text-muted-foreground mb-6">
                    Share content from Instagram, TikTok, LinkedIn, ChatGPT,
                    Claude, or any AI platform. JournalMate extracts the essence
                    and creates your plan.
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
                    AI recommends similar venues, activities, and experiences
                    with researched pricing, budget breakdowns, and clarifying
                    questions.
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
              Example: Share a travel photo from Marrakech → AI generates
              creative plans with both mentioned venues (Royal Mansour, Comptoir
              Darna) and similar alternatives with current pricing, tiered
              budgets, and tailored questions about your preferences.
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

            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Experience JournalMate on iOS & Android
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-4">
              Powerful mobile features designed to keep you productive on the
              go.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {[
              {
                icon: LayoutGrid,
                title: "Home Screen Widget",
                description:
                  "Pin your ongoing tasks to your home screen for instant access and progress tracking",
                color: "text-emerald-500",
                bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
              },
              {
                icon: Bell,
                title: "Smart Weather-Aware Updates",
                description:
                  "Real-time adjustments to your ongoing plans and tasks based on weather conditions",
                color: "text-blue-500",
                bgColor: "bg-blue-100 dark:bg-blue-900/30",
              },
              {
                icon: Calendar,
                title: "Calendar Sync",
                description:
                  "Automatically sync your tasks with your device calendar for seamless scheduling",
                color: "text-violet-500",
                bgColor: "bg-violet-100 dark:bg-violet-900/30",
              },
              {
                icon: Target,
                title: "Completion Reviews",
                description:
                  "Get detailed insights and improvement suggestions based on your task completion patterns",
                color: "text-orange-500",
                bgColor: "bg-orange-100 dark:bg-orange-900/30",
              },
              {
                icon: Trophy,
                title: "Share Achievements",
                description:
                  "Unlock badges and share your accomplishments with friends to celebrate wins",
                color: "text-pink-500",
                bgColor: "bg-pink-100 dark:bg-pink-900/30",
              },
              {
                icon: Award,
                title: "Group Badges",
                description:
                  "Earn team and task completion badges when working together with your group",
                color: "text-rose-500",
                bgColor: "bg-rose-100 dark:bg-rose-900/30",
              },
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card
                  className="h-full hover-elevate"
                  data-testid={`mobile-feature-card-${index}`}
                >
                  <CardContent className="p-6">
                    <div
                      className={`w-12 h-12 rounded-xl ${feature.bgColor} flex items-center justify-center mb-4`}
                    >
                      <feature.icon className={`w-6 h-6 ${feature.color}`} />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {feature.description}
                    </p>
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
              Download now and get instant access to all mobile-exclusive
              features
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
                    <div className="text-xl font-semibold -mt-1">
                      Google Play
                    </div>
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
              <img
                src="/icons/web/android-chrome-192x192.png"
                alt="JournalMate.ai logo - discover and share activity plans"
                className="w-8 h-8 rounded-lg"
                loading="lazy"
                data-testid="img-logo-footer"
              />
              <span className="font-bold text-xl">JournalMate</span>
            </div>

            <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
              <Link href="/updates">
                <span
                  className="hover:text-foreground cursor-pointer"
                  data-testid="footer-link-updates"
                >
                  Updates
                </span>
              </Link>
              <Link href="/discover">
                <span
                  className="hover:text-foreground cursor-pointer"
                  data-testid="footer-link-discover"
                >
                  Community
                </span>
              </Link>
              <Link href="/terms#privacy-policy">
                <span
                  className="hover:text-foreground cursor-pointer"
                  data-testid="footer-link-privacy"
                >
                  Privacy
                </span>
              </Link>
              <Link href="/terms#terms-of-service">
                <span
                  className="hover:text-foreground cursor-pointer"
                  data-testid="footer-link-terms"
                >
                  Terms
                </span>
              </Link>
              <Link href="/support">
                <span
                  className="hover:text-foreground cursor-pointer"
                  data-testid="footer-link-support"
                >
                  Support
                </span>
              </Link>
            </div>

            <div className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} JournalMate. All rights
              reserved.
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
                  {extractionPhase === "extracting" && (
                    <div className="text-center space-y-6">
                      <div className="relative w-20 h-20 mx-auto">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                          className="absolute inset-0"
                        >
                          <div className="w-full h-full rounded-full border-4 border-purple-200 dark:border-purple-900 border-t-purple-500" />
                        </motion.div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Sparkles className="w-8 h-8 text-purple-500" />
                        </div>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold mb-2">
                          Extracting & Planning...
                        </h3>
                        <p className="text-muted-foreground text-sm">
                          Analyzing your content to create an action plan
                        </p>
                      </div>
                    </div>
                  )}

                  {extractionPhase === "detected" && detectedPlatform && (
                    <div className="text-center space-y-6">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", duration: 0.5 }}
                        className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-purple-100 to-violet-100 dark:from-purple-900/30 dark:to-violet-900/30 flex items-center justify-center"
                      >
                        {detectedPlatform.icon ? (
                          <detectedPlatform.icon
                            className={`w-10 h-10 ${detectedPlatform.color}`}
                          />
                        ) : (
                          <LinkIcon
                            className={`w-10 h-10 ${detectedPlatform.color}`}
                          />
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
                          Sign in to generate your personalized action plan from
                          this content
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

                  {extractionPhase === "error" && (
                    <div className="text-center space-y-6">
                      <div className="w-20 h-20 mx-auto rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                        <X className="w-10 h-10 text-red-500" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold mb-2">Invalid URL</h3>
                        <p className="text-muted-foreground text-sm mb-6">
                          Please paste a valid Instagram, TikTok, YouTube,
                          Twitter/X, Facebook, or Reddit URL
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
