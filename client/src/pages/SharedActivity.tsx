import { useEffect, useState } from 'react';
import { useParams } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckSquare, Calendar, Clock, Lock, Share2, ChevronRight, Sparkles, ArrowLeft, Edit, Link2, Twitter, Facebook, Linkedin, Dumbbell, HeartPulse, Briefcase, BookOpen, DollarSign, Heart, Palette, Plane, Home, Star, ClipboardList, type LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

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

const categoryThemes: Record<string, { gradient: string; Icon: LucideIcon; accentColor: string }> = {
  fitness: {
    gradient: 'from-orange-500/20 via-red-500/20 to-pink-500/20',
    Icon: Dumbbell,
    accentColor: 'text-orange-600 dark:text-orange-400'
  },
  health: {
    gradient: 'from-emerald-500/20 via-teal-500/20 to-cyan-500/20',
    Icon: HeartPulse,
    accentColor: 'text-emerald-600 dark:text-emerald-400'
  },
  career: {
    gradient: 'from-blue-500/20 via-indigo-500/20 to-purple-500/20',
    Icon: Briefcase,
    accentColor: 'text-blue-600 dark:text-blue-400'
  },
  learning: {
    gradient: 'from-violet-500/20 via-purple-500/20 to-fuchsia-500/20',
    Icon: BookOpen,
    accentColor: 'text-violet-600 dark:text-violet-400'
  },
  finance: {
    gradient: 'from-green-500/20 via-emerald-500/20 to-teal-500/20',
    Icon: DollarSign,
    accentColor: 'text-green-600 dark:text-green-400'
  },
  relationships: {
    gradient: 'from-pink-500/20 via-rose-500/20 to-red-500/20',
    Icon: Heart,
    accentColor: 'text-pink-600 dark:text-pink-400'
  },
  creativity: {
    gradient: 'from-yellow-500/20 via-amber-500/20 to-orange-500/20',
    Icon: Palette,
    accentColor: 'text-yellow-600 dark:text-yellow-400'
  },
  travel: {
    gradient: 'from-sky-500/20 via-blue-500/20 to-indigo-500/20',
    Icon: Plane,
    accentColor: 'text-sky-600 dark:text-sky-400'
  },
  home: {
    gradient: 'from-amber-500/20 via-orange-500/20 to-red-500/20',
    Icon: Home,
    accentColor: 'text-amber-600 dark:text-amber-400'
  },
  personal: {
    gradient: 'from-purple-500/20 via-pink-500/20 to-rose-500/20',
    Icon: Star,
    accentColor: 'text-purple-600 dark:text-purple-400'
  },
  other: {
    gradient: 'from-slate-500/20 via-gray-500/20 to-zinc-500/20',
    Icon: ClipboardList,
    accentColor: 'text-slate-600 dark:text-slate-400'
  }
};

