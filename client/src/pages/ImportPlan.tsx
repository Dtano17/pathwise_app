import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
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
  Link,
  Image,
  Video,
  LogIn
} from 'lucide-react';
import { SiInstagram, SiTiktok, SiYoutube, SiX, SiFacebook, SiReddit, SiOpenai, SiAnthropic, SiGooglegemini } from 'react-icons/si';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAIPlanImport, useClipboardImport, type ParsedTask } from '@/hooks/useAIPlanImport';
import { useAuth } from '@/hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import { SocialMediaShareDialog } from '@/components/SocialMediaShareDialog';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 border border-white/20 dark:border-slate-700/30 rounded-2xl shadow-xl ${className}`}>
      {children}
    </div>
  );
}


function SourcePill({ icon: Icon, label, color }: { icon: any; label: string; color: string }) {
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium ${color}`}>
      <Icon className="w-3.5 h-3.5" />
      <span>{label}</span>
    </div>
  );
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
        <div className="absolute inset-2 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center">
          <Sparkles className="w-8 h-8 text-purple-500 animate-spin" style={{ animationDuration: '3s' }} />
        </div>
      </div>
      <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">
        {message || 'Analyzing Your Content'}
      </h3>
      <p className="text-slate-500 dark:text-slate-400 text-center max-w-xs">
        Extracting content, generating your personalized plan...
      </p>
    </motion.div>
  );
}

function EmptyState({ onPasteClick, isLoading }: { onPasteClick: () => void; isLoading?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-8 px-6"
    >
      
      <div className="mt-6 mb-4 text-center">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
          Import Content to Plan
        </h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-sm">
          Share or paste content from anywhere. We'll extract it, create an actionable plan, and add it to your journal.
        </p>
      </div>

      <div className="w-full max-w-md mb-6">
        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 text-center">
          Supported Sources
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="space-y-2">
            <div className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-2">Social Media</div>
            <div className="flex flex-wrap gap-1.5">
              <SourcePill icon={SiInstagram} label="Instagram" color="bg-gradient-to-r from-pink-100 to-purple-100 dark:from-pink-900/30 dark:to-purple-900/30 text-pink-600 dark:text-pink-400" />
              <SourcePill icon={SiTiktok} label="TikTok" color="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300" />
              <SourcePill icon={SiYoutube} label="YouTube" color="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400" />
              <SourcePill icon={SiX} label="Twitter/X" color="bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400" />
              <SourcePill icon={SiFacebook} label="Facebook" color="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" />
              <SourcePill icon={SiReddit} label="Reddit" color="bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-2">AI & Files</div>
            <div className="flex flex-wrap gap-1.5">
              <SourcePill icon={SiOpenai} label="ChatGPT" color="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" />
              <SourcePill icon={SiAnthropic} label="Claude" color="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" />
              <SourcePill icon={SiGooglegemini} label="Gemini" color="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" />
              <SourcePill icon={Link} label="Articles" color="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400" />
              <SourcePill icon={FileText} label="Docs" color="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400" />
              <SourcePill icon={Image} label="Images" color="bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400" />
              <SourcePill icon={FileText} label="PDFs" color="bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400" />
              <SourcePill icon={Video} label="Videos" color="bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400" />
            </div>
          </div>
        </div>
      </div>

      <Button
        onClick={onPasteClick}
        disabled={isLoading}
        className="bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white shadow-lg px-8"
        size="lg"
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
      
      <p className="text-xs text-slate-400 dark:text-slate-500 mt-4 text-center max-w-xs">
        On mobile, use the share button in any app to send content directly to JournalMate
      </p>
    </motion.div>
  );
}

function SignInPrompt({ planPreview, onSignIn }: { planPreview: any; onSignIn: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-8 px-6"
    >
      
      <div className="w-full mt-6 mb-6">
        <div className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 rounded-xl p-4 border border-purple-100 dark:border-purple-800/30">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">Your Plan is Ready!</span>
          </div>
          
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">
            {planPreview?.title || 'Generated Plan'}
          </h3>
          
          {planPreview?.description && (
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 line-clamp-2">
              {planPreview.description}
            </p>
          )}
          
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Check className="w-4 h-4 text-emerald-500" />
            <span>{planPreview?.taskCount || 0} actionable tasks created</span>
          </div>
        </div>
      </div>

      <div className="text-center mb-6">
        <h4 className="font-semibold text-slate-800 dark:text-white mb-2">
          Sign in to save your plan
        </h4>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">
          Create an account to track your progress, get reminders, and access your plans anywhere.
        </p>
      </div>

      <Button
        onClick={onSignIn}
        className="bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white shadow-lg w-full max-w-xs"
        size="lg"
        data-testid="button-sign-in"
      >
        <LogIn className="w-5 h-5 mr-2" />
        Sign in to Continue
      </Button>
      
      <p className="text-xs text-slate-400 dark:text-slate-500 mt-4">
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
          ? 'bg-amber-100 dark:bg-amber-900/30' 
          : 'bg-red-100 dark:bg-red-900/30'
      }`}>
        {upgradeRequired ? (
          <Sparkles className="w-8 h-8 text-amber-500" />
        ) : (
          <AlertCircle className="w-8 h-8 text-red-500" />
        )}
      </div>
      <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">
        {upgradeRequired ? 'Upgrade to Pro' : 'Something went wrong'}
      </h3>
      <p className="text-slate-500 dark:text-slate-400 text-center max-w-xs mb-6">
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
      <h3 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">
        Plan Created & Journaled!
      </h3>
      <p className="text-slate-500 dark:text-slate-400 text-center">
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
      className="group flex items-start gap-3 p-4 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 hover:bg-white/80 dark:hover:bg-slate-800/80 transition-colors"
      data-testid={`task-item-${index}`}
    >
      <div className="flex-shrink-0 cursor-grab opacity-0 group-hover:opacity-50 transition-opacity">
        <GripVertical className="w-5 h-5 text-slate-400" />
      </div>

      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-xs font-semibold text-purple-600 dark:text-purple-400">
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
            className="font-medium text-slate-800 dark:text-white cursor-pointer hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
            onClick={() => setIsEditing(true)}
          >
            {task.title}
          </div>
        )}

        {task.description && (
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
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
          className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
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

  const generatePlanMutation = useMutation({
    mutationFn: async ({ content, sourceUrl }: { content: string; sourceUrl: string }) => {
      const response = await apiRequest('POST', '/api/planner/generate-plan-from-content', {
        externalContent: content,
        mode: 'quick',
        sourceUrl
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate plan');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
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
      
      if (url && isSocialMediaUrl(url)) {
        if (!isAuthenticated) {
          setPlanPreview({
            title: `Plan from ${detectPlatform(url)}`,
            description: 'Content will be extracted and turned into actionable tasks',
            taskCount: '6-9'
          });
          setShowSignIn(true);
          return;
        }
        
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

  const handleSignIn = () => {
    login();
  };

  const isProcessing = isLoading || extractingContent || generatePlanMutation.isPending;

  return (
    <div className="h-screen overflow-auto bg-gradient-to-br from-purple-50 via-white to-violet-50 dark:from-slate-900 dark:via-slate-900 dark:to-purple-950">
      <div className="sticky top-0 z-50 backdrop-blur-lg bg-white/70 dark:bg-slate-900/70 border-b border-slate-200/50 dark:border-slate-700/50">
        <div className="flex items-center justify-between px-4 h-14 max-w-2xl mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <div className="flex items-center gap-2">
            <img 
              src="/journalmate-logo-transparent.png" 
              alt="JournalMate" 
              className="h-12 w-auto"
            />
          </div>

          <div className="w-10" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 pb-24">
        {limits && limits.tier === 'free' && !showSignIn && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4"
          >
            <GlassCard className="p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  Free imports: {limits.remaining} of {limits.limit} remaining
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-purple-600 dark:text-purple-400"
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
            {showSignIn && planPreview && (
              <SignInPrompt 
                key="signin" 
                planPreview={planPreview} 
                onSignIn={handleSignIn} 
              />
            )}

            {!showSignIn && state.status === 'idle' && !isProcessing && (
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

            {(isSuccess || generatePlanMutation.isSuccess) && (
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
                      className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                    >
                      <Sparkles className="w-3 h-3 mr-1" />
                      AI Parsed
                    </Badge>
                    {state.parsedPlan.confidence >= 0.8 && (
                      <Badge variant="outline" className="text-emerald-600 border-emerald-200 dark:border-emerald-800">
                        High Confidence
                      </Badge>
                    )}
                  </div>

                  <Input
                    value={state.parsedPlan.title}
                    onChange={(e) => updateParsedPlan({ title: e.target.value })}
                    className="text-xl font-bold border-none bg-transparent p-0 h-auto focus-visible:ring-0 text-slate-800 dark:text-white"
                    placeholder="Plan title..."
                    data-testid="input-plan-title"
                  />

                  {state.parsedPlan.description && (
                    <Textarea
                      value={state.parsedPlan.description}
                      onChange={(e) => updateParsedPlan({ description: e.target.value })}
                      className="mt-2 border-none bg-transparent resize-none focus-visible:ring-0 text-slate-600 dark:text-slate-400"
                      placeholder="Plan description..."
                      rows={2}
                      data-testid="textarea-plan-description"
                    />
                  )}
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-slate-700 dark:text-slate-300">
                      Tasks ({state.parsedPlan.tasks.length})
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAddTask(true)}
                      className="text-purple-600 dark:text-purple-400"
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
                        className="flex gap-2 p-3 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-dashed border-purple-300 dark:border-purple-700"
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
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent dark:from-slate-900 dark:via-slate-900">
          <div className="max-w-2xl mx-auto flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
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
