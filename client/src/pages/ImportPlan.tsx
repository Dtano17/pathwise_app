import { useState, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import {
  ArrowLeft,
  Sparkles,
  Check,
  X,
  Loader2,
  ClipboardPaste,
  Trash2,
  Plus,
  AlertCircle,
  ChevronRight,
  Edit2,
  GripVertical,
  BookOpen,
  FileText,
  Link2,
  Image,
  Video,
  LogIn,
  Megaphone,
  Compass,
  Upload,
  Wand2,
  Zap,
  Globe,
  ArrowRight,
  Smartphone,
} from 'lucide-react';
import { 
  SiInstagram, SiTiktok, SiYoutube, SiX, SiFacebook, SiReddit, 
  SiOpenai, SiAnthropic, SiGooglegemini, SiThreads
} from 'react-icons/si';
import { FaLinkedin } from 'react-icons/fa';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAIPlanImport, type ParsedTask } from '@/hooks/useAIPlanImport';
import { useAuth } from '@/hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import { SocialMediaShareDialog } from '@/components/SocialMediaShareDialog';
import { useMutation } from '@tanstack/react-query';
import { useAsyncJob } from '@/hooks/useAsyncJob';
import { apiRequest, queryClient } from '@/lib/queryClient';
import ThemeToggle from '@/components/ThemeToggle';

const heroVideoUrl = 'https://storage.googleapis.com/pathwise-media/public/hero_video.mp4';

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`backdrop-blur-2xl bg-white/10 border border-white/15 rounded-2xl shadow-xl ${className}`}>
      {children}
    </div>
  );
}

