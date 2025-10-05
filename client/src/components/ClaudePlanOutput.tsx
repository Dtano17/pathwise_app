import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, Target, Sparkles, ChevronRight, Share2, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import Confetti from 'react-confetti';
import ShareDialog from './ShareDialog';

interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  category: string;
  completed?: boolean;
  timeEstimate?: string;
  context?: string;
}

interface ClaudePlanOutputProps {
  planTitle?: string;
  summary?: string;
  tasks: Task[];
  estimatedTimeframe?: string;
  motivationalNote?: string;
  onCompleteTask: (taskId: string) => void;
  onCreateActivity?: (planData: { title: string; description: string; tasks: Task[] }) => void;
  onSetAsTheme?: () => void;
  showConfetti?: boolean;
  activityId?: string;
}

export default function ClaudePlanOutput({
  planTitle,
  summary,
  tasks,
  estimatedTimeframe,
  motivationalNote,
  onCompleteTask,
  onCreateActivity,
  onSetAsTheme,
  showConfetti = false,
  activityId
}: ClaudePlanOutputProps) {
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
  const [showCelebration, setShowCelebration] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);

  // Sync completed tasks from actual task data (additive to preserve optimistic UI, prune stale IDs)
  useEffect(() => {
    const validIds = new Set(tasks.map(t => t.id));
    const completedFromProps = tasks.filter(t => t.completed).map(t => t.id);
    
    setCompletedTasks(prev => {
      // Keep only IDs that are in current tasks list
      const pruned = new Set(Array.from(prev).filter(id => validIds.has(id)));
      // Add server-confirmed completions
      completedFromProps.forEach(id => pruned.add(id));
      return pruned;
    });
  }, [tasks]);

  const handleCompleteTask = (taskId: string) => {
    // Prevent completing preview tasks (tasks without IDs)
    if (!taskId) {
      console.warn('Cannot complete preview task without ID');
      return;
    }
    
    const newCompleted = new Set(completedTasks);
    newCompleted.add(taskId);
    setCompletedTasks(newCompleted);
    setShowCelebration(true);
    onCompleteTask(taskId);
    setTimeout(() => setShowCelebration(false), 3000);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {showCelebration && showConfetti && typeof window !== 'undefined' && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={false}
          numberOfPieces={200}
          colors={['#6C5CE7', '#00B894', '#FDCB6E']}
        />
      )}

      {/* Plan Header */}
      <Card className="p-6 bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-foreground" data-testid="text-plan-title">
                {planTitle || 'Your Action Plan'}
              </h2>
              {estimatedTimeframe && (
                <div className="flex items-center gap-2 mt-1">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground" data-testid="text-timeframe">
                    {estimatedTimeframe}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {summary && (
            <p className="text-muted-foreground leading-relaxed" data-testid="text-plan-summary">
              {summary}
            </p>
          )}
        </div>
      </Card>

      {/* Tasks List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Action Steps
        </h3>
        
        {tasks.map((task, index) => {
          const isCompleted = completedTasks.has(task.id) || task.completed;
          
          return (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="w-full"
            >
              <Card className={`p-3 sm:p-5 transition-all duration-300 ${
                isCompleted 
                  ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-700' 
                  : 'hover-elevate'
              }`}>
                <div className="space-y-3 sm:space-y-4">
                  {/* Task Header */}
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                    <div className="flex-1 space-y-2 min-w-0">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 ${
                          isCompleted ? 'bg-green-600' : 'bg-primary/10'
                        }`}>
                          {isCompleted ? (
                            <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                          ) : (
                            <span className="text-xs sm:text-sm font-semibold text-primary">
                              {index + 1}
                            </span>
                          )}
                        </div>
                        <h4 className={`font-semibold text-sm sm:text-base text-foreground break-words ${
                          isCompleted ? 'line-through decoration-2 decoration-green-600' : ''
                        }`} data-testid={`text-task-title-${index}`}>
                          {task.title}
                        </h4>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 ml-9 sm:ml-11">
                        <Badge variant="outline" className={`text-xs ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {task.category}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                      {task.timeEstimate && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-700">
                          <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">{task.timeEstimate}</span>
                        </div>
                      )}
                      
                      {!isCompleted && (
                        <Button
                          onClick={() => handleCompleteTask(task.id)}
                          size="sm"
                          variant="outline"
                          className="gap-2 shrink-0 w-full sm:w-auto"
                          disabled={!task.id || !activityId}
                          data-testid={`button-complete-task-${index}`}
                        >
                          <CheckCircle className="w-4 h-4" />
                          {!activityId ? 'Create Activity First' : 'Complete'}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Task Details */}
                  <div className="ml-9 sm:ml-11 space-y-2 sm:space-y-3">
                    <p className={`text-xs sm:text-sm text-muted-foreground leading-relaxed break-words ${
                      isCompleted ? 'line-through decoration-1 decoration-gray-400 opacity-70' : ''
                    }`} data-testid={`text-task-description-${index}`}>
                      {task.description}
                    </p>
                    
                    {task.context && (
                      <div className="bg-secondary/20 border border-secondary/30 rounded-lg p-2 sm:p-3">
                        <div className="flex items-start gap-2">
                          <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 text-primary mt-0.5 shrink-0" />
                          <p className={`text-xs text-foreground/80 leading-relaxed break-words ${
                            isCompleted ? 'line-through decoration-1 decoration-gray-400 opacity-70' : ''
                          }`} data-testid={`text-task-context-${index}`}>
                            {task.context}
                          </p>
                        </div>
                      </div>
                    )}

                    {isCompleted && (
                      <div className="flex items-center gap-2 text-green-600 text-xs sm:text-sm font-medium">
                        <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                        Task completed! Great job!
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Motivational Note */}
      {motivationalNote && (
        <Card className="p-4 bg-gradient-to-br from-secondary/5 to-primary/5 border-dashed border-2 border-primary/20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <p className="text-sm text-foreground font-medium" data-testid="text-motivational-note">
              {motivationalNote}
            </p>
          </div>
        </Card>
      )}

      {/* Activity Progress Tracking */}
      {activityId && (
        <Card className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 border-emerald-200 dark:border-emerald-700">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center">
                <Target className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-emerald-900 dark:text-emerald-100">Activity Created!</h4>
                <p className="text-xs text-emerald-700 dark:text-emerald-300">Track your progress below</p>
              </div>
            </div>
            {(() => {
              const completedCount = tasks.filter(t => t.completed || completedTasks.has(t.id)).length;
              const progressPercent = tasks.length > 0 ? Math.min(100, (completedCount / tasks.length) * 100) : 0;
              return (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-emerald-800 dark:text-emerald-200 font-medium">Progress</span>
                    <span className="text-emerald-900 dark:text-emerald-100 font-bold">{completedCount} / {tasks.length} tasks</span>
                  </div>
                  <div className="w-full bg-emerald-200/50 dark:bg-emerald-800/30 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-3 rounded-full transition-all duration-500 flex items-center justify-end pr-1"
                      style={{ width: `${progressPercent}%` }}
                    >
                      {progressPercent > 15 && (
                        <span className="text-[10px] font-bold text-white">{Math.round(progressPercent)}%</span>
                      )}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </Card>
      )}
      
      {/* Progress Summary (when no activity created yet) */}
      {!activityId && (
        <div className="text-center pt-4">
          {(() => {
            const completedCount = tasks.filter(t => t.completed || completedTasks.has(t.id)).length;
            const progressPercent = tasks.length > 0 ? Math.min(100, (completedCount / tasks.length) * 100) : 0;
            return (
              <>
                <p className="text-sm text-muted-foreground">
                  {completedCount} of {tasks.length} tasks completed
                </p>
                <div className="w-full bg-secondary/20 rounded-full h-2 mt-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Action Buttons */}
      <div className="pt-6 border-t">
        <h3 className="text-sm font-semibold text-center mb-4 text-muted-foreground">
          Quick Actions
        </h3>
        <div className="flex flex-wrap gap-3 justify-center">
          {/* Create Activity - Always visible, disabled after creation */}
          {onCreateActivity && (
            <Button
              onClick={() => onCreateActivity({
                title: planTitle || 'Generated Plan',
                description: summary || 'AI-generated activity plan',
                tasks: tasks
              })}
              className="gap-2"
              variant="default"
              disabled={!!activityId}
              data-testid="button-create-activity-from-plan"
            >
              <Target className="w-4 h-4" />
              {activityId ? 'Activity Created ✓' : 'Create Activity'}
            </Button>
          )}

          {/* Share to Social Media */}
          <Button
            onClick={() => setShowShareDialog(true)}
            className="gap-2"
            variant="outline"
            data-testid="button-share-plan"
          >
            <Share2 className="w-4 h-4" />
            Share Plan
          </Button>

          {/* Set as Theme */}
          {onSetAsTheme && (
            <Button
              onClick={onSetAsTheme}
              className="gap-2"
              variant="outline"
              data-testid="button-set-as-theme"
            >
              <Zap className="w-4 h-4" />
              Set as Theme
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground text-center mt-3">
          {!activityId 
            ? "Create an activity to share and track progress, or set this plan as today's theme"
            : "Share your progress or set this as today's focus theme"}
        </p>
      </div>

      {/* Share Dialog */}
      <ShareDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        title={planTitle || 'My Action Plan'}
        description={summary || `Generated plan with ${tasks.length} tasks`}
      />
    </motion.div>
  );
}