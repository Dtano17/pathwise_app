import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Target, CheckCircle2, XCircle, Archive, Trash2, Eye, Calendar, TrendingUp, Filter } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { Activity } from '@shared/schema';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'completed':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'planning':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case 'cancelled':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'active':
      return <TrendingUp className="w-3 h-3" />;
    case 'completed':
      return <CheckCircle2 className="w-3 h-3" />;
    case 'planning':
      return <Clock className="w-3 h-3" />;
    case 'cancelled':
      return <XCircle className="w-3 h-3" />;
    default:
      return <Target className="w-3 h-3" />;
  }
};

interface ActivityWithProgress extends Activity {
  completedTasks: number;
  totalTasks: number;
  progressPercentage: number;
}

export default function RecentGoals() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const { data: activities = [], isLoading } = useQuery<ActivityWithProgress[]>({
    queryKey: ['/api/activities/recent', statusFilter, categoryFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (categoryFilter !== 'all') params.append('category', categoryFilter);

      const res = await fetch(`/api/activities/recent?${params}`);
      if (!res.ok) throw new Error('Failed to fetch activities');
      return res.json();
    }
  });

  const archiveMutation = useMutation({
    mutationFn: async (activityId: string) => {
      const res = await apiRequest('PATCH', `/api/activities/${activityId}`, {
        archived: true
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/activities/recent'] });
      toast({
        title: 'Activity archived',
        description: 'The activity has been moved to archive',
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (activityId: string) => {
      const res = await apiRequest('DELETE', `/api/activities/${activityId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/activities/recent'] });
      toast({
        title: 'Activity deleted',
        description: 'The activity has been permanently deleted',
      });
    }
  });

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center gap-2 mb-6">
          <Target className="w-5 h-5 md:w-6 md:h-6" />
          <h1 className="text-xl md:text-2xl font-bold">Recent Goals</h1>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-3">
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded w-full"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const categories = Array.from(new Set(activities.map(a => a.category).filter(Boolean)));

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 md:w-6 md:h-6" />
          <h1 className="text-xl md:text-2xl font-bold">Recent Goals</h1>
          <Badge variant="secondary" className="ml-2 text-xs">
            {activities.length}
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="planning">Planning</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        {categories.length > 0 && (
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat || 'uncategorized'}>
                  {cat || 'Uncategorized'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Activities List */}
      {activities.length === 0 ? (
        <Card>
          <CardContent className="p-6 md:p-8 text-center">
            <Target className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-3 text-muted-foreground" />
            <h3 className="text-base md:text-lg font-medium mb-2">No activities yet</h3>
            <p className="text-sm text-muted-foreground">
              Start planning activities to see them here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {activities.map((activity) => (
            <Card key={activity.id} className="hover-elevate">
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base md:text-lg flex-1 leading-tight">
                      {activity.title}
                    </CardTitle>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                      <Clock className="w-3 h-3" />
                      <span className="hidden sm:inline">
                        {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                      </span>
                      <span className="sm:hidden">
                        {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: false })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={`${getStatusColor(activity.status)} text-xs`}>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(activity.status)}
                        <span className="capitalize">{activity.status}</span>
                      </div>
                    </Badge>
                    {activity.category && (
                      <Badge variant="outline" className="text-xs">{activity.category}</Badge>
                    )}
                  </div>
                  {activity.summary && (
                    <CardDescription className="text-xs md:text-sm line-clamp-2">
                      {activity.summary}
                    </CardDescription>
                  )}
                </div>
              </CardHeader>

              <CardContent className="pb-3 space-y-3">
                {/* Progress Bar */}
                {activity.totalTasks > 0 && (
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">
                        {activity.completedTasks}/{activity.totalTasks} ({activity.progressPercentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div
                        className="bg-primary rounded-full h-1.5 transition-all"
                        style={{ width: `${activity.progressPercentage}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 border-t gap-2">
                  <Button variant="ghost" size="sm" className="h-7 text-xs px-2">
                    <Eye className="w-3 h-3 mr-1" />
                    <span className="hidden sm:inline">View Details</span>
                    <span className="sm:hidden">View</span>
                  </Button>
                  <div className="flex gap-1">
                    {!activity.archived && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs px-2"
                        onClick={() => archiveMutation.mutate(activity.id)}
                        disabled={archiveMutation.isPending}
                      >
                        <Archive className="w-3 h-3" />
                        <span className="hidden md:inline ml-1">Archive</span>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs px-2 text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this activity?')) {
                          deleteMutation.mutate(activity.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-3 h-3" />
                      <span className="hidden md:inline ml-1">Delete</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
