import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckSquare, Search, Filter, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import TaskCard from './TaskCard';

interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  category: string;
  completed?: boolean;
}

interface TaskListProps {
  tasks: Task[];
  onTaskComplete: (taskId: string) => void;
  onTaskSkip: (taskId: string) => void;
  onAddTask: () => void;
}

export default function TaskList({ tasks, onTaskComplete, onTaskSkip, onAddTask }: TaskListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [filterCategory, setFilterCategory] = useState('all');

  const categories = [...new Set(tasks.map(task => task.category))];
  
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
    const matchesCategory = filterCategory === 'all' || task.category === filterCategory;
    const notCompleted = !task.completed;
    
    return matchesSearch && matchesPriority && matchesCategory && notCompleted;
  });

  const completedTasks = tasks.filter(task => task.completed);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Tasks</h2>
          <Badge variant="secondary" data-testid="badge-task-count">
            {filteredTasks.length} active
          </Badge>
        </div>
        
        <Button onClick={onAddTask} className="gap-2" data-testid="button-add-task">
          <Plus className="w-4 h-4" />
          Add Task
        </Button>
      </div>

      {/* Search and Filters */}
      <Card className="hover-elevate" data-testid="card-filters">
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-tasks"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Priority:</span>
                <div className="flex gap-1">
                  {(['all', 'high', 'medium', 'low'] as const).map((priority) => (
                    <Badge
                      key={priority}
                      variant={filterPriority === priority ? "default" : "outline"}
                      className="cursor-pointer hover-elevate text-xs"
                      onClick={() => setFilterPriority(priority)}
                      data-testid={`filter-priority-${priority}`}
                    >
                      {priority}
                    </Badge>
                  ))}
                </div>
              </div>

              {categories.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Category:</span>
                  <div className="flex gap-1">
                    <Badge
                      variant={filterCategory === 'all' ? "default" : "outline"}
                      className="cursor-pointer hover-elevate text-xs"
                      onClick={() => setFilterCategory('all')}
                      data-testid="filter-category-all"
                    >
                      all
                    </Badge>
                    {categories.map((category) => (
                      <Badge
                        key={category}
                        variant={filterCategory === category ? "default" : "outline"}
                        className="cursor-pointer hover-elevate text-xs"
                        onClick={() => setFilterCategory(category)}
                        data-testid={`filter-category-${category}`}
                      >
                        {category}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Tasks */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Active Tasks</h3>
        <AnimatePresence>
          {filteredTasks.length > 0 ? (
            <div className="space-y-4">
              {filteredTasks.map((task, index) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <TaskCard
                    task={task}
                    onComplete={onTaskComplete}
                    onSkip={onTaskSkip}
                    showConfetti={true}
                  />
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <CheckSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground mb-2">No tasks found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || filterPriority !== 'all' || filterCategory !== 'all'
                  ? 'Try adjusting your filters or search term'
                  : 'Create your first task to get started'}
              </p>
              <Button onClick={onAddTask} variant="outline" className="gap-2">
                <Plus className="w-4 h-4" />
                Add Task
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Completed Tasks */}
      {completedTasks.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Completed Today</h3>
          <div className="space-y-2">
            {completedTasks.slice(0, 5).map((task, index) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
              >
                <Card className="p-3 bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-700">
                  <div className="flex items-center gap-3">
                    <CheckSquare className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-800 dark:text-green-200 line-through">
                      {task.title}
                    </span>
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {task.category}
                    </Badge>
                  </div>
                </Card>
              </motion.div>
            ))}
            {completedTasks.length > 5 && (
              <p className="text-sm text-muted-foreground text-center">
                +{completedTasks.length - 5} more completed tasks
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}