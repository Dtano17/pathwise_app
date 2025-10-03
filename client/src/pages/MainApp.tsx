import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import VoiceInput from '@/components/VoiceInput';
import LiveChatInterface from '@/components/LiveChatInterface';
import TaskCard from '@/components/TaskCard';
import ProgressDashboard from '@/components/ProgressDashboard';
import ClaudePlanOutput from '@/components/ClaudePlanOutput';
import ThemeSelector from '@/components/ThemeSelector';
import LocationDatePlanner from '@/components/LocationDatePlanner';
import ConversationalPlanner from '@/components/ConversationalPlanner';
import Contacts from './Contacts';
import ChatHistory from './ChatHistory';
import RecentGoals from './RecentGoals';
import ProgressReport from './ProgressReport';
import { Sparkles, Target, BarChart3, CheckSquare, Mic, Plus, RefreshCw, Upload, MessageCircle, Download, Copy, Users, Heart, Dumbbell, Briefcase, TrendingUp, BookOpen, Mountain, Activity, Menu, Bell, Calendar, Share, Contact, MessageSquare, Brain, Lightbulb, History, Music, Instagram, Facebook, Youtube, Star, Share2, MoreHorizontal, Check, Clock, X, Trash2, ArrowLeft, Archive } from 'lucide-react';
import { Link } from 'wouter';
import { SiOpenai, SiClaude, SiPerplexity, SiSpotify, SiApplemusic, SiYoutubemusic, SiFacebook, SiInstagram, SiX } from 'react-icons/si';
import { type Task, type Activity as ActivityType, type ChatImport } from '@shared/schema';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import ThemeToggle from '@/components/ThemeToggle';
import NotificationManager from '@/components/NotificationManager';
import SmartScheduler from '@/components/SmartScheduler';
import CelebrationModal from '@/components/CelebrationModal';
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
  } | null>(null);

  // Activity selection and delete dialog state
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; activity: ActivityType | null }>({ open: false, activity: null });
  
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

  // Expanded activities for collapsible view
  const handleActivityClick = (activity: ActivityType) => {
    // Set the selected activity and navigate to tasks tab
    setSelectedActivityId(activity.id);
    setActiveTab('tasks');
    toast({
      title: `Viewing: ${activity.title}`,
      description: "Now showing tasks for this activity",
    });
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
      toast({
        title: "Activity Deleted",
        description: "The activity and its tasks have been removed."
      });
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
      toast({
        title: "Activity Archived",
        description: "The activity has been archived and hidden from view."
      });
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
      toast({
        title: "Task Archived",
        description: "The task has been archived and hidden from view."
      });
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
    staleTime: 60000, // 1 minute
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

  // Process goal mutation
  const processGoalMutation = useMutation({
    mutationFn: async (goalText: string) => {
      const response = await apiRequest('POST', '/api/goals/process', { goalText });
      return response.json();
    },
    onSuccess: async (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/progress'] });
      
      // Capture plan output for display on Goal Input page
      setCurrentPlanOutput({
        planTitle: data.planTitle,
        summary: data.summary,
        tasks: data.tasks || [],
        estimatedTimeframe: data.estimatedTimeframe,
        motivationalNote: data.motivationalNote
      });

      // Automatically create activity from the processed goal
      if (data.planTitle && data.tasks && data.tasks.length > 0) {
        try {
          const activityResponse = await apiRequest('POST', '/api/activities/from-dialogue', {
            title: data.planTitle,
            description: data.summary || 'AI-generated activity plan',
            category: 'goal',
            tasks: data.tasks.map((task: any) => ({
              title: task.title,
              description: task.description,
              priority: task.priority || 'medium',
              category: task.category || 'general',
              timeEstimate: task.timeEstimate
            }))
          });
          const activityData = await activityResponse.json();
          
          // Invalidate activities query to show the new activity
          queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
          queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
          
          toast({
            title: "Activity Created!",
            description: `"${activityData.title}" is ready to share with ${data.tasks.length} tasks!`,
            action: (
              <ToastAction onClick={() => setActiveTab("tasks")} altText="View Activity">
                View Activity
              </ToastAction>
            ),
          });
        } catch (error) {
          console.error('Failed to create activity:', error);
          // Still show the regular success toast if activity creation fails
          toast({
            title: "Goal Processed!",
            description: data.message || `Created ${data.tasks?.length || 0} actionable tasks!`,
          });
        }
      } else {
        toast({
          title: "Goal Processed!",
          description: data.message || `Created ${data.tasks?.length || 0} actionable tasks!`,
        });
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
      
      // Check if activity is completed after this task
      const celebrationMessages = [
        "🎉 Amazing work! Keep the momentum going!",
        "💪 You're crushing it! Another step closer to your goal!",
        "⭐ Fantastic! You're making real progress!",
        "🚀 Outstanding! You're on fire today!",
        "✨ Brilliant! Every task completed is a victory!"
      ];
      
      const randomMessage = celebrationMessages[Math.floor(Math.random() * celebrationMessages.length)];
      
      toast({
        title: data.achievement?.title || "Task Completed!",
        description: data.achievement?.description || data.message || randomMessage,
      });
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

  // Create activity from plan mutation
  const createActivityMutation = useMutation({
    mutationFn: async (planData: { title: string; description: string; tasks: any[] }) => {
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
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/progress'] });
      toast({
        title: "Activity Created!",
        description: `"${data.title}" has been created with ${data.tasks?.length || 0} tasks. Check your Activities tab!`,
      });
      setActiveTab("tasks"); // Switch to activities view
      // Keep plan visible - only clear when new plan is created
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.error || error.message || "Failed to create activity. Please try again.";
      toast({
        title: "Activity Creation Failed",
        description: errorMessage,
        variant: "destructive",
      });
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-50">
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
              <Badge variant="secondary" className="gap-1">
                <Sparkles className="w-3 h-3" />
                Live Demo
              </Badge>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 h-full overflow-auto">
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
                <Sparkles className="w-4 h-4" />
                <span>Integrations</span>
              </TabsTrigger>
              <TabsTrigger value="about" className="gap-2 text-sm font-medium" data-testid="tab-about">
                <Sparkles className="w-4 h-4" />
                <span>About</span>
              </TabsTrigger>
            </TabsList>

            {/* Goal Input Tab */}
            <TabsContent value="input" className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-3xl font-bold text-foreground mb-2">
                  What do you want to achieve?
                </h2>
                <p className="text-muted-foreground">
                  Share your goals through voice or text - AI will create actionable tasks for you
                </p>
              </div>
              
              <VoiceInput
                onSubmit={(text) => processGoalMutation.mutate(text)}
                isGenerating={processGoalMutation.isPending}
                placeholder="Tell me about your goals... or copy/paste a ChatGPT conversation to convert it into an action plan!"
              />

              {/* Interactive Options */}
              {!currentPlanOutput && !showThemeSelector && !showLocationDatePlanner && !showLifestylePlanner && (
                <div className="max-w-4xl mx-auto space-y-6">
                  {/* Quick Action Buttons */}
                  <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-4 mb-6">
                    <Button
                      onClick={() => onShowLifestylePlanner(true)}
                      variant="outline"
                      className="gap-2"
                      data-testid="button-lifestyle-planner"
                    >
                      <Brain className="w-4 h-4" />
                      Lifestyle Planner
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
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
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
                <DialogContent className="max-w-4xl">
                  <DialogHeader>
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
                <div className="max-w-4xl mx-auto">
                  {/* Back to Input Button */}
                  <div className="flex items-center justify-between mb-6 p-4 bg-muted/30 rounded-lg">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPlanOutput(null)}
                      className="gap-2"
                      data-testid="button-back-to-input"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back to Goal Input
                    </Button>
                    <div className="text-sm text-muted-foreground">
                      AI-Generated Action Plan
                    </div>
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
                    onCompleteTask={(taskId) => completeTaskMutation.mutate(taskId)}
                    onCreateActivity={(planData) => createActivityMutation.mutate(planData)}
                    showConfetti={true}
                  />
                  
                  {/* Action buttons */}
                  <div className="flex justify-center gap-4 mt-8">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPlanOutput(null)}
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
            <TabsContent value="activities" className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-3xl font-bold text-foreground mb-2">Your Activities</h2>
                <p className="text-muted-foreground">
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
                          toast({
                            title: `Viewing tasks for: ${activity.title}`,
                            description: "Switched to tasks view for this activity"
                          });
                        }}
                        data-testid={`activity-card-${activity.id}`}
                      >
                        <div className="w-full p-6">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="text-lg font-semibold">{activity.title}</h3>
                              </div>
                              <p className="text-muted-foreground text-sm mb-3">
                                {activity.description || 'No description provided'}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              <Badge variant="secondary" className="text-xs">{activity.category || 'General'}</Badge>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        try {
                                          // Generate proper shareable link via backend
                                          const response = await apiRequest('POST', `/api/activities/${activity.id}/share`);
                                          const data = await response.json();
                                          const shareUrl = data.shareableLink;
                                          const shareText = `Check out my activity: ${activity.title} - ${progressPercent}% complete!`;
                                          
                                          if (navigator.share) {
                                            await navigator.share({
                                              title: activity.title,
                                              text: shareText,
                                              url: shareUrl
                                            });
                                            toast({ 
                                              title: "Shared Successfully!", 
                                              description: "Activity shared with your contacts!" 
                                            });
                                          } else {
                                            await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
                                            toast({ 
                                              title: "Link Copied!", 
                                              description: "Activity link copied to clipboard - share it anywhere!" 
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
                                      data-testid={`button-share-${activity.id}`}
                                    >
                                      <Share2 className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Share to social media or contacts</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleArchiveActivity.mutate(activity.id);
                                      }}
                                      disabled={handleArchiveActivity.isPending}
                                      data-testid={`button-archive-${activity.id}`}
                                    >
                                      <Archive className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Archive</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
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
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Delete</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </div>

                          <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-4">
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
                                  <span>Due {new Date(activity.endDate).toLocaleDateString()}</span>
                                </div>
                              )}
                            </div>
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
            <TabsContent value="tasks" className="space-y-6">
              <div className="text-center mb-6">
                {selectedActivityId ? (
                  <>
                    <h2 className="text-3xl font-bold text-foreground mb-2">Activity Tasks</h2>
                    <p className="text-muted-foreground">
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
                      Back to {activities.find(a => a.id === selectedActivityId)?.title || 'Activity'}
                    </Button>
                  </>
                ) : (
                  <>
                    <h2 className="text-3xl font-bold text-foreground mb-2">All Tasks</h2>
                    <p className="text-muted-foreground">
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
                  <div className="flex gap-4 justify-between items-center mb-6">
                    <div className="flex gap-4 items-center">
                      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger className="w-32">
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
                        <SelectTrigger className="w-32">
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
                        <SelectTrigger className="w-40">
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
                      className="max-w-xs"
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
            <TabsContent value="progress" className="space-y-6">
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
            <TabsContent value="sync" className="h-full flex flex-col">
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
            </TabsContent>

            {/* Groups Tab */}
            <TabsContent value="groups" className="space-y-6">
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
              </div>
            </TabsContent>

            {/* About Tab */}
            <TabsContent value="about" className="space-y-8">
              <div className="max-w-4xl mx-auto">
                {/* Hero Section */}
                <div className="text-center mb-12">
                  <div className="inline-flex items-center justify-center w-32 h-32 mb-6">
                    <img src="/journalmate-logo-transparent.png" alt="JournalMate" className="w-32 h-32 object-contain" />
                  </div>
                  <h2 className="text-4xl font-bold text-foreground mb-4 bg-gradient-to-r from-purple-600 to-emerald-600 bg-clip-text text-transparent">
                    JournalMate AI
                  </h2>
                  <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                    Your AI-powered journaling companion that transforms goals into actionable plans and connects you with loved ones on your journey.
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
                    <p className="text-sm text-muted-foreground">Speak your goals naturally and get personalized action plans instantly</p>
                    
                    {expandedFeature === 'voice' && (
                      <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700 text-left">
                        <p className="text-sm text-muted-foreground mb-3">
                          Speak or write your goals—"I want to work out, take vitamins, prep for my Dallas trip"—and the app curates a personalized, step-by-step plan.
                        </p>
                        <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
                          <Copy className="w-3 h-3" />
                          <span>Copy & paste from ChatGPT, Claude, and other AI assistants supported</span>
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
                    <h3 className="text-lg font-semibold mb-2">Swipe to Complete</h3>
                    <p className="text-sm text-muted-foreground">Interactive task cards with instant celebrations and progress tracking</p>
                    
                    {expandedFeature === 'swipe' && (
                      <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-700 text-left">
                        <p className="text-sm text-muted-foreground mb-3">
                          Receive task reminders as swipeable cards: Swipe right = task completed → logged as a checkpoint. Swipe left = task skipped → logged as missed.
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Control how often the app nudges you—hourly, daily, weekly—based on your preferred cadence. Friendly pop-ups keep you on track without overwhelming you.
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
                    <h3 className="text-lg font-semibold mb-2">Share & Collaborate</h3>
                    <p className="text-sm text-muted-foreground">Connect with contacts to share journals, plans, and accountability</p>
                    
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
                      <h4 className="font-semibold">Progress Analytics</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">Track streaks, completion rates, and lifestyle insights</p>
                  </div>

                  <div className="p-4 bg-muted/50 rounded-xl border">
                    <div className="flex items-center gap-3 mb-2">
                      <Copy className="w-5 h-5 text-primary" />
                      <h4 className="font-semibold">AI Chat Import</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">Import conversations from ChatGPT, Claude, and more</p>
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
                </div>
              </div>
            </TabsContent>

          </Tabs>
        </div>
      </main>

      {/* Modals */}

      <Dialog open={showContacts} onOpenChange={onShowContacts}>
        <DialogContent className="max-w-6xl h-[90vh]" data-testid="modal-contacts">
          <DialogHeader>
            <DialogTitle>Friends & Family</DialogTitle>
            <DialogDescription>
              Manage your contacts and share your goals with friends and family
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            <Contacts />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showChatHistory} onOpenChange={onShowChatHistory}>
        <DialogContent className="max-w-6xl h-[90vh]" data-testid="modal-chat-history">
          <DialogHeader>
            <DialogTitle>Chat History</DialogTitle>
            <DialogDescription>
              View your imported conversations from ChatGPT, Claude, and other LLMs
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            <ChatHistory />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showRecentGoals} onOpenChange={onShowRecentGoals}>
        <DialogContent className="max-w-6xl h-[90vh]" data-testid="modal-recent-goals">
          <DialogHeader>
            <DialogTitle>Recent Goals</DialogTitle>
            <DialogDescription>
              View all your activities, track progress, and manage your goals
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            <RecentGoals />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showProgressReport} onOpenChange={onShowProgressReport}>
        <DialogContent className="max-w-6xl h-[90vh]" data-testid="modal-progress-report">
          <DialogHeader>
            <DialogTitle>Progress Report</DialogTitle>
            <DialogDescription>
              Comprehensive analytics, milestones, and insights about your achievements
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            <ProgressReport />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showLifestylePlanner} onOpenChange={onShowLifestylePlanner}>
        <DialogContent className="max-w-6xl h-[90vh]" data-testid="modal-lifestyle-planner">
          <DialogHeader>
            <DialogTitle>Conversational Lifestyle Planner</DialogTitle>
            <DialogDescription>
              AI-powered planning that asks clarifying questions and generates personalized lifestyle plans
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            <ConversationalPlanner onClose={() => onShowLifestylePlanner(false)} />
          </div>
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
    </div>
  );
}