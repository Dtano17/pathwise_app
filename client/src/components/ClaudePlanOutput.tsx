import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, Target, Sparkles, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import Confetti from 'react-confetti';

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
  showConfetti?: boolean;
}

export default function ClaudePlanOutput({
  planTitle,
  summary,
  tasks,
  estimatedTimeframe,
  motivationalNote,
  onCompleteTask,
  onCreateActivity,
  showConfetti = false
}: ClaudePlanOutputProps) {
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
  const [showCelebration, setShowCelebration] = useState(false);

  const handleCompleteTask = (taskId: string) => {
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
      {showCelebration && showConfetti && (
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
            >
              <Card className={`p-5 transition-all duration-300 ${
                isCompleted 
                  ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-700' 
                  : 'hover-elevate'
              }`}>
                <div className="space-y-4">
                  {/* Task Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          isCompleted ? 'bg-green-600' : 'bg-primary/10'
                        }`}>
                          {isCompleted ? (
                            <CheckCircle className="w-5 h-5 text-white" />
                          ) : (
                            <span className="text-sm font-semibold text-primary">
                              {index + 1}
                            </span>
                          )}
                        </div>
                        <h4 className={`font-semibold text-foreground ${
                          isCompleted ? 'line-through decoration-2 decoration-green-600' : ''
                        }`} data-testid={`text-task-title-${index}`}>
                          {task.title}
                        </h4>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-11">
                        <Badge variant="outline" className={getPriorityColor(task.priority)}>
                          {task.priority}
                        </Badge>
                        <Badge variant="outline">
                          {task.category}
                        </Badge>
                        {task.timeEstimate && (
                          <Badge variant="outline" className="gap-1">
                            <Clock className="w-3 h-3" />
                            {task.timeEstimate}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {!isCompleted && (
                      <Button
                        onClick={() => handleCompleteTask(task.id)}
                        size="sm"
                        variant="outline"
                        className="gap-2 shrink-0"
                        data-testid={`button-complete-task-${index}`}
                      >
                        <CheckCircle className="w-4 h-4" />
                        Complete
                      </Button>
                    )}
                  </div>

                  {/* Task Details */}
                  <div className="ml-11 space-y-3">
                    <p className={`text-sm text-muted-foreground leading-relaxed ${
                      isCompleted ? 'line-through decoration-1 decoration-gray-400 opacity-70' : ''
                    }`} data-testid={`text-task-description-${index}`}>
                      {task.description}
                    </p>
                    
                    {task.context && (
                      <div className="bg-secondary/20 border border-secondary/30 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <ChevronRight className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                          <p className={`text-xs text-foreground/80 leading-relaxed ${
                            isCompleted ? 'line-through decoration-1 decoration-gray-400 opacity-70' : ''
                          }`} data-testid={`text-task-context-${index}`}>
                            {task.context}
                          </p>
                        </div>
                      </div>
                    )}

                    {isCompleted && (
                      <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                        <CheckCircle className="w-4 h-4" />
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

      {/* Progress Summary */}
      <div className="text-center pt-4">
        <p className="text-sm text-muted-foreground">
          {completedTasks.size} of {tasks.length} tasks completed
        </p>
        <div className="w-full bg-secondary/20 rounded-full h-2 mt-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-500"
            style={{ width: `${(completedTasks.size / tasks.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Create Activity Button */}
      {onCreateActivity && (
        <div className="text-center pt-6">
          <Button
            onClick={() => onCreateActivity({
              title: planTitle || 'Generated Plan',
              description: summary || 'AI-generated activity plan',
              tasks: tasks
            })}
            className="gap-2"
            variant="outline"
            data-testid="button-create-activity-from-plan"
          >
            <Target className="w-4 h-4" />
            Create Activity from Plan
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            Convert this plan into a shareable activity with timeline and progress tracking
          </p>
        </div>
      )}
    </motion.div>
  );
}