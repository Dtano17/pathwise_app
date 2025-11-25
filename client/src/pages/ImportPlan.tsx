import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { 
  ArrowLeft, 
  Sparkles, 
  Check, 
  X, 
  Loader2, 
  ClipboardPaste,
  Trash2,
  Plus,
  AlertCircle,
  ChevronRight,
  Edit2,
  GripVertical
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAIPlanImport, useClipboardImport, type ParsedTask } from '@/hooks/useAIPlanImport';
import { motion, AnimatePresence } from 'framer-motion';

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 border border-white/20 dark:border-slate-700/30 rounded-2xl shadow-xl ${className}`}>
      {children}
    </div>
  );
}

function LoadingState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col items-center justify-center py-16 px-6"
    >
      <div className="relative w-20 h-20 mb-6">
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 to-violet-600 animate-pulse" />
        <div className="absolute inset-2 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center">
          <Sparkles className="w-8 h-8 text-purple-500 animate-spin" style={{ animationDuration: '3s' }} />
        </div>
      </div>
      <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">
        Analyzing Your Plan
      </h3>
      <p className="text-slate-500 dark:text-slate-400 text-center max-w-xs">
        AI is extracting tasks, priorities, and timelines from your text...
      </p>
    </motion.div>
  );
}

function EmptyState({ onPasteClick }: { onPasteClick: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-12 px-6"
    >
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-100 to-violet-100 dark:from-purple-900/30 dark:to-violet-900/30 flex items-center justify-center mb-6">
        <ClipboardPaste className="w-10 h-10 text-purple-500" />
      </div>
      <h3 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">
        Import AI Plan
      </h3>
      <p className="text-slate-500 dark:text-slate-400 text-center max-w-sm mb-8">
        Paste a plan from ChatGPT, Claude, or any AI assistant to automatically create tasks
      </p>
      <Button
        onClick={onPasteClick}
        className="bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white shadow-lg"
        size="lg"
        data-testid="button-paste-plan"
      >
        <ClipboardPaste className="w-5 h-5 mr-2" />
        Paste from Clipboard
      </Button>
      <p className="text-xs text-slate-400 dark:text-slate-500 mt-4">
        Or share text directly from ChatGPT/Claude app to JournalMate
      </p>
    </motion.div>
  );
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-12 px-6"
    >
      <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8 text-red-500" />
      </div>
      <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">
        Import Failed
      </h3>
      <p className="text-slate-500 dark:text-slate-400 text-center max-w-xs mb-6">
        {error}
      </p>
      <Button onClick={onRetry} variant="outline" data-testid="button-retry">
        Try Again
      </Button>
    </motion.div>
  );
}

function SuccessState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-16 px-6"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', delay: 0.1 }}
        className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center mb-6 shadow-lg"
      >
        <Check className="w-10 h-10 text-white" />
      </motion.div>
      <h3 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">
        Plan Imported!
      </h3>
      <p className="text-slate-500 dark:text-slate-400 text-center">
        Redirecting to your new activity...
      </p>
    </motion.div>
  );
}

function TaskItem({ 
  task, 
  index, 
  onUpdate, 
  onRemove 
}: { 
  task: ParsedTask; 
  index: number;
  onUpdate: (updates: Partial<ParsedTask>) => void;
  onRemove: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task.title);

  const handleSaveTitle = () => {
    if (editedTitle.trim()) {
      onUpdate({ title: editedTitle.trim() });
    }
    setIsEditing(false);
  };

  const priorityColors = {
    high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ delay: index * 0.05 }}
      className="group flex items-start gap-3 p-4 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 hover:bg-white/80 dark:hover:bg-slate-800/80 transition-colors"
      data-testid={`task-item-${index}`}
    >
      <div className="flex-shrink-0 cursor-grab opacity-0 group-hover:opacity-50 transition-opacity">
        <GripVertical className="w-5 h-5 text-slate-400" />
      </div>

      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-xs font-semibold text-purple-600 dark:text-purple-400">
        {index + 1}
      </div>

      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="flex gap-2">
            <Input
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onBlur={handleSaveTitle}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
              autoFocus
              className="flex-1"
              data-testid={`input-task-title-${index}`}
            />
          </div>
        ) : (
          <div 
            className="font-medium text-slate-800 dark:text-white cursor-pointer hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
            onClick={() => setIsEditing(true)}
          >
            {task.title}
          </div>
        )}

        {task.description && (
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
            {task.description}
          </p>
        )}

        <div className="flex flex-wrap gap-2 mt-2">
          <Select
            value={task.priority || 'medium'}
            onValueChange={(value) => onUpdate({ priority: value as 'high' | 'medium' | 'low' })}
          >
            <SelectTrigger className="h-7 w-24 text-xs" data-testid={`select-priority-${index}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>

          {task.timeEstimate && (
            <Badge variant="secondary" className="text-xs">
              {task.timeEstimate}
            </Badge>
          )}

          {task.category && (
            <Badge variant="outline" className="text-xs">
              {task.category}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setIsEditing(true)}
          data-testid={`button-edit-task-${index}`}
        >
          <Edit2 className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
          onClick={onRemove}
          data-testid={`button-remove-task-${index}`}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
}

