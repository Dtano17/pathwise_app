import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import VoiceInput from '@/components/VoiceInput';
import LiveChatInterface from '@/components/LiveChatInterface';
import TaskCard from '@/components/TaskCard';
import ProgressDashboard from '@/components/ProgressDashboard';
import ClaudePlanOutput, { type ClaudePlanCommandRef } from '@/components/ClaudePlanOutput';
import ThemeSelector from '@/components/ThemeSelector';
import LocationDatePlanner from '@/components/LocationDatePlanner';
import PersonalJournal from '@/components/PersonalJournal';
import ConversationalPlanner from '@/components/ConversationalPlanner';
import QuickCaptureButton from '@/components/QuickCaptureButton';
import PostActivityPrompt from '@/components/PostActivityPrompt';
import EndOfDayReview from '@/components/EndOfDayReview';
import CreateGroupDialog from '@/components/CreateGroupDialog';
import JoinGroupDialog from '@/components/JoinGroupDialog';
import GroupCard from '@/components/GroupCard';
import GroupDetailsModal from '@/components/GroupDetailsModal';
import ShareActivityToGroupDialog from '@/components/ShareActivityToGroupDialog';
import Contacts from './Contacts';
import ChatHistory from './ChatHistory';
import RecentGoals from './RecentGoals';
import ProgressReport from './ProgressReport';
import { SocialLogin } from '@/components/SocialLogin';
import { SignInPromptModal } from '@/components/SignInPromptModal';
import { Sparkles, Target, BarChart3, CheckSquare, Mic, Plus, RefreshCw, Upload, MessageCircle, Download, Copy, Users, Heart, Dumbbell, Briefcase, TrendingUp, BookOpen, Mountain, Activity, Menu, Bell, Calendar, Share, Contact, MessageSquare, Brain, Lightbulb, History, Music, Instagram, Facebook, Youtube, Star, Share2, MoreHorizontal, Check, Clock, X, Trash2, ArrowLeft, ArrowRight, Archive, Plug, Info, LogIn, Lock, Unlock, Eye, Edit, CheckCircle2, Circle, UserPlus, UserMinus, Globe2, Link2, ClipboardPaste, FileText, Image, Video, Link as LinkIcon, Loader2, Zap } from 'lucide-react';
import DiscoverPlansView from '@/components/discover/DiscoverPlansView';
import { Link } from 'wouter';
import { SiOpenai, SiClaude, SiPerplexity, SiSpotify, SiApplemusic, SiYoutubemusic, SiFacebook, SiInstagram, SiX, SiTiktok, SiYoutube, SiReddit, SiAnthropic, SiGooglegemini } from 'react-icons/si';
import { type Task, type Activity as ActivityType, type ChatImport } from '@shared/schema';
import { formatDistanceToNow } from 'date-fns';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { SharePreviewDialog } from '@/components/SharePreviewDialog';
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import ThemeToggle from '@/components/ThemeToggle';
import NotificationManager from '@/components/NotificationManager';
import SmartScheduler from '@/components/SmartScheduler';
import CelebrationModal from '@/components/CelebrationModal';
import OnboardingTutorial from '@/components/OnboardingTutorial';
import { UpgradeModal } from '@/components/UpgradeModal';
import { ProBadge } from '@/components/ProBadge';
import { useImportQueue } from '@/hooks/useImportQueue';
import Confetti from 'react-confetti';
import { Share as CapacitorShare } from '@capacitor/share';
import { isNative } from '@/lib/mobile';

interface ProgressData {
  completedToday: number;
  totalToday: number;
  weeklyStreak: number;
  totalCompleted: number;
  completionRate: number;
  categories: { name: string; completed: number; total: number; }[];
  recentAchievements: string[];
  lifestyleSuggestions?: string[];
}

interface MainAppProps {
  selectedTheme: string;
  onThemeSelect: (theme: string) => void;
  showThemeSelector: boolean;
  onShowThemeSelector: (show: boolean) => void;
  showLocationDatePlanner: boolean;
  onShowLocationDatePlanner: (show: boolean) => void;
  showContacts: boolean;
  onShowContacts: (show: boolean) => void;
  showChatHistory: boolean;
  onShowChatHistory: (show: boolean) => void;
  showLifestylePlanner: boolean;
  onShowLifestylePlanner: (show: boolean) => void;
  showRecentGoals: boolean;
  onShowRecentGoals: (show: boolean) => void;
  showProgressReport: boolean;
  onShowProgressReport: (show: boolean) => void;
  showEndOfDayReview: boolean;
  onShowEndOfDayReview: (show: boolean) => void;
  onTabChange?: (setter: (tab: string) => void) => void;
}

