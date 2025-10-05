import { useEffect, useState } from 'react';
import { useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckSquare, Calendar, Clock, Lock, Share2, ChevronRight, Sparkles, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

interface SharedActivityData {
  activity: {
    id: string;
    title: string;
    description: string;
    category: string;
    status: string;
    priority?: string;
    startDate?: string;
    endDate?: string;
    userId: string;
    planSummary?: string;
    createdAt: string;
    updatedAt: string;
  };
  tasks: Array<{
    id: string;
    title: string;
    description: string;
    category: string;
    priority: string;
    completed: boolean;
    completedAt?: string;
    dueDate?: string;
    timeEstimate?: string;
  }>;
  requiresAuth: boolean;
  sharedBy?: {
    name?: string;
    email?: string;
  };
}

export default function SharedActivity() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication status
  const { data: user } = useQuery({
    queryKey: ['/api/user'],
  });

  useEffect(() => {
    setIsAuthenticated(!!user);
  }, [user]);

  // Fetch shared activity data
  const { data, isLoading, error: queryError } = useQuery<SharedActivityData>({
    queryKey: ['/api/share/activity', token],
    queryFn: async () => {
      const response = await fetch(`/api/share/activity/${token}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('This shared activity link is invalid or has expired.');
        }
        if (response.status === 401) {
          throw new Error('AUTH_REQUIRED');
        }
        throw new Error('Failed to load shared activity');
      }
      return response.json();
    },
    enabled: !!token,
  });

  const handleSignIn = () => {
    window.location.href = '/api/login';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading shared activity...</p>
        </div>
      </div>
    );
  }

  if (queryError || !data) {
    const errorMessage = queryError instanceof Error ? queryError.message : 'Failed to load activity';
    
    // Require authentication
    if (errorMessage === 'AUTH_REQUIRED' || (data?.requiresAuth && !isAuthenticated)) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-8 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Sign In Required</h2>
            <p className="text-muted-foreground mb-6">
              This activity is private. Please sign in to view the full details.
            </p>
            <Button onClick={handleSignIn} className="gap-2" data-testid="button-sign-in">
              <Lock className="w-4 h-4" />
              Sign In to View
            </Button>
          </Card>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Share2 className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Activity Not Found</h2>
          <p className="text-muted-foreground mb-6">
            {errorMessage === 'AUTH_REQUIRED' ? 'Please sign in to view this activity.' : errorMessage}
          </p>
          <Button onClick={() => window.location.href = '/'}>
            Go to Home
          </Button>
        </Card>
      </div>
    );
  }

  const { activity, tasks } = data;
  const completedTasks = tasks.filter(t => t.completed).length;
  const totalTasks = tasks.length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const activeTasks = tasks.filter(t => !t.completed);
  const completedTasksList = tasks.filter(t => t.completed);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Share2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-bold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Shared Activity
                </h1>
                {data.sharedBy?.name && (
                  <p className="text-xs text-muted-foreground">
                    Shared by {data.sharedBy.name}
                  </p>
                )}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => window.location.href = '/'} data-testid="button-go-home">
              <ArrowLeft className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Go to Home</span>
              <span className="sm:hidden">Home</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 sm:py-8 max-w-4xl">
        {/* Activity Summary Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="p-6 sm:p-8 mb-8">
            <div className="space-y-6">
              {/* Title and Description */}
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3 break-words">
                  {activity.planSummary || activity.title}
                </h2>
                {activity.description && (
                  <p className="text-muted-foreground text-base leading-relaxed break-words">
                    {activity.description}
                  </p>
                )}
              </div>

              {/* Metadata */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <Badge variant="outline" className="gap-1">
                  <span className="capitalize">{activity.category}</span>
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <span className="capitalize">{activity.status || 'planning'}</span>
                </Badge>
                {activity.endDate && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span className="whitespace-nowrap">Due {new Date(activity.endDate).toLocaleDateString()}</span>
                  </div>
                )}
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>{totalTasks} tasks</span>
                </div>
              </div>

              {/* Progress Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-foreground">
                      {completedTasks} of {totalTasks} completed
                    </span>
                  </div>
                  <Badge variant="outline" className="text-sm font-bold text-primary">
                    {progressPercent}%
                  </Badge>
                </div>
                
                <Progress value={progressPercent} className="h-3" />
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Active Tasks */}
        {activeTasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mb-8"
          >
            <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <ChevronRight className="w-5 h-5 text-primary" />
              Active Tasks
            </h3>
            <div className="space-y-3">
              {activeTasks.map((task, index) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.3) }}
                >
                  <Card className="p-4 sm:p-5 hover-elevate" data-testid={`task-active-${task.id}`}>
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/50 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-foreground mb-1 break-words">
                          {task.title}
                        </h4>
                        {task.description && (
                          <p className="text-sm text-muted-foreground mb-2 break-words">
                            {task.description}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {task.category}
                          </Badge>
                          {task.timeEstimate && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              <span>{task.timeEstimate}</span>
                            </div>
                          )}
                          {task.priority && (
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${
                                task.priority === 'high' ? 'border-red-500 text-red-600' :
                                task.priority === 'medium' ? 'border-yellow-500 text-yellow-600' :
                                'border-green-500 text-green-600'
                              }`}
                            >
                              {task.priority}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Completed Tasks */}
        {completedTasksList.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-green-600" />
              Completed Tasks
            </h3>
            <div className="space-y-3">
              {completedTasksList.map((task, index) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.3) }}
                >
                  <Card className="p-4 sm:p-5 bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-700" data-testid={`task-completed-${task.id}`}>
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-green-600 flex items-center justify-center mt-0.5 shrink-0">
                        <CheckSquare className="w-3 h-3 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-green-800 dark:text-green-200 line-through mb-1 break-words">
                          {task.title}
                        </h4>
                        {task.description && (
                          <p className="text-sm text-green-700 dark:text-green-300 line-through break-words">
                            {task.description}
                          </p>
                        )}
                        {task.completedAt && (
                          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                            Completed {new Date(task.completedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* CTA Section */}
        {!isAuthenticated && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="mt-8"
          >
            <Card className="p-6 text-center bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <Sparkles className="w-12 h-12 text-primary mx-auto mb-3" />
              <h3 className="text-lg font-bold mb-2">Want to create your own activity plan?</h3>
              <p className="text-muted-foreground mb-4">
                Sign in to JournalMate and start transforming your goals into reality
              </p>
              <Button onClick={handleSignIn} className="gap-2" data-testid="button-cta-signin">
                Get Started Free
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Card>
          </motion.div>
        )}

        {isAuthenticated && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="mt-8 text-center"
          >
            <Button onClick={() => window.location.href = '/'} variant="outline" className="gap-2">
              <Sparkles className="w-4 h-4" />
              Create Your Own Activity
            </Button>
          </motion.div>
        )}
      </main>
    </div>
  );
}
