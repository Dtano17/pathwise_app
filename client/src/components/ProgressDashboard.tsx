import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Calendar, Target, Flame, Award, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { isNative } from '@/lib/platform';
import { syncWidgetWithApp, updateWidgetData } from '@/lib/widgetManager';

interface ProgressData {
  completedToday: number;
  totalToday: number;
  weeklyStreak: number;
  totalCompleted: number;
  completionRate: number;
  plansComplete: number;
  totalPlans: number;
  categories: { name: string; completed: number; total: number; }[];
  recentAchievements: string[];
  pendingTasks?: Array<{
    id: string;
    title: string;
    dueDate?: string;
    priority?: string;
  }>;
}

interface ProgressDashboardProps {
  data: ProgressData;
}

export default function ProgressDashboard({ data }: ProgressDashboardProps) {
  // Sync progress data to widget when it changes
  useEffect(() => {
    const syncToWidget = async () => {
      if (!isNative()) return;

      try {
        // Update widget with progress data — matches Reports page summary cards
        const tasks = (data.pendingTasks || []).slice(0, 5).map(task => ({
          id: task.id,
          title: task.title,
          completed: false,
          dueDate: task.dueDate,
        }));
        await updateWidgetData(
          data.weeklyStreak,
          tasks,
          undefined,
          {
            totalActivities: data.totalPlans || 0,
            completedToday: data.completedToday,
            completionRate: data.completionRate,
          },
          {
            totalCompleted: data.totalCompleted,
            plansComplete: data.plansComplete || 0,
            completionRate: data.completionRate,
          }
        );
        console.log('[WIDGET] Progress dashboard synced to widget');
      } catch (error) {
        console.log('[WIDGET] Failed to sync progress to widget:', error);
      }
    };

    syncToWidget();
  }, [data.weeklyStreak, data.completedToday, data.totalToday, data.completionRate, data.pendingTasks]);
  const todayPercentage = data.totalToday > 0 ? (data.completedToday / data.totalToday) * 100 : 0;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="w-6 h-6 text-primary" />
        <h2 className="text-2xl font-bold text-foreground">Progress Dashboard</h2>
      </div>

      {/* Today's Progress */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="hover-elevate" data-testid="card-today-progress">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Today's Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Tasks Completed</span>
              <span className="font-semibold">{data.completedToday} / {data.totalToday}</span>
            </div>
            <Progress value={todayPercentage} className="h-3" data-testid="progress-today" />
            <div className="text-center">
              <span className="text-2xl font-bold text-primary">{Math.round(todayPercentage)}%</span>
              <p className="text-sm text-muted-foreground">completion rate</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Weekly Streak */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="hover-elevate" data-testid="card-streak">
            <CardContent className="p-6 text-center">
              <Flame className="w-8 h-8 text-orange-500 mx-auto mb-2" />
              <div className="text-3xl font-bold text-orange-500 mb-1">{data.weeklyStreak}</div>
              <div className="text-sm text-muted-foreground">day streak</div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Total Completed */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card className="hover-elevate" data-testid="card-total-completed">
            <CardContent className="p-6 text-center">
              <Target className="w-8 h-8 text-secondary mx-auto mb-2" />
              <div className="text-3xl font-bold text-secondary mb-1">{data.totalCompleted}</div>
              <div className="text-sm text-muted-foreground">total completed</div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Overall Rate */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Card className="hover-elevate" data-testid="card-completion-rate">
            <CardContent className="p-6 text-center">
              <CheckCircle className="w-8 h-8 text-primary mx-auto mb-2" />
              <div className="text-3xl font-bold text-primary mb-1">{data.completionRate}%</div>
              <div className="text-sm text-muted-foreground">overall rate</div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Category Breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
      >
        <Card className="hover-elevate" data-testid="card-categories">
          <CardHeader>
            <CardTitle>Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.categories.map((category, index) => {
              const percentage = category.total > 0 ? (category.completed / category.total) * 100 : 0;
              return (
                <div key={category.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{category.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {category.completed} / {category.total}
                    </span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Achievements */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.5 }}
      >
        <Card className="hover-elevate" data-testid="card-achievements">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-500" />
              Recent Achievements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.recentAchievements.map((achievement, index) => (
                <Badge key={index} variant="secondary" className="mr-2 mb-2">
                  {achievement}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}