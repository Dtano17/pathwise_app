import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Clock, Plus, Loader2, Bell } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface AddTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activityId?: string; // Optional: if adding task to a specific activity
}

const categories = [
  { value: 'personal', label: 'Personal' },
  { value: 'work', label: 'Work' },
  { value: 'health', label: 'Health' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'learning', label: 'Learning' },
  { value: 'finance', label: 'Finance' },
  { value: 'home', label: 'Home' },
  { value: 'errands', label: 'Errands' },
  { value: 'goal', label: 'Goal' },
  { value: 'other', label: 'Other' }
];

const priorities = [
  { value: 'low', label: 'Low', color: 'text-blue-500' },
  { value: 'medium', label: 'Medium', color: 'text-yellow-500' },
  { value: 'high', label: 'High', color: 'text-red-500' }
];

const timeEstimates = [
  { value: '15 min', label: '15 minutes' },
  { value: '30 min', label: '30 minutes' },
  { value: '1 hour', label: '1 hour' },
  { value: '2 hours', label: '2 hours' },
  { value: '4 hours', label: '4 hours' },
  { value: 'half day', label: 'Half day' },
  { value: 'full day', label: 'Full day' }
];

const reminderOptions = [
  { value: 'at_time', label: 'At due time', minutes: 0 },
  { value: '15_min', label: '15 minutes before', minutes: 15 },
  { value: '30_min', label: '30 minutes before', minutes: 30 },
  { value: '1_hour', label: '1 hour before', minutes: 60 },
  { value: '2_hours', label: '2 hours before', minutes: 120 },
  { value: '1_day', label: '1 day before', minutes: 1440 },
];

export function AddTaskDialog({ open, onOpenChange, activityId }: AddTaskDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('personal');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [timeEstimate, setTimeEstimate] = useState('');
  const [selectedReminders, setSelectedReminders] = useState<string[]>(['30_min']);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory('personal');
    setPriority('medium');
    setDueDate('');
    setDueTime('');
    setTimeEstimate('');
    setSelectedReminders(['30_min']);
  };

  const createTaskMutation = useMutation({
    mutationFn: async () => {
      // Combine date and time into a single ISO string
      let dueDateISO: string | null = null;
      if (dueDate) {
        const date = new Date(dueDate);
        if (dueTime) {
          const [hours, minutes] = dueTime.split(':').map(Number);
          date.setHours(hours, minutes, 0, 0);
        } else {
          // Default to 9 AM if no time specified
          date.setHours(9, 0, 0, 0);
        }
        dueDateISO = date.toISOString();
      }

      // Build reminder data if due date is set
      const reminders = dueDate && selectedReminders.length > 0
        ? selectedReminders.map(reminderValue => {
            const option = reminderOptions.find(o => o.value === reminderValue);
            return {
              type: reminderValue === 'at_time' ? 'deadline' : 'custom',
              minutesBefore: option?.minutes || 30,
            };
          })
        : [];

      const taskData = {
        title,
        description: description || null,
        category,
        priority,
        dueDate: dueDateISO,
        timeEstimate: timeEstimate || null,
        reminders,
      };

      if (activityId) {
        // Create task linked to an activity
        return apiRequest('POST', `/api/activities/${activityId}/tasks`, taskData);
      } else {
        // Create standalone task
        return apiRequest('POST', '/api/tasks', taskData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      if (activityId) {
        queryClient.invalidateQueries({ queryKey: [`/api/activities/${activityId}/tasks`] });
      }
      toast({
        title: 'Task Created',
        description: dueDate
          ? 'Your task has been created and a reminder will be scheduled.'
          : 'Your task has been created successfully.',
      });
      resetForm();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Creation Failed',
        description: error.message || 'Failed to create task. Please try again.',
        variant: 'destructive'
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please provide a task title.',
        variant: 'destructive'
      });
      return;
    }

    createTaskMutation.mutate();
  };

  // Get minimum date (today)
  const today = new Date().toISOString().split('T')[0];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add New Task
          </DialogTitle>
          <DialogDescription>
            Create a new task. Set a due date to receive reminders.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Task Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What do you need to do?"
              required
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details or notes..."
              rows={3}
            />
          </div>

          {/* Due Date and Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="dueDate" className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Due Date
              </Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                min={today}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueTime" className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Due Time
              </Label>
              <Input
                id="dueTime"
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                disabled={!dueDate}
              />
            </div>
          </div>

          {/* Reminder Options - only show when due date is set */}
          {dueDate && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Bell className="w-4 h-4" />
                Reminders
              </Label>
              <div className="space-y-2 pl-1">
                {reminderOptions.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`reminder-${option.value}`}
                      checked={selectedReminders.includes(option.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedReminders([...selectedReminders, option.value]);
                        } else {
                          setSelectedReminders(selectedReminders.filter(r => r !== option.value));
                        }
                      }}
                    />
                    <label
                      htmlFor={`reminder-${option.value}`}
                      className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {option.label}
                    </label>
                  </div>
                ))}
              </div>
              {selectedReminders.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Select at least one reminder to be notified before this task is due.
                </p>
              )}
            </div>
          )}

          {/* Category and Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map((prio) => (
                    <SelectItem key={prio.value} value={prio.value}>
                      <span className={prio.color}>{prio.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Time Estimate */}
          <div className="space-y-2">
            <Label htmlFor="timeEstimate">Time Estimate (optional)</Label>
            <Select value={timeEstimate} onValueChange={setTimeEstimate}>
              <SelectTrigger>
                <SelectValue placeholder="How long will this take?" />
              </SelectTrigger>
              <SelectContent>
                {timeEstimates.map((est) => (
                  <SelectItem key={est.value} value={est.value}>
                    {est.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createTaskMutation.isPending}
              className="flex-1"
            >
              {createTaskMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Task
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default AddTaskDialog;
