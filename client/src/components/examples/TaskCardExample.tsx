import { useState } from 'react';
import TaskCard from '../TaskCard';

export default function TaskCardExample() {
  const [completed, setCompleted] = useState(false);

  const sampleTask = {
    id: '1',
    title: 'Morning Workout',
    description: 'Complete a 30-minute workout session including cardio and strength training',
    priority: 'high' as const,
    dueDate: 'Today, 8:00 AM',
    category: 'Health',
    completed: completed
  };

  const handleComplete = (taskId: string) => {
    console.log('Task completed:', taskId);
    setCompleted(true);
  };

  const handleSkip = (taskId: string) => {
    console.log('Task skipped:', taskId);
  };

  const handleSnooze = (taskId: string, hours: number) => {
    console.log(`Task snoozed for ${hours} hours:`, taskId);
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <TaskCard
        task={sampleTask}
        onComplete={handleComplete}
        onSkip={handleSkip}
        onSnooze={handleSnooze}
        showConfetti={true}
      />
    </div>
  );
}