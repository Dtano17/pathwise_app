import { useState } from 'react';
import { Button } from '@/components/ui/button';
import CelebrationModal from '../CelebrationModal';

export default function CelebrationModalExample() {
  const [isOpen, setIsOpen] = useState(false);

  const sampleAchievement = {
    title: 'Task Master!',
    description: 'You completed your morning workout! Keep up the amazing work!',
    type: 'task' as const,
    points: 50
  };

  return (
    <div className="p-6 text-center">
      <Button 
        onClick={() => setIsOpen(true)}
        className="gap-2"
        data-testid="button-trigger-celebration"
      >
        🎉 Trigger Celebration
      </Button>
      
      <CelebrationModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        achievement={sampleAchievement}
      />
    </div>
  );
}