export default function MainApp({
  selectedTheme,
  onThemeSelect,
  showThemeSelector,
  onShowThemeSelector,
  showLocationDatePlanner,
  onShowLocationDatePlanner,
  showContacts,
  onShowContacts,
  showChatHistory,
  onShowChatHistory,
  showLifestylePlanner,
  onShowLifestylePlanner,
  showRecentGoals,
  onShowRecentGoals,
  showProgressReport,
  onShowProgressReport,
  showEndOfDayReview,
  onShowEndOfDayReview,
  onTabChange
}: MainAppProps) {
  const [activeTab, setActiveTab] = useState("input"); // Start with Goal Input as the landing page
  const [location] = useLocation();
  
  // Expose setActiveTab to parent via callback
  useEffect(() => {
    onTabChange?.(setActiveTab);
  }, [onTabChange]);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { open, isMobile } = useSidebar();
  
  // Chat sync form state
  const [chatText, setChatText] = useState('');
  const [chatSource, setChatSource] = useState('chatgpt');
  const [chatTitle, setChatTitle] = useState('');

  // Current plan output for Goal Input page
  const [currentPlanOutput, setCurrentPlanOutput] = useState<{
    planTitle?: string;
    summary?: string;
    tasks: Task[];
    estimatedTimeframe?: string;
    motivationalNote?: string;
    activityId?: string;
    sourceUrl?: string;
    importId?: string;
  } | null>(null);

  // Conversation history for contextual plan regeneration
  const [conversationHistory, setConversationHistory] = useState<string[]>([]);
  const [planVersion, setPlanVersion] = useState(0);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  
  // Ref to track activityId to prevent race conditions during refinements
  const activityIdRef = useRef<string | undefined>(undefined);

  // Import queue for handling pasted content
  const importQueue = useImportQueue();

  // Ref to track import source URL for auto-journaling
  const importSourceUrlRef = useRef<string | undefined>(undefined);

  // Ref for ClaudePlanOutput commands (for natural language control)
  const planCommandRef = useRef<ClaudePlanCommandRef>(null);

  // Activity selection and delete dialog state
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; activity: ActivityType | null }>({ open: false, activity: null });
  const [sharePreviewDialog, setSharePreviewDialog] = useState<{ open: boolean; activity: ActivityType | null }>({ open: false, activity: null });
  const [editingActivity, setEditingActivity] = useState<ActivityType | null>(null);
  const [showJournalMode, setShowJournalMode] = useState(false);
  const [journalActivityContext, setJournalActivityContext] = useState<{ activityId: string; title: string } | null>(null);
  const [postActivityPrompt, setPostActivityPrompt] = useState<{ open: boolean; activity: ActivityType | null }>({ open: false, activity: null });
  const [promptedActivities, setPromptedActivities] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('journalmate_prompted_activities');
      if (!saved) return new Set();
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return new Set(parsed);
      }
      throw new Error('Invalid format');
    } catch (error) {
      console.error('Failed to parse promptedActivities from localStorage:', error);
      localStorage.removeItem('journalmate_prompted_activities');
      return new Set();
    }
  });

  // Clean up localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('journalmate_prompted_activities');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!Array.isArray(parsed)) {
          localStorage.removeItem('journalmate_prompted_activities');
        }
      }
    } catch {
      localStorage.removeItem('journalmate_prompted_activities');
    }
  }, []);

  // Handle URL query parameters for activity selection from shared links and tab navigation
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const activityParam = params.get('activity');
    const tabParam = params.get('tab');
    
    if (activityParam) {
      setSelectedActivityId(activityParam);
      if (tabParam) {
        setActiveTab(tabParam);
      }
      // Clean up URL after setting state
      window.history.replaceState({}, '', '/');
    } else if (tabParam) {
      // Handle tab parameter without activity parameter
      setActiveTab(tabParam);
    }
  }, [location]);

  // Sync active tab to URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    
    if (activeTab && activeTab !== "input") {
      params.set("tab", activeTab);
    } else {
      params.delete("tab");
    }
    
    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
    window.history.replaceState({}, "", newUrl);
  }, [activeTab]);

  // Auto-process pending import URL from /import-plan sign-in flow
  const [autoImportProcessed, setAutoImportProcessed] = useState(false);
  
  // Task filtering state
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Activity completion celebration state
  const [completedActivities, setCompletedActivities] = useState(new Set<string>());
  const [showActivityConfetti, setShowActivityConfetti] = useState(false);
  const [activityCelebration, setActivityCelebration] = useState<{
    title: string;
    description: string;
  } | null>(null);

  // Onboarding tutorial state
  const [showTutorial, setShowTutorial] = useState(false);

  // Upgrade modal state
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeTrigger, setUpgradeTrigger] = useState<'planLimit' | 'favorites' | 'export' | 'insights'>('planLimit');
  const [planCount, setPlanCount] = useState(0);
  const [planLimit, setPlanLimit] = useState(5);

  // Groups state
  const [showCreateGroupDialog, setShowCreateGroupDialog] = useState(false);
  const [showJoinGroupDialog, setShowJoinGroupDialog] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [shareActivityDialog, setShareActivityDialog] = useState<{ open: boolean; activityId: string; activityTitle: string }>({ open: false, activityId: '', activityTitle: '' });

  // Load and resume a conversation session
  const loadConversationSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/conversations/${sessionId}`);
      if (!response.ok) {
        throw new Error('Failed to load conversation');
      }
      
      const session = await response.json();
      
      // Extract conversation history
      const history = session.conversationHistory.map((msg: any) => msg.content);
      setConversationHistory(history);
      
      // Set plan output if available
      if (session.generatedPlan) {
        const activityId = session.generatedPlan.activityId;
        
        // Set ref first if activityId exists
        if (activityId) {
          activityIdRef.current = activityId;
          console.log('📥 Loaded session with activityId:', activityId);
        }
        
        setCurrentPlanOutput({
          planTitle: session.generatedPlan.title,
          summary: session.generatedPlan.summary,
          tasks: session.generatedPlan.tasks || [],
          estimatedTimeframe: session.generatedPlan.estimatedTimeframe,
          motivationalNote: session.generatedPlan.motivationalNote,
          activityId: activityId, // Restore activityId from saved session
          sourceUrl: session.generatedPlan.sourceUrl,
          importId: session.generatedPlan.importId
        });
      }
      
      // Set session ID for future updates
      setCurrentSessionId(sessionId);
      
      // Set plan version based on conversation length
      setPlanVersion(history.length);
      
      // Navigate to input tab
      setActiveTab('input');
    } catch (error) {
      console.error('Failed to load conversation:', error);
      toast({
        title: "Error",
        description: "Failed to load conversation session.",
        variant: "destructive"
      });
    }
  };

  // Expanded activities for collapsible view
  const handleActivityClick = (activity: ActivityType) => {
    // Set the selected activity and navigate to tasks tab
    setSelectedActivityId(activity.id);
    setActiveTab('tasks');
  };

  // Natural language command parser for plan control
  // Returns true if command was handled, false if should proceed to goal processing
  const handlePlanCommand = (text: string): boolean => {
    if (!currentPlanOutput || !planCommandRef.current) return false;

    const lowerText = text.toLowerCase().trim();

    // Journal commands: "journal this", "save to journal", "add to journal"
    if (/\b(journal\s*this|save\s*(to\s*)?(my\s*)?journal|add\s*(to\s*)?(my\s*)?journal)\b/.test(lowerText)) {
      planCommandRef.current.saveToJournal();
      toast({
        title: "Saving to Journal",
        description: "Adding plan items to your personal journal...",
      });
      return true;
    }

    // Budget filter commands: "fit my budget", "match budget", "budget filter", "filter by budget"
    if (/\b(fit\s*(my\s*)?budget|match\s*budget|budget\s*filter|filter\s*(by\s*)?budget|within\s*budget)\b/.test(lowerText)) {
      planCommandRef.current.toggleBudgetFilter();
      const state = planCommandRef.current.getState();
      toast({
        title: state.matchBudgetFilter ? "Budget Filter Disabled" : "Budget Filter Enabled",
        description: state.matchBudgetFilter ? "Showing all alternatives" : "Filtering alternatives to match your budget",
      });
      return true;
    }

    // Expand alternatives commands: "show alternatives", "see alternatives", "see other options", "view alternatives"
    if (/\b(show\s*alternatives|see\s*alternatives|see\s*other\s*options|view\s*alternatives|expand\s*alternatives)\b/.test(lowerText)) {
      planCommandRef.current.expandAllAlternatives();
      toast({
        title: "Alternatives Expanded",
        description: "Showing alternative options for all tasks",
      });
      return true;
    }

    // Collapse alternatives commands: "hide alternatives", "close alternatives", "collapse alternatives"
    if (/\b(hide\s*alternatives|close\s*alternatives|collapse\s*alternatives)\b/.test(lowerText)) {
      planCommandRef.current.collapseAllAlternatives();
      toast({
        title: "Alternatives Hidden",
        description: "Alternative options collapsed",
      });
      return true;
    }

    return false;
  };

  // Helper functions for group activity feed
  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case "task_completed":
        return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
      case "task_added":
        return <Circle className="w-5 h-5 text-blue-400" />;
      case "activity_shared":
        return <Share2 className="w-5 h-5 text-purple-400" />;
      case "member_joined":
        return <UserPlus className="w-5 h-5 text-primary" />;
      case "member_left":
        return <UserMinus className="w-5 h-5 text-muted-foreground" />;
      default:
        return <Users className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getActivityBackground = (activityType: string) => {
    switch (activityType) {
      case "task_completed":
        return "bg-emerald-500/10 border-emerald-500/20";
      case "task_added":
        return "bg-blue-500/10 border-blue-500/20";
      case "activity_shared":
        return "bg-purple-500/10 border-purple-500/20";
      case "member_joined":
        return "bg-primary/10 border-primary/20";
      case "member_left":
        return "bg-muted/50 border-muted-foreground/20";
      default:
        return "bg-background/40 border-border/50";
    }
  };

  const getActivityText = (activity: { userName: string; activityType: string; taskTitle: string | null; activityTitle: string | null }) => {
    const taskName = activity.taskTitle || "a task";
    const activityName = activity.activityTitle || "an activity";
    const userName = activity.userName || "Someone";

    switch (activity.activityType) {
      case "task_completed":
        return (
          <>
            <span className="font-medium">{userName}</span> completed <span className="font-medium">"{taskName}"</span>
          </>
        );
      case "task_added":
        return (
          <>
            <span className="font-medium">{userName}</span> added new task <span className="font-medium">"{taskName}"</span>
          </>
        );
      case "activity_shared":
        return (
          <>
            <span className="font-medium">{userName}</span> shared <span className="font-medium">{activityName}</span>
          </>
        );
      case "member_joined":
        return (
          <>
            <span className="font-medium">{userName}</span> joined the group
          </>
        );
      case "member_left":
        return (
          <>
            <span className="font-medium">{userName}</span> left the group
          </>
        );
      default:
        return <span className="font-medium">{userName}</span>;
    }
  };

  const handleImportPaste = async () => {
    // Prevent duplicate processing
    if (importQueue.isProcessing || processGoalMutation.isPending) {
      toast({
        title: 'Already processing',
        description: 'Please wait for the current import to complete.',
      });
      return;
    }

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

      // Enqueue the content (validation happens inside the hook)
      const success = importQueue.enqueue(text.trim());

      if (success) {
        // Switch to Goal Input tab to process the content
        setActiveTab('input');
      }

    } catch (error) {
      toast({
        title: 'Cannot access clipboard',
        description: 'Please allow clipboard access or paste manually.',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteActivity = useMutation({
    mutationFn: async (activityId: string) => {
      const response = await fetch(`/api/activities/${activityId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete activity');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Delete Failed", 
        description: error?.message || "Failed to delete activity. Please try again."
      });
    }
  });

  const handleArchiveActivity = useMutation({
    mutationFn: async (activityId: string) => {
      return await apiRequest('PATCH', `/api/activities/${activityId}/archive`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Archive Failed", 
        description: error?.message || "Failed to archive activity. Please try again."
      });
    }
  });

  const handleArchiveTask = useMutation({
    mutationFn: async (taskId: string) => {
      return await apiRequest('PATCH', `/api/tasks/${taskId}/archive`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
      queryClient.invalidateQueries({ queryKey: ['/api/progress'] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Archive Failed", 
        description: error?.message || "Failed to archive task. Please try again."
      });
    }
  });

  // Task handler functions for TaskCard component
  const handleCompleteTask = (taskId: string) => {
    completeTaskMutation.mutate(taskId);
  };

  const handleSkipTask = (taskId: string) => {
    skipTaskMutation.mutate(taskId);
  };

  const handleSnoozeTask = (taskId: string, hours: number) => {
    snoozeTaskMutation.mutate({ taskId, hours });
  };

  // These states are now managed in App.tsx and passed as props
  
  // About page expandable features state
  const [expandedFeature, setExpandedFeature] = useState<string | null>(null);

  // Check user authentication
  const { data: user } = useQuery({
    queryKey: ['/api/user'],
  });
  const isAuthenticated = !!user;
  
  // Sign-in dialog state
  const [showSignInDialog, setShowSignInDialog] = useState(false);
  
  // Sign-in prompt states for different contexts
  const [showPlannerSignIn, setShowPlannerSignIn] = useState(false);
  const [showJournalSignIn, setShowJournalSignIn] = useState(false);
  const [showDiscoverSignIn, setShowDiscoverSignIn] = useState(false);

  // Check if user has completed tutorial (show on first login/visit)
  useEffect(() => {
    if (user && typeof user === 'object' && 'id' in user) {
      const userId = (user as any).id;
      const isDemo = userId === 'demo-user';
      
      if (isDemo) {
        // For demo users, use localStorage to track tutorial completion
        const demoTutorialCompleted = localStorage.getItem('demo-tutorial-completed');
        console.log('[TUTORIAL] Demo user tutorial status:', { demoTutorialCompleted });
        
        if (!demoTutorialCompleted) {
          // Show tutorial immediately for demo users on first visit
          setTimeout(() => {
            setShowTutorial(true);
          }, 500);
        }
      } else {
        // For authenticated users, use database value
        const hasCompletedTutorial = (user as any).hasCompletedTutorial;
        console.log('[TUTORIAL] User tutorial status:', { hasCompletedTutorial, userId });
        
        // Show tutorial if not completed
        if (!hasCompletedTutorial) {
          // Small delay to let the app load first
          setTimeout(() => {
            setShowTutorial(true);
          }, 1000);
        }
      }
    }
  }, [user]);

  // Profile completion for OAuth new users
  const [showProfileCompletion, setShowProfileCompletion] = useState(false);
  const [oauthUserId, setOauthUserId] = useState<string | null>(null);

  // Check for OAuth new user redirect and auth errors
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isNewUser = urlParams.get('newUser') === 'true';
    const userId = urlParams.get('userId');
    const authStatus = urlParams.get('auth');
    const provider = urlParams.get('provider');
    const reason = urlParams.get('reason');

    // Handle OAuth errors
    if (authStatus === 'error') {
      if (provider === 'facebook' && reason === 'app_not_active') {
        toast({
          title: "Facebook Sign-In Unavailable",
          description: "Facebook authentication is currently in development mode. Please use Google or Email to sign in.",
          variant: "destructive",
          duration: 8000,
        });
      } else {
        toast({
          title: "Authentication Failed",
          description: `Failed to sign in with ${provider || 'social provider'}. Please try another method.`,
          variant: "destructive",
          duration: 5000,
        });
      }
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    // Handle new user signup
    if (isNewUser && userId) {
      toast({
        title: "Welcome! 🎉",
        description: "Your account has been created. Complete your profile to get personalized recommendations!",
        duration: 5000,
      });
      setOauthUserId(userId);
      setShowProfileCompletion(true);
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [toast]);

  // Sign-in gate component for restricted features
  const SignInGate = ({ children, feature }: { children: React.ReactNode; feature: string }) => {
    if (isAuthenticated) {
      return <>{children}</>;
    }
    
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="max-w-md text-center space-y-6">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <LogIn className="w-10 h-10 text-primary" />
          </div>
          <div>
            <h3 className="text-2xl font-bold mb-2">Sign in to access this feature</h3>
            <p className="text-muted-foreground mb-4">
              {feature} and other features require a free account. Sign in to unlock unlimited activities, progress tracking, and more!
            </p>
          </div>
          <div className="space-y-3">
            <Button 
              onClick={() => setShowSignInDialog(true)} 
              className="gap-2 w-full"
              data-testid="button-signin-gate"
            >
              <LogIn className="w-4 h-4" />
              Sign In Free
            </Button>
            <p className="text-xs text-muted-foreground">
              Free users: 1 activity • Signed in: Unlimited activities + features
            </p>
          </div>
        </div>
      </div>
    );
  };

  // Fetch tasks
  const { data: tasks = [], isLoading: tasksLoading, error: tasksError, refetch: refetchTasks } = useQuery<Task[]>({
    queryKey: ['/api/tasks'],
    staleTime: 30000, // 30 seconds
  });

  // Fetch activities
  const { data: activities = [], isLoading: activitiesLoading, error: activitiesError, refetch: refetchActivities } = useQuery<(ActivityType & { totalTasks: number; completedTasks: number; progressPercent: number })[]>({
    queryKey: ['/api/activities'],
    staleTime: 30000, // 30 seconds
  });

  // Fetch progress data
  const { data: progressData, isLoading: progressLoading, error: progressError, refetch: refetchProgress } = useQuery<ProgressData>({
    queryKey: ['/api/progress'],
    staleTime: 0, // Always fresh - refetch immediately when invalidated
    refetchOnMount: 'always', // Always refetch when component mounts
  });

  // Fetch chat imports
  const { data: chatImports = [], isLoading: chatImportsLoading, refetch: refetchChatImports } = useQuery<ChatImport[]>({
    queryKey: ['/api/chat/imports'],
    staleTime: 30000, // 30 seconds
  });

  // Fetch user's groups
  const { data: groupsData, isLoading: groupsLoading, refetch: refetchGroups } = useQuery<{ groups: Array<{ id: string; name: string; description: string | null; isPrivate: boolean; inviteCode: string; createdBy: string; createdAt: string; memberCount: number; role: string; tasksCompleted?: number; tasksTotal?: number; }> }>({
    queryKey: ['/api/groups'],
    staleTime: 30000, // 30 seconds
  });
  const groups = groupsData?.groups || [];

  // Fetch recent group activity
  const { data: groupActivities, isLoading: groupActivitiesLoading } = useQuery<Array<{
    id: string;
    userId: string;
    userName: string;
    activityType: string;
    taskTitle: string | null;
    activityTitle: string | null;
    timestamp: string;
    groupName: string;
  }>>({
    queryKey: ['/api/groups/activity'],
    staleTime: 30000, // 30 seconds
  });

  // Fetch activity-specific tasks when an activity is selected
  const { data: activityTasks, isLoading: activityTasksLoading, error: activityTasksError } = useQuery<Task[]>({
    queryKey: ['/api/activities', selectedActivityId, 'tasks'],
    enabled: !!selectedActivityId,
    staleTime: 30000, // 30 seconds
  });

  // Sync task completion status with plan output whenever tasks change
  // This ensures progress persists across tabs and updates in real-time
  useEffect(() => {
    if (currentPlanOutput && tasks.length > 0) {
      const hasTasksInPlan = currentPlanOutput.tasks.some(planTask => 
        tasks.some(actualTask => actualTask.id === planTask.id)
      );
      
      if (hasTasksInPlan) {
        // Check if any task completion status has changed
        const hasChanges = currentPlanOutput.tasks.some(planTask => {
          const actualTask = tasks.find(t => t.id === planTask.id);
          return actualTask && actualTask.completed !== planTask.completed;
        });
        
        if (hasChanges) {
          setCurrentPlanOutput(prevPlan => {
            if (!prevPlan) return null;
            
            return {
              ...prevPlan,
              tasks: prevPlan.tasks.map(planTask => {
                const actualTask = tasks.find(t => t.id === planTask.id);
                if (actualTask) {
                  return {
                    ...planTask,
                    completed: actualTask.completed,
                  };
                }
                return planTask;
              })
            };
          });
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks]); // Only re-run when tasks array changes

  // Load activity data when entering edit mode
  useEffect(() => {
    if (editingActivity && !currentPlanOutput) {
      // Load the activity data into plan output
      apiRequest('POST', '/api/goals/load-for-edit', {
        activityId: editingActivity.id
      })
        .then(res => res.json())
        .then(data => {
          setCurrentPlanOutput({
            planTitle: data.planTitle,
            summary: data.summary,
            tasks: data.tasks,
            estimatedTimeframe: data.estimatedTimeframe,
            motivationalNote: data.motivationalNote,
            activityId: data.activityId,
            sourceUrl: data.sourceUrl,
            importId: data.importId
          });
          activityIdRef.current = data.activityId;
        })
        .catch(error => {
          console.error('Failed to load activity:', error);
          toast({
            title: "Error",
            description: "Failed to load activity for editing",
            variant: "destructive"
          });
          setEditingActivity(null);
        });
    }
  }, [editingActivity, currentPlanOutput, toast]);

  // Process goal mutation
  const processGoalMutation = useMutation({
    mutationFn: async (goalText: string) => {
      // For refinements, incorporate additional context into the original request
      // Example: "plan my weekend" + "add timeline with timestamps" = "plan my weekend with detailed timeline and timestamps"
      const fullContext = conversationHistory.length > 0
        ? `${conversationHistory[0]}, and make sure to ${goalText}` // Rephrase as refinement of original goal
        : goalText;
      
      const response = await apiRequest('POST', '/api/goals/process', { 
        goalText: fullContext,
        sessionId: currentSessionId,
        activityId: activityIdRef.current, // Pass activityId when in edit mode
        conversationHistory: [...conversationHistory, goalText].map((msg, idx) => ({
          role: 'user' as const,
          content: msg,
          timestamp: new Date().toISOString(),
          type: 'question' as const
        }))
      });
      return response.json();
    },
    onSuccess: async (data: any, variables: string) => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/progress'] });
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
      
      // Add the new user input to conversation history
      const updatedHistory = [...conversationHistory, variables];
      setConversationHistory(updatedHistory);
      
      // Increment plan version
      setPlanVersion(prev => prev + 1);

      // REPLACE the plan completely (regeneration from scratch, not merging)
      // Use ref to get latest activityId (prevents race conditions during refinements)
      const preservedActivityId = activityIdRef.current;
      console.log('🔄 Plan refinement - preserving activityId:', preservedActivityId);
      
      const newPlanOutput = {
        planTitle: data.planTitle,
        summary: data.summary,
        tasks: data.tasks || [],
        estimatedTimeframe: data.estimatedTimeframe,
        motivationalNote: data.motivationalNote,
        activityId: preservedActivityId, // Preserve activity ID if it exists
        sourceUrl: data.sourceUrl,
        importId: data.importId
      };
      
      console.log('📋 New plan output:', { ...newPlanOutput, tasks: `${newPlanOutput.tasks.length} tasks` });
      setCurrentPlanOutput(newPlanOutput);

      // Auto-save conversation session
      try {
        const conversationMessages = updatedHistory.map((msg, idx) => ({
          role: 'user' as const,
          content: msg,
          timestamp: new Date().toISOString(),
          type: 'question' as const
        }));

        // Use the same plan data with preserved activityId
        const planToSave = {
          planTitle: data.planTitle,
          summary: data.summary,
          tasks: data.tasks || [],
          estimatedTimeframe: data.estimatedTimeframe,
          motivationalNote: data.motivationalNote,
          activityId: preservedActivityId,
          sourceUrl: data.sourceUrl,
          importId: data.importId
        };

        if (currentSessionId) {
          // Update existing session
          await apiRequest('PUT', `/api/conversations/${currentSessionId}`, {
            conversationHistory: conversationMessages,
            generatedPlan: planToSave
          });
        } else {
          // Create new session
          const sessionResponse = await apiRequest('POST', '/api/conversations', {
            conversationHistory: conversationMessages,
            generatedPlan: planToSave
          });
          const session = await sessionResponse.json();
          setCurrentSessionId(session.id);
        }
      } catch (error) {
        console.error('Failed to save conversation session:', error);
        // Don't show error to user - auto-save is background functionality
      }
      
      // Stay on input tab to show Claude-style output
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.error || error.message || "Failed to process your goal. Please try again.";
      toast({
        title: "Processing Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  });

  // Auto-process pending import URL from /import-plan sign-in flow
  useEffect(() => {
    if (autoImportProcessed) return;
    
    const pendingUrl = localStorage.getItem('journalmate.pendingImportUrl');
    const timestamp = localStorage.getItem('journalmate.pendingImportTimestamp');
    
    if (pendingUrl && timestamp) {
      // Check if not expired (10 minutes)
      const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
      if (parseInt(timestamp, 10) > tenMinutesAgo) {
        // Clear localStorage first to prevent re-triggering
        localStorage.removeItem('journalmate.pendingImportUrl');
        localStorage.removeItem('journalmate.pendingImportTimestamp');
        setAutoImportProcessed(true);
        
        // Navigate to input tab
        setActiveTab('input');
        
        // Format the goal text appropriately
        const isUrl = /^https?:\/\//i.test(pendingUrl);
        const goalText = isUrl 
          ? `Create an action plan from this content: ${pendingUrl}`
          : pendingUrl;
        
        // Set the text in the input field so user can see what's being processed
        setChatText(goalText);
        
        // Show toast to let user know we're processing their content
        toast({
          title: 'Processing your content',
          description: 'Creating an action plan from your pasted content...'
        });
        
        // Trigger the goal processing mutation after a brief delay
        setTimeout(() => {
          processGoalMutation.mutate(goalText);
        }, 500);
      } else {
        // Expired - clean up
        localStorage.removeItem('journalmate.pendingImportUrl');
        localStorage.removeItem('journalmate.pendingImportTimestamp');
        setAutoImportProcessed(true);
      }
    } else {
      setAutoImportProcessed(true);
    }
  }, [autoImportProcessed, toast, processGoalMutation]);

  // Complete task mutation
  const completeTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const response = await apiRequest('POST', `/api/tasks/${taskId}/complete`);
      return response.json();
    },
    onMutate: async (taskId: string) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['/api/tasks'] });
      const previousTasks = queryClient.getQueryData<Task[]>(['/api/tasks']);
      
      queryClient.setQueryData<Task[]>(['/api/tasks'], (old = []) => 
        old.map(task => task.id === taskId ? { ...task, completed: true } : task)
      );
      
      return { previousTasks };
    },
    onError: (error: any, taskId: string, context: any) => {
      // Rollback optimistic update
      if (context?.previousTasks) {
        queryClient.setQueryData(['/api/tasks'], context.previousTasks);
      }
      const errorMessage = error?.response?.error || error.message || "Failed to complete task";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
      queryClient.invalidateQueries({ queryKey: ['/api/progress'] });
    }
  });

  // Skip task mutation
  const skipTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const response = await apiRequest('POST', `/api/tasks/${taskId}/skip`, { reason: 'User skipped via swipe' });
      return response.json();
    },
    onMutate: async (taskId: string) => {
      // Optimistic update - remove from pending list
      await queryClient.cancelQueries({ queryKey: ['/api/tasks'] });
      const previousTasks = queryClient.getQueryData<Task[]>(['/api/tasks']);
      
      queryClient.setQueryData<Task[]>(['/api/tasks'], (old = []) => 
        old.filter(task => task.id !== taskId)
      );
      
      return { previousTasks };
    },
    onError: (error: any, taskId: string, context: any) => {
      // Rollback optimistic update
      if (context?.previousTasks) {
        queryClient.setQueryData(['/api/tasks'], context.previousTasks);
      }
      const errorMessage = error?.response?.error || error.message || "Failed to skip task";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
      queryClient.invalidateQueries({ queryKey: ['/api/progress'] });
      toast({
        title: "Task Skipped",
        description: data.message,
      });
    }
  });

  // Snooze task mutation
  const snoozeTaskMutation = useMutation({
    mutationFn: async ({ taskId, hours }: { taskId: string; hours: number }) => {
      const response = await apiRequest('POST', `/api/tasks/${taskId}/snooze`, { hours });
      return response.json();
    },
    onMutate: async ({ taskId }: { taskId: string; hours: number }) => {
      // Optimistic update - remove from pending list temporarily
      await queryClient.cancelQueries({ queryKey: ['/api/tasks'] });
      const previousTasks = queryClient.getQueryData<Task[]>(['/api/tasks']);
      
      queryClient.setQueryData<Task[]>(['/api/tasks'], (old = []) => 
        old.filter(task => task.id !== taskId)
      );
      
      return { previousTasks };
    },
    onError: (error: any, { taskId }: { taskId: string; hours: number }, context: any) => {
      // Rollback optimistic update
      if (context?.previousTasks) {
        queryClient.setQueryData(['/api/tasks'], context.previousTasks);
      }
      const errorMessage = error?.response?.error || error.message || "Failed to snooze task";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
    onSuccess: (data: any, { hours }: { taskId: string; hours: number }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
      queryClient.invalidateQueries({ queryKey: ['/api/progress'] });
      toast({
        title: "Task Snoozed",
        description: `Task postponed for ${hours} hour${hours !== 1 ? 's' : ''}`,
      });
    }
  });

  // Chat import mutation
  const importChatMutation = useMutation({
    mutationFn: async (chatData: {
      source: string;
      conversationTitle?: string;
      chatHistory: Array<{role: 'user' | 'assistant', content: string, timestamp?: string}>;
    }) => {
      const response = await apiRequest('POST', '/api/chat/import', chatData);
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/chat/imports'] });
      queryClient.invalidateQueries({ queryKey: ['/api/progress'] });
      toast({
        title: "Chat Imported Successfully!",
        description: data.message || `Created ${data.tasks?.length || 0} accountability tasks!`,
      });
      setChatText('');
      setChatTitle('');
      setActiveTab("tasks"); // Switch to tasks view
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.error || error.message || "Failed to import chat history. Please try again.";
      toast({
        title: "Import Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  });

  const handleChatImport = () => {
    if (!chatText.trim()) {
      toast({
        title: "Chat Text Required",
        description: "Please paste your chat conversation",
        variant: "destructive",
      });
      return;
    }

    try {
      // Parse the chat text into messages
      const lines = chatText.split('\n').filter(line => line.trim());
      const chatHistory: Array<{role: 'user' | 'assistant', content: string}> = [];
      
      let currentMessage = '';
      let currentRole: 'user' | 'assistant' = 'user';
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;
        
        // Detect role markers
        if (trimmedLine.toLowerCase().startsWith('user:') || trimmedLine.toLowerCase().startsWith('you:')) {
          if (currentMessage) {
            chatHistory.push({ role: currentRole, content: currentMessage.trim() });
          }
          currentRole = 'user';
          currentMessage = trimmedLine.substring(trimmedLine.indexOf(':') + 1).trim();
        } else if (trimmedLine.toLowerCase().startsWith('assistant:') || trimmedLine.toLowerCase().startsWith('ai:') || trimmedLine.toLowerCase().startsWith('chatgpt:') || trimmedLine.toLowerCase().startsWith('claude:')) {
          if (currentMessage) {
            chatHistory.push({ role: currentRole, content: currentMessage.trim() });
          }
          currentRole = 'assistant';
          currentMessage = trimmedLine.substring(trimmedLine.indexOf(':') + 1).trim();
        } else {
          currentMessage += (currentMessage ? ' ' : '') + trimmedLine;
        }
      }
      
      // Add the last message
      if (currentMessage) {
        chatHistory.push({ role: currentRole, content: currentMessage.trim() });
      }
      
      // Fallback: if no role markers found, treat entire text as user message
      if (chatHistory.length === 0) {
        chatHistory.push({ role: 'user', content: chatText.trim() });
      }

      importChatMutation.mutate({
        source: chatSource,
        conversationTitle: chatTitle || undefined,
        chatHistory
      });
    } catch (error) {
      console.error('Chat parsing error:', error);
      toast({
        title: "Parsing Error",
        description: "Could not parse chat format. Please check your chat text.",
        variant: "destructive",
      });
    }
  };

  // Complete tutorial mutation
  const completeTutorialMutation = useMutation({
    mutationFn: async () => {
      if (!user || typeof user !== 'object' || !('id' in user)) {
        return;
      }
      
      const isDemo = (user as any).id === 'demo-user';
      
      if (isDemo) {
        // For demo users, save to localStorage
        localStorage.setItem('demo-tutorial-completed', 'true');
        console.log('[TUTORIAL] Demo user tutorial marked as completed (localStorage)');
        return { success: true, isDemo: true };
      }
      
      // For authenticated users, save to database
      const response = await fetch(`/api/users/${(user as any).id}/complete-tutorial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark tutorial as completed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      if (data && !(data as any).isDemo) {
        // Only refetch for authenticated users
        queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      }
      console.log('[TUTORIAL] Tutorial marked as completed');
    },
    onError: (error) => {
      console.error('[TUTORIAL] Failed to mark tutorial as completed:', error);
    }
  });

  const handleTutorialComplete = () => {
    completeTutorialMutation.mutate();
  };

  // Create activity from plan mutation
  const createActivityMutation = useMutation({
    mutationFn: async (planData: { title: string; description: string; tasks: any[]; mode?: 'create' | 'update'; activityId?: string }) => {
      // Use explicit mode passed from the call site
      const mode = planData.mode || 'create';
      const activityId = planData.activityId || activityIdRef.current;
      
      if (mode === 'update' && activityId) {
        // Update existing activity
        const response = await apiRequest('POST', `/api/activities/${activityId}/update-from-dialogue`, {
          title: planData.title,
          description: planData.description,
          category: 'goal',
          tasks: planData.tasks.map(task => ({
            title: task.title,
            description: task.description,
            priority: task.priority || 'medium',
            category: task.category || 'general',
            timeEstimate: task.timeEstimate
          }))
        });
        return { ...await response.json(), mode: 'update' };
      } else {
        // Create new activity
        const response = await apiRequest('POST', '/api/activities/from-dialogue', {
          title: planData.title,
          description: planData.description,
          category: 'goal',
          tasks: planData.tasks.map(task => ({
            title: task.title,
            description: task.description,
            priority: task.priority || 'medium',
            category: task.category || 'general',
            timeEstimate: task.timeEstimate
          }))
        });
        return { ...await response.json(), mode: 'create' };
      }
    },
    onSuccess: async (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/progress'] });
      
      if (data.mode === 'update') {
        console.log('✅ Activity updated with ID:', data.id);
        
        // Show success message for edit
        toast({
          title: "Activity Updated!",
          description: "Your changes have been saved successfully.",
        });
        
        // Clear edit state
        setEditingActivity(null);
        setCurrentPlanOutput(null);
        setConversationHistory([]);
        activityIdRef.current = undefined;
        
        // Switch to activities tab to show the updated activity
        setActiveTab('activities');
      } else {
        console.log('✅ Activity created with ID:', data.id);
        
        // Update ref first to ensure all future refinements preserve this activityId
        activityIdRef.current = data.id;
        console.log('📌 Set activityIdRef.current to:', activityIdRef.current);
      }
      
      // Fetch the newly created tasks to get their IDs
      await queryClient.refetchQueries({ queryKey: ['/api/tasks'] });
      const updatedTasks = queryClient.getQueryData<Task[]>(['/api/tasks']) || [];
      
      // Get the task IDs from the response (backend should return created tasks)
      const createdTaskIds = data.tasks?.map((t: any) => t.id) || [];
      
      // Update current plan with the created activity ID AND the real tasks with IDs
      setCurrentPlanOutput(prev => {
        if (!prev) return null;
        
        // Map preview tasks to actual created tasks by matching title
        const tasksWithIds = prev.tasks.map((previewTask, index) => {
          // Try to find by ID first (if backend returned it)
          const taskId = createdTaskIds[index];
          if (taskId) {
            const createdTask = updatedTasks.find(t => t.id === taskId);
            if (createdTask) return createdTask;
          }
          
          // Fallback: match by title from recently fetched tasks
          const createdTask = updatedTasks.find(t => 
            t.title === previewTask.title &&
            !prev.tasks.some((pt, i) => i < index && pt.title === t.title) // Avoid duplicate matches
          );
          return createdTask || previewTask;
        });
        
        const updated = {
          ...prev,
          activityId: data.id,
          tasks: tasksWithIds
        };
        console.log('📝 Updated currentPlanOutput with activityId and real task IDs:', updated.activityId, tasksWithIds.map(t => t.id));
        return updated;
      });
      
      toast({
        title: "Activity Created!",
        description: `"${data.title}" is ready to share! Click "Your Activity" to view it.`,
      });
      // Keep plan visible so user can see the "Your Activity" button
    },
    onError: async (error: any) => {
      // Try to parse the error response from the Error message
      let errorData;
      try {
        // apiRequest throws Error with message like "403: {json}"
        const errorMessage = error?.message || '';
        const colonIndex = errorMessage.indexOf(':');
        if (colonIndex > 0) {
          const jsonPart = errorMessage.substring(colonIndex + 1).trim();
          errorData = JSON.parse(jsonPart);
        }
      } catch (e) {
        errorData = null;
      }
      
      // Check if this is a sign-in requirement error
      if (errorData?.requiresAuth) {
        toast({
          title: "Sign In to Continue",
          description: errorData.message || "Sign in to create unlimited activities and access all features",
          action: (
            <Button 
              size="sm"
              variant="default"
              onClick={() => {
                setShowSignInDialog(true);
              }}
              data-testid="button-toast-signin"
            >
              Sign In Now
            </Button>
          ),
        });
      } else {
        const errorMessage = errorData?.message || errorData?.error || error.message || "Failed to create activity. Please try again.";
        toast({
          title: "Activity Creation Failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    }
  });

  const pendingTasks = tasks.filter(task => !task.completed);
  const completedTasks = tasks.filter(task => task.completed);

  // Initialize completed activities on first load to prevent false celebrations
  useEffect(() => {
    if (activities.length > 0 && completedActivities.size === 0) {
      const alreadyCompleted = activities
        .filter(activity => activity.progressPercent === 100)
        .map(activity => activity.id);
      if (alreadyCompleted.length > 0) {
        setCompletedActivities(new Set(alreadyCompleted));
      }
    }
  }, [activities.length]); // Only run when activities first load

  // Check for newly completed activities and trigger confetti
  useEffect(() => {
    if (activities.length > 0 && completedActivities.size > 0) {
      activities.forEach(activity => {
        // Check if activity is 100% complete and hasn't been celebrated yet
        if (activity.progressPercent === 100 && !Array.from(completedActivities).includes(activity.id)) {
          // Mark this activity as celebrated
          setCompletedActivities(prev => new Set([...Array.from(prev), activity.id]));
          
          // Show confetti celebration
          setShowActivityConfetti(true);
          setActivityCelebration({
            title: `🎉 Activity Completed!`,
            description: `Congratulations! You've completed "${activity.title}"! All tasks are done! 🚀`
          });

          // Auto-hide confetti after 5 seconds, then show journal prompt
          setTimeout(() => {
            setShowActivityConfetti(false);
            setActivityCelebration(null);

            // Show journal prompt if not already prompted for this activity
            if (!promptedActivities.has(activity.id)) {
              setPostActivityPrompt({ open: true, activity });
            }
          }, 5000);

          // Show toast notification
          toast({
            title: "🎊 ACTIVITY COMPLETED! 🎊",
            description: `Amazing! You finished "${activity.title}" - All ${activity.totalTasks} tasks complete!`,
          });
        }
      });
    }
  }, [activities, completedActivities, toast, promptedActivities]);

  // Post-Activity Prompt handlers
  const handleQuickNote = (activityId: string, title: string) => {
    // Set activity context FIRST before opening journal
    setJournalActivityContext({ activityId, title });

    // Small delay to ensure state updates before opening dialog
    setTimeout(() => {
      setShowJournalMode(true);
    }, 10);

    // Mark as prompted
    const updated = new Set(promptedActivities);
    updated.add(activityId);
    setPromptedActivities(updated);
    localStorage.setItem('journalmate_prompted_activities', JSON.stringify(Array.from(updated)));
  };

  const handleSkipJournalPrompt = () => {
    if (postActivityPrompt.activity) {
      // Mark as prompted so we don't show again
      const updated = new Set(promptedActivities);
      updated.add(postActivityPrompt.activity.id);
      setPromptedActivities(updated);
      localStorage.setItem('journalmate_prompted_activities', JSON.stringify(Array.from(updated)));
    }
  };

  const handleRemindLater = () => {
    // Don't mark as prompted, so it can show again later
    toast({
      title: "We'll remind you later",
      description: "Journal prompt will appear next time you open the app"
    });
  };

  // Tab options for mobile dropdown
  const tabOptions = [
    { value: "input", label: "Goal Input", shortLabel: "Input", icon: Mic },
    { value: "discover", label: "Discover", shortLabel: "Discover", icon: Globe2 },
    { value: "activities", label: `Activities (${activities.length})`, shortLabel: "Activities", icon: CheckSquare },
    { value: "tasks", label: `All Tasks (${tasks.length})`, shortLabel: "Tasks", icon: Target },
    { value: "progress", label: "Progress", shortLabel: "Stats", icon: BarChart3 },
    { value: "groups", label: "Groups", shortLabel: "Groups", icon: Users },
    { value: "sync", label: "Integrations", shortLabel: "Integrations", icon: Plug },
    { value: "about", label: "About", shortLabel: "About", icon: Info }
  ];

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Header */}
      <header className="shrink-0 border-b border-border bg-card/50 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Sidebar toggle (keep visible even when plan is active) */}
              {(isMobile || !open) && <SidebarTrigger data-testid="button-sidebar-toggle" />}
              
              <div 
                className="flex items-center gap-2 sm:gap-3 cursor-pointer" 
                onClick={() => setActiveTab('input')}
                data-testid="header-logo"
              >
                <div className="w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center hover-elevate rounded-md">
                  <img src="/journalmate-logo-transparent.png" alt="JournalMate" className="w-12 h-12 sm:w-16 sm:h-16 object-contain" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg sm:text-2xl font-bold text-foreground">JournalMate</h1>
                    {((user as any)?.subscriptionTier === 'pro' || (user as any)?.subscriptionTier === 'family') && (
                      <ProBadge size="md" variant="full" />
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                    {currentPlanOutput ? "AI Action Plan Active" : "Transform Goals into Reality"}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-3">
              {/* Help/Tutorial Icon - Pulse for demo users who haven't seen it */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative">
                    {(user as any)?.id === 'demo-user' && !localStorage.getItem('demo-tutorial-completed') && (
                      <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowTutorial(true)}
                      data-testid="button-tutorial"
                      aria-label={isAuthenticated && (user as any)?.id !== 'demo-user' ? 'Help & Tutorial' : 'Help & Live Demo'}
                    >
                      <Info className="w-4 h-4" />
                    </Button>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isAuthenticated && (user as any)?.id !== 'demo-user' ? 'Help & Tutorial' : 'Help & Live Demo'}</p>
                </TooltipContent>
              </Tooltip>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <div className="max-w-6xl mx-auto">
          {/* Navigation */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            {/* Mobile Dropdown Navigation */}
            <div className="sm:hidden mb-4">
              <Select value={activeTab} onValueChange={setActiveTab}>
                <SelectTrigger className="w-full" data-testid="mobile-nav-dropdown">
                  <div className="flex items-center gap-2">
                    {(() => {
                      const currentTab = tabOptions.find(tab => tab.value === activeTab);
                      const IconComponent = currentTab?.icon || Mic;
                      return <IconComponent className="w-4 h-4" />;
                    })()}
                    <SelectValue placeholder="Select Page" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {tabOptions.map((option) => {
                    // Use full label for dropdown options to show counts
                    const displayLabel = option.value === 'activities' ? `Activities (${activities.length})` :
                                       option.value === 'tasks' ? `Tasks (${tasks.length})` :
                                       option.shortLabel;
                    return (
                      <SelectItem key={option.value} value={option.value} data-testid={`mobile-nav-${option.value}`}>
                        {displayLabel}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Desktop Tab Navigation */}
            <div className="w-full overflow-x-auto">
              <TabsList className="hidden sm:inline-flex w-max min-w-full mb-4 sm:mb-8 bg-muted/30 p-1 h-12 flex-nowrap gap-2">
                <TabsTrigger value="input" className="gap-2 text-sm font-medium" data-testid="tab-input">
                  <Mic className="w-4 h-4" />
                  <span>Goal Input</span>
                </TabsTrigger>
                <TabsTrigger value="discover" className="gap-2 text-sm font-medium" data-testid="tab-discover">
                  <Globe2 className="w-4 h-4" />
                  <span>Discover</span>
                </TabsTrigger>
                <TabsTrigger value="activities" className="gap-2 text-sm font-medium" data-testid="tab-activities">
                  <CheckSquare className="w-4 h-4" />
                  <span>Activities ({activities.length})</span>
                </TabsTrigger>
                <TabsTrigger value="tasks" className="gap-2 text-sm font-medium" data-testid="tab-all-tasks">
                  <Target className="w-4 h-4" />
                  <span>All Tasks ({tasks.length})</span>
                </TabsTrigger>
                <TabsTrigger value="progress" className="gap-2 text-sm font-medium" data-testid="tab-progress">
                  <BarChart3 className="w-4 h-4" />
                  <span>Progress</span>
                </TabsTrigger>
                <TabsTrigger value="groups" className="gap-2 text-sm font-medium" data-testid="tab-groups">
                  <Users className="w-4 h-4" />
                  <span>Groups</span>
                </TabsTrigger>
                <TabsTrigger value="sync" className="gap-2 text-sm font-medium" data-testid="tab-integrations">
                  <Plug className="w-4 h-4" />
                  <span>Integrations</span>
                </TabsTrigger>
                <TabsTrigger value="about" className="gap-2 text-sm font-medium" data-testid="tab-about">
                  <Info className="w-4 h-4" />
                  <span>About</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Discover Tab */}
            <TabsContent value="discover" className="space-y-6 pb-20">
              <DiscoverPlansView 
                onSignInRequired={() => setShowDiscoverSignIn(true)}
              />
            </TabsContent>

            {/* Goal Input Tab */}
            <TabsContent value="input" className="space-y-6 pb-20">
              {editingActivity && (
                <div className="max-w-4xl mx-auto mb-6 px-4">
                  <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Edit className="w-5 h-5 text-primary" />
                        <h3 className="font-semibold text-lg">Editing: {editingActivity.title}</h3>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingActivity(null);
                          setCurrentPlanOutput(null);
                          setConversationHistory([]);
                          activityIdRef.current = undefined;
                        }}
                        data-testid="button-cancel-edit"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Tell me what you'd like to change - modify tasks, update description, adjust priority, or anything else.
                    </p>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p><strong>Category:</strong> {editingActivity.category}</p>
                      {editingActivity.planSummary && <p><strong>Current Plan:</strong> {editingActivity.planSummary}</p>}
                    </div>
                  </div>
                </div>
              )}
              
              <div className="text-center mb-6 px-4">
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                  {editingActivity ? 'What would you like to change?' : 'What do you want to achieve?'}
                </h2>
                <p className="text-sm sm:text-base text-muted-foreground">
                  {editingActivity 
                    ? 'Describe your changes naturally - the AI will understand and update your activity'
                    : 'Share your goals through voice or text - AI will create actionable tasks for you'}
                </p>
              </div>
              
              <VoiceInput
                onSubmit={(text) => processGoalMutation.mutate(text)}
                isGenerating={processGoalMutation.isPending}
              />

              {/* Interactive Options */}
              {!currentPlanOutput && !showThemeSelector && !showLocationDatePlanner && !showLifestylePlanner && (
                <div className="max-w-4xl mx-auto space-y-6">
                  {/* Quick Action Buttons */}
                  <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-4 mb-6">
                    <Button
                      onClick={() => {
                        if (isAuthenticated) {
                          onShowLifestylePlanner(true);
                        } else {
                          setShowJournalSignIn(true);
                        }
                      }}
                      variant="outline"
                      className="gap-2"
                      data-testid="button-lifestyle-planner"
                    >
                      <BookOpen className="w-4 h-4" />
                      Personal Journal
                    </Button>
                    <Button
                      onClick={() => onShowThemeSelector(true)}
                      variant="outline"
                      className="gap-2"
                      data-testid="button-theme-selector"
                    >
                      <Target className="w-4 h-4" />
                      Set Daily Theme
                    </Button>
                    <Button
                      onClick={() => onShowLocationDatePlanner(true)}
                      variant="outline"
                      className="gap-2"
                      data-testid="button-date-planner"
                    >
                      <Heart className="w-4 h-4" />
                      <span className="flex items-center gap-1.5">
                        Plan a Date
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="secondary" className="text-xs" data-testid="badge-date-planner-beta">
                              Beta
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            Uses curated venue suggestions
                          </TooltipContent>
                        </Tooltip>
                      </span>
                    </Button>
                  </div>

                  {/* Example goals */}
                  <div className="max-w-2xl mx-auto">
                    <p className="text-sm text-muted-foreground mb-4 text-center">Or try these quick examples:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { text: "Devise a workout plan", theme: "Health & Fitness", Icon: Dumbbell },
                        { text: "Focus on work productivity", theme: "Work Focus", Icon: Briefcase }, 
                        { text: "Trade stocks using AI insights", theme: "Investment", Icon: TrendingUp },
                        { text: "Create morning devotion plan", theme: "Spiritual", Icon: BookOpen },
                        { text: "Plan perfect date night", theme: "Romance", Icon: Heart },
                        { text: "Explore hiking adventures", theme: "Adventure", Icon: Mountain }
                      ].map((example, index) => {
                        const { Icon } = example;
                        return (
                          <Button
                            key={index}
                            variant="outline"
                            size="lg"
                            onClick={() => processGoalMutation.mutate(example.text)}
                            disabled={processGoalMutation.isPending}
                            className="text-left justify-start h-auto p-3 flex-col items-start gap-2 min-h-[80px]"
                            data-testid={`button-example-${index}`}
                          >
                            <div className="flex items-center gap-2 w-full">
                              <Icon className="w-4 h-4 text-primary flex-shrink-0" />
                              <Badge variant="secondary" className="text-xs">
                                {example.theme}
                              </Badge>
                            </div>
                            <span className="text-sm leading-tight overflow-hidden text-ellipsis">{example.text}</span>
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Theme Selector Modal */}
              <Dialog open={showThemeSelector} onOpenChange={onShowThemeSelector}>
                <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader backLabel="Back to Planning">
                    <DialogTitle>Set Your Daily Theme</DialogTitle>
                    <DialogDescription>
                      Choose a focus area to get personalized goal suggestions and themed planning
                    </DialogDescription>
                  </DialogHeader>
                  <ThemeSelector
                    selectedTheme={selectedTheme}
                    onThemeSelect={onThemeSelect}
                    onGenerateGoal={(goal) => {
                      processGoalMutation.mutate(goal);
                      onShowThemeSelector(false);
                    }}
                  />
                </DialogContent>
              </Dialog>

              {/* Location Date Planner Modal */}
              <Dialog open={showLocationDatePlanner} onOpenChange={onShowLocationDatePlanner}>
                <DialogContent className="max-w-[95vw] sm:max-w-4xl">
                  <DialogHeader backLabel="Back to Planning">
                    <DialogTitle>Plan Your Perfect Date</DialogTitle>
                    <DialogDescription>
                      Let us help you find the perfect spots for your date based on your location
                    </DialogDescription>
                  </DialogHeader>
                  <LocationDatePlanner
                    onPlanGenerated={(plan) => {
                      processGoalMutation.mutate(plan);
                      onShowLocationDatePlanner(false);
                    }}
                  />
                </DialogContent>
              </Dialog>

              {/* Claude-style Plan Output */}
              {currentPlanOutput && (
                <div className="max-w-4xl mx-auto overflow-y-auto">
                  {/* Back to Input Button */}
                  <div className="flex items-center justify-between mb-6 p-4 bg-muted/30 rounded-lg">
                    <Button
                      variant="outline"
                      onClick={() => {
                        // Don't reset conversation history here - user might want to refine
                        setCurrentPlanOutput(null);
                      }}
                      className="gap-2"
                      data-testid="button-back-to-input"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back to Goal Input
                    </Button>
                    {currentPlanOutput.activityId ? (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedActivityId(currentPlanOutput.activityId || null);
                          setActiveTab('activities');
                        }}
                        className="gap-2"
                        data-testid="button-view-your-activity"
                      >
                        <Target className="w-4 h-4" />
                        Your Activity
                      </Button>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        {planVersion === 1 ? 'AI-Generated Action Plan' : `Refined Plan v${planVersion}`}
                      </div>
                    )}
                  </div>
                  
                  <ClaudePlanOutput
                    planTitle={currentPlanOutput.planTitle}
                    summary={currentPlanOutput.summary}
                    tasks={currentPlanOutput.tasks.map(task => {
                      // Merge with actual task data to get updated completion status
                      const actualTask = tasks.find(t => t.id === task.id);
                      return {
                        ...task,
                        description: task.description || '',
                        priority: (task.priority as 'high' | 'low' | 'medium') || 'medium',
                        completed: actualTask?.completed ?? task.completed ?? false,
                        timeEstimate: task.timeEstimate || undefined,
                        context: task.context || undefined
                      };
                    })}
                    estimatedTimeframe={currentPlanOutput.estimatedTimeframe}
                    motivationalNote={currentPlanOutput.motivationalNote}
                    activityId={currentPlanOutput.activityId}
                    sourceUrl={currentPlanOutput.sourceUrl}
                    importId={currentPlanOutput.importId}
                    onCompleteTask={(taskId) => completeTaskMutation.mutate(taskId)}
                    onCreateActivity={(planData) => {
                      if (!createActivityMutation.isPending) {
                        createActivityMutation.mutate(planData);
                      }
                    }}
                    isCreating={createActivityMutation.isPending}
                    onSetAsTheme={() => {
                      // TODO: Implement theme/quick actions functionality
                      toast({
                        title: "Theme Set!",
                        description: "This plan is now your focus theme for today. (Feature coming soon!)",
                      });
                    }}
                    onOpenSharePreview={async (activityId: string) => {
                      // Fetch full activity data and open SharePreviewDialog
                      const activity = activities?.find(a => a.id === activityId);
                      if (activity) {
                        setSharePreviewDialog({ open: true, activity });
                      }
                    }}
                    backdrop={activities?.find(a => a.id === currentPlanOutput.activityId)?.backdrop ?? undefined}
                    showConfetti={true}
                  />
                  
                  {/* Action buttons */}
                  <div className="flex justify-center gap-4 mt-8">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setCurrentPlanOutput(null);
                        setConversationHistory([]);
                        setPlanVersion(0);
                        setCurrentSessionId(null);
                        activityIdRef.current = undefined; // Reset ref
                      }}
                      data-testid="button-new-goal"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      New Goal
                    </Button>
                    <Button
                      variant="default"
                      onClick={() => setActiveTab("tasks")}
                      data-testid="button-view-all-tasks"
                    >
                      <CheckSquare className="w-4 h-4 mr-2" />
                      View All Tasks
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Activities Tab - Primary Focus */}
            <TabsContent value="activities" className="space-y-6 pb-20">
              <div className="text-center mb-6 px-4">
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Your Activities</h2>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Shareable activities with progress tracking and social features. Click an activity to view its tasks.
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-3 mb-6">
                <Button
                  onClick={() => setActiveTab("input")}
                  className="gap-2"
                  data-testid="button-create-activity"
                >
                  <Plus className="w-4 h-4" />
                  Create New Activity
                </Button>
                <Link href="/discover">
                  <Button
                    variant="secondary"
                    className="gap-2"
                    data-testid="button-discover-plans"
                  >
                    <Sparkles className="w-4 h-4" />
                    Discover Plans
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  onClick={() => refetchActivities()}
                  className="gap-2"
                  data-testid="button-refresh-activities"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </Button>
              </div>

              {activitiesLoading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Loading activities...</p>
                </div>
              ) : activitiesError ? (
                <div className="text-center py-8">
                  <p className="text-destructive">Failed to load activities. Please try again.</p>
                  <Button onClick={() => refetchActivities()} variant="outline" className="mt-4">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retry
                  </Button>
                </div>
              ) : activities.length === 0 ? (
                <div className="text-center py-12">
                  <CheckSquare className="mx-auto w-16 h-16 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-medium text-foreground mb-2">No Activities Yet</h3>
                  <p className="text-muted-foreground mb-6">
                    Create activities with goals to generate tasks automatically
                  </p>
                  <Button onClick={() => setActiveTab("input")} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Create Your First Goal
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 max-w-4xl mx-auto">
                  {activities.map((activity) => {
                    // Use real progress data from ActivityWithProgress type
                    const activityWithProgress = activity as any; // TODO: Type properly with ActivityWithProgress
                    const completedTasks = activityWithProgress.completedTasks || 0;
                    const totalTasks = activityWithProgress.totalTasks || 0;
                    const progressPercent = activityWithProgress.progressPercent || 0;
                    
                    return (
                      <div
                        key={activity.id}
                        className="bg-card border rounded-xl overflow-hidden hover-elevate cursor-pointer"
                        onClick={() => {
                          // Navigate to tasks tab and show tasks for this activity
                          setSelectedActivityId(activity.id);
                          setActiveTab('tasks');
                        }}
                        data-testid={`activity-card-${activity.id}`}
                      >
                        <div className="w-full p-4 sm:p-6">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start gap-2 mb-2">
                                <h3 className="text-base sm:text-lg font-semibold break-words flex-1">{activity.title}</h3>
                                <Badge variant="secondary" className="text-xs shrink-0">{activity.category || 'General'}</Badge>
                              </div>
                              <p className="text-muted-foreground text-sm line-clamp-2 break-words">
                                {activity.description || 'No description provided'}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 sm:ml-4 shrink-0">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    const currentState = activity.isPublic;
                                    const newIsPublic = !currentState;
                                    
                                    const response = await fetch(`/api/activities/${activity.id}`, {
                                      method: 'PATCH',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ isPublic: newIsPublic })
                                    });
                                    
                                    if (!response.ok) {
                                      throw new Error('Failed to update privacy');
                                    }
                                    
                                    await response.json();
                                    
                                    // Refetch activities to get the latest data
                                    await queryClient.refetchQueries({ queryKey: ['/api/activities'] });
                                    
                                    toast({ 
                                      title: newIsPublic ? "Made Public" : "Made Private", 
                                      description: newIsPublic 
                                        ? "Activity can now be shared publicly. Click the share button to continue." 
                                        : "Activity is now private and cannot be shared"
                                    });
                                  } catch (error) {
                                    console.error('Privacy toggle error:', error);
                                    await queryClient.refetchQueries({ queryKey: ['/api/activities'] });
                                    toast({
                                      title: "Update Failed",
                                      description: "Unable to update privacy settings. Please try again.",
                                      variant: "destructive"
                                    });
                                  }
                                }}
                                data-testid={`button-privacy-${activity.id}`}
                                title={activity.isPublic ? "Make Private" : "Make Public"}
                              >
                                {activity.isPublic ? (
                                  <Unlock className="w-4 h-4 text-green-600" />
                                ) : (
                                  <Lock className="w-4 h-4 text-muted-foreground" />
                                )}
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                disabled={!activity.isPublic || !user || (user as any).authenticationMethod === 'demo'}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  
                                  // Check if user is signed in
                                  if (!user || (user as any).authenticationMethod === 'demo') {
                                    toast({
                                      title: "Sign In Required",
                                      description: "Please sign in to share your activities with others",
                                      action: (
                                        <Button 
                                          size="sm"
                                          variant="default"
                                          onClick={() => setShowSignInDialog(true)}
                                          data-testid="button-toast-signin-share"
                                        >
                                          Sign In
                                        </Button>
                                      )
                                    });
                                    return;
                                  }
                                  
                                  if (!activity.isPublic) {
                                    toast({
                                      title: "Activity is Private",
                                      description: "Make the activity public first before sharing.",
                                      variant: "default"
                                    });
                                    return;
                                  }
                                  
                                  // Open share preview dialog
                                  setSharePreviewDialog({ open: true, activity });
                                }}
                                data-testid={`button-share-${activity.id}`}
                                title={
                                  !user || (user as any).authenticationMethod === 'demo' 
                                    ? "Sign in to share activities" 
                                    : activity.isPublic 
                                      ? "Share to social media or contacts" 
                                      : "Make activity public first to share"
                                }
                                className="group"
                              >
                                <Share2 className={`w-4 h-4 transition-all duration-300 ${
                                  activity.isPublic 
                                    ? 'text-blue-600 group-hover:drop-shadow-[0_0_6px_rgba(37,99,235,0.5)] group-hover:scale-110' 
                                    : 'text-muted-foreground group-hover:drop-shadow-[0_0_4px_rgba(147,51,234,0.3)] group-hover:scale-105'
                                }`} />
                              </Button>
                              {activity.isPublic && activity.shareableLink && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      await navigator.clipboard.writeText(activity.shareableLink!);
                                      toast({
                                        title: "🔗 Link Copied!",
                                        description: "Share link copied to clipboard"
                                      });
                                    } catch (error) {
                                      toast({
                                        title: "Copy Failed",
                                        description: "Unable to copy link to clipboard",
                                        variant: "destructive"
                                      });
                                    }
                                  }}
                                  data-testid={`button-copy-link-${activity.id}`}
                                  title="Copy shareable link"
                                  className="group"
                                >
                                  <Link2 className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    // Toggle like status
                                    const response = await fetch(`/api/activities/${activity.id}/feedback`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ feedbackType: 'like' })
                                    });
                                    
                                    if (!response.ok) {
                                      throw new Error('Failed to save feedback');
                                    }
                                    
                                    const result = await response.json();
                                    
                                    // Refetch activities to update feedback state
                                    await queryClient.refetchQueries({ queryKey: ['/api/activities'] });
                                    
                                    toast({
                                      title: result.feedback ? "Liked!" : "Like removed",
                                      description: result.feedback ? "Activity added to your favorites" : "Activity removed from favorites"
                                    });
                                  } catch (error) {
                                    console.error('Like toggle error:', error);
                                    toast({
                                      title: "Failed to save",
                                      description: "Unable to save your feedback. Please try again.",
                                      variant: "destructive"
                                    });
                                  }
                                }}
                                data-testid={`button-like-${activity.id}`}
                                title={(activity as any).userLiked ? "Unlike this activity" : "Like this activity"}
                                className="group"
                              >
                                <Heart className={`w-4 h-4 transition-all duration-300 ${
                                  (activity as any).userLiked 
                                    ? 'text-red-600 fill-red-600 group-hover:scale-110' 
                                    : 'text-muted-foreground group-hover:text-red-600 group-hover:scale-105'
                                }`} />
                              </Button>
                              {progressPercent > 0 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setJournalActivityContext({
                                      activityId: activity.id,
                                      title: activity.title
                                    });
                                    setShowJournalMode(true);
                                  }}
                                  data-testid={`button-journal-${activity.id}`}
                                  title="Journal about this activity"
                                  className={`transition-all duration-300 ${
                                    progressPercent === 100
                                      ? 'text-purple-600 animate-pulse hover:scale-110'
                                      : 'hover:text-purple-600'
                                  }`}
                                >
                                  <BookOpen className="w-4 h-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingActivity(activity);
                                  setActiveTab('input');
                                }}
                                data-testid={`button-edit-${activity.id}`}
                                title="Edit activity with AI"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleArchiveActivity.mutate(activity.id);
                                }}
                                disabled={handleArchiveActivity.isPending}
                                data-testid={`button-archive-${activity.id}`}
                                title="Archive activity"
                              >
                                <Archive className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteDialog({ open: true, activity });
                                }}
                                disabled={handleDeleteActivity.isPending}
                                data-testid={`button-delete-${activity.id}`}
                                className="text-destructive hover:text-destructive"
                                title="Delete activity"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4">
                            <div className="flex items-center gap-1 text-sm">
                              <CheckSquare className="w-4 h-4 text-green-600" />
                              <span className="font-medium">{completedTasks}/{totalTasks}</span>
                              <span className="text-muted-foreground">tasks</span>
                            </div>
                            <div className="flex items-center gap-1 text-sm">
                              <Badge variant="outline" className="text-xs font-semibold text-primary">
                                {progressPercent}% Complete
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1 text-sm">
                              <Badge variant="outline" className="text-xs">
                                <span className="capitalize">{activity.status || 'planning'}</span>
                              </Badge>
                            </div>
                            {activity.endDate && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Calendar className="w-4 h-4" />
                                <span className="whitespace-nowrap">Due {new Date(activity.endDate).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>

                          {/* Progress Bar with Percentage */}
                          <div className="w-full bg-muted rounded-full h-3 relative">
                            <div 
                              className="bg-gradient-to-r from-primary to-primary/80 rounded-full h-3 transition-all duration-500 flex items-center justify-center" 
                              style={{ width: `${progressPercent}%` }}
                            >
                              {progressPercent > 20 && (
                                <span className="text-xs font-semibold text-primary-foreground px-2">
                                  {progressPercent}%
                                </span>
                              )}
                            </div>
                            {progressPercent <= 20 && progressPercent > 0 && (
                              <div className="absolute inset-0 flex items-center justify-start pl-2">
                                <span className="text-xs font-semibold text-foreground">
                                  {progressPercent}%
                                </span>
                              </div>
                            )}
                          </div>
                          
                          <div className="mt-3 text-center">
                            <p className="text-xs text-muted-foreground">
                              Click to view tasks →
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* All Tasks Tab */}
            <TabsContent value="tasks" className="space-y-6 pb-20">
              <div className="text-center mb-6 px-4">
                {selectedActivityId ? (
                  <>
                    <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Activity Tasks</h2>
                    <p className="text-sm sm:text-base text-muted-foreground">
                      Tasks for: {activities.find(a => a.id === selectedActivityId)?.title || 'Selected Activity'}
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        setActiveTab("activities");
                        setSelectedActivityId(null);
                      }}
                      className="mt-2"
                      data-testid="button-back-to-activity"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      <span className="hidden sm:inline">Back to {activities.find(a => a.id === selectedActivityId)?.title || 'Activity'}</span>
                      <span className="sm:hidden">Back</span>
                    </Button>
                  </>
                ) : (
                  <>
                    <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">All Tasks</h2>
                    <p className="text-sm sm:text-base text-muted-foreground">
                      Manage and track all your tasks. Use filters to find specific tasks.
                    </p>
                  </>
                )}
              </div>

              {tasksLoading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Loading tasks...</p>
                </div>
              ) : tasksError ? (
                <div className="text-center py-8">
                  <p className="text-destructive">Failed to load tasks. Please try again.</p>
                  <Button onClick={() => refetchTasks()} variant="outline" className="mt-4">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retry
                  </Button>
                </div>
              ) : tasks.length === 0 ? (
                <div className="text-center py-12">
                  <CheckSquare className="mx-auto w-16 h-16 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-medium text-foreground mb-2">No Tasks Yet</h3>
                  <p className="text-muted-foreground mb-6">
                    Create activities with goals to generate tasks automatically
                  </p>
                  <Button onClick={() => setActiveTab("input")} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Create Your First Goal
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 max-w-4xl mx-auto">
                  {/* Filter and Search Controls */}
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:justify-between sm:items-center mb-6">
                    <div className="flex flex-wrap gap-2 sm:gap-4 items-center">
                      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger className="w-28 sm:w-32">
                          <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="health">Health</SelectItem>
                          <SelectItem value="fitness">Fitness</SelectItem>
                          <SelectItem value="work">Work</SelectItem>
                          <SelectItem value="personal">Personal</SelectItem>
                          <SelectItem value="goal">Goal</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                        <SelectTrigger className="w-28 sm:w-32">
                          <SelectValue placeholder="Priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Select value={filter} onValueChange={setFilter}>
                        <SelectTrigger className="w-32 sm:w-40">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Tasks</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <Input
                      type="text"
                      placeholder="Search tasks..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full sm:max-w-xs"
                      data-testid="input-search-tasks"
                    />
                  </div>

                  {/* Task Cards */}
                  {(() => {
                    // Show loading state for activity tasks
                    if (selectedActivityId && activityTasksLoading) {
                      return (
                        <div className="text-center py-8">
                          <p className="text-muted-foreground">Loading tasks for selected activity...</p>
                        </div>
                      );
                    }

                    // Show error state for activity tasks
                    if (selectedActivityId && activityTasksError) {
                      return (
                        <div className="text-center py-8">
                          <p className="text-destructive">Failed to load activity tasks. Please try again.</p>
                        </div>
                      );
                    }

                    // Use either activity-specific tasks or all tasks
                    let filteredTasks = selectedActivityId 
                      ? (activityTasks || [])
                      : tasks;

                    // Apply other filters
                    filteredTasks = filteredTasks.filter(task => {
                      const categoryMatch = selectedCategory === 'all' || task.category === selectedCategory;
                      const priorityMatch = selectedPriority === 'all' || task.priority === selectedPriority;
                      const statusMatch = filter === 'all' || 
                        (filter === 'completed' && task.completed) ||
                        (filter === 'active' && !task.completed) ||
                        (filter === 'pending' && !task.completed);
                      const searchMatch = searchQuery === '' || 
                        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()));
                      
                      return categoryMatch && priorityMatch && statusMatch && searchMatch;
                    });

                    if (filteredTasks.length === 0) {
                      return (
                        <div className="text-center py-8">
                          <CheckSquare className="mx-auto w-12 h-12 text-muted-foreground mb-4" />
                          <p className="text-muted-foreground">
                            {selectedActivityId 
                              ? "No tasks found for this activity with the current filters." 
                              : searchQuery || selectedCategory !== 'all' || selectedPriority !== 'all' || filter !== 'all'
                                ? "No tasks match your current filters."
                                : "No tasks available."}
                          </p>
                        </div>
                      );
                    }

                    return filteredTasks.map(task => (
                      <TaskCard
                        key={task.id}
                        task={{
                          ...task,
                          description: task.description || '',
                          priority: (task.priority as 'low' | 'medium' | 'high') || 'medium',
                          completed: task.completed ?? false,
                          dueDate: task.dueDate ? new Date(task.dueDate).toISOString() : undefined
                        }}
                        onComplete={handleCompleteTask}
                        onSkip={handleSkipTask}
                        onSnooze={handleSnoozeTask}
                        onArchive={(taskId: string) => handleArchiveTask.mutate(taskId)}
                        showConfetti={true}
                        data-testid={`task-card-${task.id}`}
                      />
                    ));
                  })()}
                </div>
              )}
            </TabsContent>

            {/* Progress Tab */}
            <TabsContent value="progress" className="space-y-6 pb-20">
              <SignInGate feature="Progress tracking">
                {progressLoading ? (
                  <div className="text-center py-12">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading your progress...</p>
                  </div>
                ) : progressData ? (
                  <ProgressDashboard data={progressData} />
                ) : (
                  <div className="text-center py-12">
                    <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No progress data yet</h3>
                    <p className="text-muted-foreground">Complete some tasks to see your analytics!</p>
                  </div>
                )}
              </SignInGate>

              {/* Lifestyle Suggestions */}
              {progressData?.lifestyleSuggestions && progressData.lifestyleSuggestions.length > 0 && (
                <div className="max-w-2xl mx-auto">
                  <h3 className="text-lg font-semibold mb-4 text-center flex items-center justify-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    AI Lifestyle Suggestions
                  </h3>
                  <div className="grid gap-3">
                    {progressData.lifestyleSuggestions.map((suggestion, index) => (
                      <div key={index} className="bg-secondary/20 border border-secondary/30 rounded-lg p-4">
                        <p className="text-sm text-foreground">{suggestion}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* App Integrations Tab */}
            <TabsContent value="sync" className="h-full flex flex-col pb-20">
              <SignInGate feature="App integrations">
                <div className="max-w-4xl mx-auto space-y-8">
                  
                  {/* Import Content to Plan - Hero Section */}
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <Upload className="w-7 h-7 text-primary" />
                      <h2 className="text-2xl font-bold text-foreground">Import Content to Plan</h2>
                    </div>
                    <p className="text-muted-foreground max-w-lg mx-auto">
                      Share or paste content from anywhere. We'll extract it, create an actionable plan, and add it to your journal.
                    </p>
                  </div>

                  {/* Supported Sources */}
                  <Card className="p-6">
                    <p className="text-xs font-semibold text-muted-foreground text-center mb-4 tracking-wider">SUPPORTED SOURCES</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Social Media Column */}
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-3">Social Media</p>
                        <div className="flex flex-wrap gap-2">
                          <Badge className="bg-gradient-to-r from-pink-500 to-purple-500 text-white border-0 gap-1.5">
                            <SiInstagram className="w-3 h-3" /> Instagram
                          </Badge>
                          <Badge className="bg-black text-white border-0 gap-1.5">
                            <SiTiktok className="w-3 h-3" /> TikTok
                          </Badge>
                          <Badge className="bg-red-600 text-white border-0 gap-1.5">
                            <Youtube className="w-3 h-3" /> YouTube
                          </Badge>
                          <Badge className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 border-0 gap-1.5">
                            <SiX className="w-3 h-3" /> Twitter/X
                          </Badge>
                          <Badge className="bg-blue-600 text-white border-0 gap-1.5">
                            <SiFacebook className="w-3 h-3" /> Facebook
                          </Badge>
                          <Badge className="bg-orange-600 text-white border-0 gap-1.5">
                            <SiReddit className="w-3 h-3" /> Reddit
                          </Badge>
                        </div>
                      </div>

                      {/* AI & Files Column */}
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-3">AI & Files</p>
                        <div className="flex flex-wrap gap-2">
                          <Badge className="bg-green-600 text-white border-0 gap-1.5">
                            <SiOpenai className="w-3 h-3" /> ChatGPT
                          </Badge>
                          <Badge className="bg-purple-600 text-white border-0 gap-1.5">
                            <SiClaude className="w-3 h-3" /> Claude
                          </Badge>
                          <Badge className="bg-blue-500 text-white border-0 gap-1.5">
                            <SiGooglegemini className="w-3 h-3" /> Gemini
                          </Badge>
                          <Badge className="bg-emerald-600 text-white border-0 gap-1.5">
                            <FileText className="w-3 h-3" /> Articles
                          </Badge>
                          <Badge className="bg-blue-700 text-white border-0 gap-1.5">
                            <FileText className="w-3 h-3" /> Docs
                          </Badge>
                          <Badge className="bg-pink-600 text-white border-0 gap-1.5">
                            <Image className="w-3 h-3" /> Images
                          </Badge>
                          <Badge className="bg-red-700 text-white border-0 gap-1.5">
                            <FileText className="w-3 h-3" /> PDFs
                          </Badge>
                          <Badge className="bg-violet-600 text-white border-0 gap-1.5">
                            <Video className="w-3 h-3" /> Videos
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Paste from Clipboard Button */}
                    <div className="mt-6 space-y-3">
                      <Button 
                        onClick={async () => {
                          try {
                            const text = await navigator.clipboard.readText();
                            if (text) {
                              setChatText(text);
                              toast({
                                title: "Content pasted",
                                description: "Content from clipboard has been added. Click Import to create your plan."
                              });
                            }
                          } catch (err) {
                            toast({
                              title: "Clipboard access denied",
                              description: "Please paste your content manually in the text area below.",
                              variant: "destructive"
                            });
                          }
                        }}
                        className="w-full bg-gradient-to-r from-purple-600 to-emerald-600 hover:from-purple-700 hover:to-emerald-700 text-white"
                        data-testid="button-paste-clipboard"
                      >
                        <ClipboardPaste className="w-4 h-4 mr-2" />
                        Paste from Clipboard
                      </Button>
                      <p className="text-xs text-muted-foreground text-center">
                        On mobile, use the share button in any app to send content directly to JournalMate
                      </p>
                    </div>
                  </Card>

                  {/* How to Share on Mobile */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Share2 className="w-5 h-5 text-purple-600" />
                      How to Share on Mobile
                    </h3>
                    <div className="space-y-4">
                      <div className="flex gap-3 items-start p-3 bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-900/20 dark:to-purple-900/20 rounded-lg">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center shrink-0">
                          <SiInstagram className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">Found a workout routine on Instagram?</p>
                          <p className="text-xs text-muted-foreground">Tap Share → Select JournalMate → Get your personalized workout plan!</p>
                        </div>
                      </div>
                      <div className="flex gap-3 items-start p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                        <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                          <SiOpenai className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">Had a trip planning chat with ChatGPT?</p>
                          <p className="text-xs text-muted-foreground">Copy the conversation → Paste here → Get actionable travel tasks!</p>
                        </div>
                      </div>
                      <div className="flex gap-3 items-start p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center shrink-0">
                          <Youtube className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">Watching a cooking tutorial on YouTube?</p>
                          <p className="text-xs text-muted-foreground">Tap Share → JournalMate → We extract ingredients and steps!</p>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Recent Imports */}
                  {chatImports.length > 0 && (
                    <Card className="p-6">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <History className="w-5 h-5" />
                        Recent Imports
                      </h3>
                      <div className="space-y-3">
                        {chatImports.slice(0, 5).map((chatImport) => (
                          <div key={chatImport.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover-elevate">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{chatImport.conversationTitle || 'Untitled Import'}</p>
                              <p className="text-xs text-muted-foreground">
                                {chatImport.extractedGoals?.length || 0} goals extracted • {chatImport.processedAt ? new Date(chatImport.processedAt).toLocaleDateString() : 'Processing...'}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              <Badge variant="outline" className="text-xs">{chatImport.source}</Badge>
                              <Button size="icon" variant="ghost" className="h-7 w-7" data-testid={`button-view-import-${chatImport.id}`}>
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}

                </div>
              </SignInGate>
            </TabsContent>

            {/* Groups Tab */}
            <TabsContent value="groups" className="space-y-6 pb-20">
              <SignInGate feature="Group collaboration">
                <div className="max-w-4xl mx-auto px-4">
                  <div className="text-center mb-8">
                    <h2 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center justify-center gap-2 mb-4">
                      <Users className="w-6 h-6 sm:w-8 sm:h-8" />
                      Groups & Collaborative Planning
                    </h2>
                    <p className="text-base sm:text-xl text-muted-foreground px-2">
                      Create groups, share activities, and plan together!
                    </p>
                  </div>

                  {/* Create and Join Group Cards */}
                  <div className="grid gap-6 md:grid-cols-2 mb-8">
                    {/* Create New Group */}
                    <Card className="p-6">
                      <div className="text-center">
                        <Users className="w-12 h-12 text-primary mx-auto mb-4" />
                        <h3 className="text-xl font-semibold mb-2">Create New Group</h3>
                        <p className="text-muted-foreground mb-4">
                          Start a new group for shared activities and collaborative planning
                        </p>
                        <Button
                          className="w-full"
                          onClick={() => setShowCreateGroupDialog(true)}
                          data-testid="button-create-group"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Create Group
                        </Button>
                      </div>
                    </Card>

                    {/* Join Existing Group */}
                    <Card className="p-6">
                      <div className="text-center">
                        <Target className="w-12 h-12 text-primary mx-auto mb-4" />
                        <h3 className="text-xl font-semibold mb-2">Join Group</h3>
                        <p className="text-muted-foreground mb-4">
                          Enter an invite code to join an existing group
                        </p>
                        <Button
                          className="w-full"
                          variant="outline"
                          onClick={() => setShowJoinGroupDialog(true)}
                          data-testid="button-join-group"
                        >
                          Join Group
                        </Button>
                      </div>
                    </Card>
                  </div>

                  {/* My Groups Section */}
                  <div>
                    <h3 className="text-2xl font-semibold mb-4">My Groups</h3>
                    {groupsLoading ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Loading groups...
                      </div>
                    ) : groups.length === 0 ? (
                      <Card className="p-8 text-center mb-8">
                        <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                        <h4 className="text-lg font-semibold mb-2">No groups yet</h4>
                        <p className="text-sm text-muted-foreground mb-4">
                          Create a new group or join an existing one to start planning together
                        </p>
                        <div className="flex gap-2 justify-center">
                          <Button onClick={() => setShowCreateGroupDialog(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Create Group
                          </Button>
                          <Button variant="outline" onClick={() => setShowJoinGroupDialog(true)}>
                            Join Group
                          </Button>
                        </div>
                      </Card>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
                        {groups.map((group) => (
                          <GroupCard
                            key={group.id}
                            group={group}
                            onClick={() => setSelectedGroupId(group.id)}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Recent Group Activity */}
                  <div className="mb-8">
                    <h3 className="text-xl font-semibold mb-4">Recent Group Activity</h3>
                    
                    {groupActivitiesLoading ? (
                      <Card className="bg-card/50">
                        <CardContent className="py-6 space-y-3">
                          {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-start gap-3 p-3 rounded-lg animate-pulse">
                              <div className="w-5 h-5 bg-muted rounded-full mt-0.5" />
                              <div className="flex-1">
                                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                                <div className="h-3 bg-muted rounded w-1/2" />
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    ) : groupActivities && groupActivities.length > 0 ? (
                      <Card className="bg-card/50">
                        <CardContent className="py-6 space-y-2">
                          {groupActivities.map((activity) => (
                            <div 
                              key={activity.id} 
                              className={`flex items-start gap-3 p-3 rounded-lg border ${getActivityBackground(activity.activityType)}`}
                              data-testid={`activity-${activity.id}`}
                            >
                              <div className="mt-0.5">
                                {getActivityIcon(activity.activityType)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm">
                                  {getActivityText(activity)}
                                </p>
                                {activity.groupName && (
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {activity.groupName}
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground mt-1">
                                  {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                                </p>
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    ) : (
                      <Card className="p-8">
                        <div className="text-center text-muted-foreground">
                          <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
                          <p>No recent activity. Group activities will appear here when members complete tasks or make changes.</p>
                        </div>
                      </Card>
                    )}
                  </div>

                  {/* Community Powered CTA */}
                  <Card className="p-6 bg-gradient-to-r from-purple-500/5 to-emerald-500/5 border-dashed">
                    <div className="text-center mb-4">
                      <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500/10 to-emerald-500/10 px-4 py-2 rounded-full mb-3">
                        <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">Community Powered</span>
                      </div>
                      <h3 className="text-lg font-semibold mb-2">Discover & Use Community Plans</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Browse plans created by others, get inspired, and use them for your own goals. Join thousands planning together!
                      </p>
                      <Link href="/discover">
                        <Button className="gap-2" data-testid="button-browse-community-plans">
                          <Sparkles className="w-4 h-4" />
                          Browse Community Plans
                        </Button>
                      </Link>
                    </div>
                  </Card>
                </div>
              </SignInGate>
            </TabsContent>

            {/* About Tab */}
            <TabsContent value="about" className="space-y-8 pb-20">
              <div className="max-w-4xl mx-auto">
                {/* Hero Section */}
                <div className="text-center mb-12">
                  <div className="inline-flex items-center justify-center w-32 h-32 mb-6">
                    <img src="/journalmate-logo-transparent.png" alt="AI Planner - Smart Goal Tracker and AI Journal for Life Planning" className="w-32 h-32 object-contain" />
                  </div>
                  <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-4 bg-gradient-to-r from-purple-600 to-emerald-600 bg-clip-text text-transparent">
                    Plan Together. Reflect Together. Grow Together.
                  </h2>
                  <p className="text-xl sm:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed mb-4">
                    Watch your dreams become your reality with JournalMate's rhythm-aware planning engine
                  </p>
                  <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                    Unlike traditional journals, JournalMate combines <span className="font-semibold text-foreground">adaptive planning</span>, <span className="font-semibold text-foreground">emotional intelligence</span>, and <span className="font-semibold text-foreground">rhythm-aware journaling</span> to help you PLAN first, then REFLECT.
                  </p>
                  
                  {/* Visual Hierarchy Flow */}
                  <div className="mt-8 max-w-3xl mx-auto">
                    <div className="flex items-center justify-center gap-2 sm:gap-4 flex-wrap">
                      <div className="flex items-center gap-2">
                        <div className="px-4 py-2 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg font-semibold text-sm sm:text-base">
                          Smart Planning
                        </div>
                        <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="px-4 py-2 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-lg font-semibold text-sm sm:text-base">
                          Activity Execution
                        </div>
                        <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="px-4 py-2 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg font-semibold text-sm sm:text-base">
                          Reflection
                        </div>
                        <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                      </div>
                      <div className="px-4 py-2 bg-gradient-to-br from-pink-500 to-pink-600 text-white rounded-lg font-semibold text-sm sm:text-base">
                        Social Sharing
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-4">
                      Your complete planning-to-reflection journey, powered by AI that learns your rhythm
                    </p>
                  </div>
                </div>

                {/* CTA Button */}
                <div className="text-center mb-8">
                  <Button 
                    size="lg" 
                    className="bg-gradient-to-r from-purple-600 to-emerald-600 hover:from-purple-700 hover:to-emerald-700 text-white text-lg px-8 py-6 h-auto"
                    onClick={() => setActiveTab('input')}
                    data-testid="button-plan-adventure"
                  >
                    <Sparkles className="w-5 h-5 mr-2" />
                    Plan Your Next Adventure
                  </Button>
                  <p className="text-sm text-muted-foreground mt-3">
                    Start with Quick Plan (5 questions) or Smart Plan (comprehensive with real-time web research)
                  </p>
                </div>

                {/* Core Features */}
                <div className="grid gap-6 md:grid-cols-3 mb-12">
                  <p className="col-span-full text-center text-xs text-muted-foreground mb-2">
                    💡 Click on any feature to learn more
                  </p>
                  
                  {/* PRIMARY: Smart Planning */}
                  <div 
                    className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/20 rounded-xl border-2 border-purple-300 dark:border-purple-600 hover-elevate cursor-pointer transition-all duration-200 relative"
                    onClick={() => setExpandedFeature(expandedFeature === 'planning' ? null : 'planning')}
                    data-testid="feature-adaptive-planning"
                  >
                    <Badge className="absolute top-2 right-2 bg-purple-600 text-white text-xs">PRIMARY</Badge>
                    <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Sparkles className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Adaptive Planning Engine</h3>
                    <p className="text-sm text-muted-foreground">AI that learns your rhythm and adapts plans in real-time with emotional intelligence</p>
                    
                    {expandedFeature === 'planning' && (
                      <div className="mt-4 p-4 bg-white/60 dark:bg-gray-900/40 rounded-lg border border-purple-200 dark:border-purple-700 text-left">
                        <div className="space-y-3 text-sm">
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 bg-purple-600 rounded-full mt-2 shrink-0"></div>
                            <div>
                              <p className="font-medium text-foreground">Quick Plan Mode</p>
                              <p className="text-muted-foreground">5 essential questions in 2 batches with targeted web research for flight prices, hotels, and weather</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 bg-purple-600 rounded-full mt-2 shrink-0"></div>
                            <div>
                              <p className="font-medium text-foreground">Smart Plan Mode</p>
                              <p className="text-muted-foreground">10 comprehensive questions in 3 batches with mandatory real-time enrichment: resort pricing, restaurant details, flight comparisons, 7-day forecasts</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 bg-purple-600 rounded-full mt-2 shrink-0"></div>
                            <div>
                              <p className="font-medium text-foreground">Context-Aware Intelligence</p>
                              <p className="text-muted-foreground">Dynamic emojis based on destination, intelligent routing explanations (e.g., "Fly to Cancun instead of Tulum - TQO has limited service"), and budget-conscious recommendations</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-purple-600 dark:text-purple-400 pt-2">
                            <Copy className="w-3 h-3" />
                            <span>Import from ChatGPT, Claude, and other AI assistants</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* SECONDARY: Activity Execution */}
                  <div 
                    className="text-center p-6 bg-card rounded-xl border hover-elevate cursor-pointer transition-all duration-200 relative"
                    onClick={() => setExpandedFeature(expandedFeature === 'execution' ? null : 'execution')}
                    data-testid="feature-activity-execution"
                  >
                    <Badge className="absolute top-2 right-2 bg-emerald-600 text-white text-xs">SECONDARY</Badge>
                    <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <CheckSquare className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Activity Execution & Progress Tracking</h3>
                    <p className="text-sm text-muted-foreground">Execute your plans with swipeable task cards, real-time analytics, and celebratory milestones</p>
                    
                    {expandedFeature === 'execution' && (
                      <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-700 text-left">
                        <div className="space-y-3 text-sm">
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 bg-emerald-600 rounded-full mt-2 shrink-0"></div>
                            <div>
                              <p className="font-medium text-foreground">Swipeable Task Interface</p>
                              <p className="text-muted-foreground">Swipe right to complete, left to skip. Every completion triggers celebration animations with confetti effects</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 bg-emerald-600 rounded-full mt-2 shrink-0"></div>
                            <div>
                              <p className="font-medium text-foreground">Real-Time Progress Dashboard</p>
                              <p className="text-muted-foreground">Track completion rates, streaks, productivity patterns with visual analytics that adapt to your workflow</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 bg-emerald-600 rounded-full mt-2 shrink-0"></div>
                            <div>
                              <p className="font-medium text-foreground">YouTube-Style Feedback</p>
                              <p className="text-muted-foreground">Thumbs up/down on tasks to help AI learn what works for you and refine future plans</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* TERTIARY: Reflection & Journaling */}
                  <div 
                    className="text-center p-6 bg-card rounded-xl border hover-elevate cursor-pointer transition-all duration-200 relative"
                    onClick={() => setExpandedFeature(expandedFeature === 'reflection' ? null : 'reflection')}
                    data-testid="feature-rhythm-journaling"
                  >
                    <Badge className="absolute top-2 right-2 bg-blue-600 text-white text-xs">CLOSE THE LOOP</Badge>
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <BookOpen className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Rhythm-Aware Journaling</h3>
                    <p className="text-sm text-muted-foreground">Close the loop with intelligent reflection that learns your patterns and enriches future planning</p>
                    
                    {expandedFeature === 'reflection' && (
                      <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700 text-left">
                        <div className="space-y-3 text-sm">
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 shrink-0"></div>
                            <div>
                              <p className="font-medium text-foreground">Smart Capture Mode</p>
                              <p className="text-muted-foreground">Type minimal text with keywords (@restaurants, @travel, @music) + upload photos/videos. AI auto-detects category and enriches entries</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 shrink-0"></div>
                            <div>
                              <p className="font-medium text-foreground">9 Life Categories</p>
                              <p className="text-muted-foreground">Restaurants, Travel, Music, Movies, Books, Products, Workouts, Personal Achievements, Daily Reflections with AI-organized galleries</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 shrink-0"></div>
                            <div>
                              <p className="font-medium text-foreground">Feeds Future Planning</p>
                              <p className="text-muted-foreground">AI learns from your reflections to personalize future plan recommendations and task suggestions</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Social Sharing - Complete the Cycle */}
                <div 
                  className="bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 dark:from-pink-900/20 dark:via-purple-900/20 dark:to-blue-900/20 p-8 rounded-2xl border-2 border-pink-200/50 dark:border-pink-700/50 shadow-lg mb-12 cursor-pointer hover-elevate transition-all duration-200"
                  onClick={() => setExpandedFeature(expandedFeature === 'sharing' ? null : 'sharing')}
                  data-testid="feature-social-sharing"
                >
                  <div className="flex items-center justify-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-500 rounded-xl flex items-center justify-center">
                      <Share2 className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-center">
                      <h3 className="text-xl font-bold text-foreground bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                        Social Sharing - Complete the Cycle
                      </h3>
                      <p className="text-sm text-muted-foreground">Share your success, inspire others, discover community plans</p>
                    </div>
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-3 text-center">
                    <div className="p-4 bg-white/60 dark:bg-gray-800/40 rounded-xl border border-white/40 dark:border-gray-700/40">
                      <Target className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                      <p className="text-sm font-medium">Goal Plans</p>
                    </div>
                    <div className="p-4 bg-white/60 dark:bg-gray-800/40 rounded-xl border border-white/40 dark:border-gray-700/40">
                      <BookOpen className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
                      <p className="text-sm font-medium">Daily Journals</p>
                    </div>
                    <div className="p-4 bg-white/60 dark:bg-gray-800/40 rounded-xl border border-white/40 dark:border-gray-700/40">
                      <CheckSquare className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                      <p className="text-sm font-medium">To-Do Lists</p>
                    </div>
                  </div>

                  {expandedFeature === 'sharing' && (
                    <div className="mt-6 p-4 bg-white/80 dark:bg-gray-800/60 rounded-xl border border-white/60 dark:border-gray-700/60">
                      <div className="space-y-4 text-sm">
                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 bg-purple-600 rounded-full mt-2 shrink-0"></div>
                          <div>
                            <p className="font-medium text-foreground">Secure Contact Integration</p>
                            <p className="text-muted-foreground">Import your phone contacts safely with privacy protection and share via SMS, email, or direct links</p>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 bg-emerald-600 rounded-full mt-2 shrink-0"></div>
                          <div>
                            <p className="font-medium text-foreground">Personalized Invite Messages</p>
                            <p className="text-muted-foreground">Auto-generated invitation messages for sharing your goals, journal entries, and collaborative planning sessions</p>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 shrink-0"></div>
                          <div>
                            <p className="font-medium text-foreground">Real-Time Collaboration</p>
                            <p className="text-muted-foreground">Perfect for couples goals, family planning, group trips, and accountability partnerships with live updates</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Additional Features */}
                <div className="grid gap-4 md:grid-cols-2 mb-12">
                  <div className="p-4 bg-muted/50 rounded-xl border">
                    <div className="flex items-center gap-3 mb-2">
                      <BarChart3 className="w-5 h-5 text-primary" />
                      <h4 className="font-semibold">Productivity Analytics Dashboard</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">Track goal completion rates, daily streaks, habit formation, and productivity insights with visual charts</p>
                  </div>

                  <div className="p-4 bg-muted/50 rounded-xl border">
                    <div className="flex items-center gap-3 mb-2">
                      <Copy className="w-5 h-5 text-primary" />
                      <h4 className="font-semibold">AI Assistant Integration</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">Import and sync plans from ChatGPT, Claude, and other AI chatbots directly into your task manager</p>
                  </div>
                </div>

                {/* Footer */}
                <div className="text-center p-6 bg-muted/30 rounded-xl border">
                  <p className="text-lg font-semibold mb-2">Founded by Dennis Tanaruno</p>
                  <p className="text-muted-foreground mb-4">Built for those who want to live with intention and momentum</p>
                  <Button asChild variant="outline" size="sm">
                    <a href="https://www.linkedin.com/in/dennis-tanaruno" target="_blank" rel="noopener noreferrer">
                      Connect on LinkedIn
                    </a>
                  </Button>
                  <div className="mt-6 pt-4 border-t border-muted">
                    <p className="text-xs text-muted-foreground">
                      © {new Date().getFullYear()} JournalMate. All rights reserved.
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      The JournalMate name, logo, design, and all related intellectual property are protected by copyright and trademark laws.
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            </Tabs>
        </div>
        </div>
      </main>

      {/* Modals */}

      <Dialog open={showContacts} onOpenChange={onShowContacts}>
        <DialogContent className="max-w-[95vw] sm:max-w-6xl h-[90vh] flex flex-col" data-testid="modal-contacts">
          <DialogHeader backLabel="Back to Home">
            <DialogTitle>Friends & Family</DialogTitle>
            <DialogDescription>
              Manage your contacts and share your goals with friends and family
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto min-h-0">
            <Contacts />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showChatHistory} onOpenChange={onShowChatHistory}>
        <DialogContent className="max-w-[95vw] sm:max-w-6xl h-[90vh] flex flex-col" data-testid="modal-chat-history">
          <DialogHeader backLabel="Back to Home">
            <DialogTitle>Chat History</DialogTitle>
            <DialogDescription>
              View your conversation sessions and resume refining your plans
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto min-h-0">
            <ChatHistory onLoadSession={(sessionId) => {
              loadConversationSession(sessionId);
              onShowChatHistory(false);
            }} />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showRecentGoals} onOpenChange={onShowRecentGoals}>
        <DialogContent className="max-w-[95vw] sm:max-w-6xl h-[90vh] flex flex-col" data-testid="modal-recent-goals">
          <DialogHeader backLabel="Back to Home">
            <DialogTitle>Recent Goals</DialogTitle>
            <DialogDescription>
              View all your activities, track progress, and manage your goals
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto min-h-0">
            <RecentGoals onSelectActivity={(activityId) => {
              setSelectedActivityId(activityId);
              setActiveTab("activities");
              onShowRecentGoals(false);
            }} />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showProgressReport} onOpenChange={onShowProgressReport}>
        <DialogContent className="max-w-[95vw] sm:max-w-6xl h-[90vh] flex flex-col" data-testid="modal-progress-report">
          <DialogHeader backLabel="Back to Home">
            <DialogTitle>Progress Report</DialogTitle>
            <DialogDescription>
              Comprehensive analytics, milestones, and insights about your achievements
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto min-h-0">
            <ProgressReport />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showLifestylePlanner} onOpenChange={onShowLifestylePlanner}>
        <DialogContent className="max-w-[95vw] sm:max-w-7xl h-[90vh] flex flex-col" data-testid="modal-lifestyle-planner">
          <DialogHeader className="pb-2" backLabel="Back to Home">
            <DialogTitle className="text-2xl">Personal Journal</DialogTitle>
            <DialogDescription>
              Capture your unique interests, preferences, and personal notes
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto min-h-0">
            <PersonalJournal onClose={() => onShowLifestylePlanner(false)} />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showJournalMode} onOpenChange={(open) => {
        setShowJournalMode(open);
        if (!open) {
          setJournalActivityContext(null);
        }
      }}>
        <DialogContent className="max-w-[95vw] sm:max-w-4xl h-[90vh] flex flex-col p-0" data-testid="modal-journal-mode">
          <ConversationalPlanner
            initialMode="journal"
            onClose={() => {
              setShowJournalMode(false);
              setJournalActivityContext(null);
            }}
            activityId={journalActivityContext?.activityId}
            activityTitle={journalActivityContext?.title}
            user={user}
            onSignInRequired={() => setShowPlannerSignIn(true)}
          />
        </DialogContent>
      </Dialog>

      {/* Post-Activity Journal Prompt */}
      {postActivityPrompt.activity && (
        <PostActivityPrompt
          activity={{
            id: postActivityPrompt.activity.id,
            title: postActivityPrompt.activity.title,
            category: postActivityPrompt.activity.category || 'General'
          }}
          onQuickNote={handleQuickNote}
          onSkip={handleSkipJournalPrompt}
          onRemindLater={handleRemindLater}
          open={postActivityPrompt.open}
          onOpenChange={(open) => setPostActivityPrompt({ ...postActivityPrompt, open })}
        />
      )}

      <Dialog open={showSignInDialog} onOpenChange={setShowSignInDialog}>
        <DialogContent className="max-w-md p-0" data-testid="modal-signin">
          <SocialLogin />
        </DialogContent>
      </Dialog>

      {/* Delete Activity Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, activity: null })}>
        <AlertDialogContent data-testid="dialog-delete-activity">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Activity</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteDialog.activity?.title}"? This will also delete all associated tasks. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="button-confirm-delete"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteDialog.activity) {
                  handleDeleteActivity.mutate(deleteDialog.activity.id);
                  setDeleteDialog({ open: false, activity: null });
                }
              }}
              disabled={handleDeleteActivity.isPending}
            >
              {handleDeleteActivity.isPending ? 'Deleting...' : 'Delete Activity'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Activity Completion Confetti */}
      {showActivityConfetti && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          <Confetti
            width={window.innerWidth}
            height={window.innerHeight}
            recycle={false}
            numberOfPieces={400}
            colors={['#6C5CE7', '#00B894', '#FDCB6E', '#FF6B6B', '#4ECDC4', '#FFD93D', '#A8E6CF']}
            gravity={0.3}
            wind={0.01}
          />
        </div>
      )}

      {/* Activity Completion Modal */}
      {activityCelebration && (
        <CelebrationModal
          isOpen={!!activityCelebration}
          onClose={() => setActivityCelebration(null)}
          achievement={{
            title: activityCelebration.title,
            description: activityCelebration.description,
            type: 'milestone',
            points: 100
          }}
        />
      )}

      {/* Share Preview Dialog */}
      {sharePreviewDialog.activity && (
        <SharePreviewDialog
          open={sharePreviewDialog.open}
          onOpenChange={(open) => setSharePreviewDialog({ open, activity: null })}
          activity={sharePreviewDialog.activity}
          onConfirmShare={async (shareData) => {
            const activity = sharePreviewDialog.activity;
            if (!activity) return;

            try {
              // Import getContextualEmoji dynamically
              const { getContextualEmoji } = await import('@/lib/shareCardTemplates');

              // Use the shareableLink from SharePreviewDialog (already generated)
              const shareUrl = shareData.shareableLink;

              if (!shareUrl) {
                console.warn('No share link generated, but activity has been saved/shared successfully');
                toast({
                  title: 'Success!',
                  description: 'Your activity has been saved and shared. You can share it later from the activity details.',
                });
                return;
              }

              const displayTitle = shareData.shareTitle || activity.planSummary || activity.title;
              const contextualEmoji = getContextualEmoji(activity.title, activity.category);

              // Enhanced share text with contextual emoji and JournalMate.ai branding
              const shareText = shareData.socialText ||
                `${contextualEmoji} ${displayTitle}\n\n${activity.planSummary || activity.description}\n\n${contextualEmoji} Customize this plan: ${shareUrl}\n\n✨ Plan your next adventure with JournalMate.ai`;

              let shareSuccessful = false;

              // 1. Try native Capacitor Share first (mobile apps) WITH IMAGE if available
              if (isNative() && shareData.shareCardImageFile) {
                try {
                  const canShare = await CapacitorShare.canShare();
                  if (canShare.value) {
                    // Note: Capacitor Share has limited file support
                    // For now, share without the file on mobile - this is a known limitation
                    await CapacitorShare.share({
                      title: `${contextualEmoji} ${displayTitle}`,
                      text: shareText,
                      url: shareUrl,
                      dialogTitle: 'Share Activity',
                    });
                    toast({
                      title: "Shared successfully!",
                      description: "Activity shared via native share sheet"
                    });
                    shareSuccessful = true;
                    return;
                  }
                } catch (shareError: any) {
                  // AbortError means user canceled the share dialog - don't show error
                  if (shareError.name === 'AbortError' || shareError.message?.includes('cancel')) {
                    console.log('User canceled native share dialog');
                    return;
                  }
                  // Other errors - fall through to Web Share API
                  console.warn('Capacitor Share failed, trying Web Share API:', shareError);
                }
              } else if (isNative()) {
                // No image - regular native share
                try {
                  const canShare = await CapacitorShare.canShare();
                  if (canShare.value) {
                    await CapacitorShare.share({
                      title: `${contextualEmoji} ${displayTitle}`,
                      text: shareText,
                      url: shareUrl,
                      dialogTitle: 'Share Activity',
                    });
                    toast({
                      title: "Shared successfully!",
                      description: "Activity shared via native share sheet"
                    });
                    shareSuccessful = true;
                    return;
                  }
                } catch (shareError: any) {
                  if (shareError.name === 'AbortError' || shareError.message?.includes('cancel')) {
                    return;
                  }
                  console.warn('Capacitor Share failed, trying Web Share API:', shareError);
                }
              }

              // 2. Try Web Share API (modern browsers) WITH IMAGE if available
              if (navigator.share && shareData.shareCardImageFile && !shareSuccessful) {
                // Check if file sharing is supported
                try {
                  if (navigator.canShare && navigator.canShare({ files: [shareData.shareCardImageFile] })) {
                    // BEST PRACTICE: Share image + text + URL together
                    await navigator.share({
                      title: `${contextualEmoji} ${displayTitle}`,
                      text: shareText,
                      url: shareUrl,
                      files: [shareData.shareCardImageFile],  // Include the share card image!
                    });
                    toast({
                      title: "Shared successfully!",
                      description: "Activity shared with image"
                    });
                    shareSuccessful = true;
                    return;
                  }
                } catch (shareError: any) {
                  // AbortError means user canceled the share dialog - don't show error
                  if (shareError.name === 'AbortError') {
                    console.log('User canceled share dialog');
                    return;
                  }
                  // File sharing not supported or failed - fall through to text-only share
                  console.warn('Web Share API with files failed, trying text-only share:', shareError);
                }
              }

              // 3. Fallback: Web Share API text-only (no image)
              if (navigator.share && !shareSuccessful) {
                try {
                  await navigator.share({
                    title: `${contextualEmoji} ${displayTitle}`,
                    text: shareText,
                    url: shareUrl
                  });
                  const description = shareData.shareCardImageFile
                    ? "Activity shared (image not supported on this browser)"
                    : "Activity shared";
                  toast({
                    title: "Shared successfully!",
                    description
                  });
                  shareSuccessful = true;
                  return;
                } catch (shareError: any) {
                  // AbortError means user canceled the share dialog - don't show error
                  if (shareError.name === 'AbortError') {
                    console.log('User canceled share dialog');
                    return;
                  }
                  // Other share errors - fall through to clipboard fallback
                  console.warn('Navigator.share failed, trying clipboard:', shareError);
                }
              }

              // 4. Last resort: Clipboard fallback
              if (!shareSuccessful) {
                try {
                  await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
                  toast({
                    title: 'Link copied to clipboard',
                    description: 'Share link has been copied. Paste it anywhere to share!',
                  });
                  shareSuccessful = true;
                } catch (clipboardError) {
                  console.warn('Clipboard API failed:', clipboardError);
                  // If clipboard fails, show the link in a dialog for manual copy
                  toast({
                    title: 'Share Link Generated',
                    description: `Share URL: ${shareUrl}`,
                  });
                }
              }
            } catch (error) {
              console.error('Share error:', error);

              // User canceled share dialog - not an error, silent return
              if (error instanceof Error && error.name === 'AbortError') {
                return;
              }

              // Clipboard permission denied
              if (error instanceof DOMException && error.name === 'NotAllowedError') {
                toast({
                  title: "Permission Required",
                  description: "Please allow clipboard access to copy the share link.",
                  variant: "destructive"
                });
                return;
              }

              // Generic fallback with actual error message
              toast({
                title: "Share failed",
                description: error instanceof Error ? error.message : "Unable to share. Please try again.",
                variant: "destructive"
              });
            }
          }}
        />
      )}

      {/* Onboarding Tutorial */}
      <OnboardingTutorial
        open={showTutorial}
        onOpenChange={setShowTutorial}
        onComplete={handleTutorialComplete}
      />

      {/* Upgrade Modal */}
      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        trigger={upgradeTrigger}
        planCount={planCount}
        planLimit={planLimit}
      />

      {/* Quick Capture Floating Button */}
      <QuickCaptureButton onClick={() => setShowJournalMode(true)} />

      {/* End of Day Review */}
      <EndOfDayReview
        open={showEndOfDayReview}
        onOpenChange={onShowEndOfDayReview}
        onComplete={() => {
          toast({
            title: "Great work today! 🎉",
            description: "Your daily review has been saved to your journal.",
            duration: 5000
          });
        }}
      />

      {/* Create Group Dialog */}
      <CreateGroupDialog
        open={showCreateGroupDialog}
        onOpenChange={setShowCreateGroupDialog}
        onGroupCreated={() => {
          refetchGroups();
          setShowCreateGroupDialog(false);
        }}
      />

      {/* Join Group Dialog */}
      <JoinGroupDialog
        open={showJoinGroupDialog}
        onOpenChange={setShowJoinGroupDialog}
        onGroupJoined={() => {
          refetchGroups();
          setShowJoinGroupDialog(false);
        }}
      />

      {/* Group Details Modal */}
      <GroupDetailsModal
        groupId={selectedGroupId}
        open={!!selectedGroupId}
        onOpenChange={(open) => {
          if (!open) setSelectedGroupId(null);
        }}
        onGroupUpdated={() => {
          refetchGroups();
        }}
      />

      {/* Share Activity to Group Dialog */}
      <ShareActivityToGroupDialog
        activityId={shareActivityDialog.activityId}
        activityTitle={shareActivityDialog.activityTitle}
        open={shareActivityDialog.open}
        onOpenChange={(open) => {
          if (!open) setShareActivityDialog({ open: false, activityId: '', activityTitle: '' });
        }}
        onActivityShared={() => {
          refetchActivities();
          refetchGroups();
        }}
      />

      {/* Sign-In Prompt Modals */}
      <SignInPromptModal
        open={showPlannerSignIn}
        onOpenChange={setShowPlannerSignIn}
        title="Sign In to Save Your Plan"
        description="Sign in to save this plan, create tasks, and collaborate with others"
      />
      
      <SignInPromptModal
        open={showJournalSignIn}
        onOpenChange={setShowJournalSignIn}
        title="Sign In to Access Journal"
        description="Sign in to create personal journal entries and track your memories"
      />
      
      <SignInPromptModal
        open={showDiscoverSignIn}
        onOpenChange={setShowDiscoverSignIn}
        title="Sign In to Use This Plan"
        description="Sign in to use this plan and track your progress"
      />

    </div>
  );
}