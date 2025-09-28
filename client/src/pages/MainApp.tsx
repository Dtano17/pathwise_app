import { useState } from 'react';
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
import Contacts from './Contacts';
import ChatHistory from './ChatHistory';
import { Sparkles, Target, BarChart3, CheckSquare, Mic, Plus, RefreshCw, Upload, MessageCircle, Download, Copy, Users, Heart, Dumbbell, Briefcase, TrendingUp, BookOpen, Mountain, Activity, Menu, Bell, Calendar, Share, Contact, MessageSquare, Brain, Lightbulb, History, Music, Instagram, Facebook, Youtube, Star, Share2, MoreHorizontal, Check, Clock, X } from 'lucide-react';
import { SiOpenai, SiClaude, SiPerplexity, SiSpotify, SiApplemusic, SiYoutubemusic, SiFacebook, SiInstagram, SiX } from 'react-icons/si';
import { type Task, type Activity as ActivityType, type ChatImport } from '@shared/schema';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import ThemeToggle from '@/components/ThemeToggle';
import NotificationManager from '@/components/NotificationManager';
import SmartScheduler from '@/components/SmartScheduler';

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
  onShowChatHistory
}: MainAppProps) {
  const [activeTab, setActiveTab] = useState("input");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { open } = useSidebar();
  
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

  // Selected activity for detail view
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);

  // These states are now managed in App.tsx and passed as props
  
  // About page expandable features state
  const [expandedFeature, setExpandedFeature] = useState<string | null>(null);

  // Fetch tasks
  const { data: tasks = [], isLoading: tasksLoading, error: tasksError, refetch: refetchTasks } = useQuery<Task[]>({
    queryKey: ['/api/tasks'],
    staleTime: 30000, // 30 seconds
  });

  // Fetch activities
  const { data: activities = [], isLoading: activitiesLoading, error: activitiesError, refetch: refetchActivities } = useQuery<ActivityType[]>({
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
      queryClient.invalidateQueries({ queryKey: ['/api/progress'] });
      toast({
        title: data.achievement?.title || "Task Completed!",
        description: data.achievement?.description || data.message,
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
      setCurrentPlanOutput(null); // Clear the plan output
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              {!open && <SidebarTrigger data-testid="button-sidebar-toggle" />}
              <div className="w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center">
                <img src="/journalmate-logo-transparent.png" alt="JournalMate" className="w-12 h-12 sm:w-16 sm:h-16 object-contain" />
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl font-bold text-foreground">JournalMate</h1>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Transform Goals into Reality</p>
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
          {/* Navigation Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 mb-4 sm:mb-8 bg-muted/30 p-1 h-10 sm:h-12 overflow-x-auto">
              <TabsTrigger value="input" className="gap-2 text-sm font-medium" data-testid="tab-input">
                <Mic className="w-4 h-4" />
                <span className="hidden sm:inline">Goal Input</span>
                <span className="sm:hidden">Input</span>
              </TabsTrigger>
              <TabsTrigger value="tasks" className="gap-2 text-sm font-medium" data-testid="tab-activities">
                <CheckSquare className="w-4 h-4" />
                <span className="hidden sm:inline">Activities ({pendingTasks.length})</span>
                <span className="sm:hidden">Activities</span>
              </TabsTrigger>
              <TabsTrigger value="progress" className="gap-2 text-sm font-medium" data-testid="tab-progress">
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">Progress</span>
                <span className="sm:hidden">Stats</span>
              </TabsTrigger>
              <TabsTrigger value="groups" className="gap-2 text-sm font-medium" data-testid="tab-groups">
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Groups</span>
                <span className="sm:hidden">Groups</span>
              </TabsTrigger>
              <TabsTrigger value="sync" className="gap-2 text-sm font-medium" data-testid="tab-integrations">
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">Integrations</span>
                <span className="sm:hidden">Apps</span>
              </TabsTrigger>
              <TabsTrigger value="about" className="gap-2 text-sm font-medium" data-testid="tab-about">
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">About</span>
                <span className="sm:hidden">About</span>
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
                placeholder="Tell me about your goals... (e.g., 'I want to get healthier', 'Learn to code', 'Organize my life')"
              />

              {/* Interactive Options */}
              {!currentPlanOutput && !showThemeSelector && !showLocationDatePlanner && (
                <div className="max-w-4xl mx-auto space-y-6">
                  {/* Quick Action Buttons */}
                  <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-4 mb-6">
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
                  <ClaudePlanOutput
                    planTitle={currentPlanOutput.planTitle}
                    summary={currentPlanOutput.summary}
                    tasks={currentPlanOutput.tasks.map(task => ({
                      ...task,
                      description: task.description || '',
                      priority: (task.priority as 'high' | 'low' | 'medium') || 'medium',
                      completed: task.completed ?? false,
                      timeEstimate: task.timeEstimate || undefined,
                      context: task.context || undefined
                    }))}
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

            {/* Activities Tab */}
            <TabsContent value="tasks" className="space-y-6">
              {!selectedActivityId ? (
                <>
                  {/* Activities List View */}
                  <div className="text-center mb-6">
                    <h2 className="text-3xl font-bold text-foreground mb-2">Your Activities</h2>
                    <p className="text-muted-foreground">
                      Shareable activities with progress tracking and social features
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
                    <div className="text-center py-12">
                      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-muted-foreground">Loading your activities...</p>
                    </div>
                  ) : activities.length === 0 ? (
                    <div className="text-center py-12">
                      <Target className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-xl font-semibold mb-2">No activities yet</h3>
                      <p className="text-muted-foreground mb-4">
                        Create your first activity to organize goals with shareable timelines!
                      </p>
                      <Button onClick={() => setActiveTab("input")} className="gap-2">
                        <Plus className="w-4 h-4" />
                        Create Your First Activity
                      </Button>
                    </div>
                  ) : (
                    <div className="grid gap-6 max-w-4xl mx-auto">
                      {activities.map((activity) => (
                        <div 
                          key={activity.id} 
                          className="bg-card border rounded-xl p-6 hover-elevate cursor-pointer" 
                          data-testid={`activity-card-${activity.id}`}
                          onClick={() => setSelectedActivityId(activity.id)}
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold mb-2">{activity.title}</h3>
                              <p className="text-muted-foreground text-sm mb-3">
                                {activity.description || 'No description provided'}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              <Badge variant="secondary" className="text-xs">{activity.category || 'General'}</Badge>
                              {activity.rating && (
                                <div className="flex items-center gap-1">
                                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                  <span className="text-sm font-medium">{activity.rating}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Activity className="w-4 h-4" />
                                <span>{activity.status || 'planning'}</span>
                              </div>
                              {activity.endDate && (
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <Calendar className="w-4 h-4" />
                                  <span>Due {new Date(activity.endDate).toLocaleDateString()}</span>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                data-testid={`button-share-activity-${activity.id}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toast({ title: "Share Activity", description: "Social sharing coming soon!" });
                                }}
                              >
                                <Share2 className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                data-testid={`button-activity-options-${activity.id}`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          
                          {activity.isPublic && (
                            <div className="mt-3 flex items-center gap-2">
                              <Share className="w-4 h-4 text-green-600" />
                              <span className="text-sm text-green-600 font-medium">Public Activity</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Activity Detail View with Tasks */}
                  <div className="flex items-center gap-4 mb-6">
                    <Button 
                      variant="ghost" 
                      onClick={() => setSelectedActivityId(null)}
                      className="gap-2"
                      data-testid="button-back-to-activities"
                    >
                      <Share className="w-4 h-4 rotate-180" />
                      Back to Activities
                    </Button>
                  </div>

                  <div className="text-center mb-6">
                    <h2 className="text-3xl font-bold text-foreground mb-2">Activity Tasks</h2>
                    <p className="text-muted-foreground">
                      Simple task management with inline actions
                    </p>
                  </div>

                  {tasksLoading ? (
                    <div className="text-center py-12">
                      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-muted-foreground">Loading tasks...</p>
                    </div>
                  ) : pendingTasks.length === 0 ? (
                    <div className="text-center py-12">
                      <CheckSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-xl font-semibold mb-2">No tasks in this activity</h3>
                      <p className="text-muted-foreground mb-4">
                        Tasks will appear here when you create an activity from a plan
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-w-2xl mx-auto">
                      {pendingTasks.map((task) => (
                        <div key={task.id} className="bg-card border rounded-lg p-4" data-testid={`task-item-${task.id}`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1 mr-4">
                              <h4 className="font-medium mb-2">{task.title}</h4>
                              {task.description && (
                                <p className="text-sm text-muted-foreground mb-3">{task.description}</p>
                              )}
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">{task.priority}</Badge>
                                <Badge variant="secondary" className="text-xs">{task.category}</Badge>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => completeTaskMutation.mutate(task.id)}
                                data-testid={`button-complete-${task.id}`}
                              >
                                <Check className="w-4 h-4 text-green-600" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => snoozeTaskMutation.mutate({ taskId: task.id, hours: 2 })}
                                data-testid={`button-snooze-${task.id}`}
                              >
                                <Clock className="w-4 h-4 text-yellow-600" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => skipTaskMutation.mutate(task.id)}
                                data-testid={`button-skip-${task.id}`}
                              >
                                <X className="w-4 h-4 text-red-600" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Completed Tasks Summary */}
                      {completedTasks.length > 0 && (
                        <div className="mt-8">
                          <h3 className="text-lg font-semibold mb-4 text-center flex items-center justify-center gap-2">
                            <CheckSquare className="w-5 h-5 text-green-600" />
                            Completed ({completedTasks.length})
                          </h3>
                          <div className="space-y-2">
                            {completedTasks.slice(0, 3).map((task) => (
                              <div key={task.id} className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-3">
                                <p className="text-sm font-medium text-green-800 dark:text-green-200 line-through">
                                  {task.title}
                                </p>
                              </div>
                            ))}
                            {completedTasks.length > 3 && (
                              <p className="text-center text-sm text-muted-foreground">
                                +{completedTasks.length - 3} more completed
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
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
    </div>
  );
}