import { useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Heart, ThumbsUp, ThumbsDown, ArrowRight, Sparkles,
  PartyPopper, X, Calendar, CheckCircle2, Trophy, Star
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { hapticsSwipe, hapticsSuccess, hapticsCelebrate } from '@/lib/haptics';
import confetti from 'canvas-confetti';

// Helper: render text with clickable links
function renderWithLinks(text: string): React.ReactNode {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return parts.map((part, i) => {
    if (/^https?:\/\//.test(part)) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline break-all"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

interface Task {
  id: string;
  title: string;
  description?: string;
  category?: string;
  activityTitle?: string;
  completedAt?: string;
}

interface Reaction {
  taskId: string;
  type: 'superlike' | 'like' | 'unlike' | 'skip';
  timestamp: string;
}

interface EndOfDayReviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

export default function EndOfDayReview({ open, onOpenChange, onComplete }: EndOfDayReviewProps) {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0]);
  const [exitDirection, setExitDirection] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Reactive indicator opacities bound to motion values
  const leftIndicatorOpacity = useTransform(x, [-100, -50, 0], [1, 0.5, 0]);
  const rightIndicatorOpacity = useTransform(x, [0, 50, 100], [0, 0.5, 1]);
  const upIndicatorOpacity = useTransform(y, [-100, -50, 0], [1, 0.5, 0]);

  // Fetch today's completed tasks
  useEffect(() => {
    if (open) {
      fetchCompletedTasks();
    }
  }, [open]);

  const fetchCompletedTasks = async () => {
    try {
      setIsLoading(true);
      const response = await apiRequest('GET', '/api/tasks/completed-today');
      const data = await response.json();
      setTasks(data.tasks || []);
      setCurrentIndex(0);
      setReactions([]);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to fetch completed tasks:', error);
      toast({
        title: "Error",
        description: "Failed to load completed tasks",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  const handleReaction = (type: 'superlike' | 'like' | 'unlike' | 'skip') => {
    const currentTask = tasks[currentIndex];
    if (!currentTask) return;

    const reaction: Reaction = {
      taskId: currentTask.id,
      type,
      timestamp: new Date().toISOString()
    };

    setReactions([...reactions, reaction]);

    // Trigger haptic feedback
    if (type === 'superlike') {
      hapticsSuccess();
    } else {
      hapticsSwipe();
    }

    // Play sound effect (optional)
    playSwipeSound(type);

    // Move to next task
    if (currentIndex < tasks.length - 1) {
      setTimeout(() => {
        setCurrentIndex(currentIndex + 1);
        x.set(0);
        y.set(0);
      }, 300);
    } else {
      // All tasks reviewed!
      handleComplete();
    }
  };

  const playSwipeSound = (type: string) => {
    // Optional: Add sound effects here
    // For now, just a placeholder
    console.log(`Sound: ${type}`);
  };

  const handleDragEnd = (_event: any, info: any) => {
    const threshold = 100;

    if (info.offset.x > threshold) {
      // Swiped right = Like
      setExitDirection({ x: 500, y: 0 });
      handleReaction('like');
    } else if (info.offset.x < -threshold) {
      // Swiped left = Unlike
      setExitDirection({ x: -500, y: 0 });
      handleReaction('unlike');
    } else if (info.offset.y < -threshold) {
      // Swiped up = Superlike
      setExitDirection({ x: 0, y: -500 });
      handleReaction('superlike');
    } else {
      // Not enough swipe, return to center
      x.set(0);
      y.set(0);
    }
  };

  const handleComplete = async () => {
    setShowCelebration(true);

    // Trigger celebration haptics
    hapticsCelebrate();

    // Trigger confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#9333EA', '#10B981', '#F59E0B', '#EF4444', '#3B82F6']
    });

    // Wait a moment for celebration
    setTimeout(async () => {
      await generateDailyJournal();
    }, 2000);
  };

  const generateDailyJournal = async () => {
    try {
      setIsSubmitting(true);

      // Organize reactions by type
      const superliked = reactions.filter(r => r.type === 'superlike');
      const liked = reactions.filter(r => r.type === 'like');
      const unliked = reactions.filter(r => r.type === 'unlike');
      const skipped = reactions.filter(r => r.type === 'skip');

      // Find task details for each reaction
      const getSuperlikedTasks = () => superliked.map(r => {
        const task = tasks.find(t => t.id === r.taskId);
        return task?.title || '';
      }).filter(Boolean);

      const getLikedTasks = () => liked.map(r => {
        const task = tasks.find(t => t.id === r.taskId);
        return task?.title || '';
      }).filter(Boolean);

      const getUnlikedTasks = () => unliked.map(r => {
        const task = tasks.find(t => t.id === r.taskId);
        return task?.title || '';
      }).filter(Boolean);

      // Generate journal entry text
      const journalText = `
🌟 End of Day Review - ${new Date().toLocaleDateString('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric'
})}

${superliked.length > 0 ? `❤️ LOVED IT! (${superliked.length})\n${getSuperlikedTasks().map(t => `• ${t}`).join('\n')}\n` : ''}
${liked.length > 0 ? `\n👍 Went Well (${liked.length})\n${getLikedTasks().map(t => `• ${t}`).join('\n')}\n` : ''}
${unliked.length > 0 ? `\n👎 Struggled With (${unliked.length})\n${getUnlikedTasks().map(t => `• ${t}`).join('\n')}\n` : ''}

📊 Total Tasks Completed: ${tasks.length}
⭐ Review Completion: ${reactions.length}/${tasks.length} tasks reviewed
${skipped.length > 0 ? `⏭️ Skipped: ${skipped.length}` : ''}

Keep crushing it! 🚀
      `.trim();

      // Save journal entry
      const response = await apiRequest('POST', '/api/journal/smart-entry', {
        text: journalText,
        keywords: ['@dailyreview', '@reflection'],
        mood: superliked.length > unliked.length ? 'positive' : (unliked.length > superliked.length ? 'challenging' : 'neutral')
      });

      const data = await response.json();

      // Save reactions to database for analytics
      await apiRequest('POST', '/api/tasks/reactions', {
        date: new Date().toISOString().split('T')[0],
        reactions: reactions
      });

      toast({
        title: "Daily Review Complete! 🎉",
        description: "Your journal entry has been saved.",
        duration: 5000
      });

      setIsSubmitting(false);

      if (onComplete) {
        onComplete();
      }

      // Close after a moment
      setTimeout(() => {
        onOpenChange(false);
        setShowCelebration(false);
      }, 1500);

    } catch (error) {
      console.error('Failed to generate daily journal:', error);
      toast({
        title: "Error",
        description: "Failed to save your daily review",
        variant: "destructive"
      });
      setIsSubmitting(false);
    }
  };

  const currentTask = tasks[currentIndex];
  const progress = tasks.length > 0 ? (reactions.length / tasks.length) * 100 : 0;

  if (showCelebration) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <div className="text-center py-12 space-y-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", duration: 0.5 }}
            >
              <div className="mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-emerald-500 flex items-center justify-center">
                <Trophy className="w-12 h-12 text-white" />
              </div>
            </motion.div>

            <div>
              <h2 className="text-3xl font-bold mb-2">Amazing Work! 🎉</h2>
              <p className="text-muted-foreground text-lg">
                You reviewed {tasks.length} tasks today
              </p>
            </div>

            <div className="flex justify-center gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-500">{reactions.filter(r => r.type === 'superlike').length}</div>
                <div className="text-muted-foreground">Loved</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">{reactions.filter(r => r.type === 'like').length}</div>
                <div className="text-muted-foreground">Liked</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-500">{reactions.filter(r => r.type === 'unlike').length}</div>
                <div className="text-muted-foreground">Struggled</div>
              </div>
            </div>

            {isSubmitting && (
              <div className="text-sm text-muted-foreground">
                Saving your daily journal...
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              End of Day Review
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {!isLoading && tasks.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {currentIndex + 1} / {tasks.length} tasks
                </span>
                <Badge variant="secondary">
                  <Star className="w-3 h-3 mr-1" />
                  {reactions.length} reviewed
                </Badge>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </CardHeader>

        <CardContent className="pb-6">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin mx-auto w-8 h-8 border-4 border-primary border-t-transparent rounded-full mb-4" />
              <p className="text-muted-foreground">Loading your completed tasks...</p>
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-12 space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold mb-2">No Tasks Completed Today</h3>
                <p className="text-sm text-muted-foreground">
                  Complete some tasks and come back to review your day!
                </p>
              </div>
              <Button onClick={() => onOpenChange(false)}>
                Got it
              </Button>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {/* Swipeable Card Stack */}
              <div className="relative h-[280px] xs:h-[340px] sm:h-[400px] flex items-center justify-center overflow-hidden">
                <AnimatePresence>
                  {currentTask && (
                    <motion.div
                      key={currentTask.id}
                      style={{ x, y, rotate, opacity, touchAction: 'none' }}
                      drag
                      dragElastic={1}
                      onDragEnd={handleDragEnd}
                      className="absolute w-full px-2"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{
                        x: exitDirection.x,
                        y: exitDirection.y,
                        opacity: 0,
                        transition: { duration: 0.3 }
                      }}
                      transition={{ duration: 0.3 }}
                    >
                      <Card className="cursor-grab active:cursor-grabbing border-2 border-primary/20 shadow-xl">
                        <CardContent className="p-4 sm:p-8 text-center space-y-3 sm:space-y-4">
                          <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto rounded-full bg-gradient-to-br from-purple-500 to-emerald-500 flex items-center justify-center">
                            <CheckCircle2 className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                          </div>

                          <div className="space-y-2">
                            <h3 className="text-lg sm:text-xl font-bold break-words line-clamp-2">{currentTask.title}</h3>
                            {currentTask.description && (
                              <p className="text-muted-foreground text-sm break-words line-clamp-3">
                                {renderWithLinks(currentTask.description)}
                              </p>
                            )}
                            {currentTask.activityTitle && (
                              <Badge variant="outline" className="mt-2">
                                {currentTask.activityTitle}
                              </Badge>
                            )}
                          </div>

                          <div className="pt-2 sm:pt-4">
                            <p className="text-sm text-muted-foreground font-medium">
                              How did this task go?
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Swipe Indicators - reactive to drag position */}
                <motion.div
                  className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10"
                  style={{ opacity: leftIndicatorOpacity }}
                >
                  <div className="bg-orange-500 text-white p-3 sm:p-4 rounded-full">
                    <ThumbsDown className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                </motion.div>

                <motion.div
                  className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 pointer-events-none z-10"
                  style={{ opacity: rightIndicatorOpacity }}
                >
                  <div className="bg-green-500 text-white p-3 sm:p-4 rounded-full">
                    <ThumbsUp className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                </motion.div>

                {/* Superlike indicator */}
                <motion.div
                  className="absolute top-2 left-1/2 -translate-x-1/2 pointer-events-none z-10"
                  style={{ opacity: upIndicatorOpacity }}
                >
                  <div className="bg-red-500 text-white p-3 sm:p-4 rounded-full">
                    <Heart className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                </motion.div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 xs:grid-cols-4 gap-2">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => handleReaction('unlike')}
                  className="flex flex-col h-auto py-4 gap-2 border-orange-200 hover:bg-orange-50 hover:border-orange-300"
                >
                  <ThumbsDown className="w-5 h-5 text-orange-500" />
                  <span className="text-xs">Struggled</span>
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => handleReaction('skip')}
                  className="flex flex-col h-auto py-4 gap-2"
                >
                  <ArrowRight className="w-5 h-5 text-muted-foreground" />
                  <span className="text-xs">Skip</span>
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => handleReaction('like')}
                  className="flex flex-col h-auto py-4 gap-2 border-green-200 hover:bg-green-50 hover:border-green-300"
                >
                  <ThumbsUp className="w-5 h-5 text-green-500" />
                  <span className="text-xs">Went Well</span>
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => handleReaction('superlike')}
                  className="flex flex-col h-auto py-4 gap-2 border-red-200 hover:bg-red-50 hover:border-red-300"
                >
                  <Heart className="w-5 h-5 text-red-500" />
                  <span className="text-xs">Loved It!</span>
                </Button>
              </div>

              {/* Instructions */}
              <div className="text-center space-y-1">
                <p className="text-xs text-muted-foreground">
                  👆 Swipe up to love • 👈 Swipe left to struggle • 👉 Swipe right to like
                </p>
                <p className="text-xs text-muted-foreground">
                  Or tap the buttons below
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </DialogContent>
    </Dialog>
  );
}
