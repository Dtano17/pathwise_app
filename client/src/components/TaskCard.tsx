import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, Calendar, ArrowRight, ArrowLeft } from 'lucide-react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import Confetti from 'react-confetti';

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
  showConfetti?: boolean;
}

export default function TaskCard({ task, onComplete, onSkip, showConfetti = false }: TaskCardProps) {
  const [dragDirection, setDragDirection] = useState<'left' | 'right' | null>(null);
  const [isCompleted, setIsCompleted] = useState(task.completed || false);
  const [showCelebration, setShowCelebration] = useState(false);

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.5, 0.8, 1, 0.8, 0.5]);

  const triggerHapticFeedback = (type: 'light' | 'medium' | 'heavy' = 'medium') => {
    if ('vibrate' in navigator && navigator.vibrate) {
      // Mobile vibration patterns
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

  const showMobileAlert = (message: string, type: 'success' | 'info' = 'info') => {
    // Modern browsers support notifications
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('JournalMate', {
        body: message,
        icon: '/journalmate-logo-final.png',
        tag: 'task-action',
        requireInteraction: false,
        silent: false
      });
    } else {
      // Fallback to toast-like alert
      const alertDiv = document.createElement('div');
      alertDiv.className = `fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg text-white ${
        type === 'success' ? 'bg-green-500' : 'bg-blue-500'
      }`;
      alertDiv.textContent = message;
      document.body.appendChild(alertDiv);
      
      setTimeout(() => {
        alertDiv.remove();
      }, 3000);
    }
  };

  const handleDragEnd = (event: any, info: PanInfo) => {
    const threshold = 150;
    
    if (info.offset.x > threshold) {
      // Swiped right - complete task
      triggerHapticFeedback('heavy');
      setIsCompleted(true);
      setShowCelebration(true);
      onComplete(task.id);
      showMobileAlert(`Task completed: ${task.title}`, 'success');
      setTimeout(() => setShowCelebration(false), 3000);
    } else if (info.offset.x < -threshold) {
      // Swiped left - skip task
      triggerHapticFeedback('light');
      onSkip(task.id);
      showMobileAlert(`Task skipped: ${task.title}`, 'info');
    }
    
    x.set(0);
    setDragDirection(null);
  };

  const handleDrag = (event: any, info: PanInfo) => {
    if (info.offset.x > 50 && dragDirection !== 'right') {
      setDragDirection('right');
      triggerHapticFeedback('light'); // Light feedback when entering complete zone
    } else if (info.offset.x < -50 && dragDirection !== 'left') {
      setDragDirection('left');
      triggerHapticFeedback('light'); // Light feedback when entering skip zone
    } else if (Math.abs(info.offset.x) < 50 && dragDirection !== null) {
      setDragDirection(null);
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

  if (isCompleted) {
    return (
      <>
        {showCelebration && showConfetti && (
          <Confetti
            width={window.innerWidth}
            height={window.innerHeight}
            recycle={false}
            numberOfPieces={200}
            colors={['#6C5CE7', '#00B894', '#FDCB6E']}
          />
        )}
        <motion.div
          initial={{ scale: 1 }}
          animate={{ scale: 0.95, opacity: 0.7 }}
          className="relative"
        >
          <Card className="p-4 bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-700">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <div className="flex-1">
                <h3 className="font-semibold text-green-800 dark:text-green-200 line-through decoration-2 decoration-green-600">
                  {task.title}
                </h3>
                {task.description && (
                  <p className="text-sm text-green-700 dark:text-green-300 line-through decoration-1 decoration-green-500 opacity-80 mt-1">
                    {task.description}
                  </p>
                )}
                <p className="text-sm text-green-600 dark:text-green-300 font-medium mt-2">
                  Task completed successfully!
                </p>
              </div>
            </div>
          </Card>
        </motion.div>
      </>
    );
  }

  return (
    <div className="relative">
      {/* Background hints */}
      <div className="absolute inset-0 flex" data-testid={`swipe-hints-${task.id}`}>
        <div className="flex-1 bg-red-100 dark:bg-red-900/20 rounded-l-lg flex items-center justify-start pl-6" data-testid={`skip-hint-${task.id}`}>
          <ArrowLeft className="w-6 h-6 text-red-600" />
          <span className="ml-2 text-red-600 font-medium">Skip</span>
        </div>
        <div className="flex-1 bg-green-100 dark:bg-green-900/20 rounded-r-lg flex items-center justify-end pr-6" data-testid={`complete-hint-${task.id}`}>
          <span className="mr-2 text-green-600 font-medium">Complete</span>
          <ArrowRight className="w-6 h-6 text-green-600" />
        </div>
      </div>

      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        style={{ x, rotate, opacity }}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        className="relative z-10 cursor-grab active:cursor-grabbing"
        data-testid={`task-card-${task.id}`}
        whileTap={{ scale: 0.98 }}
      >
        <Card className={`p-4 hover-elevate transition-all duration-200 ${
          dragDirection === 'right' ? 'border-green-300 shadow-green-100' :
          dragDirection === 'left' ? 'border-red-300 shadow-red-100' : ''
        }`}>
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <h3 className="font-semibold text-card-foreground text-lg">{task.title}</h3>
              <Badge className={getPriorityColor(task.priority)} data-testid={`badge-priority-${task.priority}`}>
                {task.priority}
              </Badge>
            </div>
            
            <p className="text-muted-foreground text-sm leading-relaxed">
              {task.description}
            </p>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{task.dueDate || 'Today'}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{task.category}</span>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Swipe instruction */}
      <div className="text-center mt-2 text-xs text-muted-foreground" data-testid={`swipe-instructions-${task.id}`}>
        ← Swipe left to skip • Swipe right to complete →
      </div>
    </div>
  );
}