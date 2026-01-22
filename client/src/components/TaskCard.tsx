import { useState, useRef, useEffect, memo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, Calendar, CalendarPlus, X, Pause, Undo, Archive, ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react';
import Confetti from 'react-confetti';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { isNative } from '@/lib/platform';
import { addTaskToCalendar } from '@/lib/calendar';
import { hapticsSuccess, hapticsLight, hapticsCelebrate } from '@/lib/haptics';

interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  category: string;
  completed?: boolean;
}

interface TaskCardProps {
  task: Task;
  onComplete: (taskId: string) => void;
  onSkip: (taskId: string) => void;
  onSnooze: (taskId: string, hours: number) => void;
  onArchive?: (taskId: string) => void;
  onUncomplete?: (taskId: string) => void;
  showConfetti?: boolean;
}

const TaskCard = memo(function TaskCard({ task, onComplete, onSkip, onSnooze, onArchive, onUncomplete, showConfetti = false }: TaskCardProps) {
  const [isCompleted, setIsCompleted] = useState(task.completed || false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [pendingAction, setPendingAction] = useState<'complete' | 'skip' | 'snooze' | 'archive' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAddingToCalendar, setIsAddingToCalendar] = useState(false);

  const { toast, dismiss } = useToast();
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentToastIdRef = useRef<string | null>(null);

  // Sync local completed state with prop when it changes (e.g., from server refresh)
  useEffect(() => {
    setIsCompleted(task.completed || false);
  }, [task.completed]);

  // TEMPORARILY DISABLED: Fetch task feedback (causing N+1 query performance issues)
  // const { data: feedbackData } = useQuery<{ userFeedback: { feedbackType: 'like' | 'dislike' } | null; stats: { likes: number; dislikes: number } }>({
  //   queryKey: ['/api/tasks', task.id, 'feedback'],
  //   staleTime: 30000,
  // });

  // TEMPORARILY DISABLED: Task feedback mutation
  // const feedbackMutation = useMutation({
  //   mutationFn: async (feedbackType: 'like' | 'dislike') => {
  //     const response = await apiRequest('POST', `/api/tasks/${task.id}/feedback`, { feedbackType });
  //     return await response.json();
  //   },
  //   onSuccess: () => {
  //     queryClient.invalidateQueries({ queryKey: ['/api/tasks', task.id, 'feedback'] });
  //   }
  // });

  // Enhanced haptic feedback that respects user preferences
  const triggerHapticFeedback = async (type: 'light' | 'success' | 'celebrate' = 'success') => {
    try {
      // Check if completion haptic is enabled
      const response = await fetch('/api/mobile/preferences');
      if (response.ok) {
        const prefs = await response.json();
        if (!prefs.enableHaptics || !prefs.enableCompletionHaptic) {
          return; // User disabled haptics
        }
      }

      // Trigger the appropriate haptic
      switch (type) {
        case 'light':
          await hapticsLight();
          break;
        case 'success':
          await hapticsSuccess();
          break;
        case 'celebrate':
          await hapticsCelebrate();
          break;
      }
    } catch (error) {
      // Fallback to web vibration API
      if ('vibrate' in navigator && navigator.vibrate) {
        switch (type) {
          case 'light':
            navigator.vibrate(50);
            break;
          case 'success':
            navigator.vibrate(100);
            break;
          case 'celebrate':
            navigator.vibrate([100, 50, 100, 50, 100]);
            break;
        }
      }
    }
  };

  const clearPendingAction = () => {
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
      undoTimeoutRef.current = null;
    }
    if (currentToastIdRef.current) {
      dismiss(currentToastIdRef.current);
      currentToastIdRef.current = null;
    }
    setPendingAction(null);
  };

  const handleComplete = () => {
    if (isProcessing) return;

    setIsProcessing(true);
    clearPendingAction();
    setPendingAction('complete');
    triggerHapticFeedback('celebrate'); // Celebration haptic on task completion

    // Show celebration immediately
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 3000);

    // Show undo toast
    const { id } = toast({
      title: "Task Completed! 🎉",
      description: "Great job finishing this task!",
      action: (
        <ToastAction altText="Undo completion" onClick={undoAction}>
          <Undo className="w-4 h-4" />
          Undo
        </ToastAction>
      ),
    });
    currentToastIdRef.current = id;

    // Execute action after delay
    undoTimeoutRef.current = setTimeout(() => {
      onComplete(task.id);
      clearPendingAction();
      setIsProcessing(false);
    }, 1000);
  };

  const handleSkip = () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    clearPendingAction();
    setPendingAction('skip');
    triggerHapticFeedback('light');

    // Show undo toast
    const { id } = toast({
      title: "Task Skipped",
      description: "This task has been skipped for now.",
      action: (
        <ToastAction altText="Undo skip" onClick={undoAction}>
          <Undo className="w-4 h-4" />
          Undo
        </ToastAction>
      ),
    });
    currentToastIdRef.current = id;

    // Execute action after delay
    undoTimeoutRef.current = setTimeout(() => {
      onSkip(task.id);
      clearPendingAction();
      setIsProcessing(false);
    }, 1000);
  };

  const handleSnooze = () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    clearPendingAction();
    setPendingAction('snooze');
    triggerHapticFeedback('medium');

    // Show undo toast
    const { id } = toast({
      title: "Task Snoozed",
      description: "This task will remind you again in 2 hours.",
      action: (
        <ToastAction altText="Undo snooze" onClick={undoAction}>
          <Undo className="w-4 h-4" />
          Undo
        </ToastAction>
      ),
    });
    currentToastIdRef.current = id;

    // Execute action after delay
    undoTimeoutRef.current = setTimeout(() => {
      onSnooze(task.id, 2);
      clearPendingAction();
      setIsProcessing(false);
    }, 1000);
  };

  const handleArchive = () => {
    if (isProcessing || !onArchive) return;
    
    setIsProcessing(true);
    clearPendingAction();
    setPendingAction('archive');
    triggerHapticFeedback('light');

    // Show undo toast
    const { id } = toast({
      title: "Task Archived",
      description: "This task has been archived.",
      action: (
        <ToastAction altText="Undo archive" onClick={undoAction}>
          <Undo className="w-4 h-4" />
          Undo
        </ToastAction>
      ),
    });
    currentToastIdRef.current = id;

    // Execute action after delay
    undoTimeoutRef.current = setTimeout(() => {
      onArchive(task.id);
      clearPendingAction();
      setIsProcessing(false);
    }, 1000);
  };

  const undoAction = () => {
    clearPendingAction();
    setIsProcessing(false);
    setShowCelebration(false);
  };

  const handleUncomplete = () => {
    if (isProcessing || !onUncomplete) return;

    setIsProcessing(true);
    triggerHapticFeedback('medium');

    // Show confirmation toast
    toast({
      title: "Task marked incomplete",
      description: "You can complete this task again when ready.",
    });

    // Call the uncomplete handler
    onUncomplete(task.id);
    setIsCompleted(false);
    setIsProcessing(false);
  };

  const handleAddToCalendar = async () => {
    if (isAddingToCalendar) return;

    setIsAddingToCalendar(true);
    triggerHapticFeedback('light');

    try {
      // Use task due date or default to tomorrow at 9 AM
      const dueDate = task.dueDate
        ? new Date(task.dueDate)
        : (() => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(9, 0, 0, 0);
            return tomorrow;
          })();

      const result = await addTaskToCalendar(
        task.title,
        dueDate,
        task.description,
        30 // 30 minutes reminder
      );

      if (result.success) {
        triggerHapticFeedback('heavy');
        toast({
          title: 'Added to Calendar',
          description: 'Task has been added to your calendar with a reminder',
        });
      } else {
        toast({
          title: 'Calendar Error',
          description: result.error || 'Failed to add to calendar',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('[TASK CARD] Calendar error:', error);
      toast({
        title: 'Calendar Error',
        description: error.message || 'Failed to add task to calendar',
        variant: 'destructive',
      });
    } finally {
      setIsAddingToCalendar(false);
    }
  };

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
    <div className="w-full max-w-md mx-auto relative" data-testid={`task-container-${task.id}`}>
      {/* Celebration Confetti */}
      {showCelebration && showConfetti && (
        <div className="absolute inset-0 z-50 pointer-events-none">
          <Confetti
            width={300}
            height={200}
            recycle={false}
            numberOfPieces={50}
            gravity={0.3}
          />
        </div>
      )}

      <Card className={`relative p-6 mb-4 transition-all duration-300 hover-elevate ${
        pendingAction === 'complete' ? 'ring-2 ring-green-500 border-green-200' :
        pendingAction === 'skip' ? 'ring-2 ring-red-500 border-red-200' :
        pendingAction === 'snooze' ? 'ring-2 ring-yellow-500 border-yellow-200' :
        pendingAction === 'archive' ? 'ring-2 ring-blue-500 border-blue-200' : ''
      }`} data-testid={`task-card-${task.id}`}>

        {/* Undo button in upper-right corner for completed tasks */}
        {isCompleted && onUncomplete && (
          <Button
            onClick={handleUncomplete}
            disabled={isProcessing}
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-foreground"
            data-testid={`button-uncomplete-${task.id}`}
          >
            <Undo className="w-4 h-4" />
          </Button>
        )}

        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base sm:text-lg text-foreground mb-2 break-words" data-testid={`task-title-${task.id}`}>
              {task.title}
            </h3>
            <p className="text-sm text-muted-foreground mb-3 break-words" data-testid={`task-description-${task.id}`}>
              {task.description}
            </p>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          {isCompleted && (
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 flex items-center gap-1" data-testid={`task-status-completed-${task.id}`}>
              <CheckCircle className="w-3 h-3" />
              Completed
            </Badge>
          )}
          <Badge className={getPriorityColor(task.priority)} data-testid={`task-priority-${task.id}`}>
            {task.priority}
          </Badge>
          <Badge className={getCategoryColor(task.category)} data-testid={`task-category-${task.id}`}>
            {task.category}
          </Badge>
          {task.dueDate && (
            <Badge variant="outline" className="flex items-center gap-1" data-testid={`task-due-date-${task.id}`}>
              <Calendar className="w-3 h-3" />
              {(() => {
                const date = new Date(task.dueDate);
                const dateStr = date.toLocaleDateString();
                // Show time if not midnight (indicating time was extracted)
                const hours = date.getHours();
                const minutes = date.getMinutes();
                if (hours !== 0 || minutes !== 0) {
                  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  return `${dateStr} at ${timeStr}`;
                }
                return dateStr;
              })()}
            </Badge>
          )}
        </div>

        {/* TEMPORARILY DISABLED: Feedback Buttons - YouTube Style (causing N+1 query performance issues) */}
        {/* <div className="flex items-center justify-center gap-4 mb-4 border-t pt-4">
          <button
            onClick={() => feedbackMutation.mutate('like')}
            disabled={feedbackMutation.isPending}
            className="flex items-center gap-2 px-3 py-2 rounded-full transition-all duration-200 hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid={`button-like-${task.id}`}
          >
            <ThumbsUp 
              className={`w-5 h-5 transition-all duration-200 ${
                feedbackData?.userFeedback?.feedbackType === 'like' 
                  ? 'fill-foreground stroke-foreground' 
                  : 'fill-none stroke-foreground'
              }`}
              strokeWidth={1.5}
            />
            <span className="text-xs font-medium text-foreground">
              {feedbackData?.stats?.likes || ''}
            </span>
          </button>
          <div className="w-px h-6 bg-border" />
          <button
            onClick={() => feedbackMutation.mutate('dislike')}
            disabled={feedbackMutation.isPending}
            className="flex items-center gap-2 px-3 py-2 rounded-full transition-all duration-200 hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid={`button-dislike-${task.id}`}
          >
            <ThumbsDown 
              className={`w-5 h-5 transition-all duration-200 ${
                feedbackData?.userFeedback?.feedbackType === 'dislike' 
                  ? 'fill-foreground stroke-foreground' 
                  : 'fill-none stroke-foreground'
              }`}
              strokeWidth={1.5}
            />
            <span className="text-xs font-medium text-foreground">
              {feedbackData?.stats?.dislikes || ''}
            </span>
          </button>
        </div> */}

        {/* Action Buttons */}
        {!isCompleted && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
            <Button
              onClick={handleComplete}
              disabled={isProcessing}
              size="default"
              className="w-full min-h-[44px] bg-green-600 hover:bg-green-700 text-white"
              data-testid={`button-complete-${task.id}`}
            >
              <CheckCircle className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="truncate">Complete</span>
            </Button>

            <Button
              onClick={handleSnooze}
              disabled={isProcessing}
              variant="outline"
              size="default"
              className="w-full min-h-[44px]"
              data-testid={`button-snooze-${task.id}`}
            >
              <Pause className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="truncate">Snooze</span>
            </Button>

            {/* Calendar button - show on native mobile, or when task has a due date */}
            {(isNative() || task.dueDate) && (
              <Button
                onClick={handleAddToCalendar}
                disabled={isProcessing || isAddingToCalendar}
                variant="outline"
                size="default"
                className="w-full min-h-[44px]"
                data-testid={`button-calendar-${task.id}`}
              >
                {isAddingToCalendar ? (
                  <Loader2 className="w-4 h-4 mr-2 flex-shrink-0 animate-spin" />
                ) : (
                  <CalendarPlus className="w-4 h-4 mr-2 flex-shrink-0" />
                )}
                <span className="truncate">Calendar</span>
              </Button>
            )}

            {onArchive && (
              <Button
                onClick={handleArchive}
                disabled={isProcessing}
                variant="outline"
                size="default"
                className="w-full min-h-[44px]"
                data-testid={`button-archive-${task.id}`}
              >
                <Archive className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="truncate">Archive</span>
              </Button>
            )}

            <Button
              onClick={handleSkip}
              disabled={isProcessing}
              variant="outline"
              size="default"
              className={`w-full min-h-[44px] text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950 ${onArchive ? '' : 'sm:col-start-2'}`}
              data-testid={`button-skip-${task.id}`}
            >
              <X className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="truncate">Skip</span>
            </Button>
          </div>
        )}

        {isCompleted && (
          <div className="mt-4 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-medium">
              <CheckCircle className="w-5 h-5" />
              <span>Great job! Task completed.</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {onArchive && (
                <Button
                  onClick={handleArchive}
                  disabled={isProcessing}
                  variant="outline"
                  size="sm"
                  className="flex-1 sm:flex-none"
                  data-testid={`button-archive-completed-${task.id}`}
                >
                  <Archive className="w-4 h-4 mr-2 flex-shrink-0" />
                  Archive
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Processing indicator */}
        {isProcessing && (
          <div className="mt-3 text-center text-sm text-muted-foreground">
            Processing... (Click undo to cancel)
          </div>
        )}
      </Card>
    </div>
  );
});

export default TaskCard;