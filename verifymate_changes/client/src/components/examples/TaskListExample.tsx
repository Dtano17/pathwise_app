import { useState } from 'react';
import TaskList from '../TaskList';

export default function TaskListExample() {
  const [tasks, setTasks] = useState([
    {
      id: '1',
      title: 'Morning Workout',
      description: 'Complete 30-minute cardio and strength training session',
      priority: 'high' as const,
      dueDate: 'Today, 8:00 AM',
      category: 'Health',
      completed: false
    },
    {
      id: '2',
      title: 'Review Project Proposal',
      description: 'Go through the Q3 project proposal and provide feedback',
      priority: 'medium' as const,
      dueDate: 'Today, 2:00 PM',
      category: 'Work',
      completed: false
    },
    {
      id: '3',
      title: 'Read 20 Pages',
      description: 'Continue reading "Atomic Habits" - Chapter 3',
      priority: 'low' as const,
      dueDate: 'Today, 8:00 PM',
      category: 'Personal',
      completed: false
    },
    {
      id: '4',
      title: 'Call Mom',
      description: 'Weekly check-in call with family',
      priority: 'medium' as const,
      dueDate: 'Today, 6:00 PM',
      category: 'Social',
      completed: true
    }
  ]);

  const handleTaskComplete = (taskId: string) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, completed: true } : task
    ));
    console.log('Task completed:', taskId);
  };

  const handleTaskSkip = (taskId: string) => {
    console.log('Task skipped:', taskId);
  };

  const handleAddTask = () => {
    console.log('Add new task clicked');
  };

  return (
    <TaskList
      tasks={tasks}
      onTaskComplete={handleTaskComplete}
      onTaskSkip={handleTaskSkip}
      onAddTask={handleAddTask}
    />
  );
}