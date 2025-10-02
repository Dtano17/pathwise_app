import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TrendingUp, Target, CheckCircle2, Clock } from 'lucide-react';

interface CategoryStats {
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

interface ProgressChartsProps {
  categoryStats: CategoryStats[];
  timelineData: TimelineDataPoint[];
  totalCompleted: number;
  totalActive: number;
  completionRate: number;
  currentStreak: number;
}

export default function ProgressCharts({
  categoryStats,
  timelineData,
  totalCompleted,
  totalActive,
  completionRate,
  currentStreak
}: ProgressChartsProps) {
  const maxValue = Math.max(...categoryStats.map(c => c.total), 1);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Completed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span className="text-3xl font-bold">{totalCompleted}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <span className="text-3xl font-bold">{totalActive}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Completion Rate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-600" />
              <span className="text-3xl font-bold">{completionRate}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Current Streak</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-600" />
              <span className="text-3xl font-bold">{currentStreak}</span>
              <span className="text-sm text-muted-foreground">days</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Progress by Category</CardTitle>
          <CardDescription>See how you're doing across different areas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {categoryStats.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No category data yet</p>
            ) : (
              categoryStats.map((category) => (
                <div key={category.name} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium capitalize">{category.name}</span>
                    <span className="text-muted-foreground">
                      {category.completed}/{category.total} ({category.percentage}%)
                    </span>
                  </div>
                  <div className="relative w-full bg-muted rounded-full h-3">
                    <div
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
                      style={{ width: `${(category.total / maxValue) * 100}%` }}
                    >
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${category.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Timeline Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Timeline</CardTitle>
          <CardDescription>Your activity over the past 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          {timelineData.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No timeline data yet</p>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between items-end h-48 gap-2">
                {timelineData.map((point, idx) => {
                  const maxTotal = Math.max(...timelineData.map(p => p.completed + p.created), 1);
                  const totalHeight = ((point.completed + point.created) / maxTotal) * 100;
                  const completedHeight = (point.completed / (point.completed + point.created || 1)) * 100;

                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                      <div className="relative w-full flex flex-col justify-end" style={{ height: '100%' }}>
                        <div
                          className="w-full bg-gradient-to-t from-green-500 to-green-400 rounded-t transition-all duration-500 hover:opacity-80"
                          style={{ height: `${totalHeight}%` }}
                          title={`${point.completed} completed, ${point.created} created`}
                        >
                          <div
                            className="w-full bg-blue-500 rounded-t"
                            style={{ height: `${100 - completedHeight}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(point.date).toLocaleDateString('en-US', { weekday: 'short' })}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-center gap-4 pt-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded" />
                  <span>Completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded" />
                  <span>Created</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
