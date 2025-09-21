import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Target, CheckCircle, Calendar, TrendingUp, Star, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { type SchedulingSuggestion, type Task } from '@shared/schema';

interface SmartSchedulerProps {
  userId: string;
  tasks: Task[];
  compact?: boolean;
}

interface SchedulingSuggestionWithTasks extends SchedulingSuggestion {
  taskDetails?: Task[];
}

export default function SmartScheduler({ userId, tasks, compact = false }: SmartSchedulerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // YYYY-MM-DD format
  });

  // Fetch scheduling suggestions
  const { data: suggestions = [], isLoading } = useQuery<SchedulingSuggestionWithTasks[]>({
    queryKey: ['/api/scheduling/suggestions', userId, selectedDate],
    staleTime: 30000, // 30 seconds
  });

  // Generate new suggestions mutation
  const generateSuggestionsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/scheduling/generate', { 
        targetDate: selectedDate 
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/scheduling/suggestions'] });
      toast({
        title: "Schedule Generated!",
        description: `Created ${data.suggestions?.length || 0} smart scheduling suggestions for ${selectedDate}.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed",
        description: error?.response?.error || "Failed to generate scheduling suggestions.",
        variant: "destructive",
      });
    }
  });

  // Accept suggestion mutation
  const acceptSuggestionMutation = useMutation({
    mutationFn: async (suggestionId: string) => {
      const response = await apiRequest('POST', `/api/scheduling/suggestions/${suggestionId}/accept`);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/scheduling/suggestions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] }); // Refresh tasks
      toast({
        title: "Schedule Accepted!",
        description: data.message || "Your schedule has been applied and reminders have been set.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Accept Failed",
        description: error?.response?.error || "Failed to accept scheduling suggestion.",
        variant: "destructive",
      });
    }
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getTimeEstimateMinutes = (timeEstimate: string) => {
    if (timeEstimate.includes('hour')) {
      const hours = parseInt(timeEstimate);
      return hours * 60;
    } else {
      return parseInt(timeEstimate) || 30;
    }
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour24 = parseInt(hours);
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
    const ampm = hour24 >= 12 ? 'PM' : 'AM';
    return `${hour12}:${minutes} ${ampm}`;
  };

  const pendingTasks = tasks.filter(task => !task.completed);
  const hasTasksToSchedule = pendingTasks.length > 0;

  // Compact version for sidebar
  if (compact) {
    return (
      <div className="space-y-2">
        {/* Date picker and generate button */}
        <div className="flex items-center justify-between">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="text-sm border border-input rounded px-2 py-1 bg-background"
            data-testid="input-date-compact"
          />
          <Badge variant="outline" className="text-xs">
            {suggestions.length} suggestions
          </Badge>
        </div>
        
        <Button
          onClick={() => generateSuggestionsMutation.mutate()}
          disabled={generateSuggestionsMutation.isPending}
          size="sm"
          variant="outline"
          className="w-full h-8 text-xs"
          data-testid="button-generate-schedule-compact"
        >
          {generateSuggestionsMutation.isPending ? 'Generating...' : 'Generate Schedule'}
        </Button>

        {/* Show first 2 suggestions */}
        {suggestions.slice(0, 2).map((suggestion) => (
          <div key={suggestion.id} className="text-xs bg-muted/30 rounded p-2">
            <div className="flex items-center justify-between">
              <span className="font-medium truncate">
                {new Date(suggestion.targetDate).toLocaleDateString()}
              </span>
              <Button
                onClick={() => acceptSuggestionMutation.mutate(suggestion.id)}
                disabled={acceptSuggestionMutation.isPending || suggestion.accepted}
                size="icon"
                variant="ghost"
                className="h-5 w-5"
                data-testid={`button-accept-suggestion-compact-${suggestion.id}`}
              >
                {suggestion.accepted ? '✓' : '+'}
              </Button>
            </div>
            <div className="text-muted-foreground mt-1">
              {suggestion.suggestedTasks?.length || 0} tasks
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Smart Scheduler
          </CardTitle>
          <CardDescription>
            AI-powered scheduling suggestions based on your tasks, priorities, and preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Date Selector */}
          <div className="flex items-center gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Target Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="p-2 border border-input rounded-md bg-background text-sm"
                data-testid="input-target-date"
                min={new Date().toISOString().split('T')[0]} // Today or later
              />
            </div>
            
            <div className="flex items-center gap-2 mt-6">
              <Button
                onClick={() => generateSuggestionsMutation.mutate()}
                disabled={generateSuggestionsMutation.isPending || !hasTasksToSchedule}
                className="gap-2"
                data-testid="button-generate-schedule"
              >
                <TrendingUp className="w-4 h-4" />
                {generateSuggestionsMutation.isPending ? 'Generating...' : 'Generate Schedule'}
              </Button>
              
              {!hasTasksToSchedule && (
                <Badge variant="secondary" className="gap-1">
                  <CheckCircle className="w-3 h-3" />
                  All tasks completed!
                </Badge>
              )}
            </div>
          </div>

          {/* Stats */}
          {hasTasksToSchedule && (
            <div className="grid grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
              <div className="text-center">
                <p className="text-2xl font-bold">{pendingTasks.length}</p>
                <p className="text-xs text-muted-foreground">Pending Tasks</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">
                  {Math.round(pendingTasks.reduce((acc, task) => acc + getTimeEstimateMinutes(task.timeEstimate || '30 min'), 0) / 60)}h
                </p>
                <p className="text-xs text-muted-foreground">Total Time</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">
                  {pendingTasks.filter(task => task.priority === 'high').length}
                </p>
                <p className="text-xs text-muted-foreground">High Priority</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scheduling Suggestions */}
      {isLoading ? (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="h-4 bg-muted rounded animate-pulse" />
              <div className="h-4 bg-muted rounded animate-pulse" />
              <div className="h-4 bg-muted rounded animate-pulse" />
            </div>
          </CardContent>
        </Card>
      ) : suggestions.length > 0 ? (
        <div className="space-y-4">
          {suggestions.map((suggestion) => (
            <Card key={suggestion.id} className={suggestion.accepted ? 'border-green-200 bg-green-50/50' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-lg">
                      {suggestion.suggestionType === 'daily' ? 'Daily Schedule' : 
                       suggestion.suggestionType === 'weekly' ? 'Weekly Plan' : 
                       'Priority-Based Schedule'}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="gap-1">
                        <Star className="w-3 h-3" />
                        {suggestion.score}% confidence
                      </Badge>
                      {suggestion.accepted && (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Accepted
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {!suggestion.accepted && (
                    <Button
                      onClick={() => acceptSuggestionMutation.mutate(suggestion.id)}
                      disabled={acceptSuggestionMutation.isPending}
                      size="sm"
                      className="gap-2"
                      data-testid={`button-accept-suggestion-${suggestion.id}`}
                    >
                      <Calendar className="w-4 h-4" />
                      Accept Schedule
                    </Button>
                  )}
                </div>
                
                <CardDescription>
                  Schedule for {new Date(suggestion.targetDate).toLocaleDateString()} • {suggestion.suggestedTasks?.length || 0} tasks planned
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-3">
                  {suggestion.suggestedTasks?.map((taskSuggestion, index) => (
                    <div
                      key={taskSuggestion.taskId}
                      className="flex items-center justify-between p-3 bg-background border rounded-lg hover-elevate"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-medium text-muted-foreground min-w-[80px]">
                          {formatTime(taskSuggestion.suggestedStartTime)}
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        <div className="space-y-1">
                          <p className="font-medium">{taskSuggestion.title}</p>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant="secondary" 
                              className={getPriorityColor(taskSuggestion.priority)}
                            >
                              {taskSuggestion.priority}
                            </Badge>
                            <Badge variant="outline" className="gap-1">
                              <Clock className="w-3 h-3" />
                              {taskSuggestion.estimatedTime}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right max-w-[200px]">
                        <p className="text-xs text-muted-foreground italic">
                          {taskSuggestion.reason}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Schedule Suggestions</h3>
            <p className="text-muted-foreground mb-4">
              {hasTasksToSchedule 
                ? `Generate smart scheduling suggestions for ${new Date(selectedDate).toLocaleDateString()}`
                : "Complete some tasks first to get scheduling suggestions"
              }
            </p>
            {hasTasksToSchedule && (
              <Button
                onClick={() => generateSuggestionsMutation.mutate()}
                disabled={generateSuggestionsMutation.isPending}
                className="gap-2"
                data-testid="button-generate-schedule-empty"
              >
                <TrendingUp className="w-4 h-4" />
                Generate Smart Schedule
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}