import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, Trophy, Star, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import ProgressCharts from '@/components/ProgressCharts';

interface CategoryStat {
  name: string;
  completed: number;
  total: number;
  percentage: number;
}

interface Milestone {
  id: string;
  title: string;
  description: string;
  achievedAt: string;
  type: 'completion' | 'streak' | 'category' | 'rating';
}

interface ProgressData {
  totalActivities: number;
  completedActivities: number;
  activeActivities: number;
  completionRate: number;
  currentStreak: number;
  longestStreak: number;
  categoryStats: CategoryStat[];
  timelineData: Array<{
    date: string;
    completed: number;
    created: number;
  }>;
  milestones: Milestone[];
  totalTasks: number;
  completedTasks: number;
  taskCompletionRate: number;
  averageRating: number;
  topRatedActivities: Array<{
    id: string;
    title: string;
    rating: number;
    category: string;
  }>;
}

const getMilestoneIcon = (type: string) => {
  switch (type) {
    case 'streak':
      return <TrendingUp className="w-4 h-4" />;
    case 'rating':
      return <Star className="w-4 h-4" />;
    default:
      return <Trophy className="w-4 h-4" />;
  }
};

const getMilestoneColor = (type: string) => {
  switch (type) {
    case 'streak':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    case 'rating':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case 'category':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    default:
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
  }
};

export default function ProgressReport() {
  const [timeRange, setTimeRange] = useState<string>('7');

  const { data: progressData, isLoading } = useQuery<ProgressData>({
    queryKey: ['/api/progress/stats', timeRange],
    queryFn: async () => {
      const res = await fetch(`/api/progress/stats?days=${timeRange}`);
      if (!res.ok) throw new Error('Failed to fetch progress data');
      return res.json();
    }
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="w-6 h-6" />
          <h1 className="text-2xl font-bold">Progress Report</h1>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="pb-2">
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-muted rounded w-16"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!progressData) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="w-6 h-6" />
          <h1 className="text-2xl font-bold">Progress Report</h1>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <BarChart3 className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No data available</h3>
            <p className="text-muted-foreground">
              Start completing activities to see your progress here.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-6 h-6" />
          <h1 className="text-2xl font-bold">Progress Report</h1>
        </div>

        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Progress Charts */}
      <ProgressCharts
        categoryStats={progressData.categoryStats}
        timelineData={progressData.timelineData}
        totalCompleted={progressData.completedTasks}
        totalActive={progressData.totalTasks - progressData.completedTasks}
        completionRate={progressData.taskCompletionRate}
        currentStreak={progressData.currentStreak}
      />

      {/* Task Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Task Statistics</CardTitle>
          <CardDescription>Overall task completion metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <p className="text-2xl font-bold">{progressData.totalTasks}</p>
              <p className="text-sm text-muted-foreground">Total Tasks</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-2xl font-bold text-green-600">{progressData.completedTasks}</p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{progressData.taskCompletionRate}%</p>
              <p className="text-sm text-muted-foreground">Completion Rate</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Milestones */}
      {progressData.milestones && progressData.milestones.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Recent Achievements
            </CardTitle>
            <CardDescription>Your latest milestones and accomplishments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {progressData.milestones.map((milestone) => (
                <div
                  key={milestone.id}
                  className="flex items-start gap-3 p-3 border rounded-lg hover-elevate"
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
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Rated Activities */}
      {progressData.topRatedActivities && progressData.topRatedActivities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              Top Rated Activities
            </CardTitle>
            <CardDescription>
              Your highest-rated completed activities (Avg: {progressData.averageRating.toFixed(1)}★)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {progressData.topRatedActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover-elevate"
                >
                  <div className="flex-1">
                    <h4 className="font-medium">{activity.title}</h4>
                    <p className="text-sm text-muted-foreground">{activity.category}</p>
                  </div>
                  <div className="flex items-center gap-1 text-yellow-500">
                    {[...Array(activity.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
