import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TrendingUp,
  Calendar,
  Target,
  Flame,
  Award,
  CheckCircle,
  CheckCircle2,
  Trophy,
  BarChart3,
  Activity,
  Clock,
  Star,
  Zap,
  Medal,
  Filter,
  Moon,
  Sparkles,
  ArrowRight,
  ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { isNative } from '@/lib/platform';
import { updateWidgetData } from '@/lib/widgetManager';
import EndOfDayReview from '@/components/EndOfDayReview';

// Types
interface CategoryStat {
  name: string;
  completed: number;
  total: number;
  percentage: number;
}

interface TimelineDataPoint {
  date: string;
  completed: number;
  created: number;
}

interface Milestone {
  id: string;
  title: string;
  description: string;
  achievedAt: string;
  type: 'completion' | 'streak' | 'category' | 'rating';
}

interface ActivityProgress {
  id: string;
  title: string;
  category: string;
  totalTasks: number;
  completedTasks: number;
  progress: number;
  isComplete: boolean;
  startDate: string | null;
  createdAt: string;
}

interface BadgeInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: string;
  category: string;
}

interface UnlockedBadge {
  badge: BadgeInfo;
  unlockedAt: string;
  progress: number;
  progressMax: number;
}

interface ProgressData {
  totalActivities: number;
  completedActivities: number;
  activeActivities: number;
  completionRate: number;
  currentStreak: number;
  longestStreak: number;
  categoryStats: CategoryStat[];
  timelineData: TimelineDataPoint[];
  milestones: Milestone[];
  totalTasks: number;
  completedTasks: number;
  completedToday: number;
  completedThisWeek: number;
  taskCompletionRate: number;
  averageRating: number;
  topRatedActivities: Array<{
    id: string;
    title: string;
    rating: number;
    category: string;
  }>;
}

interface AchievementsData {
  unlocked: UnlockedBadge[];
  locked: Array<{ badge: BadgeInfo; progress: number; progressMax: number }>;
  totalUnlocked: number;
  totalBadges: number;
  recentBadges: UnlockedBadge[];
}

interface ReportsApiData {
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
  categories: CategoryStat[];
  activities: ActivityProgress[];
  achievements: AchievementsData;
  widgetData: {
    streakCount: number;
    completedToday: number;
    totalToday: number;
    completionRate: number;
  };
}

// Skeleton Components
function SummaryCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4 text-center">
        <Skeleton className="w-8 h-8 rounded-full mx-auto mb-2" />
        <Skeleton className="h-8 w-12 mx-auto mb-1" />
        <Skeleton className="h-3 w-16 mx-auto" />
      </CardContent>
    </Card>
  );
}

function CategorySkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-2 w-full" />
        </div>
      ))}
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="p-4 rounded-lg border">
          <div className="flex justify-between mb-2">
            <div className="flex-1">
              <Skeleton className="h-5 w-48 mb-1" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-6 w-12" />
          </div>
          <Skeleton className="h-2 w-full mt-2" />
        </div>
      ))}
    </div>
  );
}

function TimelineSkeleton() {
  return (
    <div className="flex justify-between items-end h-32 gap-2">
      {[1, 2, 3, 4, 5, 6, 7].map((i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-2">
          <Skeleton className="w-full" style={{ height: `${Math.random() * 60 + 20}%` }} />
          <Skeleton className="h-3 w-8" />
        </div>
      ))}
    </div>
  );
}

// Helper functions
const getMilestoneIcon = (type: string) => {
  switch (type) {
    case 'streak': return <TrendingUp className="w-4 h-4" />;
    case 'rating': return <Star className="w-4 h-4" />;
    case 'category': return <Target className="w-4 h-4" />;
    default: return <Trophy className="w-4 h-4" />;
  }
};

const getMilestoneColor = (type: string) => {
  switch (type) {
    case 'streak': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
    case 'rating': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
    case 'category': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
    default: return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
  }
};

