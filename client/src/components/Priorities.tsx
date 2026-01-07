import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { 
  Plus, 
  X, 
  Edit,
  Heart,
  Activity,
  Home,
  Briefcase,
  Brain,
  Users,
  Target,
  Clock,
  Star,
  Moon,
  BookOpen,
  Dumbbell,
  Utensils,
  Phone
} from 'lucide-react';

interface Priority {
  id: string;
  title: string;
  description?: string;
  category: 'health' | 'family' | 'work' | 'personal' | 'spiritual' | 'social';
  importance: 'high' | 'medium' | 'low';
  userId: string;
  createdAt: string;
}

const priorityCategories = [
  { id: 'health', name: 'Health & Wellness', icon: Activity, color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  { id: 'family', name: 'Family & Relationships', icon: Heart, color: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200' },
  { id: 'work', name: 'Work & Career', icon: Briefcase, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  { id: 'personal', name: 'Personal Growth', icon: Target, color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
  { id: 'spiritual', name: 'Spiritual & Mindfulness', icon: BookOpen, color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200' },
  { id: 'social', name: 'Social & Community', icon: Users, color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' }
];

const priorityPresets = [
  { title: 'Taking regular naps', category: 'health', importance: 'medium', description: 'Prioritize rest and recovery through daily naps' },
  { title: 'Being physically active', category: 'health', importance: 'high', description: 'Daily exercise and movement for physical health' },
  { title: 'Family time and relationships', category: 'family', importance: 'high', description: 'Quality time with family and nurturing relationships' },
  { title: 'Mom\'s health and wellbeing', category: 'family', importance: 'high', description: 'Supporting and caring for mom\'s health needs' },
  { title: 'Daily reflection and journaling', category: 'personal', importance: 'medium', description: 'Time for self-reflection and documenting thoughts' },
  { title: 'Prayer and spiritual practice', category: 'spiritual', importance: 'high', description: 'Daily spiritual practice and connection' },
  { title: 'Healthy eating habits', category: 'health', importance: 'high', description: 'Maintaining nutritious and balanced diet' },
  { title: 'Work-life balance', category: 'work', importance: 'medium', description: 'Maintaining healthy boundaries between work and personal life' },
  { title: 'Learning and growth', category: 'personal', importance: 'medium', description: 'Continuous learning and skill development' },
  { title: 'Social connections', category: 'social', importance: 'medium', description: 'Nurturing friendships and community connections' }
];

export default function Priorities() {
  const { toast } = useToast();
  const [isAddingPriority, setIsAddingPriority] = useState(false);
  const [newPriority, setNewPriority] = useState({
    title: '',
    description: '',
    category: 'personal' as const,
    importance: 'medium' as const
  });

  // Fetch user priorities
  const { data: priorities = [], isLoading } = useQuery<Priority[]>({
    queryKey: ['/api/user/priorities'],
  });

  // Add priority mutation
  const addPriorityMutation = useMutation({
    mutationFn: (priority: Omit<Priority, 'id' | 'userId' | 'createdAt'>) =>
      apiRequest('POST', '/api/user/priorities', priority),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/priorities'] });
      toast({
        title: "Priority Added",
        description: "Your life priority has been added successfully.",
      });
      setNewPriority({ title: '', description: '', category: 'personal', importance: 'medium' });
      setIsAddingPriority(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Add Priority",
        description: error?.response?.error || "Please try again.",
        variant: "destructive",
      });
    }
  });

  // Delete priority mutation
  const deletePriorityMutation = useMutation({
    mutationFn: (priorityId: string) =>
      apiRequest('DELETE', `/api/user/priorities/${priorityId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/priorities'] });
      toast({
        title: "Priority Removed",
        description: "Your life priority has been removed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Remove Priority",
        description: error?.response?.error || "Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleAddPriority = () => {
    if (!newPriority.title.trim()) {
      toast({
        title: "Title Required",
        description: "Please enter a title for your priority.",
        variant: "destructive",
      });
      return;
    }

    addPriorityMutation.mutate(newPriority);
  };

  const handleAddPreset = (preset: typeof priorityPresets[0]) => {
    addPriorityMutation.mutate({
      ...preset,
      category: preset.category as Priority['category'],
      importance: preset.importance as Priority['importance']
    });
  };

  const getCategoryInfo = (categoryId: string) => {
    return priorityCategories.find(cat => cat.id === categoryId) || priorityCategories[0];
  };

  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'low': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 px-4 sm:px-0 w-full max-w-full overflow-hidden">
      <div className="text-center">
        <h2 className="text-xl sm:text-2xl font-bold mb-2 flex items-center justify-center gap-2">
          <Target className="w-5 h-5 sm:w-6 sm:h-6" />
          Life Priorities
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground px-2">
          Define your core values and priorities to help AI create more meaningful and aligned action plans
        </p>
      </div>

      {/* Priority Categories Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-3 w-full">
        {priorityCategories.map((category) => {
          const Icon = category.icon;
          const count = priorities.filter(p => p.category === category.id).length;
          return (
            <Card key={category.id} className="p-3 sm:p-3 text-center hover-elevate min-w-0 overflow-hidden">
              <Icon className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-1 sm:mb-2 text-muted-foreground" />
              <p className="text-xs sm:text-sm font-medium break-words hyphens-auto leading-tight">{category.name}</p>
              <Badge variant="outline" className="text-xs mt-1">
                {count} {count === 1 ? 'priority' : 'priorities'}
              </Badge>
            </Card>
          );
        })}
      </div>

      {/* Quick Add Presets */}
      <Card className="p-3 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
          <Star className="w-4 h-4 sm:w-5 sm:h-5" />
          Quick Add Common Priorities
        </h3>
        <div className="grid gap-2">
          {priorityPresets.map((preset, index) => {
            const categoryInfo = getCategoryInfo(preset.category);
            const Icon = categoryInfo.icon;
            const alreadyAdded = priorities.some(p => p.title.toLowerCase() === preset.title.toLowerCase());
            
            return (
              <div key={index} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium line-clamp-1">{preset.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1 hidden sm:block">{preset.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-6 sm:ml-0">
                  <Badge className={`${getImportanceColor(preset.importance)} text-xs`}>
                    {preset.importance}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAddPreset(preset)}
                    disabled={alreadyAdded || addPriorityMutation.isPending}
                    data-testid={`button-add-preset-${index}`}
                  >
                    {alreadyAdded ? <span className="text-xs">Added</span> : <Plus className="w-3 h-3" />}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Add Custom Priority */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add Custom Priority
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddingPriority(!isAddingPriority)}
            data-testid="button-toggle-add-priority"
          >
            {isAddingPriority ? 'Cancel' : 'Add Custom'}
          </Button>
        </div>

        {isAddingPriority && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="priority-title">Priority Title</Label>
              <Input
                id="priority-title"
                value={newPriority.title}
                onChange={(e) => setNewPriority(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Daily meditation practice"
                data-testid="input-priority-title"
              />
            </div>

            <div>
              <Label htmlFor="priority-description">Description (optional)</Label>
              <Textarea
                id="priority-description"
                value={newPriority.description}
                onChange={(e) => setNewPriority(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe why this priority is important to you..."
                className="resize-none"
                rows={3}
                data-testid="textarea-priority-description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="priority-category">Category</Label>
                <Select 
                  value={newPriority.category} 
                  onValueChange={(value: any) => setNewPriority(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger data-testid="select-priority-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorityCategories.map((category) => {
                      const Icon = category.icon;
                      return (
                        <SelectItem key={category.id} value={category.id}>
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4" />
                            {category.name}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="priority-importance">Importance</Label>
                <Select 
                  value={newPriority.importance} 
                  onValueChange={(value: any) => setNewPriority(prev => ({ ...prev, importance: value }))}
                >
                  <SelectTrigger data-testid="select-priority-importance">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High Priority</SelectItem>
                    <SelectItem value="medium">Medium Priority</SelectItem>
                    <SelectItem value="low">Low Priority</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={handleAddPriority}
              disabled={addPriorityMutation.isPending || !newPriority.title.trim()}
              className="w-full"
              data-testid="button-save-priority"
            >
              {addPriorityMutation.isPending ? 'Adding...' : 'Add Priority'}
            </Button>
          </div>
        )}
      </Card>

      {/* Current Priorities */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Target className="w-5 h-5" />
          Your Current Priorities ({priorities.length})
        </h3>
        
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : priorities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No priorities set yet. Add some priorities to help AI create better plans for you!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {priorities.map((priority) => {
              const categoryInfo = getCategoryInfo(priority.category);
              const Icon = categoryInfo.icon;
              
              return (
                <div key={priority.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover-elevate">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Icon className="w-5 h-5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{priority.title}</p>
                      {priority.description && (
                        <p className="text-sm text-muted-foreground truncate">{priority.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={categoryInfo.color} variant="outline">
                          {categoryInfo.name}
                        </Badge>
                        <Badge className={getImportanceColor(priority.importance)}>
                          {priority.importance}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deletePriorityMutation.mutate(priority.id)}
                    disabled={deletePriorityMutation.isPending}
                    className="text-destructive hover:text-destructive"
                    data-testid={`button-delete-priority-${priority.id}`}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* AI Integration Note */}
      <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700">
        <div className="flex items-start gap-3">
          <Brain className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
              How Priorities Help Your AI Plans
            </p>
            <p className="text-blue-700 dark:text-blue-200">
              When you share your intentions or import conversations, JournalMate will consider these priorities to create more personalized and meaningful action plans that align with what matters most to you.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}