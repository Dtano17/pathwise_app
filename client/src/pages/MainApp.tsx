import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import VoiceInput from '@/components/VoiceInput';
import TaskCard from '@/components/TaskCard';
import ProgressDashboard from '@/components/ProgressDashboard';
import ClaudePlanOutput from '@/components/ClaudePlanOutput';
import ThemeSelector from '@/components/ThemeSelector';
import LocationDatePlanner from '@/components/LocationDatePlanner';
import Contacts from './Contacts';
import { Sparkles, Target, BarChart3, CheckSquare, Mic, Plus, RefreshCw, Upload, MessageCircle, Download, Copy, Users, Heart, Dumbbell, Briefcase, TrendingUp, BookOpen, Mountain, Activity, Menu, Bell, Calendar } from 'lucide-react';
import { type Task, type ChatImport } from '@shared/schema';
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
}

export default function MainApp({ 
  selectedTheme, 
  onThemeSelect,
  showThemeSelector,
  onShowThemeSelector,
  showLocationDatePlanner,
  onShowLocationDatePlanner,
  showContacts,
  onShowContacts
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

  // These states are now managed in App.tsx and passed as props

  // Fetch tasks
  const { data: tasks = [], isLoading: tasksLoading, error: tasksError, refetch: refetchTasks } = useQuery<Task[]>({
    queryKey: ['/api/tasks'],
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
    onSuccess: (data: any) => {
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
      
      toast({
        title: "Goal Processed!",
        description: data.message || `Created ${data.tasks?.length || 0} actionable tasks!`,
      });
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

  const pendingTasks = tasks.filter(task => !task.completed);
  const completedTasks = tasks.filter(task => task.completed);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {!open && <SidebarTrigger data-testid="button-sidebar-toggle" />}
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">pathwise.ai</h1>
                <p className="text-sm text-muted-foreground">Transform Goals into Reality</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
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
      <main className="container mx-auto px-4 py-8 h-full overflow-auto">
        <div className="max-w-6xl mx-auto">
          {/* Navigation Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-6 mb-8 bg-muted/30 p-1 h-12">
              <TabsTrigger value="input" className="gap-2 text-sm font-medium" data-testid="tab-input">
                <Mic className="w-4 h-4" />
                <span className="hidden sm:inline">Goal Input</span>
                <span className="sm:hidden">Input</span>
              </TabsTrigger>
              <TabsTrigger value="tasks" className="gap-2 text-sm font-medium" data-testid="tab-tasks">
                <CheckSquare className="w-4 h-4" />
                <span className="hidden sm:inline">Tasks ({pendingTasks.length})</span>
                <span className="sm:hidden">Tasks</span>
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
              <TabsTrigger value="sync" className="gap-2 text-sm font-medium" data-testid="tab-sync">
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">Chat Sync</span>
                <span className="sm:hidden">Sync</span>
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
                  <div className="flex justify-center gap-4 mb-6">
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {[
                        { text: "Lose 20lbs in 2 months", theme: "Health & Fitness", Icon: Dumbbell },
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

            {/* Tasks Tab */}
            <TabsContent value="tasks" className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-3xl font-bold text-foreground mb-2">Your Action Items</h2>
                <p className="text-muted-foreground">
                  Swipe right to complete with celebrations, swipe left to skip
                </p>
              </div>

              {tasksLoading ? (
                <div className="text-center py-12">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading your tasks...</p>
                </div>
              ) : pendingTasks.length === 0 ? (
                <div className="text-center py-12">
                  <Target className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No pending tasks</h3>
                  <p className="text-muted-foreground mb-4">
                    Start by adding a goal to generate actionable tasks!
                  </p>
                  <Button onClick={() => setActiveTab("input")} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Add Your First Goal
                  </Button>
                </div>
              ) : (
                <div className="grid gap-6 max-w-2xl mx-auto">
                  {pendingTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={{
                        ...task,
                        description: task.description || '',
                        dueDate: task.dueDate ? 
                          (task.dueDate instanceof Date ? 
                            task.dueDate.toISOString().split('T')[0] : 
                            String(task.dueDate).split('T')[0]
                          ) : undefined,
                        priority: task.priority as 'low' | 'medium' | 'high',
                        completed: task.completed ?? false
                      }}
                      onComplete={(taskId) => completeTaskMutation.mutate(taskId)}
                      onSkip={(taskId) => skipTaskMutation.mutate(taskId)}
                      showConfetti={true}
                    />
                  ))}
                </div>
              )}

              {/* Completed Tasks Summary */}
              {completedTasks.length > 0 && (
                <div className="mt-12 max-w-2xl mx-auto">
                  <h3 className="text-lg font-semibold mb-4 text-center flex items-center justify-center gap-2">
                    <CheckSquare className="w-5 h-5 text-green-600" />
                    Completed Today ({completedTasks.length})
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
                        +{completedTasks.length - 3} more completed tasks
                      </p>
                    )}
                  </div>
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

            {/* Chat Sync Tab */}
            <TabsContent value="sync" className="space-y-6">
              <div className="max-w-4xl mx-auto">
                <div className="text-center mb-6">
                  <h2 className="text-3xl font-bold text-foreground mb-2">
                    Import Chat Conversations
                  </h2>
                  <p className="text-muted-foreground">
                    Sync your ChatGPT/Claude conversations to create actionable accountability tasks
                  </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  {/* Import Form */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Upload className="w-5 h-5" />
                        Import New Chat
                      </CardTitle>
                      <CardDescription>
                        Paste your chat conversation and we'll extract goals and create tasks
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Chat Source</label>
                        <Select value={chatSource} onValueChange={setChatSource}>
                          <SelectTrigger data-testid="select-chat-source">
                            <SelectValue placeholder="Select chat source" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="chatgpt">ChatGPT</SelectItem>
                            <SelectItem value="claude">Claude</SelectItem>
                            <SelectItem value="manual">Manual Entry</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Conversation Title (Optional)</label>
                        <Input
                          placeholder="e.g., Fitness Goals Discussion"
                          value={chatTitle}
                          onChange={(e) => setChatTitle(e.target.value)}
                          data-testid="input-chat-title"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Chat Conversation</label>
                        <Textarea
                          placeholder="Paste your chat conversation here...

Format examples:
User: I want to get healthier
Assistant: That's a great goal! Here are some steps...

Or:
You: I need to organize my life
ChatGPT: I can help you create a plan..."
                          value={chatText}
                          onChange={(e) => setChatText(e.target.value)}
                          className="min-h-[200px] resize-none"
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
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Processing Chat...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            Import & Create Tasks
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Instructions & Previous Imports */}
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <MessageCircle className="w-5 h-5" />
                          How It Works
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 text-sm text-muted-foreground">
                        <div className="flex items-start gap-2">
                          <span className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-0.5">1</span>
                          <div>
                            <p className="font-medium text-foreground">Copy Your Chat</p>
                            <p>Copy and paste conversations from ChatGPT, Claude, or any AI assistant</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-0.5">2</span>
                          <div>
                            <p className="font-medium text-foreground">AI Processes Your Chat</p>
                            <p>Our AI extracts goals, intentions, and commitments from your conversation</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-0.5">3</span>
                          <div>
                            <p className="font-medium text-foreground">Get Accountability Tasks</p>
                            <p>Receive swipeable tasks that help you follow through on your plans</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Download className="w-5 h-5" />
                          Previous Imports ({chatImports.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {chatImportsLoading ? (
                          <p className="text-muted-foreground">Loading imports...</p>
                        ) : chatImports.length === 0 ? (
                          <p className="text-muted-foreground">No chat imports yet. Start by importing your first conversation!</p>
                        ) : (
                          <div className="space-y-3 max-h-60 overflow-y-auto">
                            {chatImports.slice(0, 5).map((chatImport) => (
                              <div key={chatImport.id} className="border rounded-lg p-3">
                                <div className="flex items-center justify-between mb-1">
                                  <p className="font-medium text-sm">
                                    {chatImport.conversationTitle || `${chatImport.source} Conversation`}
                                  </p>
                                  <Badge variant="outline" className="text-xs">
                                    {chatImport.source}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {chatImport.extractedGoals?.length || 0} goals extracted • {chatImport.createdAt ? new Date(chatImport.createdAt).toLocaleDateString() : 'Recently'}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
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
            <TabsContent value="about" className="space-y-6">
              <div className="max-w-4xl mx-auto">
                <div className="text-center mb-8">
                  <h2 className="text-4xl font-bold text-foreground mb-4 flex items-center justify-center gap-2">
                    <Sparkles className="w-8 h-8" />
                    Transform Goals into Reality Using AI as Your Companion
                  </h2>
                  <p className="text-xl text-muted-foreground">
                    Built for doers. Designed to deliver.
                  </p>
                </div>

                <div className="prose prose-lg max-w-none dark:prose-invert">
                  <p className="text-muted-foreground text-lg leading-relaxed mb-8">
                    This is more than a productivity tool—it's your lifestyle companion. Whether you're chasing short-term wins or long-term transformations, this AI-powered mobile app helps you turn intentions into actionable plans and holds you accountable every step of the way.
                  </p>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="bg-card p-6 rounded-lg border">
                      <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                        <Mic className="w-5 h-5 text-primary" />
                        Conversational Planning
                      </h3>
                      <p className="text-muted-foreground">
                        Speak or write your goals—"I want to work out, take vitamins, prep for my Dallas trip"—and the app curates a personalized, step-by-step plan.
                      </p>
                    </div>

                    <div className="bg-card p-6 rounded-lg border">
                      <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                        <CheckSquare className="w-5 h-5 text-primary" />
                        Swipe-Based Accountability
                      </h3>
                      <p className="text-muted-foreground">
                        Receive task reminders as swipeable cards: Swipe right = task completed → logged as a checkpoint. Swipe left = task skipped → logged as missed.
                      </p>
                    </div>

                    <div className="bg-card p-6 rounded-lg border">
                      <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-primary" />
                        AI Check-ins & Progress Tracking
                      </h3>
                      <p className="text-muted-foreground">
                        Control how often the app nudges you—hourly, daily, weekly—based on your preferred cadence. Friendly pop-ups keep you on track without overwhelming you.
                      </p>
                    </div>

                    <div className="bg-card p-6 rounded-lg border">
                      <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                        <Target className="w-5 h-5 text-primary" />
                        Future Projection
                      </h3>
                      <p className="text-muted-foreground">
                        Planning a trip or lifestyle shift? The app anticipates your needs—lodging, transport, packing—and reminds you proactively.
                      </p>
                    </div>

                    <div className="bg-card p-6 rounded-lg border">
                      <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-primary" />
                        Copy & Paste AI Chat Import
                      </h3>
                      <p className="text-muted-foreground">
                        Simply copy and paste your conversations from ChatGPT, Claude, or any AI assistant. Our system intelligently extracts your goals and creates actionable accountability tasks from your discussions.
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                        <Copy className="w-4 h-4" />
                        <span>Direct copy-paste from AI platforms supported</span>
                      </div>
                    </div>

                    <div className="bg-card p-6 rounded-lg border">
                      <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                        <RefreshCw className="w-5 h-5 text-primary" />
                        Smart Sync & Lifestyle Pairing
                      </h3>
                      <p className="text-muted-foreground">
                        Discover new habits and activities inspired by users with similar goals—like hiking, journaling, cold plunges, or travel routines.
                      </p>
                    </div>

                    <div className="bg-card p-6 rounded-lg border">
                      <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                        <Users className="w-5 h-5 text-primary" />
                        Group Goals & Shared Journaling
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        Create collaborative spaces where family and friends can join your journey! Share goals, track progress together, and build accountability through collective journaling and real-time updates.
                      </p>
                      
                      <div className="space-y-3 text-sm">
                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0"></div>
                          <div>
                            <p className="font-medium text-foreground">Shared Goal Creation</p>
                            <p className="text-muted-foreground">Invite members to contribute tasks to group objectives like "Girls Trip to Miami" or "Family Fitness Challenge"</p>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0"></div>
                          <div>
                            <p className="font-medium text-foreground">Real-Time Activity Feed</p>
                            <p className="text-muted-foreground">See when group members complete tasks with instant strikethrough effects and celebratory notifications</p>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0"></div>
                          <div>
                            <p className="font-medium text-foreground">Collective Progress Tracking</p>
                            <p className="text-muted-foreground">Visual progress bars show group momentum, completion rates, and milestone achievements</p>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0"></div>
                          <div>
                            <p className="font-medium text-foreground">Shared Reflection Journaling</p>
                            <p className="text-muted-foreground">Group members can share daily reflections, mood tracking, and achievements with rich context about their journey</p>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0"></div>
                          <div>
                            <p className="font-medium text-foreground">Accountability Insights</p>
                            <p className="text-muted-foreground">AI-powered insights suggest who might need encouragement and highlights group success patterns</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
                        <p className="text-sm text-foreground font-medium mb-1">Perfect for:</p>
                        <p className="text-xs text-muted-foreground">Family wellness goals • Friend group travel planning • Work team challenges • Study groups • Couples accountability • Fitness partnerships</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-green-100/50 to-emerald-100/50 dark:from-green-900/30 dark:to-emerald-900/30 p-6 rounded-lg mt-8 border border-green-200 dark:border-green-800">
                    <h3 className="text-xl font-semibold mb-3">✅ New: Contact Integration</h3>
                    <p className="text-muted-foreground mb-4">Sync your phone contacts and share goals with friends and family! Available now through the sidebar.</p>
                  </div>

                  <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-6 rounded-lg mt-4 border">
                    <h3 className="text-xl font-semibold mb-3">🎯 Coming Soon: Advanced Features</h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• <strong>Smart Sync:</strong> Seamless integration with iPhone Notes, Samsung Memo, calendar, and maps</li>
                      <li>• <strong>Stock Strategy Companion:</strong> AI-powered trading assistant with risk management and alerts</li>
                      <li>• <strong>Geotagging Accountability:</strong> Location-based task completion verification</li>
                      <li>• <strong>Group Chat:</strong> Real-time collaboration and shared progress tracking</li>
                    </ul>
                  </div>

                  <div className="text-center mt-8 p-6 bg-muted rounded-lg">
                    <p className="text-lg font-semibold mb-2">Founded by Dennis Tanaruno</p>
                    <p className="text-muted-foreground mb-4">Built for those who want to live with intention, structure, and momentum.</p>
                    <Button asChild variant="outline">
                      <a href="https://www.linkedin.com/in/dennis-tanaruno" target="_blank" rel="noopener noreferrer">
                        Connect on LinkedIn
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

          </Tabs>
        </div>
      </main>

      {/* Modals */}
      <ThemeSelector
        open={showThemeSelector}
        onOpenChange={onShowThemeSelector}
        onThemeSelect={onThemeSelect}
      />

      <LocationDatePlanner
        open={showLocationDatePlanner}
        onOpenChange={onShowLocationDatePlanner}
      />

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
    </div>
  );
}