const getTierColor = (tier: string) => {
  switch (tier) {
    case 'gold': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30';
    case 'silver': return 'text-gray-400 bg-gray-400/10 border-gray-400/30';
    case 'bronze': return 'text-orange-600 bg-orange-600/10 border-orange-600/30';
    default: return 'text-primary bg-primary/10 border-primary/30';
  }
};

export default function ReportsPage() {
  const [timeRange, setTimeRange] = useState<string>('7');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showEndOfDayReview, setShowEndOfDayReview] = useState(false);

  // Fetch progress stats with time range
  const { data: progressData, isLoading: progressLoading } = useQuery<ProgressData>({
    queryKey: ['/api/progress/stats', timeRange],
    queryFn: async () => {
      const res = await fetch(`/api/progress/stats?days=${timeRange}`);
      if (!res.ok) throw new Error('Failed to fetch progress data');
      return res.json();
    },
    refetchInterval: 30000,
  });

  // Fetch comprehensive reports data (activities, achievements, etc.)
  const { data: reportsData, isLoading: reportsLoading, error: reportsError } = useQuery<ReportsApiData>({
    queryKey: ['/api/reports'],
    queryFn: async () => {
      const res = await fetch('/api/reports', { credentials: 'include' });
      if (!res.ok) {
        console.error('[REPORTS] Failed to fetch reports:', res.status);
        throw new Error('Failed to fetch reports data');
      }
      const data = await res.json();
      console.log('[REPORTS] Data received:', {
        activitiesCount: data.activities?.length,
        summary: data.summary,
        achievementsCount: data.achievements?.unlocked?.length
      });
      return data;
    },
    refetchInterval: 30000,
  });

  // Log any errors
  useEffect(() => {
    if (reportsError) {
      console.error('[REPORTS] Query error:', reportsError);
    }
  }, [reportsError]);

  // Derive achievements and activities from reports data
  const achievementsData = reportsData?.achievements;
  const activitiesLoading = reportsLoading;
  const achievementsLoading = reportsLoading;

  // Sync to widget when data changes
  useEffect(() => {
    if (!reportsData?.widgetData || !isNative()) return;

    const syncToWidget = async () => {
      try {
        await updateWidgetData({
          streakCount: reportsData.widgetData.streakCount,
          stats: {
            completedToday: reportsData.widgetData.completedToday,
            totalToday: reportsData.widgetData.totalToday,
            completionRate: reportsData.widgetData.completionRate,
          },
          lastUpdated: new Date().toISOString(),
          version: 1,
        });
      } catch (err) {
        console.log('[REPORTS] Failed to sync widget:', err);
      }
    };

    syncToWidget();
  }, [reportsData]);

  // Filter activities by category
  const filteredActivities = useMemo(() => {
    if (!reportsData?.activities) return [];
    if (categoryFilter === 'all') return reportsData.activities;
    return reportsData.activities.filter(a =>
      a.category?.toLowerCase() === categoryFilter.toLowerCase()
    );
  }, [reportsData?.activities, categoryFilter]);

  // Get unique categories for filter
  const categories = useMemo(() => {
    if (!reportsData?.activities) return [];
    const cats = new Set(reportsData.activities.map(a => a.category).filter(Boolean));
    return Array.from(cats);
  }, [reportsData?.activities]);

  // Filter category stats by selected category
  const filteredCategoryStats = useMemo(() => {
    if (!progressData?.categoryStats) return [];
    if (categoryFilter === 'all') return progressData.categoryStats;
    return progressData.categoryStats.filter(c =>
      c.name.toLowerCase() === categoryFilter.toLowerCase()
    );
  }, [progressData?.categoryStats, categoryFilter]);

  const isLoading = progressLoading;

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header with Time Range Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <BarChart3 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Reports & Progress</h2>
            <p className="text-sm text-muted-foreground">Track your achievements and activity</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[140px]">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowEndOfDayReview(true)}
            className="gap-2"
          >
            <Moon className="w-4 h-4" />
            <span className="hidden sm:inline">Daily Review</span>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
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
          <TabsTrigger value="insights" className="gap-2">
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">Insights</span>
          </TabsTrigger>
        </TabsList>

        {/* ==================== OVERVIEW TAB ==================== */}
        <TabsContent value="overview" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {isLoading ? (
              <>
                <SummaryCardSkeleton />
                <SummaryCardSkeleton />
                <SummaryCardSkeleton />
                <SummaryCardSkeleton />
              </>
            ) : (
              <>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="hover-elevate overflow-hidden">
                    <CardContent className="p-4 text-center relative">
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 to-red-500" />
                      <Flame className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                      <div className="text-3xl font-bold text-orange-500">{progressData?.currentStreak || 0}</div>
                      <div className="text-xs text-muted-foreground">Day Streak</div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                >
                  <Card className="hover-elevate overflow-hidden">
                    <CardContent className="p-4 text-center relative">
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-400 to-emerald-500" />
                      <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                      <div className="text-3xl font-bold text-green-500">{progressData?.completedTasks || 0}</div>
                      <div className="text-xs text-muted-foreground">Tasks Done</div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                >
                  <Card className="hover-elevate overflow-hidden">
                    <CardContent className="p-4 text-center relative">
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 to-indigo-500" />
                      <Target className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                      <div className="text-3xl font-bold text-blue-500">{progressData?.completedActivities || 0}</div>
                      <div className="text-xs text-muted-foreground">Plans Complete</div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.3 }}
                >
                  <Card className="hover-elevate overflow-hidden">
                    <CardContent className="p-4 text-center relative">
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-400 to-pink-500" />
                      <Zap className="w-8 h-8 text-primary mx-auto mb-2" />
                      <div className="text-3xl font-bold text-primary">{progressData?.taskCompletionRate || 0}%</div>
                      <div className="text-xs text-muted-foreground">Completion Rate</div>
                    </CardContent>
                  </Card>
                </motion.div>
              </>
            )}
          </div>

          {/* Today's Progress Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Calendar className="w-5 h-5 text-primary" />
                Today's Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                    <div className="text-2xl font-bold text-green-600">{progressData?.completedToday || 0}</div>
                    <div className="text-sm text-muted-foreground">Completed Today</div>
                  </div>
                  <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                    <div className="text-2xl font-bold text-blue-600">{progressData?.completedThisWeek || 0}</div>
                    <div className="text-sm text-muted-foreground">This Week</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity Timeline */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Activity className="w-5 h-5 text-primary" />
                Activity Timeline
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Your activity over the past {timeRange} days
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <TimelineSkeleton />
              ) : progressData?.timelineData && progressData.timelineData.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-end h-32 sm:h-40 gap-1 sm:gap-2">
                    {progressData.timelineData.slice(-7).map((point, idx) => {
                      const maxTotal = Math.max(...progressData.timelineData.map(p => p.completed + p.created), 1);
                      const totalHeight = ((point.completed + point.created) / maxTotal) * 100;

                      return (
                        <motion.div
                          key={idx}
                          className="flex-1 flex flex-col items-center gap-1 sm:gap-2"
                          initial={{ opacity: 0, scaleY: 0 }}
                          animate={{ opacity: 1, scaleY: 1 }}
                          transition={{ delay: idx * 0.05, duration: 0.3 }}
                        >
                          <div className="relative w-full flex flex-col justify-end" style={{ height: '100%' }}>
                            <div
                              className="w-full bg-gradient-to-t from-green-500 to-green-400 rounded-t transition-all duration-500 hover:opacity-80 cursor-pointer"
                              style={{ height: `${Math.max(totalHeight, 5)}%` }}
                              title={`${point.completed} completed, ${point.created} created`}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(point.date).toLocaleDateString('en-US', { weekday: 'short' })}
                          </span>
                        </motion.div>
                      );
                    })}
                  </div>
                  <div className="flex justify-center gap-4 pt-2 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded" />
                      <span>Activity</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8 text-sm">No timeline data yet</p>
              )}
            </CardContent>
          </Card>

          {/* Category Breakdown with Filter */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    Progress by Category
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Performance across different areas
                  </CardDescription>
                </div>
                {categories.length > 0 && (
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[130px]">
                      <Filter className="w-3 h-3 mr-1" />
                      <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat.toLowerCase()}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <CategorySkeleton />
              ) : filteredCategoryStats.length > 0 ? (
                <div className="space-y-4">
                  {filteredCategoryStats.map((cat, idx) => (
                    <motion.div
                      key={cat.name}
                      className="space-y-2"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium capitalize">{cat.name}</span>
                        <span className="text-muted-foreground">
                          {cat.completed}/{cat.total} ({cat.percentage}%)
                        </span>
                      </div>
                      <div className="relative w-full bg-muted rounded-full h-2">
                        <motion.div
                          className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${cat.percentage}%` }}
                          transition={{ duration: 0.5, delay: idx * 0.05 }}
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8 text-sm">No category data yet</p>
              )}
            </CardContent>
          </Card>

          {/* Recent Achievements */}
          {achievementsData?.recentBadges && achievementsData.recentBadges.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Award className="w-5 h-5 text-yellow-500" />
                  Recent Achievements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {achievementsData.recentBadges.slice(0, 5).map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Badge
                        variant="secondary"
                        className={`${getTierColor(item.badge.tier)} text-sm py-1.5 px-3 border`}
                      >
                        <span className="mr-1.5">{item.badge.icon}</span>
                        {item.badge.name}
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ==================== ACTIVITIES TAB ==================== */}
        <TabsContent value="activities" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Target className="w-5 h-5 text-primary" />
                    Activity Progress
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    {reportsData?.summary?.completedActivities || 0} of {reportsData?.summary?.totalActivities || 0} plans completed
                  </CardDescription>
                </div>
                {categories.length > 0 && (
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[130px]">
                      <Filter className="w-3 h-3 mr-1" />
                      <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat.toLowerCase()}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[450px] pr-4">
                {activitiesLoading ? (
                  <ActivitySkeleton />
                ) : filteredActivities.length === 0 ? (
                  <div className="text-center py-12">
                    <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">No activities yet</h3>
                    <p className="text-muted-foreground text-sm">
                      Create a plan to start tracking your progress!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredActivities.map((activity, idx) => (
                      <motion.div
                        key={activity.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className={`p-4 rounded-lg border transition-all hover:shadow-md ${
                          activity.isComplete
                            ? 'bg-green-500/5 border-green-500/30'
                            : 'bg-card border-border hover:border-primary/30'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold truncate">{activity.title}</h4>
                              {activity.isComplete && (
                                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {activity.category || 'Uncategorized'}
                              </Badge>
                              {activity.startDate && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {new Date(activity.startDate).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                          <Badge
                            variant={activity.isComplete ? "default" : "secondary"}
                            className={activity.isComplete ? "bg-green-500" : ""}
                          >
                            {activity.progress}%
                          </Badge>
                        </div>
                        <div className="space-y-1.5">
                          <Progress
                            value={activity.progress}
                            className="h-2"
                          />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              {activity.completedTasks}/{activity.totalTasks} tasks
                            </span>
                            {activity.progress > 0 && activity.progress < 100 && (
                              <span className="text-primary font-medium">In Progress</span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== ACHIEVEMENTS TAB ==================== */}
        <TabsContent value="achievements" className="space-y-6">
          {/* Achievement Stats */}
          <div className="grid grid-cols-2 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="hover-elevate overflow-hidden">
                <CardContent className="p-4 text-center relative">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-400 to-amber-500" />
                  <Trophy className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                  <div className="text-3xl font-bold text-yellow-500">
                    {achievementsData?.totalUnlocked || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Badges Earned</div>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="hover-elevate overflow-hidden">
                <CardContent className="p-4 text-center relative">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gray-400 to-gray-500" />
                  <Medal className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <div className="text-3xl font-bold text-gray-400">
                    {(achievementsData?.totalBadges || 0) - (achievementsData?.totalUnlocked || 0)}
                  </div>
                  <div className="text-xs text-muted-foreground">To Unlock</div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Unlocked Badges */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Star className="w-5 h-5 text-yellow-500" />
                Earned Badges ({achievementsData?.totalUnlocked || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {achievementsLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-24" />
                  ))}
                </div>
              ) : achievementsData?.unlocked && achievementsData.unlocked.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {achievementsData.unlocked.map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className={`p-4 rounded-lg border-2 ${getTierColor(item.badge.tier)}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{item.badge.icon}</span>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold truncate">{item.badge.name}</h4>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {item.badge.description}
                          </p>
                          {item.unlockedAt && (
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3 text-green-500" />
                              {new Date(item.unlockedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">No badges yet</h3>
                  <p className="text-muted-foreground text-sm">
                    Complete tasks and activities to earn badges!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Locked Badges */}
          {achievementsData?.locked && achievementsData.locked.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Medal className="w-5 h-5 text-gray-400" />
                  Badges to Unlock
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {achievementsData.locked.slice(0, 6).map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-4 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-3xl opacity-40">{item.badge.icon}</span>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold truncate text-muted-foreground">{item.badge.name}</h4>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {item.badge.description}
                          </p>
                          <div className="mt-2">
                            <Progress value={(item.progress / item.progressMax) * 100} className="h-1.5" />
                            <p className="text-xs text-muted-foreground mt-1">
                              {item.progress}/{item.progressMax}
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ==================== INSIGHTS TAB ==================== */}
        <TabsContent value="insights" className="space-y-6">
          {/* Milestones */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Recent Milestones
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Your latest achievements and accomplishments
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20" />
                  ))}
                </div>
              ) : progressData?.milestones && progressData.milestones.length > 0 ? (
                <div className="space-y-3">
                  {progressData.milestones.map((milestone, idx) => (
                    <motion.div
                      key={milestone.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex items-start gap-3 p-3 border rounded-lg hover:shadow-md transition-shadow"
                    >
                      <div className={`p-2 rounded-full ${getMilestoneColor(milestone.type)}`}>
                        {getMilestoneIcon(milestone.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{milestone.title}</h4>
                          <Badge variant="secondary" className="text-xs capitalize">
                            {milestone.type}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{milestone.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(milestone.achievedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">No milestones yet</h3>
                  <p className="text-muted-foreground text-sm">
                    Keep working on your tasks to unlock milestones!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Rated Activities */}
          {progressData?.topRatedActivities && progressData.topRatedActivities.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Star className="w-5 h-5 text-yellow-500" />
                  Top Rated Activities
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Your highest-rated completed activities
                  {progressData.averageRating > 0 && (
                    <span className="ml-2">(Avg: {progressData.averageRating.toFixed(1)}★)</span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {progressData.topRatedActivities.map((activity, idx) => (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex items-center justify-between p-3 border rounded-lg hover:shadow-md transition-shadow"
                    >
                      <div className="flex-1">
                        <h4 className="font-medium">{activity.title}</h4>
                        <p className="text-sm text-muted-foreground">{activity.category}</p>
                      </div>
                      <div className="flex items-center gap-0.5 text-yellow-500">
                        {[...Array(activity.rating)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 fill-current" />
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Daily Review CTA */}
          <Card className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-purple-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-500/20 rounded-full">
                    <Moon className="w-6 h-6 text-purple-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">End of Day Review</h3>
                    <p className="text-sm text-muted-foreground">
                      Reflect on your completed tasks with a quick swipe review
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => setShowEndOfDayReview(true)}
                  className="gap-2"
                >
                  Start Review
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* End of Day Review Dialog */}
      <EndOfDayReview
        open={showEndOfDayReview}
        onOpenChange={setShowEndOfDayReview}
        onComplete={() => {
          // Refresh data after review
        }}
      />
    </div>
  );
}
