import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Calendar } from 'lucide-react';
import type { Activity } from '@shared/schema';

interface EditActivityDialogProps {
  activity: Activity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const categories = [
  { value: 'fitness', label: 'Fitness & Health' },
  { value: 'career', label: 'Career & Professional' },
  { value: 'learning', label: 'Learning & Education' },
  { value: 'finance', label: 'Finance & Money' },
  { value: 'relationships', label: 'Relationships' },
  { value: 'creativity', label: 'Creativity & Arts' },
  { value: 'travel', label: 'Travel & Adventure' },
  { value: 'home', label: 'Home & Lifestyle' },
  { value: 'personal', label: 'Personal Growth' },
  { value: 'other', label: 'Other' }
];

const priorities = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' }
];

export function EditActivityDialog({ activity, open, onOpenChange }: EditActivityDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Populate form when activity changes
  useEffect(() => {
    if (activity) {
      setTitle(activity.title || '');
      setDescription(activity.description || '');
      setCategory(activity.category || '');
      setPriority(activity.priority || 'medium');
      setStartDate(activity.startDate ? new Date(activity.startDate).toISOString().split('T')[0] : '');
      setEndDate(activity.endDate ? new Date(activity.endDate).toISOString().split('T')[0] : '');
    }
  }, [activity]);

  const updateActivityMutation = useMutation({
    mutationFn: async () => {
      if (!activity) return;
      
      return apiRequest('PUT', `/api/activities/${activity.id}`, {
        title,
        description,
        category,
        priority,
        startDate: startDate || null,
        endDate: endDate || null
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      toast({
        title: 'Activity Updated',
        description: 'Your activity has been updated successfully.',
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update activity. Please try again.',
        variant: 'destructive'
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please provide an activity title.',
        variant: 'destructive'
      });
      return;
    }

    updateActivityMutation.mutate();
  };

  if (!activity) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-edit-activity">
        <DialogHeader>
          <DialogTitle data-testid="text-edit-title">Edit Activity</DialogTitle>
          <DialogDescription data-testid="text-edit-description">
            Update your activity details below.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Activity title"
              required
              data-testid="input-activity-title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your activity..."
              rows={4}
              data-testid="input-activity-description"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="category" data-testid="select-activity-category">
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
                <SelectTrigger id="priority" data-testid="select-activity-priority">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <div className="relative">
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  data-testid="input-activity-start-date"
                />
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <div className="relative">
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  data-testid="input-activity-end-date"
                />
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateActivityMutation.isPending}
              data-testid="button-cancel-edit"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateActivityMutation.isPending}
              data-testid="button-save-activity"
            >
              {updateActivityMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
