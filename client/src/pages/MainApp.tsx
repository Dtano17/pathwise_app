import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import VoiceInput from '@/components/VoiceInput';
import LiveChatInterface from '@/components/LiveChatInterface';
import TaskCard from '@/components/TaskCard';
import ProgressDashboard from '@/components/ProgressDashboard';
import ClaudePlanOutput from '@/components/ClaudePlanOutput';
import ThemeSelector from '@/components/ThemeSelector';
import LocationDatePlanner from '@/components/LocationDatePlanner';
import PersonalJournal from '@/components/PersonalJournal';
import ConversationalPlanner from '@/components/ConversationalPlanner';
import Contacts from './Contacts';
import ChatHistory from './ChatHistory';
import RecentGoals from './RecentGoals';
import ProgressReport from './ProgressReport';
import { SocialLogin } from '@/components/SocialLogin';
import { Sparkles, Target, BarChart3, CheckSquare, Mic, Plus, RefreshCw, Upload, MessageCircle, Download, Copy, Users, Heart, Dumbbell, Briefcase, TrendingUp, BookOpen, Mountain, Activity, Menu, Bell, Calendar, Share, Contact, MessageSquare, Brain, Lightbulb, History, Music, Instagram, Facebook, Youtube, Star, Share2, MoreHorizontal, Check, Clock, X, Trash2, ArrowLeft, Archive, Plug, Info, LogIn, Lock, Unlock, Eye, Edit } from 'lucide-react';
import { Link } from 'wouter';
import { SiOpenai, SiClaude, SiPerplexity, SiSpotify, SiApplemusic, SiYoutubemusic, SiFacebook, SiInstagram, SiX } from 'react-icons/si';
import { type Task, type Activity as ActivityType, type ChatImport } from '@shared/schema';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { SharePreviewDialog } from '@/components/SharePreviewDialog';
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import ThemeToggle from '@/components/ThemeToggle';
import NotificationManager from '@/components/NotificationManager';
import SmartScheduler from '@/components/SmartScheduler';
import CelebrationModal from '@/components/CelebrationModal';
import OnboardingTutorial from '@/components/OnboardingTutorial';
import Confetti from 'react-confetti';

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
  onShowProgressReport
}: MainAppProps) {
  const [activeTab, setActiveTab] = useState("input"); // Start with Goal Input as the landing page
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
  } | null>(null);

  // Conversation history for contextual plan regeneration
  const [conversationHistory, setConversationHistory] = useState<string[]>([]);
  const [planVersion, setPlanVersion] = useState(0);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  
  // Ref to track activityId to prevent race conditions during refinements
  const activityIdRef = useRef<string | undefined>(undefined);

  // Activity selection and delete dialog state
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; activity: ActivityType | null }>({ open: false, activity: null });
  const [sharePreviewDialog, setSharePreviewDialog] = useState<{ open: boolean; activity: ActivityType | null }>({ open: false, activity: null });
  const [editingActivity, setEditingActivity] = useState<ActivityType | null>(null);
  const [showJournalMode, setShowJournalMode] = useState(false);

  // Handle URL query parameters for activity selection from shared links
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
    }
  }, []);
  
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
          activityId: activityId // Restore activityId from saved session
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

  // Check if user has completed tutorial (show on first login)
  useEffect(() => {
    if (user && typeof user === 'object' && 'id' in user && (user as any).id !== 'demo-user') {
      const hasCompletedTutorial = (user as any).hasCompletedTutorial;
      console.log('[TUTORIAL] User tutorial status:', { hasCompletedTutorial, userId: (user as any).id });
      
      // Show tutorial if not completed
      if (!hasCompletedTutorial) {
        // Small delay to let the app load first
        setTimeout(() => {
          setShowTutorial(true);
        }, 1000);
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
            activityId: data.activityId
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
        activityId: preservedActivityId // Preserve activity ID if it exists
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
          activityId: preservedActivityId
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
      if (!user || typeof user !== 'object' || !('id' in user) || (user as any).id === 'demo-user') {
        return; // Skip for demo users
      }
      
      const response = await fetch(`/api/users/${(user as any).id}/complete-tutorial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark tutorial as completed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Refetch user data to update tutorial status
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
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

          // Auto-hide confetti after 5 seconds
          setTimeout(() => {
            setShowActivityConfetti(false);
            setActivityCelebration(null);
          }, 5000);

          // Show toast notification
          toast({
            title: "🎊 ACTIVITY COMPLETED! 🎊",
            description: `Amazing! You finished "${activity.title}" - All ${activity.totalTasks} tasks complete!`,
          });
        }
      });
    }
  }, [activities, completedActivities, toast]);

  // Tab options for mobile dropdown
  const tabOptions = [
    { value: "input", label: "Goal Input", shortLabel: "Input", icon: Mic },
    { value: "activities", label: `Activities (${activities.length})`, shortLabel: "Activities", icon: CheckSquare },
    { value: "tasks", label: `All Tasks (${tasks.length})`, shortLabel: "Tasks", icon: Target },
    { value: "progress", label: "Progress", shortLabel: "Stats", icon: BarChart3 },
    { value: "groups", label: "Groups", shortLabel: "Groups", icon: Users },
    { value: "sync", label: "Integrations", shortLabel: "Apps", icon: Sparkles },
    { value: "about", label: "About", shortLabel: "About", icon: Sparkles }
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
                  <h1 className="text-lg sm:text-2xl font-bold text-foreground">JournalMate</h1>
                  <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                    {currentPlanOutput ? "AI Action Plan Active" : "Transform Goals into Reality"}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-3">
              <Badge 
                variant="secondary" 
                className="gap-1 cursor-pointer hover-elevate active-elevate-2"
                onClick={() => setShowTutorial(true)}
                data-testid="button-tutorial"
              >
                <Sparkles className="w-3 h-3" />
                {isAuthenticated && (user as any)?.id !== 'demo-user' ? 'Tutorial' : 'Live Demo'}
              </Badge>
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
            <TabsList className="hidden sm:grid w-full grid-cols-7 mb-4 sm:mb-8 bg-muted/30 p-1 h-12">
              <TabsTrigger value="input" className="gap-2 text-sm font-medium" data-testid="tab-input">
                <Mic className="w-4 h-4" />
                <span>Goal Input</span>
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
                      <p><strong>Priority:</strong> {editingActivity.priority}</p>
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
                onOpenJournalMode={() => setShowJournalMode(true)}
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
                          setShowSignInDialog(true);
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
                      Plan a Date
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

              <div className="flex justify-center mb-6">
                <Button
                  onClick={() => setActiveTab("input")}
                  className="gap-2"
                  data-testid="button-create-activity"
                >
                  <Plus className="w-4 h-4" />
                  Create New Activity
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
                                    console.log('[PRIVACY TOGGLE DEBUG] Before toggle:', { activityId: activity.id, currentState, newIsPublic });
                                    
                                    const response = await fetch(`/api/activities/${activity.id}`, {
                                      method: 'PATCH',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ isPublic: newIsPublic })
                                    });
                                    
                                    if (!response.ok) {
                                      throw new Error('Failed to update privacy');
                                    }
                                    
                                    const updatedActivity = await response.json();
                                    console.log('[PRIVACY TOGGLE DEBUG] Response from server:', { isPublic: updatedActivity.isPublic });
                                    
                                    // Refetch activities to get the latest data
                                    await queryClient.refetchQueries({ queryKey: ['/api/activities'] });
                                    
                                    // Log activities after refetch
                                    const cachedData = queryClient.getQueryData(['/api/activities']);
                                    console.log('[PRIVACY TOGGLE DEBUG] After refetch, cached activities:', cachedData);
                                    
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
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-foreground mb-2 flex items-center justify-center gap-2">
                    <Sparkles className="w-6 h-6" />
                    App Integrations
                  </h2>
                <p className="text-muted-foreground">
                  Connect your favorite AI assistants, music platforms, and social media to create personalized life plans
                </p>
              </div>

              <div className="max-w-4xl mx-auto space-y-8">
                {/* AI Assistants */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    AI Assistants
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="p-4 text-center hover-elevate cursor-pointer" data-testid="card-integration-chatgpt">
                      <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-xl flex items-center justify-center mx-auto mb-2">
                        <SiOpenai className="w-6 h-6 text-green-600" />
                      </div>
                      <p className="text-sm font-medium">ChatGPT</p>
                      <Badge variant="outline" className="mt-1 text-xs">Connected</Badge>
                    </Card>
                    <Card className="p-4 text-center hover-elevate cursor-pointer" data-testid="card-integration-claude">
                      <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-xl flex items-center justify-center mx-auto mb-2">
                        <SiClaude className="w-6 h-6 text-purple-600" />
                      </div>
                      <p className="text-sm font-medium">Claude</p>
                      <Badge variant="outline" className="mt-1 text-xs">Connected</Badge>
                    </Card>
                    <Card className="p-4 text-center hover-elevate cursor-pointer" data-testid="card-integration-perplexity">
                      <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-xl flex items-center justify-center mx-auto mb-2">
                        <SiPerplexity className="w-6 h-6 text-blue-600" />
                      </div>
                      <p className="text-sm font-medium">Perplexity</p>
                      <Badge variant="outline" className="mt-1 text-xs">Available</Badge>
                    </Card>
                    <Card className="p-4 text-center hover-elevate cursor-pointer" data-testid="card-integration-other-ai">
                      <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-xl flex items-center justify-center mx-auto mb-2">
                        <Lightbulb className="w-6 h-6 text-orange-600" />
                      </div>
                      <p className="text-sm font-medium">Other AI</p>
                      <Badge variant="outline" className="mt-1 text-xs">Available</Badge>
                    </Card>
                  </div>
                </div>

                {/* Music Platforms */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Music className="w-5 h-5" />
                    Music Platforms
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <Card className="p-4 text-center hover-elevate cursor-pointer" data-testid="card-integration-spotify">
                      <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-xl flex items-center justify-center mx-auto mb-2">
                        <SiSpotify className="w-6 h-6 text-green-600" />
                      </div>
                      <p className="text-sm font-medium">Spotify</p>
                      <Badge variant="default" className="mt-1 text-xs bg-green-600 text-white">Connected</Badge>
                    </Card>
                    <Card className="p-4 text-center hover-elevate cursor-pointer" data-testid="card-integration-apple-music">
                      <div className="w-12 h-12 bg-gray-100 dark:bg-gray-900/20 rounded-xl flex items-center justify-center mx-auto mb-2">
                        <SiApplemusic className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                      </div>
                      <p className="text-sm font-medium">Apple Music</p>
                      <Badge variant="outline" className="mt-1 text-xs">Coming Soon</Badge>
                    </Card>
                    <Card className="p-4 text-center hover-elevate cursor-pointer" data-testid="card-integration-youtube-music">
                      <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-xl flex items-center justify-center mx-auto mb-2">
                        <SiYoutubemusic className="w-6 h-6 text-red-600" />
                      </div>
                      <p className="text-sm font-medium">YouTube Music</p>
                      <Badge variant="outline" className="mt-1 text-xs">Coming Soon</Badge>
                    </Card>
                  </div>
                </div>

                {/* Social Media */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Social Media
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="p-4 text-center hover-elevate cursor-pointer" data-testid="card-integration-facebook">
                      <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-xl flex items-center justify-center mx-auto mb-2">
                        <SiFacebook className="w-6 h-6 text-blue-600" />
                      </div>
                      <p className="text-sm font-medium">Facebook</p>
                      <Badge variant="outline" className="mt-1 text-xs">Coming Soon</Badge>
                    </Card>
                    <Card className="p-4 text-center hover-elevate cursor-pointer" data-testid="card-integration-instagram">
                      <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900/20 rounded-xl flex items-center justify-center mx-auto mb-2">
                        <SiInstagram className="w-6 h-6 text-pink-600" />
                      </div>
                      <p className="text-sm font-medium">Instagram</p>
                      <Badge variant="outline" className="mt-1 text-xs">Coming Soon</Badge>
                    </Card>
                    <Card className="p-4 text-center hover-elevate cursor-pointer" data-testid="card-integration-twitter">
                      <div className="w-12 h-12 bg-gray-100 dark:bg-gray-900/20 rounded-xl flex items-center justify-center mx-auto mb-2">
                        <SiX className="w-6 h-6 text-gray-900 dark:text-gray-100" />
                      </div>
                      <p className="text-sm font-medium">Twitter/X</p>
                      <Badge variant="outline" className="mt-1 text-xs">Coming Soon</Badge>
                    </Card>
                    <Card className="p-4 text-center hover-elevate cursor-pointer" data-testid="card-integration-youtube">
                      <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-xl flex items-center justify-center mx-auto mb-2">
                        <Youtube className="w-6 h-6 text-red-600" />
                      </div>
                      <p className="text-sm font-medium">YouTube</p>
                      <Badge variant="outline" className="mt-1 text-xs">Coming Soon</Badge>
                    </Card>
                  </div>
                </div>

                {/* Chat Import Form */}
                <Card className="p-6">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">AI Source</label>
                        <Select 
                          value={chatSource} 
                          onValueChange={setChatSource}
                        >
                          <SelectTrigger data-testid="select-chat-source">
                            <SelectValue placeholder="Select AI source..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="chatgpt">
                              <div className="flex items-center gap-2">
                                <MessageSquare className="w-4 h-4 text-green-600" />
                                ChatGPT
                              </div>
                            </SelectItem>
                            <SelectItem value="claude">
                              <div className="flex items-center gap-2">
                                <Brain className="w-4 h-4 text-purple-600" />
                                Claude
                              </div>
                            </SelectItem>
                            <SelectItem value="perplexity">
                              <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-blue-600" />
                                Perplexity
                              </div>
                            </SelectItem>
                            <SelectItem value="other">
                              <div className="flex items-center gap-2">
                                <Lightbulb className="w-4 h-4 text-orange-600" />
                                Other AI
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Conversation Title (optional)</label>
                        <Input
                          value={chatTitle}
                          onChange={(e) => setChatTitle(e.target.value)}
                          placeholder="e.g., Planning my health goals..."
                          data-testid="input-chat-title"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Chat Conversation</label>
                      <Textarea
                        value={chatText}
                        onChange={(e) => setChatText(e.target.value)}
                        placeholder="Paste your full conversation here. Include both your messages and the AI's responses.

Example format:
User: I want to get healthier and work out more
Assistant: That's a great goal! Here's a plan to help you...
User: What about my diet?
Assistant: For nutrition, I recommend..."
                        className="min-h-[250px] resize-none"
                        data-testid="textarea-chat-content"
                      />
                    </div>

                    <Button
                      onClick={handleChatImport}
                      disabled={importChatMutation.isPending || !chatText.trim()}
                      className="w-full"
                      data-testid="button-import-chat"
                    >
                      {importChatMutation.isPending ? (
                        <>
                          <Upload className="w-4 h-4 mr-2 animate-spin" />
                          Importing & Processing...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Import & Extract Goals
                        </>
                      )}
                    </Button>
                  </div>
                </Card>

                {/* Recent Imports */}
                {chatImports.length > 0 && (
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <History className="w-5 h-5" />
                      Recent Chat Imports
                    </h3>
                    <div className="space-y-3">
                      {chatImports.slice(0, 5).map((chatImport) => (
                        <div key={chatImport.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover-elevate">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{chatImport.conversationTitle || 'Untitled Conversation'}</p>
                            <p className="text-xs text-muted-foreground">
                              {chatImport.extractedGoals?.length || 0} goals extracted • {chatImport.processedAt ? new Date(chatImport.processedAt).toLocaleDateString() : 'Processing...'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <Badge variant="outline" className="text-xs">
                              {chatImport.source}
                            </Badge>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Target className="w-3 h-3" />
                              {chatImport.extractedGoals?.length || 0}
                            </div>
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
                <div className="max-w-4xl mx-auto">
                  <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-foreground mb-4 flex items-center justify-center gap-2">
                      <Users className="w-8 h-8" />
                      Group Goals & Shared Accountability
                    </h2>
                    <p className="text-xl text-muted-foreground">
                      Create groups, share goals, and celebrate progress together!
                    </p>
                  </div>

                <div className="grid gap-6 md:grid-cols-2">
                  {/* Create New Group */}
                  <Card className="p-6">
                    <div className="text-center">
                      <Users className="w-12 h-12 text-primary mx-auto mb-4" />
                      <h3 className="text-xl font-semibold mb-2">Create New Group</h3>
                      <p className="text-muted-foreground mb-4">
                        Start a new group for shared goals and accountability
                      </p>
                      <Button 
                        className="w-full" 
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
                      <div className="space-y-2">
                        <Input 
                          placeholder="Enter invite code"
                          data-testid="input-invite-code"
                        />
                        <Button 
                          className="w-full" 
                          variant="outline"
                          data-testid="button-join-group"
                        >
                          Join Group
                        </Button>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* My Groups Section */}
                <div className="mt-8">
                  <h3 className="text-2xl font-semibold mb-4">My Groups</h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {/* Example Group Cards */}
                    <Card className="p-4 hover-elevate">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold">Girls Trip to Miami</h4>
                        <Badge variant="outline">5 members</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        Planning the perfect weekend getaway with the squad
                      </p>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span>8/14 tasks completed</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-primary h-2 rounded-full" style={{width: '57%'}}></div>
                        </div>
                      </div>
                      <Button variant="outline" className="w-full mt-3" size="sm">
                        View Group
                      </Button>
                    </Card>

                    <Card className="p-4 hover-elevate">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold">Family Trip to New Jersey</h4>
                        <Badge variant="outline">4 members</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        Planning our November family vacation together
                      </p>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span>7/12 tasks completed</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-primary h-2 rounded-full" style={{width: '58%'}}></div>
                        </div>
                      </div>
                      <Button variant="outline" className="w-full mt-3" size="sm">
                        View Group
                      </Button>
                    </Card>

                    <Card className="p-4 hover-elevate">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold">Eat Healthier & Workout</h4>
                        <Badge variant="outline">3 members</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        AI-curated daily health plan with accountability partners
                      </p>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span>18/25 tasks completed</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-primary h-2 rounded-full" style={{width: '72%'}}></div>
                        </div>
                      </div>
                      <Button variant="outline" className="w-full mt-3" size="sm">
                        View Group
                      </Button>
                    </Card>

                    {/* Add More Groups Card */}
                    <Card className="p-4 border-dashed border-2 hover-elevate">
                      <div className="text-center text-muted-foreground">
                        <Plus className="w-8 h-8 mx-auto mb-2" />
                        <p className="text-sm">Create or join more groups</p>
                      </div>
                    </Card>
                  </div>
                </div>

                {/* Recent Group Activity */}
                <div className="mt-8">
                  <h3 className="text-2xl font-semibold mb-4">Recent Group Activity</h3>
                  <Card className="p-4">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <CheckSquare className="w-5 h-5 text-green-600" />
                        <div className="flex-1">
                          <p className="text-sm">
                            <strong>Emma</strong> completed <span className="line-through decoration-2 decoration-green-600">"30-minute morning workout"</span>
                          </p>
                          <p className="text-xs text-muted-foreground">Eat Healthier & Workout • 1 hour ago</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <CheckSquare className="w-5 h-5 text-green-600" />
                        <div className="flex-1">
                          <p className="text-sm">
                            <strong>You</strong> completed <span className="line-through decoration-2 decoration-green-600">"Prep healthy lunch for tomorrow"</span>
                          </p>
                          <p className="text-xs text-muted-foreground">Eat Healthier & Workout • 2 hours ago</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <Target className="w-5 h-5 text-blue-600" />
                        <div className="flex-1">
                          <p className="text-sm">
                            <strong>Jessica</strong> added new task "Book spa day at resort"
                          </p>
                          <p className="text-xs text-muted-foreground">Girls Trip to Miami • 3 hours ago</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <CheckSquare className="w-5 h-5 text-green-600" />
                        <div className="flex-1">
                          <p className="text-sm">
                            <strong>Sarah</strong> completed <span className="line-through decoration-2 decoration-green-600">"Book hotel reservations"</span>
                          </p>
                          <p className="text-xs text-muted-foreground">Family Trip to New Jersey • 4 hours ago</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <Target className="w-5 h-5 text-blue-600" />
                        <div className="flex-1">
                          <p className="text-sm">
                            <strong>Mike</strong> added new task "Research hiking trails"
                          </p>
                          <p className="text-xs text-muted-foreground">Family Trip to New Jersey • 5 hours ago</p>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Browse Community Plans Section */}
                <div className="mt-12">
                  <div className="text-center mb-8 px-4">
                    <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500/10 to-emerald-500/10 px-4 sm:px-6 py-2 rounded-full mb-4">
                      <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 dark:text-purple-400" />
                      <span className="text-xs sm:text-sm font-semibold text-purple-600 dark:text-purple-400">Community Powered</span>
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-bold text-foreground mb-3 px-2">
                      Discover & Use Community Plans
                    </h3>
                    <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-2">
                      Browse plans created by others, get inspired, and use them for your own goals. Join thousands planning together!
                    </p>
                  </div>

                  {/* Category Tabs */}
                  <div className="flex gap-2 mb-6 overflow-x-auto pb-2 px-4 scrollbar-hide">
                    <Badge variant="default" className="cursor-pointer whitespace-nowrap shrink-0">
                      🔥 Trending
                    </Badge>
                    <Badge variant="outline" className="cursor-pointer whitespace-nowrap hover-elevate shrink-0">
                      ✈️ Travel
                    </Badge>
                    <Badge variant="outline" className="cursor-pointer whitespace-nowrap hover-elevate shrink-0">
                      💪 Fitness
                    </Badge>
                    <Badge variant="outline" className="cursor-pointer whitespace-nowrap hover-elevate shrink-0">
                      🎯 Productivity
                    </Badge>
                    <Badge variant="outline" className="cursor-pointer whitespace-nowrap hover-elevate shrink-0">
                      🎉 Events
                    </Badge>
                    <Badge variant="outline" className="cursor-pointer whitespace-nowrap hover-elevate shrink-0">
                      💼 Career
                    </Badge>
                    <Badge variant="outline" className="cursor-pointer whitespace-nowrap hover-elevate shrink-0">
                      🏠 Home
                    </Badge>
                  </div>

                  {/* Community Plans Grid */}
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 px-4">
                    {/* Plan Card 1 */}
                    <Card className="overflow-hidden hover-elevate group">
                      <div className="h-32 bg-gradient-to-br from-blue-500 to-purple-600 relative">
                        <div className="absolute inset-0 bg-black/20"></div>
                        <div className="absolute top-3 right-3">
                          <Badge className="bg-white/90 text-purple-700 hover:bg-white">
                            <Heart className="w-3 h-3 mr-1" />
                            2.4k
                          </Badge>
                        </div>
                        <div className="absolute bottom-3 left-3 right-3">
                          <h4 className="text-white font-bold text-lg">Weekend Trip to Paris</h4>
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white text-xs font-bold">
                            S
                          </div>
                          <span className="text-sm text-muted-foreground">by Sarah Chen</span>
                          <Badge variant="outline" className="ml-auto text-xs">Travel</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                          Complete 3-day Paris itinerary with sights, dining, and Eiffel Tower visit
                        </p>
                        <div className="flex gap-2">
                          <Button size="sm" className="flex-1" data-testid="button-use-plan-1">
                            <Copy className="w-3 h-3 mr-1" />
                            Use This Plan
                          </Button>
                          <Button size="sm" variant="outline">
                            <Eye className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </Card>

                    {/* Plan Card 2 */}
                    <Card className="overflow-hidden hover-elevate group">
                      <div className="h-32 bg-gradient-to-br from-emerald-500 to-teal-600 relative">
                        <div className="absolute inset-0 bg-black/20"></div>
                        <div className="absolute top-3 right-3">
                          <Badge className="bg-white/90 text-teal-700 hover:bg-white">
                            <Heart className="w-3 h-3 mr-1" />
                            1.8k
                          </Badge>
                        </div>
                        <div className="absolute bottom-3 left-3 right-3">
                          <h4 className="text-white font-bold text-lg">30-Day Fitness Challenge</h4>
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 bg-gradient-to-br from-emerald-400 to-teal-400 rounded-full flex items-center justify-center text-white text-xs font-bold">
                            M
                          </div>
                          <span className="text-sm text-muted-foreground">by Mike Johnson</span>
                          <Badge variant="outline" className="ml-auto text-xs">Fitness</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                          Daily workouts, meal prep, and progress tracking for complete transformation
                        </p>
                        <div className="flex gap-2">
                          <Button size="sm" className="flex-1" data-testid="button-use-plan-2">
                            <Copy className="w-3 h-3 mr-1" />
                            Use This Plan
                          </Button>
                          <Button size="sm" variant="outline">
                            <Eye className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </Card>

                    {/* Plan Card 3 */}
                    <Card className="overflow-hidden hover-elevate group">
                      <div className="h-32 bg-gradient-to-br from-orange-500 to-pink-600 relative">
                        <div className="absolute inset-0 bg-black/20"></div>
                        <div className="absolute top-3 right-3">
                          <Badge className="bg-white/90 text-orange-700 hover:bg-white">
                            <Heart className="w-3 h-3 mr-1" />
                            3.2k
                          </Badge>
                        </div>
                        <div className="absolute bottom-3 left-3 right-3">
                          <h4 className="text-white font-bold text-lg">Wedding Planning Checklist</h4>
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 bg-gradient-to-br from-orange-400 to-pink-400 rounded-full flex items-center justify-center text-white text-xs font-bold">
                            E
                          </div>
                          <span className="text-sm text-muted-foreground">by Emma Davis</span>
                          <Badge variant="outline" className="ml-auto text-xs">Events</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                          12-month wedding plan with venue, vendors, guests, and timeline
                        </p>
                        <div className="flex gap-2">
                          <Button size="sm" className="flex-1" data-testid="button-use-plan-3">
                            <Copy className="w-3 h-3 mr-1" />
                            Use This Plan
                          </Button>
                          <Button size="sm" variant="outline">
                            <Eye className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </Card>

                    {/* Plan Card 4 */}
                    <Card className="overflow-hidden hover-elevate group">
                      <div className="h-32 bg-gradient-to-br from-indigo-500 to-purple-600 relative">
                        <div className="absolute inset-0 bg-black/20"></div>
                        <div className="absolute top-3 right-3">
                          <Badge className="bg-white/90 text-indigo-700 hover:bg-white">
                            <Heart className="w-3 h-3 mr-1" />
                            1.5k
                          </Badge>
                        </div>
                        <div className="absolute bottom-3 left-3 right-3">
                          <h4 className="text-white font-bold text-lg">Career Switch to Tech</h4>
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 bg-gradient-to-br from-indigo-400 to-purple-400 rounded-full flex items-center justify-center text-white text-xs font-bold">
                            A
                          </div>
                          <span className="text-sm text-muted-foreground">by Alex Kim</span>
                          <Badge variant="outline" className="ml-auto text-xs">Career</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                          6-month plan: coding bootcamp, portfolio projects, and job applications
                        </p>
                        <div className="flex gap-2">
                          <Button size="sm" className="flex-1" data-testid="button-use-plan-4">
                            <Copy className="w-3 h-3 mr-1" />
                            Use This Plan
                          </Button>
                          <Button size="sm" variant="outline">
                            <Eye className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </Card>

                    {/* Plan Card 5 */}
                    <Card className="overflow-hidden hover-elevate group">
                      <div className="h-32 bg-gradient-to-br from-rose-500 to-red-600 relative">
                        <div className="absolute inset-0 bg-black/20"></div>
                        <div className="absolute top-3 right-3">
                          <Badge className="bg-white/90 text-rose-700 hover:bg-white">
                            <Heart className="w-3 h-3 mr-1" />
                            2.1k
                          </Badge>
                        </div>
                        <div className="absolute bottom-3 left-3 right-3">
                          <h4 className="text-white font-bold text-lg">Home Renovation Project</h4>
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 bg-gradient-to-br from-rose-400 to-red-400 rounded-full flex items-center justify-center text-white text-xs font-bold">
                            L
                          </div>
                          <span className="text-sm text-muted-foreground">by Lisa Park</span>
                          <Badge variant="outline" className="ml-auto text-xs">Home</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                          Kitchen remodel: contractors, materials, permits, and budget tracking
                        </p>
                        <div className="flex gap-2">
                          <Button size="sm" className="flex-1" data-testid="button-use-plan-5">
                            <Copy className="w-3 h-3 mr-1" />
                            Use This Plan
                          </Button>
                          <Button size="sm" variant="outline">
                            <Eye className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </Card>

                    {/* Plan Card 6 */}
                    <Card className="overflow-hidden hover-elevate group">
                      <div className="h-32 bg-gradient-to-br from-cyan-500 to-blue-600 relative">
                        <div className="absolute inset-0 bg-black/20"></div>
                        <div className="absolute top-3 right-3">
                          <Badge className="bg-white/90 text-cyan-700 hover:bg-white">
                            <Heart className="w-3 h-3 mr-1" />
                            890
                          </Badge>
                        </div>
                        <div className="absolute bottom-3 left-3 right-3">
                          <h4 className="text-white font-bold text-lg">Master Productivity System</h4>
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 bg-gradient-to-br from-cyan-400 to-blue-400 rounded-full flex items-center justify-center text-white text-xs font-bold">
                            D
                          </div>
                          <span className="text-sm text-muted-foreground">by David Lee</span>
                          <Badge variant="outline" className="ml-auto text-xs">Productivity</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                          Daily routines, time blocking, and focus techniques for peak performance
                        </p>
                        <div className="flex gap-2">
                          <Button size="sm" className="flex-1" data-testid="button-use-plan-6">
                            <Copy className="w-3 h-3 mr-1" />
                            Use This Plan
                          </Button>
                          <Button size="sm" variant="outline">
                            <Eye className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </div>

                  {/* Call to Action */}
                  <div className="mt-8 px-4">
                    <Card className="p-4 sm:p-6 bg-gradient-to-r from-purple-500/5 to-emerald-500/5 border-dashed">
                      <div className="flex flex-col sm:flex-row items-center gap-4">
                        <div className="w-12 h-12 shrink-0 bg-gradient-to-br from-purple-500 to-emerald-500 rounded-full flex items-center justify-center">
                          <Share2 className="w-6 h-6 text-white" />
                        </div>
                        <div className="text-center sm:text-left flex-1">
                          <h4 className="font-semibold mb-1">Share Your Plan with the Community</h4>
                          <p className="text-sm text-muted-foreground">Help others by sharing your successful plans and strategies</p>
                        </div>
                        <Button className="w-full sm:w-auto shrink-0" data-testid="button-share-my-plan">
                          Share My Plan
                        </Button>
                      </div>
                    </Card>
                  </div>
                </div>
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
                <h2 className="text-4xl font-bold text-foreground mb-4 bg-gradient-to-r from-purple-600 to-emerald-600 bg-clip-text text-transparent">
                  AI-Powered Life Planner & Smart Goal Tracker
                </h2>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                  Transform your goals into action with our intelligent AI planner. Track tasks, manage daily activities, and achieve your objectives with personalized AI-powered planning and goal tracking.
                </p>
              </div>

                {/* Core Features */}
                <div className="grid gap-6 md:grid-cols-3 mb-12">
                  <p className="col-span-full text-center text-xs text-muted-foreground mb-2">
                    💡 Click on any feature to learn more
                  </p>
                  <div 
                    className="text-center p-6 bg-card rounded-xl border hover-elevate cursor-pointer transition-all duration-200"
                    onClick={() => setExpandedFeature(expandedFeature === 'voice' ? null : 'voice')}
                    data-testid="feature-voice-planning"
                  >
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Mic className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Voice & AI Planning</h3>
                    <p className="text-sm text-muted-foreground">AI goal planner with voice input - speak your objectives and get instant personalized action plans</p>
                    
                    {expandedFeature === 'voice' && (
                      <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700 text-left">
                        <p className="text-sm text-muted-foreground mb-3">
                          Intelligent AI planner that understands natural language. Speak or type your goals like "I want to work out, take vitamins, prep for my Dallas trip" and get a personalized step-by-step action plan with task breakdowns.
                        </p>
                        <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
                          <Copy className="w-3 h-3" />
                          <span>Import from ChatGPT, Claude, and other AI assistants</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div 
                    className="text-center p-6 bg-card rounded-xl border hover-elevate cursor-pointer transition-all duration-200"
                    onClick={() => setExpandedFeature(expandedFeature === 'swipe' ? null : 'swipe')}
                    data-testid="feature-swipe-complete"
                  >
                    <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <CheckSquare className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Smart Task Manager</h3>
                    <p className="text-sm text-muted-foreground">Interactive task tracker with swipeable cards, instant progress updates, and celebration animations</p>
                    
                    {expandedFeature === 'swipe' && (
                      <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-700 text-left">
                        <p className="text-sm text-muted-foreground mb-3">
                          Modern task management system with swipeable cards. Swipe right to complete tasks, swipe left to skip. Every action is tracked with visual progress indicators and celebration effects.
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Customizable reminder frequency—hourly, daily, or weekly task notifications. Stay productive without feeling overwhelmed.
                        </p>
                      </div>
                    )}
                  </div>

                  <div 
                    className="text-center p-6 bg-card rounded-xl border hover-elevate cursor-pointer transition-all duration-200"
                    onClick={() => setExpandedFeature(expandedFeature === 'collaborate' ? null : 'collaborate')}
                    data-testid="feature-share-collaborate"
                  >
                    <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Users className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Collaborative Goal Planning</h3>
                    <p className="text-sm text-muted-foreground">Share goals, track group progress, and achieve objectives together with team collaboration tools</p>
                    
                    {expandedFeature === 'collaborate' && (
                      <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700 text-left">
                        <div className="space-y-3 text-sm">
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 bg-purple-600 rounded-full mt-2 shrink-0"></div>
                            <div>
                              <p className="font-medium text-foreground">Shared Goal Creation</p>
                              <p className="text-muted-foreground">Invite members to contribute tasks to group objectives like "Girls Trip to Miami" or "Family Fitness Challenge"</p>
                            </div>
                          </div>
                          
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 bg-purple-600 rounded-full mt-2 shrink-0"></div>
                            <div>
                              <p className="font-medium text-foreground">Real-Time Activity Feed</p>
                              <p className="text-muted-foreground">See when group members complete tasks with instant strikethrough effects and celebratory notifications</p>
                            </div>
                          </div>
                          
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 bg-purple-600 rounded-full mt-2 shrink-0"></div>
                            <div>
                              <p className="font-medium text-foreground">Shared Reflection Journaling</p>
                              <p className="text-muted-foreground">Group members can share daily reflections, mood tracking, and achievements with rich context about their journey</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Contact Sharing Highlight */}
                <div 
                  className="bg-gradient-to-br from-purple-50 via-emerald-50 to-blue-50 dark:from-purple-900/20 dark:via-emerald-900/20 dark:to-blue-900/20 p-8 rounded-2xl border border-purple-200/50 dark:border-purple-700/50 shadow-lg mb-12 cursor-pointer hover-elevate transition-all duration-200"
                  onClick={() => setExpandedFeature(expandedFeature === 'sharing' ? null : 'sharing')}
                  data-testid="feature-contact-sharing"
                >
                  <div className="flex items-center justify-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-emerald-500 rounded-xl flex items-center justify-center">
                      <BookOpen className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-center">
                      <h3 className="text-xl font-bold text-foreground bg-gradient-to-r from-purple-600 to-emerald-600 bg-clip-text text-transparent">
                        Share Your Journey
                      </h3>
                      <p className="text-sm text-muted-foreground">Connect your planning with friends and family</p>
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

      <Dialog open={showJournalMode} onOpenChange={setShowJournalMode}>
        <DialogContent className="max-w-[95vw] sm:max-w-4xl h-[90vh] flex flex-col p-0" data-testid="modal-journal-mode">
          <ConversationalPlanner 
            initialMode="journal"
            onClose={() => setShowJournalMode(false)}
          />
        </DialogContent>
      </Dialog>

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
              // Generate proper shareable link via backend
              const response = await apiRequest('POST', `/api/activities/${activity.id}/share`);
              const data = await response.json();
              const shareUrl = data.shareableLink;
              const displayTitle = shareData.shareTitle || activity.planSummary || activity.title;
              const shareText = `Check out my activity: ${displayTitle}!`;
              
              if (navigator.share) {
                await navigator.share({
                  title: displayTitle,
                  text: shareText,
                  url: shareUrl
                });
              } else {
                await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
                toast({
                  title: 'Link Copied!',
                  description: 'Share link has been copied to clipboard',
                });
              }
            } catch (error) {
              console.error('Share error:', error);
              toast({
                title: "Share Failed",
                description: "Unable to generate share link. Please try again.",
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

    </div>
  );
}