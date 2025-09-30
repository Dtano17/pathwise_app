import { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, Calendar, X, Pause, Undo, Archive } from 'lucide-react';
import Confetti from 'react-confetti';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';

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
  showConfetti?: boolean;
}

export default function TaskCard({ task, onComplete, onSkip, onSnooze, onArchive, showConfetti = false }: TaskCardProps) {
  const [isCompleted, setIsCompleted] = useState(task.completed || false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [pendingAction, setPendingAction] = useState<'complete' | 'skip' | 'snooze' | 'archive' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { toast, dismiss } = useToast();
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentToastIdRef = useRef<string | null>(null);

  const triggerHapticFeedback = (type: 'light' | 'medium' | 'heavy' = 'medium') => {
    if ('vibrate' in navigator && navigator.vibrate) {
      switch (type) {
        case 'light':
          navigator.vibrate(50);
          break;
        case 'medium':
          navigator.vibrate(100);
          break;
        case 'heavy':
          navigator.vibrate([100, 50, 100]);
          break;
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
    triggerHapticFeedback('heavy');

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

      <Card className={`p-6 mb-4 transition-all duration-300 hover-elevate ${
        pendingAction === 'complete' ? 'ring-2 ring-green-500 border-green-200' :
        pendingAction === 'skip' ? 'ring-2 ring-red-500 border-red-200' :
        pendingAction === 'snooze' ? 'ring-2 ring-yellow-500 border-yellow-200' :
        pendingAction === 'archive' ? 'ring-2 ring-blue-500 border-blue-200' : ''
      }`} data-testid={`task-card-${task.id}`}>
        
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-foreground mb-2" data-testid={`task-title-${task.id}`}>
              {task.title}
            </h3>
            <p className="text-sm text-muted-foreground mb-3" data-testid={`task-description-${task.id}`}>
              {task.description}
            </p>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge className={getPriorityColor(task.priority)} data-testid={`task-priority-${task.id}`}>
            {task.priority}
          </Badge>
          <Badge className={getCategoryColor(task.category)} data-testid={`task-category-${task.id}`}>
            {task.category}
          </Badge>
          {task.dueDate && (
            <Badge variant="outline" className="flex items-center gap-1" data-testid={`task-due-date-${task.id}`}>
              <Calendar className="w-3 h-3" />
              {new Date(task.dueDate).toLocaleDateString()}
            </Badge>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 mt-4">
          <Button 
            onClick={handleComplete}
            disabled={isProcessing}
            size="default"
            className="w-full bg-green-600 hover:bg-green-700 text-white"
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
            className="w-full"
            data-testid={`button-snooze-${task.id}`}
          >
            <Pause className="w-4 h-4 mr-2 flex-shrink-0" />
            <span className="truncate">Snooze</span>
          </Button>
          
          {onArchive && (
            <Button 
              onClick={handleArchive}
              disabled={isProcessing}
              variant="outline"
              size="default"
              className="w-full"
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
            className={`w-full text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950 ${onArchive ? '' : 'col-start-2'}`}
            data-testid={`button-skip-${task.id}`}
          >
            <X className="w-4 h-4 mr-2 flex-shrink-0" />
            <span className="truncate">Skip</span>
          </Button>
        </div>

        {/* Processing indicator */}
        {isProcessing && (
          <div className="mt-3 text-center text-sm text-muted-foreground">
            Processing... (Click undo to cancel)
          </div>
        )}
      </Card>
    </div>
  );
}