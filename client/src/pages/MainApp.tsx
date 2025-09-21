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
import { Sparkles, Target, BarChart3, CheckSquare, Mic, Plus, RefreshCw } from 'lucide-react';
import { type Task } from '@shared/schema';

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

export default function MainApp() {
  const [activeTab, setActiveTab] = useState("tasks");
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  // Process goal mutation
  const processGoalMutation = useMutation({
    mutationFn: async (goalText: string) => {
      const response = await apiRequest('POST', '/api/goals/process', { goalText });
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/progress'] });
      toast({
        title: "Goal Processed! 🎯",
        description: data.message || `Created ${data.tasks?.length || 0} actionable tasks!`,
      });
      setActiveTab("tasks"); // Switch to tasks view
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
        title: data.achievement?.title || "Task Completed! 🎉",
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

  const pendingTasks = tasks.filter(task => !task.completed);
  const completedTasks = tasks.filter(task => task.completed);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">IntentAI</h1>
                <p className="text-sm text-muted-foreground">Transform Goals into Reality</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                <Sparkles className="w-3 h-3" />
                Live Demo
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Navigation Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-8">
              <TabsTrigger value="input" className="gap-2" data-testid="tab-input">
                <Mic className="w-4 h-4" />
                Goal Input
              </TabsTrigger>
              <TabsTrigger value="tasks" className="gap-2" data-testid="tab-tasks">
                <CheckSquare className="w-4 h-4" />
                Tasks ({pendingTasks.length})
              </TabsTrigger>
              <TabsTrigger value="progress" className="gap-2" data-testid="tab-progress">
                <BarChart3 className="w-4 h-4" />
                Progress
              </TabsTrigger>
              <TabsTrigger value="about" className="gap-2" data-testid="tab-about">
                <Sparkles className="w-4 h-4" />
                About
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

              {/* Example goals */}
              <div className="max-w-2xl mx-auto">
                <p className="text-sm text-muted-foreground mb-3 text-center">Try these examples:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {[
                    "I want to get healthier and exercise more",
                    "Learn programming and build a website",
                    "Organize my room and declutter my space",
                    "Read more books and expand my knowledge"
                  ].map((example, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => processGoalMutation.mutate(example)}
                      disabled={processGoalMutation.isPending}
                      className="text-xs"
                      data-testid={`button-example-${index}`}
                    >
                      {example}
                    </Button>
                  ))}
                </div>
              </div>
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
                            task.dueDate.toString().split('T')[0]
                          ) : undefined,
                        priority: task.priority as 'low' | 'medium' | 'high'
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
                  <h3 className="text-lg font-semibold mb-4 text-center">
                    🎉 Completed Today ({completedTasks.length})
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
                  <h3 className="text-lg font-semibold mb-4 text-center">💡 AI Lifestyle Suggestions</h3>
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

            {/* About Tab */}
            <TabsContent value="about" className="space-y-6">
              <div className="max-w-4xl mx-auto">
                <div className="text-center mb-8">
                  <h2 className="text-4xl font-bold text-foreground mb-4">
                    🧭 Transform Goals into Reality Using AI as Your Companion
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
                        AI Companion Integration
                      </h3>
                      <p className="text-muted-foreground">
                        Sync with your favorite AI tools like ChatGPT, Claude, or Gemini for deeper insights and conversational support.
                      </p>
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
                  </div>

                  <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-6 rounded-lg mt-8 border">
                    <h3 className="text-xl font-semibold mb-3">🎯 Coming Soon: Advanced Features</h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• <strong>Smart Sync:</strong> Seamless integration with iPhone Notes, Samsung Memo, calendar, and maps</li>
                      <li>• <strong>Stock Strategy Companion:</strong> AI-powered trading assistant with risk management and alerts</li>
                      <li>• <strong>Geotagging Accountability:</strong> Location-based task completion verification</li>
                      <li>• <strong>Contact Integration:</strong> Connect with your phone contacts for shared goals and accountability</li>
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
    </div>
  );
}