export default function SharedActivity() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [permissionRequested, setPermissionRequested] = useState(false);
  const [copyingLink, setCopyingLink] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['/api/user'],
  });

  useEffect(() => {
    setIsAuthenticated(!!user);
  }, [user]);

  const { data, isLoading, error: queryError } = useQuery<SharedActivityData>({
    queryKey: ['/api/share', token],
    queryFn: async () => {
      const response = await fetch(`/api/share/${token}`);
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

  useEffect(() => {
    if (data?.activity) {
      const { title, description, category } = data.activity;
      document.title = `${title || 'Shared Activity'} - JournalMate`;
      
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute('content', description || `Check out this ${category} activity plan on JournalMate`);
      }
      
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) {
        ogTitle.setAttribute('content', title || 'Shared Activity');
      }
      
      const ogDescription = document.querySelector('meta[property="og:description"]');
      if (ogDescription) {
        ogDescription.setAttribute('content', description || `Check out this ${category} activity plan on JournalMate`);
      }
    }
  }, [data]);

  const handleSignIn = () => {
    window.location.href = '/api/login';
  };

  const requestPermissionMutation = useMutation({
    mutationFn: async () => {
      if (!data?.activity?.id) throw new Error('Activity ID not found');
      return await apiRequest(`/api/activities/${data.activity.id}/request-permission`, {
        method: 'POST',
        body: JSON.stringify({ permissionType: 'edit' })
      });
    },
    onSuccess: () => {
      setPermissionRequested(true);
      toast({
        title: 'Permission Requested',
        description: 'The activity owner will be notified of your request.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Request Failed',
        description: error.message || 'Failed to request permission. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleCopyLink = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopyingLink(true);
      toast({
        title: 'Link Copied!',
        description: 'Share link copied to clipboard',
      });
      setTimeout(() => setCopyingLink(false), 2000);
    } catch (err) {
      toast({
        title: 'Failed to Copy',
        description: 'Please copy the URL manually',
        variant: 'destructive',
      });
    }
  };

  const handleShareTwitter = () => {
    if (!data?.activity) return;
    const text = `Check out my ${data.activity.category} plan: ${data.activity.planSummary || data.activity.title}`;
    const url = window.location.href;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
  };

  const handleShareFacebook = () => {
    const url = window.location.href;
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
  };

  const handleShareLinkedIn = () => {
    const url = window.location.href;
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank');
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

  const theme = categoryThemes[activity.category.toLowerCase()] || categoryThemes.other;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section with Themed Backdrop */}
      <div className={`relative bg-gradient-to-br ${theme.gradient} border-b`}>
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,black)]" />
        <div className="container mx-auto px-4 py-8 sm:py-12 relative">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <Button variant="outline" size="sm" onClick={() => window.location.href = '/'} data-testid="button-go-home" className="bg-background/80 backdrop-blur-sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Home
              </Button>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleCopyLink}
                  data-testid="button-copy-link"
                  className="bg-background/80 backdrop-blur-sm gap-2"
                >
                  <Link2 className="w-4 h-4" />
                  {copyingLink ? 'Copied!' : 'Copy Link'}
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={handleShareTwitter}
                  data-testid="button-share-twitter"
                  className="bg-background/80 backdrop-blur-sm"
                >
                  <Twitter className="w-4 h-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={handleShareFacebook}
                  data-testid="button-share-facebook"
                  className="bg-background/80 backdrop-blur-sm"
                >
                  <Facebook className="w-4 h-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={handleShareLinkedIn}
                  data-testid="button-share-linkedin"
                  className="bg-background/80 backdrop-blur-sm"
                >
                  <Linkedin className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <div className="mb-4 flex items-center justify-center">
                <theme.Icon className={`w-16 h-16 ${theme.accentColor}`} />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3 break-words">
                {activity.planSummary || activity.title}
              </h1>
              {activity.description && (
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6 break-words">
                  {activity.description}
                </p>
              )}
              {data.sharedBy?.name && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Sparkles className="w-4 h-4" />
                  <span>Shared by {data.sharedBy.name}</span>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 sm:py-8 max-w-4xl">
        {/* Progress Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card className="p-6 sm:p-8 mb-8">
            <div className="space-y-6">
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
            transition={{ duration: 0.4, delay: 0.2 }}
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
            transition={{ duration: 0.4, delay: 0.3 }}
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
            transition={{ duration: 0.4, delay: 0.4 }}
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
            transition={{ duration: 0.4, delay: 0.4 }}
            className="mt-8"
          >
            <Card className="p-6 text-center bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <div className="flex flex-col items-center gap-4">
                {activity.userId !== user?.id && !permissionRequested && (
                  <div className="w-full">
                    <h3 className="text-lg font-bold mb-2">Want to collaborate on this activity?</h3>
                    <p className="text-muted-foreground mb-4">
                      Request permission to edit and contribute to this plan
                    </p>
                    <Button 
                      onClick={() => requestPermissionMutation.mutate()}
                      disabled={requestPermissionMutation.isPending}
                      className="gap-2"
                      data-testid="button-request-permission"
                    >
                      <Edit className="w-4 h-4" />
                      {requestPermissionMutation.isPending ? 'Requesting...' : 'Request Permission to Edit'}
                    </Button>
                  </div>
                )}
                
                {permissionRequested && (
                  <div className="w-full">
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                      <CheckSquare className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="text-lg font-bold mb-2">Request Sent!</h3>
                    <p className="text-muted-foreground mb-4">
                      The activity owner has been notified. You'll receive access once they approve your request.
                    </p>
                  </div>
                )}
                
                <div className="pt-4 border-t w-full">
                  <Button onClick={() => window.location.href = '/'} variant="outline" className="gap-2">
                    <Sparkles className="w-4 h-4" />
                    Create Your Own Activity
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </main>
    </div>
  );
}
