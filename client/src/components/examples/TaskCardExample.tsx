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

  return (
    <div className="max-w-md mx-auto p-4">
      <TaskCard
        task={sampleTask}
        onComplete={handleComplete}
        onSkip={handleSkip}
        showConfetti={true}
      />
    </div>
  );
}