function SourcePill({ icon: Icon, label, color, iconColor, tooltip }: { icon: any; label: string; color: string; iconColor?: string; tooltip?: string }) {
  const pill = (
    <motion.div
      whileHover={{ scale: 1.05, y: -1 }}
      whileTap={{ scale: 0.97 }}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-white/10 text-white/90 ${tooltip ? 'cursor-help' : 'cursor-default'} transition-shadow hover:shadow-md border border-white/10 hover:border-white/30`}
    >
      <Icon 
        className="w-4 h-4" 
        style={iconColor?.startsWith('url') ? {} : { color: iconColor }} 
        {...(iconColor?.startsWith('url') ? { fill: iconColor } : {})}
      />
      <span>{label}</span>
    </motion.div>
  );

  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {pill}
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p className="text-xs">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return pill;
}

function LoadingState({ message }: { message?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col items-center justify-center py-16 px-6"
    >
      <div className="relative w-20 h-20 mb-6">
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 to-violet-600 animate-pulse" />
        <div className="absolute inset-2 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
          <Sparkles className="w-8 h-8 text-purple-300 animate-spin" style={{ animationDuration: '3s' }} />
        </div>
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">
        {message || 'Analyzing Your Content'}
      </h3>
      <p className="text-white/60 text-center max-w-xs">
        Extracting content, generating your personalized plan...
      </p>
    </motion.div>
  );
}

function EmptyState({ onPasteClick, isLoading }: { onPasteClick: () => void; isLoading?: boolean }) {
  const sourceCategories = [
    {
      title: 'Social Media',
      icon: Globe,
      sources: [
        { icon: SiInstagram, label: 'Instagram', color: '', iconColor: '#E1306C', tooltip: 'Paste URL like instagram.com/p/ABC123 or use share sheet' },
        { icon: SiTiktok, label: 'TikTok', color: '', iconColor: '#FFFFFF', tooltip: 'Paste video URL or share from TikTok app' },
        { icon: SiYoutube, label: 'YouTube', color: '', iconColor: '#FF0000', tooltip: 'Paste video URL - we\'ll transcribe it' },
        { icon: SiX, label: 'Twitter/X', color: '', iconColor: '#FFFFFF', tooltip: 'Paste tweet URL' },
        { icon: SiFacebook, label: 'Facebook', color: '', iconColor: '#1877F2', tooltip: 'Paste post URL' },
        { icon: FaLinkedin, label: 'LinkedIn', color: '', iconColor: '#0A66C2', tooltip: 'Paste post URL' },
        { icon: SiReddit, label: 'Reddit', color: '', iconColor: '#FF4500', tooltip: 'Paste thread or comment URL' },
        { icon: SiThreads, label: 'Threads', color: '', iconColor: '#FFFFFF', tooltip: 'Paste thread URL' },
      ]
    },
    {
      title: 'AI Chats',
      icon: Sparkles,
      sources: [
        { icon: SiOpenai, label: 'ChatGPT', color: '', iconColor: '#10A37F', tooltip: 'Copy conversation or paste share URL' },
        { icon: SiAnthropic, label: 'Claude', color: '', iconColor: '#D97757', tooltip: 'Copy conversation or paste share URL' },
        { icon: SiGooglegemini, label: 'Gemini', color: '', iconColor: '#8E24AA', tooltip: 'Copy conversation or paste share URL' },
      ]
    },
    {
      title: 'Files & Links',
      icon: FileText,
      sources: [
        { icon: Link2, label: 'Articles', color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400', tooltip: 'Paste article URL' },
        { icon: FileText, label: 'Docs', color: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400', tooltip: 'Upload Word, PDF, or text files' },
        { icon: Image, label: 'Images', color: 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400', tooltip: 'Upload images with text/plans' },
        { icon: FileText, label: 'PDFs', color: 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400', tooltip: 'Upload PDF documents' },
        { icon: Video, label: 'Videos', color: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400', tooltip: 'Upload or paste video URLs' },
      ]
    }
  ];

  const steps = [
    { icon: ClipboardPaste, title: 'Paste or Share', description: 'Copy a link or content from any app' },
    { icon: Wand2, title: 'AI Extracts', description: 'We pull out the key info automatically' },
    { icon: Zap, title: 'Get Your Plan', description: 'Actionable tasks added to your journal' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center"
    >
      <svg width="0" height="0" className="hidden">
        <defs>
          <linearGradient id="ig-grad" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#833ab4" />
            <stop offset="50%" stopColor="#fd1d1d" />
            <stop offset="100%" stopColor="#fcb045" />
          </linearGradient>
          <linearGradient id="gemini-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#4285F4" />
            <stop offset="50%" stopColor="#9B72CB" />
            <stop offset="100%" stopColor="#D96570" />
          </linearGradient>
        </defs>
      </svg>
      {/* Hero Section */}
      <div className="relative w-full overflow-hidden rounded-t-2xl">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-pink-400/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-cyan-400/15 via-transparent to-transparent" />
        {/* Floating orbs */}
        <motion.div
          animate={{ y: [0, -15, 0], x: [0, 8, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-8 right-12 w-32 h-32 bg-white/10 rounded-full blur-2xl"
        />
        <motion.div
          animate={{ y: [0, 12, 0], x: [0, -6, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="absolute bottom-4 left-8 w-24 h-24 bg-pink-300/15 rounded-full blur-2xl"
        />
        <motion.div
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-violet-300/10 rounded-full blur-3xl"
        />

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />

        <div className="relative z-10 px-6 pt-10 pb-8 sm:px-10 sm:pt-14 sm:pb-10 text-center">
          {/* Icon badge */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
            className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 mb-5 shadow-2xl"
          >
            <Upload className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-2xl sm:text-3xl font-extrabold text-white mb-3 tracking-tight drop-shadow-md"
          >
            Import Content to Plan
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-white/75 max-w-md mx-auto text-sm sm:text-base leading-relaxed"
          >
            Paste a link, share from any app, or copy your AI chat. We'll turn it into an actionable plan.
          </motion.p>

          {/* CTA Button in hero */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="mt-7"
          >
            <div className="relative inline-flex group">
              <div className="absolute -inset-1 bg-gradient-to-r from-pink-400 via-white/50 to-cyan-400 rounded-full blur opacity-30 group-hover:opacity-60 transition duration-700" />
              <Button
                onClick={onPasteClick}
                disabled={isLoading}
                size="lg"
                className="relative bg-white text-purple-700 hover:bg-white/95 hover:scale-[1.03] font-bold px-8 sm:px-10 rounded-full shadow-xl transition-all duration-200 text-base"
                data-testid="button-paste-plan"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <ClipboardPaste className="w-5 h-5 mr-2" />
                    Paste from Clipboard
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </div>

        {/* How It Works Steps — inside the gradient */}
        <div className="relative z-10 px-5 sm:px-8 pb-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/15 p-5 shadow-lg">
            <div className="grid grid-cols-3 gap-3 sm:gap-6">
              {steps.map((step, i) => (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  className="flex flex-col items-center text-center"
                >
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center mb-2 ${
                    i === 0 ? 'bg-violet-500/20' :
                    i === 1 ? 'bg-pink-500/20' :
                    'bg-emerald-500/20'
                  }`}>
                    <step.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${
                      i === 0 ? 'text-violet-300' :
                      i === 1 ? 'text-pink-300' :
                      'text-emerald-300'
                    }`} />
                  </div>
                  <h4 className="text-xs sm:text-sm font-semibold text-white">{step.title}</h4>
                  <p className="text-[10px] sm:text-xs text-white/50 mt-0.5 leading-snug">{step.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Supported Sources */}
      <TooltipProvider>
        <div className="w-full px-5 sm:px-8 mt-6 mb-2">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-4 text-center">
              Supported Sources
            </h3>

            <div className="space-y-5">
              {sourceCategories.map((cat, catIdx) => (
                <motion.div
                  key={cat.title}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 + catIdx * 0.1 }}
                >
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center">
                      <cat.icon className="w-3.5 h-3.5 text-white/60" />
                    </div>
                    <span className="text-xs font-semibold text-white/80">{cat.title}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {cat.sources.map((source) => (
                      <SourcePill key={source.label} icon={source.icon} label={source.label} color={source.color} iconColor={source.iconColor} tooltip={source.tooltip} />
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Import Guide */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1 }}
            className="mt-6"
          >
            <Accordion type="single" collapsible>
              <AccordionItem value="import-guide" className="border border-white/15 rounded-xl px-4 bg-white/5">
                <AccordionTrigger className="text-sm font-medium hover:no-underline py-3">
                  <div className="flex items-center gap-2 text-white/70">
                    <BookOpen className="w-4 h-4" />
                    <span>How to Import from ChatGPT, Claude, Gemini & Social Media</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <Tabs defaultValue="chatgpt" className="w-full">
                    <TabsList className="grid w-full grid-cols-4 h-9 bg-white/5 border border-white/10 rounded-lg">
                      <TabsTrigger value="chatgpt" className="text-xs font-bold">ChatGPT</TabsTrigger>
                      <TabsTrigger value="claude" className="text-xs font-bold">Claude</TabsTrigger>
                      <TabsTrigger value="gemini" className="text-xs font-bold">Gemini</TabsTrigger>
                      <TabsTrigger value="social" className="text-xs font-bold">Social</TabsTrigger>
                    </TabsList>

                    <TabsContent value="chatgpt" className="mt-4 space-y-3 text-sm">
                      <div>
                        <p className="font-semibold mb-2">Method 1: Copy & Paste</p>
                        <ol className="list-decimal list-inside space-y-1 text-xs text-white/60">
                          <li>Go to your ChatGPT conversation</li>
                          <li>Select all text (Ctrl+A / Cmd+A)</li>
                          <li>Copy (Ctrl+C / Cmd+C)</li>
                          <li>Click "Paste from Clipboard" above</li>
                        </ol>
                      </div>
                      <div>
                        <p className="font-semibold mb-2">Method 2: Share Link</p>
                        <ol className="list-decimal list-inside space-y-1 text-xs text-white/60">
                          <li>Click Share button in ChatGPT</li>
                          <li>Copy the share URL</li>
                          <li>Paste URL and click Parse</li>
                        </ol>
                        <code className="text-xs bg-white/10 px-2 py-1 rounded mt-2 block">
                          https://chat.openai.com/share/abc-123
                        </code>
                      </div>
                    </TabsContent>

                    <TabsContent value="claude" className="mt-4 space-y-3 text-sm">
                      <div>
                        <p className="font-semibold mb-2">Method 1: Copy & Paste</p>
                        <ol className="list-decimal list-inside space-y-1 text-xs text-white/60">
                          <li>Go to your Claude conversation</li>
                          <li>Select all text (Ctrl+A / Cmd+A)</li>
                          <li>Copy (Ctrl+C / Cmd+C)</li>
                          <li>Click "Paste from Clipboard" above</li>
                        </ol>
                      </div>
                      <div>
                        <p className="font-semibold mb-2">Method 2: Share Link</p>
                        <ol className="list-decimal list-inside space-y-1 text-xs text-white/60">
                          <li>Click Share in Claude</li>
                          <li>Copy the share URL</li>
                          <li>Paste URL and click Parse</li>
                        </ol>
                      </div>
                    </TabsContent>

                    <TabsContent value="gemini" className="mt-4 space-y-3 text-sm">
                      <div>
                        <p className="font-semibold mb-2">Copy & Paste from Gemini</p>
                        <ol className="list-decimal list-inside space-y-1 text-xs text-white/60">
                          <li>Create your plan in Gemini (with images if needed)</li>
                          <li>Copy the conversation text</li>
                          <li>Click "Paste from Clipboard" above</li>
                        </ol>
                      </div>
                    </TabsContent>

                    <TabsContent value="social" className="mt-4 space-y-3 text-sm">
                      <div>
                        <p className="font-semibold mb-2">Instagram / TikTok / YouTube</p>
                        <ol className="list-decimal list-inside space-y-1 text-xs text-white/60">
                          <li>Find the post/video you want to save</li>
                          <li>Tap Share &gt; Copy Link</li>
                          <li>Paste the URL and click Parse</li>
                          <li>We'll extract the recipe, workout, or tutorial</li>
                        </ol>
                      </div>
                      <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                        <p className="font-semibold text-xs text-white/80 mb-2">Example URLs:</p>
                        <div className="space-y-1 text-xs font-mono text-white/50">
                          <div>instagram.com/p/ABC123</div>
                          <div>tiktok.com/@user/video/123</div>
                          <div>youtube.com/watch?v=ABC123</div>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </motion.div>
        </div>
      </TooltipProvider>

      {/* Mobile hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="flex items-center gap-2 mt-5 mb-6 px-4 py-2.5 rounded-full bg-white/10 border border-white/15"
      >
        <Smartphone className="w-3.5 h-3.5 text-white/40" />
        <p className="text-xs text-white/50">
          On mobile, use the share button in any app to send content directly
        </p>
      </motion.div>
    </motion.div>
  );
}

function SignInPrompt({ planPreview, onSignIn }: { planPreview: any; onSignIn: (url?: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-8 px-6"
    >
      {planPreview && (
        <div className="w-full mb-6">
          <div className="bg-white/10 rounded-xl p-4 border border-white/15">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-semibold text-purple-300">Your Plan is Ready!</span>
            </div>

            <h3 className="text-lg font-bold text-white mb-2">
              {planPreview?.title || 'Generated Plan'}
            </h3>

            {planPreview?.description && (
              <p className="text-sm text-white/60 mb-3 line-clamp-2">
                {planPreview.description}
              </p>
            )}

            <div className="flex items-center gap-2 text-sm text-white/50">
              <Check className="w-4 h-4 text-emerald-500" />
              <span>{planPreview?.taskCount || 0} actionable tasks created</span>
            </div>
          </div>
        </div>
      )}

      <div className="text-center mb-6">
        <h4 className="text-xl font-bold text-white mb-2">
          {planPreview ? 'Sign in to save your plan' : 'Sign in to import plans'}
        </h4>
        <p className="text-sm text-white/60 max-w-xs">
          {planPreview 
            ? 'Create an account to track your progress, get reminders, and access your plans anywhere.'
            : 'Import plans from ChatGPT, Claude, Instagram, TikTok, and more. Track your progress and celebrate your wins.'}
        </p>
      </div>

      <Button
        onClick={() => onSignIn(planPreview?.sourceUrl)}
        className="bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white shadow-lg w-full max-w-xs"
        size="lg"
        data-testid="button-sign-in"
      >
        <LogIn className="w-5 h-5 mr-2" />
        Sign in to Continue
      </Button>
      
      <p className="text-xs text-white/40 mt-4">
        Free account. No credit card required.
      </p>
    </motion.div>
  );
}

function ErrorState({ 
  error, 
  onRetry, 
  upgradeRequired,
  onUpgrade 
}: { 
  error: string; 
  onRetry: () => void;
  upgradeRequired?: boolean;
  onUpgrade?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-12 px-6"
    >
      <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
        upgradeRequired
          ? 'bg-amber-500/20'
          : 'bg-red-500/20'
      }`}>
        {upgradeRequired ? (
          <Sparkles className="w-8 h-8 text-amber-400" />
        ) : (
          <AlertCircle className="w-8 h-8 text-red-400" />
        )}
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">
        {upgradeRequired ? 'Upgrade to Pro' : 'Something went wrong'}
      </h3>
      <p className="text-white/60 text-center max-w-xs mb-6">
        {error}
      </p>
      {upgradeRequired ? (
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Button 
            onClick={onUpgrade}
            className="bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white"
            data-testid="button-upgrade-pro"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Upgrade to Pro
          </Button>
          <Button onClick={onRetry} variant="outline" data-testid="button-retry">
            Go Back
          </Button>
        </div>
      ) : (
        <Button onClick={onRetry} variant="outline" data-testid="button-retry">
          Try Again
        </Button>
      )}
    </motion.div>
  );
}

