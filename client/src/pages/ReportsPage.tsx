import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  TrendingUp,
  Calendar,
  Target,
  Flame,
  Award,
  CheckCircle,
  Trophy,
  BarChart3,
  Activity,
  Clock,
  Star,
  Zap,
  Medal,
  Lock,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { isNative } from '@/lib/platform';
import { updateWidgetData } from '@/lib/widgetManager';

interface ReportsData {
  summary: {
    totalTasks: number;
    completedTasks: number;
    completedToday: number;
    completedThisWeek: number;
    totalActivities: number;
    completedActivities: number;
    currentStreak: number;
    completionRate: number;
  };
  categories: Array<{
    name: string;
    completed: number;
    total: number;
    percentage: number;
  }>;
  activities: Array<{
    id: string;
    title: string;
    category: string;
    totalTasks: number;
    completedTasks: number;
    progress: number;
    isComplete: boolean;
    startDate: string | null;
    createdAt: string;
  }>;
  achievements: {
    unlocked: Array<{
      badge: {
        id: string;
        name: string;
        description: string;
        icon: string;
        tier: string;
        category: string;
      };
      unlockedAt: string;
      progress: number;
      progressMax: number;
    }>;
    totalUnlocked: number;
    totalBadges: number;
    recentBadges: Array<any>;
  };
  widgetData: {
    streakCount: number;
    completedToday: number;
    totalToday: number;
    completionRate: number;
  };
}

export default function ReportsPage() {
  const { data, isLoading, error } = useQuery<ReportsData>({
    queryKey: ['/api/reports'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Sync to widget when data changes
  useEffect(() => {
    if (!data || !isNative()) return;

    const syncToWidget = async () => {
      try {
        await updateWidgetData({
          streakCount: data.widgetData.streakCount,
          stats: {
            completedToday: data.widgetData.completedToday,
            totalToday: data.widgetData.totalToday,
            completionRate: data.widgetData.completionRate,
          },
          lastUpdated: new Date().toISOString(),
          version: 1,
        });
        console.log('[REPORTS] Widget data synced');
      } catch (err) {
        console.log('[REPORTS] Failed to sync widget:', err);
      }
    };

    syncToWidget();
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">Unable to load reports</h3>
        <p className="text-muted-foreground">Please try again later</p>
      </div>
    );
  }

  const { summary, categories, activities, achievements } = data;

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'gold': return 'text-yellow-500 bg-yellow-500/10';
      case 'silver': return 'text-gray-400 bg-gray-400/10';
      case 'bronze': return 'text-orange-600 bg-orange-600/10';
      default: return 'text-primary bg-primary/10';
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary/10 rounded-lg">
          <BarChart3 className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground">Reports & Progress</h2>
          <p className="text-sm text-muted-foreground">Track your achievements and activity</p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
          <TabsTrigger value="overview" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="activities" className="gap-2">
            <Target className="w-4 h-4" />
            <span className="hidden sm:inline">Activities</span>
          </TabsTrigger>
          <TabsTrigger value="achievements" className="gap-2">
            <Trophy className="w-4 h-4" />
            <span className="hidden sm:inline">Badges</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="hover-elevate">
                <CardContent className="p-4 text-center">
                  <Flame className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                  <div className="text-3xl font-bold text-orange-500">{summary.currentStreak}</div>
                  <div className="text-xs text-muted-foreground">Day Streak</div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <Card className="hover-elevate">
                <CardContent className="p-4 text-center">
                  <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <div className="text-3xl font-bold text-green-500">{summary.completedTasks}</div>
                  <div className="text-xs text-muted-foreground">Tasks Done</div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <Card className="hover-elevate">
                <CardContent className="p-4 text-center">
                  <Target className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                  <div className="text-3xl font-bold text-blue-500">{summary.completedActivities}</div>
                  <div className="text-xs text-muted-foreground">Plans Complete</div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
            >
              <Card className="hover-elevate">
                <CardContent className="p-4 text-center">
                  <Zap className="w-8 h-8 text-primary mx-auto mb-2" />
                  <div className="text-3xl font-bold text-primary">{summary.completionRate}%</div>
                  <div className="text-xs text-muted-foreground">Completion Rate</div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Today's Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Today's Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tasks Completed Today</span>
                <span className="font-semibold">{summary.completedToday}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Completed This Week</span>
                <span className="font-semibold">{summary.completedThisWeek}</span>
              </div>
            </CardContent>
          </Card>

          {/* Category Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                Category Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {categories.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No categories yet</p>
              ) : (
                categories.map((cat) => (
                  <div key={cat.name} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{cat.name}</span>
                      <span className="text-muted-foreground">
                        {cat.completed}/{cat.total} ({cat.percentage}%)
                      </span>
                    </div>
                    <Progress value={cat.percentage} className="h-2" />
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Recent Badges */}
          {achievements.recentBadges.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-yellow-500" />
                  Recent Achievements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {achievements.recentBadges.map((badge: any, index: number) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className={`${getTierColor(badge.badge.tier)} text-sm py-1 px-3`}
                    >
                      <span className="mr-1">{badge.badge.icon}</span>
                      {badge.badge.name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Activities Tab */}
        <TabsContent value="activities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Activity Progress
              </CardTitle>
              <CardDescription>
                {summary.completedActivities} of {summary.totalActivities} plans completed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-4">
                  {activities.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No activities yet. Create a plan to get started!
                    </p>
                  ) : (
                    activities.map((activity) => (
                      <motion.div
                        key={activity.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`p-4 rounded-lg border ${
                          activity.isComplete
                            ? 'bg-green-500/5 border-green-500/20'
                            : 'bg-card border-border'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">{activity.title}</h4>
                              {activity.isComplete && (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">{activity.category}</p>
                          </div>
                          <Badge variant={activity.isComplete ? "default" : "secondary"}>
                            {activity.progress}%
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          <Progress value={activity.progress} className="h-2" />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{activity.completedTasks}/{activity.totalTasks} tasks</span>
                            {activity.startDate && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(activity.startDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Achievements Tab */}
        <TabsContent value="achievements" className="space-y-6">
          {/* Achievement Stats */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="hover-elevate">
              <CardContent className="p-4 text-center">
                <Trophy className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                <div className="text-3xl font-bold text-yellow-500">
                  {achievements.totalUnlocked}
                </div>
                <div className="text-xs text-muted-foreground">Badges Earned</div>
              </CardContent>
            </Card>
            <Card className="hover-elevate">
              <CardContent className="p-4 text-center">
                <Medal className="w-8 h-8 text-primary mx-auto mb-2" />
                <div className="text-3xl font-bold text-primary">
                  {achievements.totalBadges - achievements.totalUnlocked}
                </div>
                <div className="text-xs text-muted-foreground">Badges to Unlock</div>
              </CardContent>
            </Card>
          </div>

          {/* Unlocked Badges */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                Earned Badges ({achievements.totalUnlocked})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {achievements.unlocked.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Complete tasks and activities to earn badges!
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {achievements.unlocked.map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className={`p-4 rounded-lg border ${getTierColor(item.badge.tier)}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{item.badge.icon}</span>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold truncate">{item.badge.name}</h4>
                          <p className="text-xs text-muted-foreground truncate">
                            {item.badge.description}
                          </p>
                          {item.unlockedAt && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Earned {new Date(item.unlockedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
