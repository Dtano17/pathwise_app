import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, Star, Zap, X } from 'lucide-react';
import Confetti from 'react-confetti';
import celebrationImage from '@assets/generated_images/celebration_confetti_animation_0c7629fe.png';

interface CelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  achievement: {
    title: string;
    description: string;
    type: 'task' | 'streak' | 'milestone';
    points?: number;
  };
}

export default function CelebrationModal({ isOpen, onClose, achievement }: CelebrationModalProps) {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const getIcon = () => {
    switch (achievement.type) {
      case 'streak':
        return <Zap className="w-12 h-12 text-yellow-500" />;
      case 'milestone':
        return <Trophy className="w-12 h-12 text-yellow-500" />;
      default:
        return <Star className="w-12 h-12 text-yellow-500" />;
    }
  };

  const getCelebrationMessage = () => {
    const messages = {
      task: ['Amazing!', 'Well done!', 'Great job!', 'Fantastic!', 'You did it!'],
      streak: ['On fire!', 'Unstoppable!', 'Keep it up!', 'Incredible streak!'],
      milestone: ['Milestone achieved!', 'Outstanding!', 'Legendary!', 'Epic achievement!']
    };
    
    const typeMessages = messages[achievement.type] || messages.task;
    return typeMessages[Math.floor(Math.random() * typeMessages.length)];
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {showConfetti && (
            <Confetti
              width={window.innerWidth}
              height={window.innerHeight}
              recycle={false}
              numberOfPieces={300}
              colors={['#6C5CE7', '#00B894', '#FDCB6E', '#FF6B6B', '#4ECDC4']}
              gravity={0.3}
            />
          )}
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
            data-testid="modal-celebration"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.5, opacity: 0, y: 50 }}
              transition={{ type: "spring", duration: 0.5 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md"
            >
              <Card className="p-8 text-center space-y-6 bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={onClose}
                  className="absolute top-4 right-4 h-8 w-8"
                  data-testid="button-close-celebration"
                >
                  <X className="w-4 h-4" />
                </Button>

                {/* Celebration Image */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="flex justify-center"
                >
                  <img 
                    src={celebrationImage} 
                    alt="Celebration" 
                    className="w-24 h-24 object-contain"
                  />
                </motion.div>

                {/* Celebration Message */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-2"
                >
                  <h2 className="text-3xl font-bold text-primary">
                    {getCelebrationMessage()}
                  </h2>
                  <div className="flex justify-center">
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ repeat: 3, duration: 0.5 }}
                    >
                      {getIcon()}
                    </motion.div>
                  </div>
                </motion.div>

                {/* Achievement Details */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="space-y-3"
                >
                  <h3 className="text-xl font-semibold text-foreground">
                    {achievement.title}
                  </h3>
                  <p className="text-muted-foreground">
                    {achievement.description}
                  </p>
                  
                  {achievement.points && (
                    <div className="flex items-center justify-center gap-2">
                      <Star className="w-5 h-5 text-yellow-500" />
                      <span className="font-semibold text-primary">
                        +{achievement.points} points
                      </span>
                    </div>
                  )}
                </motion.div>

                {/* Action Button */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <Button
                    onClick={onClose}
                    className="w-full gap-2 bg-gradient-to-r from-primary to-secondary hover:opacity-90"
                    data-testid="button-continue"
                  >
                    <Star className="w-4 h-4" />
                    Continue Your Journey
                  </Button>
                </motion.div>

                {/* Fun Motivational Quote */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="text-sm text-muted-foreground italic"
                >
                  "Progress, not perfection. Every step counts! 🚀"
                </motion.div>
              </Card>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}