function SuccessState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-16 px-6"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', delay: 0.1 }}
        className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center mb-6 shadow-lg"
      >
        <Check className="w-10 h-10 text-white" />
      </motion.div>
      <h3 className="text-xl font-semibold text-white mb-2">
        Plan Created & Journaled!
      </h3>
      <p className="text-white/60 text-center">
        Redirecting to your new activity...
      </p>
    </motion.div>
  );
}

function TaskItem({ 
  task, 
  index, 
  onUpdate, 
  onRemove 
}: { 
  task: ParsedTask; 
  index: number;
  onUpdate: (updates: Partial<ParsedTask>) => void;
  onRemove: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task.title);

  const handleSaveTitle = () => {
    if (editedTitle.trim()) {
      onUpdate({ title: editedTitle.trim() });
    }
    setIsEditing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ delay: index * 0.05 }}
      className="group flex items-start gap-3 p-4 rounded-xl bg-white/10 border border-white/10 hover:bg-white/15 transition-colors"
      data-testid={`task-item-${index}`}
    >
      <div className="flex-shrink-0 cursor-grab opacity-0 group-hover:opacity-50 transition-opacity">
        <GripVertical className="w-5 h-5 text-slate-400" />
      </div>

      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-xs font-semibold text-purple-300">
        {index + 1}
      </div>

      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="flex gap-2">
            <Input
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onBlur={handleSaveTitle}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
              autoFocus
              className="flex-1"
              data-testid={`input-task-title-${index}`}
            />
          </div>
        ) : (
          <div 
            className="font-medium text-white cursor-pointer hover:text-purple-300 transition-colors"
            onClick={() => setIsEditing(true)}
          >
            {task.title}
          </div>
        )}

        {task.description && (
          <p className="text-sm text-white/50 mt-1 line-clamp-2">
            {task.description}
          </p>
        )}

        <div className="flex flex-wrap gap-2 mt-2">
          <Select
            value={task.priority || 'medium'}
            onValueChange={(value) => onUpdate({ priority: value as 'high' | 'medium' | 'low' })}
          >
            <SelectTrigger className="h-7 w-24 text-xs" data-testid={`select-priority-${index}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>

          {task.timeEstimate && (
            <Badge variant="secondary" className="text-xs">
              {task.timeEstimate}
            </Badge>
          )}

          {task.category && (
            <Badge variant="outline" className="text-xs">
              {task.category}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setIsEditing(true)}
          data-testid={`button-edit-task-${index}`}
        >
          <Edit2 className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/20"
          onClick={onRemove}
          data-testid={`button-remove-task-${index}`}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
}

function isSocialMediaUrl(text: string): boolean {
  const patterns = [
    /instagram\.com\/(reel|p|stories)\//i,
    /tiktok\.com\/@?[\w.-]+\/video\//i,
    /(?:youtube\.com\/(?:watch\?|shorts\/)|youtu\.be\/)/i,
    /(?:twitter\.com|x\.com)\/[\w]+\/status\//i,
    /facebook\.com\/(?:watch|reel|[\w.]+\/videos)\//i,
    /reddit\.com\/r\/[\w]+\/comments\//i,
  ];
  return patterns.some(pattern => pattern.test(text));
}

function extractUrlFromText(text: string): string | null {
  const urlMatch = text.match(/https?:\/\/[^\s]+/i);
  return urlMatch ? urlMatch[0] : null;
}

function detectPlatform(url: string): string {
  if (url.includes('instagram')) return 'Instagram';
  if (url.includes('tiktok')) return 'TikTok';
  if (url.includes('youtube') || url.includes('youtu.be')) return 'YouTube';
  if (url.includes('twitter') || url.includes('x.com')) return 'Twitter';
  if (url.includes('facebook')) return 'Facebook';
  if (url.includes('reddit')) return 'Reddit';
  return 'Web';
}

export default function ImportPlan() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isAuthenticated, login, isLoading: authLoading } = useAuth();
  
  // Store pending URL for auto-processing after login
  // Read from localStorage (consistent with MainApp.tsx and LandingPage.tsx)
  const [pendingUrl, setPendingUrl] = useState<string | null>(() => {
    const url = localStorage.getItem('journalmate.pendingImportUrl');
    const timestamp = localStorage.getItem('journalmate.pendingImportTimestamp');
    // Only return if not expired (10 minutes)
    if (url && timestamp) {
      const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
      if (parseInt(timestamp, 10) > tenMinutesAgo) {
        return url;
      }
    }
    return null;
  });
  
  const {
    state,
    limits,
    startImport,
    updateParsedPlan,
    updateTask,
    removeTask,
    addTask,
    confirmImport,
    cancel,
    reset,
    dismissSocialMediaDialog,
    proceedWithPlan,
    isLoading,
    isParsed,
    isSuccess,
    isError,
    isSocialMediaChoice
  } = useAIPlanImport();

  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [extractingContent, setExtractingContent] = useState(false);
  const [planPreview, setPlanPreview] = useState<any>(null);
  const [showSignIn, setShowSignIn] = useState(false);
  
  // Auto-process pending content after authentication
  useEffect(() => {
    if (!authLoading && isAuthenticated && pendingUrl) {
      // User just logged in with pending content - auto-process it
      // Clear from localStorage first to prevent re-triggering on navigation
      localStorage.removeItem('journalmate.pendingImportUrl');
      localStorage.removeItem('journalmate.pendingImportTimestamp');
      
      const contentToProcess = pendingUrl;
      setPendingUrl(null);
      
      // Check if it's a URL or plain text
      const extractedUrl = extractUrlFromText(contentToProcess);
      
      if (extractedUrl) {
        // It's a URL - use the generate plan mutation
        setExtractingContent(true);
        generatePlanMutation.mutate({
          content: `URL to extract and plan: ${extractedUrl}`,
          sourceUrl: extractedUrl
        });
      } else if (contentToProcess.length > 20) {
        // It's plain text - use the import flow
        startImport(contentToProcess, 'clipboard');
      }
    }
  }, [authLoading, isAuthenticated, pendingUrl]);

  // Async job polling for plan generation (survives app backgrounding)
  const [planJobId, setPlanJobId] = useState<string | null>(null);
  const planJobQuery = useAsyncJob(planJobId);

  // Handle plan job completion/failure
  useEffect(() => {
    if (!planJobQuery.data) return;

    if (planJobQuery.data.status === 'completed') {
      const data = planJobQuery.data.result;
      setPlanJobId(null);
      setExtractingContent(false);
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/journal'] });

      toast({
        title: 'Plan Created & Journaled!',
        description: `Created "${data.activity?.title}" with ${data.createdTasks?.length || 0} tasks`
      });

      if (data.activity?.id) {
        setTimeout(() => {
          setLocation(`/activities/${data.activity.id}`);
        }, 1500);
      }
    }

    if (planJobQuery.data.status === 'failed') {
      setPlanJobId(null);
      setExtractingContent(false);
      toast({
        title: 'Failed to create plan',
        description: planJobQuery.data.error || 'Unknown error',
        variant: 'destructive'
      });
    }
  }, [planJobQuery.data?.status]);

  const generatePlanMutation = useMutation({
    mutationFn: async ({ content, sourceUrl }: { content: string; sourceUrl: string }) => {
      const response = await apiRequest('POST', '/api/planner/generate-plan-from-content', {
        externalContent: content,
        mode: 'quick',
        sourceUrl,
        userAnswers: {
          goal: 'Turn this inspiration into actionable steps',
          timeline: 'flexible',
          priority: 'medium',
          preferences: 'Create a practical plan based on this content'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate plan');
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Server now returns { jobId, status: 'processing' }
      if (data.jobId) {
        setPlanJobId(data.jobId);
      }
    },
    onError: (error: Error) => {
      setExtractingContent(false);
      toast({
        title: 'Failed to create plan',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const extractContentMutation = useMutation({
    mutationFn: async (url: string) => {
      const response = await apiRequest('POST', '/api/content/extract', {
        url
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to extract content');
      }
      
      return response.json();
    }
  });

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text || text.trim().length < 5) {
        toast({
          title: 'Clipboard is empty',
          description: 'Copy a URL or content first, then try again.',
          variant: 'destructive'
        });
        return;
      }

      const trimmedText = text.trim();
      const url = extractUrlFromText(trimmedText);
      
      // Auth check: show processing animation then sign-in wall for unauthenticated users
      // This builds anticipation before prompting to sign in
      if (!isAuthenticated) {
        const previewTitle = url 
          ? `Plan from ${detectPlatform(url)}`
          : 'Plan from Clipboard Content';
        const previewDesc = url
          ? 'Content will be extracted and turned into actionable tasks'
          : 'Your text will be turned into actionable tasks';
        
        // Store the content/URL for processing after login (consistent with MainApp.tsx)
        localStorage.setItem('journalmate.pendingImportUrl', url || trimmedText);
        localStorage.setItem('journalmate.pendingImportTimestamp', Date.now().toString());
        
        // Show loading animation to build anticipation
        setExtractingContent(true);
        
        // Brief delay to show processing animation before sign-in wall
        setTimeout(() => {
          setExtractingContent(false);
          setPlanPreview({
            title: previewTitle,
            description: previewDesc,
            taskCount: '6-9',
            sourceUrl: url || trimmedText
          });
          setShowSignIn(true);
        }, 1500);
        
        return;
      }
      
      // User is authenticated - process the content
      if (url && isSocialMediaUrl(url)) {
        setExtractingContent(true);
        
        generatePlanMutation.mutate({
          content: `URL to extract and plan: ${url}`,
          sourceUrl: url
        });
      } else if (url) {
        // Non-social URL - still process it
        setExtractingContent(true);
        
        generatePlanMutation.mutate({
          content: `URL to extract and plan: ${url}`,
          sourceUrl: url
        });
      } else if (trimmedText.length > 20) {
        startImport(trimmedText, 'clipboard');
      } else {
        toast({
          title: 'Content too short',
          description: 'Please paste a URL or longer content.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Cannot access clipboard',
        description: 'Please allow clipboard access or paste manually.',
        variant: 'destructive'
      });
    }
  };

  const handleAddTask = () => {
    if (newTaskTitle.trim()) {
      addTask({
        title: newTaskTitle.trim(),
        priority: 'medium',
        category: 'general'
      });
      setNewTaskTitle('');
      setShowAddTask(false);
    }
  };

  const handleBack = () => {
    if (showSignIn) {
      setShowSignIn(false);
      setPlanPreview(null);
    } else if (isParsed) {
      cancel();
    } else {
      setLocation('/');
    }
  };

  const handleSignIn = (urlToStore?: string) => {
    // Store the pending URL so we can auto-process after login in MainApp
    if (urlToStore) {
      localStorage.setItem('journalmate.pendingImportUrl', urlToStore);
      localStorage.setItem('journalmate.pendingImportTimestamp', Date.now().toString());
    }
    // Redirect to login, then to main app where the URL will be auto-processed
    setLocation('/login?returnTo=/app');
  };

  const isProcessing = isLoading || extractingContent || generatePlanMutation.isPending || !!planJobId;

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Blurred Video Background */}
      <video autoPlay muted playsInline loop poster="/hero_poster.jpg" className="absolute inset-0 w-full h-full object-cover blur-sm scale-105">
        <source src={heroVideoUrl} type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px]" />

      {/* Scrollable content layer */}
      <div className="relative z-10 h-screen overflow-auto">
      {/* Premium Header */}
      <header className="fixed top-0 sm:top-4 left-0 sm:left-1/2 sm:-translate-x-1/2 z-50 w-full sm:w-[95%] sm:max-w-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sm:rounded-full shadow-sm sm:shadow-lg border-b sm:border border-white/20 dark:border-white/10 sm:border-white/20 dark:sm:border-white/10 transition-all duration-300 pt-[env(safe-area-inset-top)] sm:pt-0">
        <div className="flex flex-col sm:flex-row items-center justify-between w-full">
          {/* Top Row */}
          <div className="px-4 py-3 sm:px-6 sm:py-3 flex items-center justify-between w-full sm:h-14 relative">
            {/* Back + Logo */}
            <div className="flex items-center gap-1 z-10">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleBack}
                data-testid="button-back"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <img
                src="/icons/web/android-chrome-192x192.png"
                alt="JournalMate"
                className="h-7 w-7 object-contain"
              />
              <span className="font-bold text-[17px] tracking-tight text-foreground hidden xs:inline">JournalMate</span>
            </div>

            {/* Desktop Center Nav */}
            <div className="hidden sm:flex items-center gap-1 absolute left-1/2 -translate-x-1/2 w-max">
              <Link href="/discover">
                <Button variant="ghost" size="sm" className="rounded-full hover:bg-muted font-medium text-sm px-4">
                  Discover
                </Button>
              </Link>
              <Link href="/import-plan">
                <Button variant="ghost" size="sm" className="rounded-full bg-primary/10 text-primary font-medium text-sm px-4">
                  Import
                </Button>
              </Link>
              <Link href="/updates">
                <Button variant="ghost" size="sm" className="rounded-full hover:bg-muted font-medium text-sm px-4">
                  Updates
                </Button>
              </Link>
            </div>

            {/* Theme toggle */}
            <div className="flex items-center z-10">
              <ThemeToggle />
            </div>
          </div>

          {/* Mobile Bottom Row (Nav Pills) */}
          <div className="sm:hidden w-full">
            <div className="mx-6 h-px bg-border/30" />
            <div className="flex items-center justify-center py-2.5 gap-2.5">
              <Link href="/discover">
                <Button variant="outline" size="sm" className="h-8 px-3.5 rounded-full bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800/50 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/40 font-medium text-[13px] shadow-sm flex items-center transition-colors">
                  <Compass className="h-3.5 w-3.5 mr-1.5" />
                  Discover
                </Button>
              </Link>
              <Button variant="default" size="sm" className="h-8 px-3.5 rounded-full bg-violet-500 dark:bg-violet-600 hover:bg-violet-600 dark:hover:bg-violet-500 text-white font-medium text-[13px] shadow-sm flex items-center border border-transparent transition-colors">
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                Import
              </Button>
              <Link href="/updates">
                <Button variant="outline" size="sm" className="h-8 px-3.5 rounded-full bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800/50 text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/40 font-medium text-[13px] shadow-sm flex items-center transition-colors">
                  <Megaphone className="h-3.5 w-3.5 mr-1.5" />
                  Updates
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Spacer for fixed header */}
      <div className="h-[104px] sm:h-[88px] safe-top sm:!pt-0" />

      <div className="max-w-2xl mx-auto p-4 pb-24">
        {limits && limits.tier === 'free' && !showSignIn && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4"
          >
            <GlassCard className="p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/60">
                  Free imports: {limits.remaining} of {limits.limit} remaining
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-purple-300"
                  onClick={() => setLocation('/settings/subscription')}
                  data-testid="button-upgrade"
                >
                  Upgrade to Pro
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </GlassCard>
          </motion.div>
        )}

        <GlassCard>
          <AnimatePresence mode="wait">
            {/* Show loading while checking auth */}
            {authLoading && (
              <LoadingState key="auth-loading" message="Loading..." />
            )}

            {/* Show sign-in prompt ONLY after plan preview is ready for unauthenticated users */}
            {!authLoading && !isAuthenticated && showSignIn && planPreview && (
              <SignInPrompt 
                key="signin" 
                planPreview={planPreview} 
                onSignIn={handleSignIn} 
              />
            )}

            {/* Show empty state (integration page) for ALL users - let them try the feature first */}
            {!authLoading && !showSignIn && state.status === 'idle' && !isProcessing && (
              <EmptyState key="empty" onPasteClick={handlePaste} isLoading={isProcessing} />
            )}

            {isProcessing && (
              <LoadingState 
                key="loading" 
                message={extractingContent ? 'Extracting & Planning...' : undefined} 
              />
            )}

            {isError && state.error && (
              <ErrorState 
                key="error" 
                error={state.error} 
                onRetry={reset}
                upgradeRequired={state.upgradeRequired}
                onUpgrade={() => setLocation('/settings/subscription')}
              />
            )}

            {(isSuccess || (planJobQuery.data?.status === 'completed')) && (
              <SuccessState key="success" />
            )}

            {isParsed && state.parsedPlan && (
              <motion.div
                key="parsed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-4"
              >
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge
                      variant="secondary"
                      className="bg-purple-500/20 text-purple-300"
                    >
                      <Sparkles className="w-3 h-3 mr-1" />
                      AI Parsed
                    </Badge>
                    {state.parsedPlan.confidence >= 0.8 && (
                      <Badge variant="outline" className="text-emerald-400 border-emerald-500/30">
                        High Confidence
                      </Badge>
                    )}
                  </div>

                  <Input
                    value={state.parsedPlan.title}
                    onChange={(e) => updateParsedPlan({ title: e.target.value })}
                    className="text-xl font-bold border-none bg-transparent p-0 h-auto focus-visible:ring-0 text-white"
                    placeholder="Plan title..."
                    data-testid="input-plan-title"
                  />

                  {state.parsedPlan.description && (
                    <Textarea
                      value={state.parsedPlan.description}
                      onChange={(e) => updateParsedPlan({ description: e.target.value })}
                      className="mt-2 border-none bg-transparent resize-none focus-visible:ring-0 text-white/60"
                      placeholder="Plan description..."
                      rows={2}
                      data-testid="textarea-plan-description"
                    />
                  )}
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-white/80">
                      Tasks ({state.parsedPlan.tasks.length})
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAddTask(true)}
                      className="text-purple-300"
                      data-testid="button-add-task"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Task
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <AnimatePresence>
                      {state.parsedPlan.tasks.map((task, index) => (
                        <TaskItem
                          key={`${task.title}-${index}`}
                          task={task}
                          index={index}
                          onUpdate={(updates) => updateTask(index, updates)}
                          onRemove={() => removeTask(index)}
                        />
                      ))}
                    </AnimatePresence>

                    {showAddTask && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex gap-2 p-3 rounded-xl bg-white/10 border border-dashed border-purple-400/30"
                      >
                        <Input
                          value={newTaskTitle}
                          onChange={(e) => setNewTaskTitle(e.target.value)}
                          placeholder="Enter task title..."
                          onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                          autoFocus
                          data-testid="input-new-task"
                        />
                        <Button onClick={handleAddTask} size="sm" data-testid="button-save-new-task">
                          Add
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setShowAddTask(false)}
                          data-testid="button-cancel-new-task"
                        >
                          Cancel
                        </Button>
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </div>

      {isParsed && state.parsedPlan && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 via-black/60 to-transparent backdrop-blur-sm z-20">
          <div className="max-w-2xl mx-auto flex gap-3">
            <Button
              variant="outline"
              className="flex-1 bg-white/20 hover:bg-white/30 text-white border-white/30"
              onClick={cancel}
              disabled={state.status === 'saving'}
              data-testid="button-cancel-import"
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white shadow-lg"
              onClick={confirmImport}
              disabled={state.status === 'saving' || state.parsedPlan.tasks.length === 0}
              data-testid="button-confirm-import"
            >
              {state.status === 'saving' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Create {state.parsedPlan.tasks.length} Tasks
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      </div>{/* end scrollable content layer */}

      <SocialMediaShareDialog
        isOpen={isSocialMediaChoice}
        onClose={dismissSocialMediaDialog}
        url={state.socialMediaUrl || ''}
        extractedContent={state.extractedContent || state.rawText || ''}
        onPlanNow={proceedWithPlan}
      />
    </div>
  );
}
