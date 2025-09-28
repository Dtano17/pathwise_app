import { useEffect, useState } from 'react';
import { useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckSquare, Calendar, ArrowLeft, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SharedActivityData {
  activity: {
    id: string;
    title: string;
    description: string;
    category: string;
    status: string;
    priority: string;
    startDate?: string;
    endDate?: string;
    userId: string;
    totalTasks: number;
    completedTasks: number;
    progressPercentage: number;
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
    timeEstimate?: number;
  }>;
}

export default function SharedActivity() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);

  // Fetch shared activity data
  const { data, isLoading, error: queryError } = useQuery<SharedActivityData>({
    queryKey: ['/api/share/activity', token],
    queryFn: async () => {
      const response = await fetch(`/api/share/activity/${token}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('This shared activity link is invalid or has expired.');
        }
        throw new Error('Failed to load shared activity');
      }
      return response.json();
    },
    enabled: !!token,
  });

  useEffect(() => {
    if (queryError) {
      setError(queryError instanceof Error ? queryError.message : 'Failed to load activity');
    }
  }, [queryError]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading shared activity...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-6 text-center">
          <h1 className="text-xl font-semibold mb-2">Activity Not Found</h1>
          <p className="text-muted-foreground mb-4">
            {error || 'This shared activity link is invalid or has expired.'}
          </p>
          <Button 
            onClick={() => window.location.href = '/'}
            data-testid="button-go-home"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getCategoryColor = (category: string | null | undefined) => {
    const categoryKey = (category ?? 'general').toLowerCase();
    switch (categoryKey) {
      case 'work': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'personal': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'health': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200';
      case 'finance': return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button 
            variant="outline" 
            onClick={() => window.location.href = '/'}
            data-testid="button-back-home"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Visit JournalMate
          </Button>
          <Button 
            variant="outline"
            onClick={() => {
              window.open('/', '_blank');
              toast({
                title: "Opening JournalMate",
                description: "Create your own activities and goals!"
              });
            }}
            data-testid="button-join-app"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Join App
          </Button>
        </div>

        {/* Shared Activity Card */}
        <Card className="p-6 mb-6" data-testid="shared-activity-card">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-2xl font-bold">{activity.title}</h1>
                <Badge className="text-xs">Shared Activity</Badge>
              </div>
              <p className="text-muted-foreground mb-3">
                {activity.description || 'No description provided'}
              </p>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <Badge variant="secondary" className="text-xs">{activity.category || 'General'}</Badge>
              <Badge variant="outline" className="text-xs">
                <span className="capitalize">{activity.status || 'planning'}</span>
              </Badge>
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
              {activity.endDate && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>Due {new Date(activity.endDate).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-muted rounded-full h-3 relative mb-4">
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

          <p className="text-center text-xs text-muted-foreground">
            Created {new Date(activity.createdAt).toLocaleDateString()}
          </p>
        </Card>

        {/* Tasks List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold mb-4">Tasks ({tasks.length})</h2>
          
          {tasks.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-muted-foreground">No tasks in this activity yet.</p>
            </Card>
          ) : (
            <div className="grid gap-4">
              {tasks.map((task) => (
                <Card 
                  key={task.id} 
                  className={`p-4 ${task.completed ? 'opacity-75' : ''}`}
                  data-testid={`shared-task-${task.id}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckSquare 
                          className={`w-5 h-5 ${task.completed ? 'text-green-600' : 'text-muted-foreground'}`} 
                        />
                        <h3 className={`font-medium ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                          {task.title}
                        </h3>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {task.description}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getPriorityColor(task.priority)}`}
                        >
                          {task.priority} priority
                        </Badge>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getCategoryColor(task.category)}`}
                        >
                          {task.category || 'general'}
                        </Badge>
                        {task.completed && task.completedAt && (
                          <Badge variant="outline" className="text-xs text-green-600">
                            ✓ Completed {new Date(task.completedAt).toLocaleDateString()}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Call to Action */}
        <Card className="p-6 text-center mt-8 bg-primary/5">
          <h3 className="text-lg font-semibold mb-2">Want to create your own activities?</h3>
          <p className="text-muted-foreground mb-4">
            Join JournalMate to track your goals, manage tasks, and share progress with friends!
          </p>
          <Button 
            onClick={() => window.open('/', '_blank')}
            data-testid="button-join-journalmate"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Get Started with JournalMate
          </Button>
        </Card>
      </div>
    </div>
  );
}