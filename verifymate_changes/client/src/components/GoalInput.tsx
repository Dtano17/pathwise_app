import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Target, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Goal {
  id: string;
  title: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
}

interface GoalInputProps {
  onAddGoal: (goal: Omit<Goal, 'id'>) => void;
  categories: string[];
}

export default function GoalInput({ onAddGoal, categories }: GoalInputProps) {
  const [title, setTitle] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [newCategory, setNewCategory] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);

  const handleSubmit = () => {
    if (title.trim()) {
      const category = newCategory.trim() || selectedCategory;
      onAddGoal({
        title: title.trim(),
        category,
        priority: selectedPriority,
      });
      
      // Reset form
      setTitle('');
      setSelectedCategory('');
      setNewCategory('');
      setShowNewCategory(false);
      setSelectedPriority('medium');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const priorityColors = {
    low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="max-w-md mx-auto hover-elevate" data-testid="card-goal-input">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Quick Goal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Input
              placeholder="What do you want to achieve?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyPress={handleKeyPress}
              data-testid="input-goal-title"
              className="text-base"
            />
          </div>

          {/* Category Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Category</label>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Badge
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  className="cursor-pointer hover-elevate"
                  onClick={() => {
                    setSelectedCategory(category);
                    setShowNewCategory(false);
                  }}
                  data-testid={`badge-category-${category}`}
                >
                  {category}
                </Badge>
              ))}
              <Badge
                variant={showNewCategory ? "default" : "outline"}
                className="cursor-pointer hover-elevate"
                onClick={() => setShowNewCategory(!showNewCategory)}
                data-testid="badge-new-category"
              >
                <Plus className="w-3 h-3 mr-1" />
                New
              </Badge>
            </div>
            
            <AnimatePresence>
              {showNewCategory && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex gap-2"
                >
                  <Input
                    placeholder="Category name"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    data-testid="input-new-category"
                    className="flex-1"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setShowNewCategory(false)}
                    data-testid="button-cancel-category"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Priority Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Priority</label>
            <div className="flex gap-2">
              {(['low', 'medium', 'high'] as const).map((priority) => (
                <Badge
                  key={priority}
                  className={`cursor-pointer hover-elevate ${
                    selectedPriority === priority ? priorityColors[priority] : 'bg-muted text-muted-foreground'
                  }`}
                  onClick={() => setSelectedPriority(priority)}
                  data-testid={`badge-priority-${priority}`}
                >
                  {priority}
                </Badge>
              ))}
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!title.trim()}
            className="w-full gap-2"
            data-testid="button-add-goal"
          >
            <Plus className="w-4 h-4" />
            Add Goal
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}