export default function ImportPlan() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { importFromClipboard } = useClipboardImport();
  
  const {
    state,
    limits,
    startImport,
    updateParsedPlan,
    updateTask,
    removeTask,
    addTask,
    confirmImport,
    cancel,
    reset,
    isLoading,
    isParsed,
    isSuccess,
    isError
  } = useAIPlanImport();

  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim().length > 20) {
        startImport(text.trim(), 'clipboard');
      } else {
        toast({
          title: 'Clipboard is empty',
          description: 'Copy an AI-generated plan first, then try again.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Cannot access clipboard',
        description: 'Please allow clipboard access or paste manually.',
        variant: 'destructive'
      });
    }
  };

  const handleAddTask = () => {
    if (newTaskTitle.trim()) {
      addTask({
        title: newTaskTitle.trim(),
        priority: 'medium',
        category: 'general'
      });
      setNewTaskTitle('');
      setShowAddTask(false);
    }
  };

  const handleBack = () => {
    if (isParsed) {
      cancel();
    } else {
      setLocation('/');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-violet-50 dark:from-slate-900 dark:via-slate-900 dark:to-purple-950">
      <div className="sticky top-0 z-50 backdrop-blur-lg bg-white/70 dark:bg-slate-900/70 border-b border-slate-200/50 dark:border-slate-700/50">
        <div className="flex items-center justify-between px-4 h-14 max-w-2xl mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <h1 className="text-lg font-semibold text-slate-800 dark:text-white">
            Import AI Plan
          </h1>

          <div className="w-10" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 pb-24">
        {limits && limits.tier === 'free' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4"
          >
            <GlassCard className="p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  Free imports: {limits.remaining} of {limits.limit} remaining
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-purple-600 dark:text-purple-400"
                  onClick={() => setLocation('/settings/subscription')}
                  data-testid="button-upgrade"
                >
                  Upgrade to Pro
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </GlassCard>
          </motion.div>
        )}

        <GlassCard>
          <AnimatePresence mode="wait">
            {state.status === 'idle' && (
              <EmptyState key="empty" onPasteClick={handlePaste} />
            )}

            {isLoading && (
              <LoadingState key="loading" />
            )}

            {isError && state.error && (
              <ErrorState key="error" error={state.error} onRetry={reset} />
            )}

            {isSuccess && (
              <SuccessState key="success" />
            )}

            {isParsed && state.parsedPlan && (
              <motion.div
                key="parsed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-4"
              >
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge 
                      variant="secondary" 
                      className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                    >
                      <Sparkles className="w-3 h-3 mr-1" />
                      AI Parsed
                    </Badge>
                    {state.parsedPlan.confidence >= 0.8 && (
                      <Badge variant="outline" className="text-emerald-600 border-emerald-200 dark:border-emerald-800">
                        High Confidence
                      </Badge>
                    )}
                  </div>

                  <Input
                    value={state.parsedPlan.title}
                    onChange={(e) => updateParsedPlan({ title: e.target.value })}
                    className="text-xl font-bold border-none bg-transparent p-0 h-auto focus-visible:ring-0 text-slate-800 dark:text-white"
                    placeholder="Plan title..."
                    data-testid="input-plan-title"
                  />

                  {state.parsedPlan.description && (
                    <Textarea
                      value={state.parsedPlan.description}
                      onChange={(e) => updateParsedPlan({ description: e.target.value })}
                      className="mt-2 border-none bg-transparent resize-none focus-visible:ring-0 text-slate-600 dark:text-slate-400"
                      placeholder="Plan description..."
                      rows={2}
                      data-testid="textarea-plan-description"
                    />
                  )}
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-slate-700 dark:text-slate-300">
                      Tasks ({state.parsedPlan.tasks.length})
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAddTask(true)}
                      className="text-purple-600 dark:text-purple-400"
                      data-testid="button-add-task"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Task
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <AnimatePresence>
                      {state.parsedPlan.tasks.map((task, index) => (
                        <TaskItem
                          key={`${task.title}-${index}`}
                          task={task}
                          index={index}
                          onUpdate={(updates) => updateTask(index, updates)}
                          onRemove={() => removeTask(index)}
                        />
                      ))}
                    </AnimatePresence>

                    {showAddTask && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex gap-2 p-3 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-dashed border-purple-300 dark:border-purple-700"
                      >
                        <Input
                          value={newTaskTitle}
                          onChange={(e) => setNewTaskTitle(e.target.value)}
                          placeholder="Enter task title..."
                          onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                          autoFocus
                          data-testid="input-new-task"
                        />
                        <Button onClick={handleAddTask} size="sm" data-testid="button-save-new-task">
                          Add
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setShowAddTask(false)}
                          data-testid="button-cancel-new-task"
                        >
                          Cancel
                        </Button>
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </div>

      {isParsed && state.parsedPlan && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent dark:from-slate-900 dark:via-slate-900">
          <div className="max-w-2xl mx-auto flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={cancel}
              disabled={state.status === 'saving'}
              data-testid="button-cancel-import"
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white shadow-lg"
              onClick={confirmImport}
              disabled={state.status === 'saving' || state.parsedPlan.tasks.length === 0}
              data-testid="button-confirm-import"
            >
              {state.status === 'saving' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Create {state.parsedPlan.tasks.length} Tasks
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
