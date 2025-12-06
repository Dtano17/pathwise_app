import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { 
  BookOpen, Coffee, Film, Music, MapPin, Heart, Star, 
  Save, Plus, X, Utensils, Palette, Book, Sparkles,
  Plane, Home, ShoppingBag, Gamepad2, Folder, Wand2,
  Package, BarChart3, FileText, Target, Cloud, Users,
  Loader2, TrendingUp, PenTool, Copy, Check, RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line } from 'recharts';

interface RichJournalEntry {
  id: string;
  text: string;
  media?: Array<{
    url: string;
    type: 'image' | 'video';
    thumbnail?: string;
  }>;
  timestamp: string;
  aiConfidence?: number;
  keywords?: string[];
  location?: { city?: string; country?: string; neighborhood?: string };
  budgetTier?: 'budget' | 'moderate' | 'luxury' | 'ultra_luxury';
  estimatedCost?: number;
  sourceUrl?: string;
  venueName?: string;
  venueType?: string;
}

type JournalItem = string | RichJournalEntry;

interface CustomCategory {
  id: string;
  name: string;
  color: string;
}

interface PersonalJournalProps {
  onClose?: () => void;
}

// Types for new features
interface JournalPack {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  prompts: string[];
}

interface JournalTemplate {
  id: string;
  userId: string | null;
  name: string;
  description: string;
  prompts: string[];
  isDefault: boolean;
  category: string;
}

interface JournalStats {
  stats: {
    totalEntries: number;
    totalCategories: number;
    journalingStreak: number;
    completionRate: number;
    totalActivities: number;
    completedTasks: number;
    pendingTasks: number;
  };
  charts: {
    entriesByCategory: Array<{ name: string; value: number }>;
    activityProgress: Array<{ name: string; progress: number; completed: number; total: number }>;
    last7Days: Array<{ date: string; entries: number; tasks: number }>;
  };
}

interface JournalSummary {
  summary: {
    totalEntries: number;
    themes: string[];
    emotions: Array<{ emotion: string; count: number }>;
    insights: string;
    recommendations: string[];
  };
}

export default function PersonalJournal({ onClose }: PersonalJournalProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>('journal');
  const [activeCategory, setActiveCategory] = useState<string>('restaurants');
  const [newItem, setNewItem] = useState('');
  const [journalData, setJournalData] = useState<Record<string, JournalItem[]>>({});
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);
  const [showAddCategoryDialog, setShowAddCategoryDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedColor, setSelectedColor] = useState('from-teal-500 to-cyan-500');
  
  // New feature states
  const [generatedPrompt, setGeneratedPrompt] = useState<string>('');
  const [selectedPack, setSelectedPack] = useState<JournalPack | null>(null);
  const [selectedPackPrompt, setSelectedPackPrompt] = useState<string>('');
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplatePrompts, setNewTemplatePrompts] = useState<string[]>(['']);
  
  // Filter states
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [budgetFilter, setBudgetFilter] = useState<string>('all');

  const categories = [
    { id: 'restaurants', label: 'Restaurants & Food', icon: Utensils, color: 'from-orange-500 to-red-500' },
    { id: 'movies', label: 'Movies & TV Shows', icon: Film, color: 'from-purple-500 to-pink-500' },
    { id: 'music', label: 'Music & Artists', icon: Music, color: 'from-blue-500 to-cyan-500' },
    { id: 'books', label: 'Books & Reading', icon: Book, color: 'from-green-500 to-emerald-500' },
    { id: 'hobbies', label: 'Hobbies & Interests', icon: Sparkles, color: 'from-yellow-500 to-orange-500' },
    { id: 'travel', label: 'Travel & Places', icon: Plane, color: 'from-indigo-500 to-purple-500' },
    { id: 'style', label: 'Personal Style', icon: Palette, color: 'from-pink-500 to-rose-500' },
    { id: 'favorites', label: 'Favorite Things', icon: Star, color: 'from-amber-500 to-yellow-500' },
    { id: 'notes', label: 'Personal Notes', icon: BookOpen, color: 'from-slate-500 to-gray-500' }
  ];

  const colorOptions = [
    'from-teal-500 to-cyan-500',
    'from-violet-500 to-purple-500',
    'from-fuchsia-500 to-pink-500',
    'from-rose-500 to-red-500',
    'from-lime-500 to-green-500'
  ];

  // Load user's journal data  (now supports rich media entries)
  const { data: userData, isLoading } = useQuery({
    queryKey: ['/api/user-preferences'],
    queryFn: async () => {
      const response = await fetch('/api/user-preferences');
      if (!response.ok) throw new Error('Failed to load preferences');
      const data = await response.json();
      return data;
    }
  });

  // Sync local state with query data whenever it updates
  useEffect(() => {
    if (userData?.preferences?.journalData) {
      setJournalData(userData.preferences.journalData);
    }
    if (userData?.preferences?.customJournalCategories) {
      setCustomCategories(userData.preferences.customJournalCategories);
    }
  }, [userData]);

  // Merge default and custom categories
  const allCategories = [
    ...categories.map(c => ({ ...c, isCustom: false })),
    ...customCategories.map(c => ({ id: c.id, label: c.name, icon: Folder, color: c.color, isCustom: true }))
  ];

  const currentCategory = allCategories.find(c => c.id === activeCategory);

  // Save journal entry mutation
  const saveEntryMutation = useMutation({
    mutationFn: async (data: { category: string; items: JournalItem[] }) => {
      const response = await apiRequest('PUT', '/api/user/journal', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user-preferences'] });
      toast({
        title: "Saved!",
        description: "Your journal entry has been saved.",
      });
    },
    onError: (error: any) => {
      console.error('Journal save error:', error);
      
      // Provide specific error messages
      let errorMessage = "Could not save your entry. Please try again.";
      
      if (!navigator.onLine) {
        errorMessage = "You appear to be offline. Please check your internet connection.";
      } else if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
        errorMessage = "Network error. Please check your connection and try again.";
      } else if (error?.status === 401 || error?.status === 403) {
        errorMessage = "Authentication error. Please log in again.";
      } else if (error?.status === 500) {
        errorMessage = "Server error. Please try again in a moment.";
      }
      
      toast({
        title: "Save Failed",
        description: errorMessage,
        variant: "destructive"
      });
    }
  });

  // Save custom category mutation
  const saveCustomCategoryMutation = useMutation({
    mutationFn: async (categories: CustomCategory[]) => {
      const response = await apiRequest('PUT', '/api/user/journal/custom-categories', {
        customJournalCategories: categories
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user-preferences'] });
      toast({
        title: "Category Added!",
        description: "Your custom category has been created.",
      });
    },
    onError: (error: any) => {
      console.error('Category save error:', error);
      
      // Provide specific error messages
      let errorMessage = "Could not create category. Please try again.";
      
      if (!navigator.onLine) {
        errorMessage = "You appear to be offline. Please check your internet connection.";
      } else if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
        errorMessage = "Network error. Please check your connection and try again.";
      } else if (error?.status === 401 || error?.status === 403) {
        errorMessage = "Authentication error. Please log in again.";
      } else if (error?.status === 500) {
        errorMessage = "Server error. Please try again in a moment.";
      }
      
      toast({
        title: "Failed to Create Category",
        description: errorMessage,
        variant: "destructive"
      });
    }
  });

  // New feature queries
  const { data: packsData } = useQuery<{ packs: JournalPack[] }>({
    queryKey: ['/api/journal/packs'],
    enabled: activeTab === 'packs',
  });

  const { data: statsData, isLoading: statsLoading } = useQuery<JournalStats>({
    queryKey: ['/api/journal/stats'],
    enabled: activeTab === 'insights',
  });

  const { data: templatesData } = useQuery<{ templates: JournalTemplate[] }>({
    queryKey: ['/api/journal/templates'],
    enabled: activeTab === 'templates',
  });

  // Generate prompt mutation
  const generatePromptMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/journal/generate-prompt');
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedPrompt(data.prompt);
      toast({
        title: "Prompt Generated!",
        description: "A personalized prompt based on your activities.",
      });
    },
    onError: () => {
      toast({
        title: "Failed",
        description: "Could not generate prompt. Try again.",
        variant: "destructive",
      });
    },
  });

  // Get AI summary mutation
  const getSummaryMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/journal/summary');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Insights Ready!",
        description: "Your journal analysis is complete.",
      });
    },
    onError: () => {
      toast({
        title: "Failed",
        description: "Could not analyze journal. Try again.",
        variant: "destructive",
      });
    },
  });

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (data: { name: string; prompts: string[] }) => {
      const response = await apiRequest('POST', '/api/journal/templates', {
        ...data,
        description: '',
        category: 'custom',
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/journal/templates'] });
      setShowTemplateDialog(false);
      setNewTemplateName('');
      setNewTemplatePrompts(['']);
      toast({
        title: "Template Created!",
        description: "Your custom template is ready to use.",
      });
    },
    onError: () => {
      toast({
        title: "Failed",
        description: "Could not create template.",
        variant: "destructive",
      });
    },
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const response = await apiRequest('DELETE', `/api/journal/templates/${templateId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/journal/templates'] });
      toast({
        title: "Deleted",
        description: "Template removed.",
      });
    },
  });

  const handleCopyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt);
    setCopiedPrompt(prompt);
    setTimeout(() => setCopiedPrompt(null), 2000);
    toast({ title: "Copied!", description: "Prompt copied to clipboard." });
  };

  const handleUsePromptInJournal = (prompt: string) => {
    setNewItem(prompt);
    setActiveTab('journal');
    setActiveCategory('notes');
    toast({ title: "Prompt added!", description: "Start writing your response below." });
  };

  const getPackIcon = (iconName: string) => {
    switch (iconName) {
      case 'heart': return Heart;
      case 'sparkles': return Sparkles;
      case 'target': return Target;
      case 'cloud': return Cloud;
      case 'palette': return Palette;
      case 'users': return Users;
      default: return Package;
    }
  };

  const CHART_COLORS = ['#8b5cf6', '#ec4899', '#f97316', '#22c55e', '#3b82f6', '#eab308', '#06b6d4'];

  const handleAddCustomCategory = () => {
    if (!newCategoryName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a category name.",
        variant: "destructive"
      });
      return;
    }

    const categoryId = newCategoryName.toLowerCase().replace(/\s+/g, '-');
    const newCategory: CustomCategory = {
      id: `custom-${categoryId}-${Date.now()}`,
      name: newCategoryName.trim(),
      color: selectedColor
    };

    const updatedCategories = [...customCategories, newCategory];
    setCustomCategories(updatedCategories);
    saveCustomCategoryMutation.mutate(updatedCategories);
    
    setNewCategoryName('');
    setSelectedColor('from-teal-500 to-cyan-500');
    setShowAddCategoryDialog(false);
    setActiveCategory(newCategory.id);
  };

  const handleAddItem = () => {
    if (!newItem.trim()) return;
    
    const updatedItems = [...(journalData[activeCategory] || []), newItem.trim()];
    setJournalData(prev => ({ ...prev, [activeCategory]: updatedItems }));
    setNewItem('');
    
    // Auto-save
    saveEntryMutation.mutate({ category: activeCategory, items: updatedItems });
  };

  const handleRemoveItem = (index: number) => {
    const updatedItems = journalData[activeCategory].filter((_, i) => i !== index);
    setJournalData(prev => ({ ...prev, [activeCategory]: updatedItems }));
    
    // Auto-save
    saveEntryMutation.mutate({ category: activeCategory, items: updatedItems });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddItem();
    }
  };

  // Extract unique locations from all journal entries across all categories
  const getUniqueLocations = (): string[] => {
    const locations = new Set<string>();
    Object.values(journalData).forEach(items => {
      items.forEach(item => {
        if (typeof item === 'object' && item !== null && item.location) {
          if (item.location.city) locations.add(item.location.city);
          if (item.location.country) locations.add(item.location.country);
          if (item.location.neighborhood) locations.add(item.location.neighborhood);
        }
      });
    });
    return Array.from(locations).sort();
  };

  const uniqueLocations = getUniqueLocations();

  // Budget tier labels
  const budgetTierLabels: Record<string, string> = {
    'budget': 'Budget ($)',
    'moderate': 'Moderate ($$)',
    'luxury': 'Luxury ($$$)',
    'ultra_luxury': 'Ultra Luxury ($$$$)'
  };

  // Filter current category entries
  const getFilteredEntries = (): JournalItem[] => {
    const entries = journalData[activeCategory] || [];
    return entries.filter(item => {
      // String entries pass through if no filters are active
      if (typeof item === 'string') {
        return locationFilter === 'all' && budgetFilter === 'all';
      }
      
      // Check location filter
      if (locationFilter !== 'all') {
        const location = item.location;
        const matchesLocation = location && (
          location.city === locationFilter ||
          location.country === locationFilter ||
          location.neighborhood === locationFilter
        );
        if (!matchesLocation) return false;
      }
      
      // Check budget filter
      if (budgetFilter !== 'all') {
        if (item.budgetTier !== budgetFilter) return false;
      }
      
      return true;
    });
  };

  const filteredEntries = getFilteredEntries();
  const hasActiveFilters = locationFilter !== 'all' || budgetFilter !== 'all';

  const clearFilters = () => {
    setLocationFilter('all');
    setBudgetFilter('all');
  };

  return (
    <div className="h-full flex flex-col p-2 sm:p-4">
      {/* Feature Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="w-full flex-wrap h-auto gap-1 mb-4 p-1">
          <TabsTrigger value="journal" className="flex-1 gap-2" data-testid="tab-journal">
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">Journal</span>
          </TabsTrigger>
          <TabsTrigger value="prompts" className="flex-1 gap-2" data-testid="tab-prompts">
            <Wand2 className="w-4 h-4" />
            <span className="hidden sm:inline">AI Prompts</span>
          </TabsTrigger>
          <TabsTrigger value="packs" className="flex-1 gap-2" data-testid="tab-packs">
            <Package className="w-4 h-4" />
            <span className="hidden sm:inline">Packs</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex-1 gap-2" data-testid="tab-templates">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Templates</span>
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex-1 gap-2" data-testid="tab-insights">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Insights</span>
          </TabsTrigger>
        </TabsList>

        {/* Journal Tab - Original journal content */}
        <TabsContent value="journal" className="flex-1 overflow-auto m-0">
          <div className="h-full flex flex-col lg:flex-row gap-4">
            {/* Sidebar - Categories */}
            <div className="w-full lg:w-64 flex-shrink-0">
              <Card className="border-none shadow-sm bg-card/50 backdrop-blur">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-primary" />
                      My Journal
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        queryClient.invalidateQueries({ queryKey: ['/api/user-preferences'] });
                        queryClient.invalidateQueries({ queryKey: ['/api/journal/stats'] });
                        toast({
                          title: "Refreshed",
                          description: "Journal data has been refreshed.",
                        });
                      }}
                      data-testid="button-refresh-journal"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                  <CardDescription className="text-xs sm:text-sm">
                    Capture what makes you unique
                  </CardDescription>
                </CardHeader>
          <CardContent className="p-2">
            <ScrollArea className="h-[400px] lg:h-[calc(90vh-180px)]">
              <div className="space-y-1">
                {allCategories.map((category) => {
                  const Icon = category.icon;
                  const isActive = activeCategory === category.id;
                  const itemCount = journalData[category.id]?.length || 0;
                  
                  return (
                    <Button
                      key={category.id}
                      variant={isActive ? "secondary" : "ghost"}
                      className={`w-full justify-start gap-3 h-auto py-3 px-3 ${isActive ? 'bg-primary/10' : ''}`}
                      onClick={() => setActiveCategory(category.id)}
                      data-testid={`category-${category.id}`}
                    >
                      <div className={`p-2 rounded-lg bg-gradient-to-br ${category.color} text-white flex-shrink-0`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-sm font-medium">{category.label}</div>
                        {itemCount > 0 && (
                          <div className="text-xs text-muted-foreground">
                            {itemCount} {itemCount === 1 ? 'entry' : 'entries'}
                          </div>
                        )}
                      </div>
                    </Button>
                  );
                })}
                
                <Separator className="my-2" />
                
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 h-auto py-3 px-3 border-dashed"
                  onClick={() => setShowAddCategoryDialog(true)}
                  data-testid="button-add-category"
                >
                  <div className="p-2 rounded-lg bg-muted flex-shrink-0">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium">Add Custom Category</div>
                  </div>
                </Button>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Main Content - Journal Entries */}
      <div className="flex-1 min-w-0">
        <Card className="border-none shadow-sm h-full">
          <CardHeader className="pb-3 sm:pb-4 p-3 sm:p-6">
            <div className="flex items-start justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                {currentCategory && (
                  <>
                    <div className={`p-2 sm:p-3 rounded-lg sm:rounded-xl bg-gradient-to-br ${currentCategory.color} text-white flex-shrink-0`}>
                      <currentCategory.icon className="w-4 h-4 sm:w-6 sm:h-6" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-base sm:text-xl md:text-2xl truncate">{currentCategory.label}</CardTitle>
                      <CardDescription className="text-xs sm:text-sm mt-0.5 sm:mt-1 line-clamp-1">
                        {activeCategory === 'restaurants' && 'Your favorite restaurants, cuisines, and food preferences'}
                        {activeCategory === 'movies' && 'Movies, shows, genres, and actors you love'}
                        {activeCategory === 'music' && 'Artists, bands, genres, and playlists that move you'}
                        {activeCategory === 'books' && 'Books, authors, and genres you enjoy reading'}
                        {activeCategory === 'hobbies' && 'Activities and interests that bring you joy'}
                        {activeCategory === 'travel' && 'Places you\'ve been or dream of visiting'}
                        {activeCategory === 'style' && 'Your fashion preferences, favorite brands, and style notes'}
                        {activeCategory === 'favorites' && 'Your all-time favorite things across all categories'}
                        {activeCategory === 'notes' && 'Personal thoughts, memories, and things about yourself'}
                      </CardDescription>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="w-[160px]" data-testid="select-location-filter">
                  <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                  <SelectValue placeholder="All Locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {uniqueLocations.map((location) => (
                    <SelectItem key={location} value={location}>
                      {location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={budgetFilter} onValueChange={setBudgetFilter}>
                <SelectTrigger className="w-[180px]" data-testid="select-budget-filter">
                  <SelectValue placeholder="All Budgets" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Budgets</SelectItem>
                  <SelectItem value="budget">Budget ($)</SelectItem>
                  <SelectItem value="moderate">Moderate ($$)</SelectItem>
                  <SelectItem value="luxury">Luxury ($$$)</SelectItem>
                  <SelectItem value="ultra_luxury">Ultra Luxury ($$$$)</SelectItem>
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="gap-1"
                  data-testid="button-clear-filters"
                >
                  <X className="w-3 h-3" />
                  Clear Filters
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Add New Entry */}
            <div className="flex gap-2">
              <div className="flex-1">
                {activeCategory === 'notes' ? (
                  <Textarea
                    placeholder="Write your thoughts here..."
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="min-h-[80px] resize-none"
                    data-testid="input-journal-entry"
                  />
                ) : (
                  <Input
                    placeholder={
                      activeCategory === 'restaurants' ? 'e.g., Chipotle - Love their carnitas bowls' :
                      activeCategory === 'movies' ? 'e.g., Inception - Mind-bending thriller' :
                      activeCategory === 'music' ? 'e.g., Taylor Swift - Favorite artist' :
                      activeCategory === 'books' ? 'e.g., The Alchemist by Paulo Coelho' :
                      activeCategory === 'hobbies' ? 'e.g., Photography, hiking on weekends' :
                      activeCategory === 'travel' ? 'e.g., Tokyo, Japan - Dream destination' :
                      activeCategory === 'style' ? 'e.g., Casual streetwear, love Nike and Adidas' :
                      'e.g., Coffee - Can\'t start my day without it'
                    }
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    onKeyPress={handleKeyPress}
                    data-testid="input-journal-entry"
                  />
                )}
              </div>
              <Button 
                onClick={handleAddItem}
                disabled={!newItem.trim() || saveEntryMutation.isPending}
                className="gap-2 flex-shrink-0"
                data-testid="button-add-entry"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add</span>
              </Button>
            </div>

            <Separator />

            {/* Entries List */}
            <ScrollArea className="h-[300px] sm:h-[400px] lg:h-[calc(90vh-380px)]">
              {isLoading ? (
                <div className="text-center py-12 text-muted-foreground">
                  Loading your journal...
                </div>
              ) : filteredEntries.length > 0 ? (
                <div className="space-y-2 pr-4">
                  {filteredEntries.map((item, filteredIndex) => {
                    // Support both old string format and new rich entry format
                    const isRichEntry = typeof item === 'object' && item !== null;
                    const text = isRichEntry ? item.text : item;
                    const media = isRichEntry ? item.media : null;
                    const timestamp = isRichEntry ? item.timestamp : null;
                    const keywords = isRichEntry ? item.keywords : null;
                    
                    // Find original index for removal
                    const originalIndex = journalData[activeCategory]?.indexOf(item) ?? -1;
                    
                    return (
                      <Card 
                        key={filteredIndex} 
                        className="hover-elevate cursor-default group"
                        data-testid={`journal-entry-${filteredIndex}`}
                      >
                        <CardContent className="p-3 sm:p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex-1 min-w-0 space-y-2">
                              {timestamp && (
                                <div className="text-xs text-muted-foreground">
                                  {new Date(timestamp).toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric', 
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </div>
                              )}
                              <p className="text-sm sm:text-base break-words whitespace-pre-wrap">
                                {text}
                              </p>
                              {media && media.length > 0 && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mt-3 sm:mt-4">
                                  {media.map((m, idx) => (
                                    <div key={idx} className="relative aspect-square rounded-md overflow-hidden bg-muted">
                                      {m.type === 'video' ? (
                                        <video 
                                          src={m.url} 
                                          className="w-full h-full object-cover"
                                          controls
                                        />
                                      ) : (
                                        <img 
                                          src={m.url} 
                                          alt={`Media ${idx + 1}`}
                                          className="w-full h-full object-cover"
                                        />
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                              {keywords && keywords.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {keywords.map((kw, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs">
                                      {kw}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                              onClick={() => handleRemoveItem(originalIndex)}
                              data-testid={`button-remove-${filteredIndex}`}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className={`mx-auto w-16 h-16 rounded-full bg-gradient-to-br ${currentCategory?.color} opacity-20 flex items-center justify-center mb-4`}>
                    {currentCategory && <currentCategory.icon className="w-8 h-8" />}
                  </div>
                  {hasActiveFilters ? (
                    <>
                      <h3 className="text-lg font-medium mb-2">No matching entries</h3>
                      <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
                        No entries match your current filters. Try adjusting or clearing your filters.
                      </p>
                      <Button variant="outline" size="sm" onClick={clearFilters} data-testid="button-clear-filters-empty">
                        Clear Filters
                      </Button>
                    </>
                  ) : (
                    <>
                      <h3 className="text-lg font-medium mb-2">No entries yet</h3>
                      <p className="text-sm text-muted-foreground max-w-md mx-auto">
                        Start capturing your thoughts and preferences. This helps personalize your experience!
                      </p>
                    </>
                  )}
                </div>
              )}
            </ScrollArea>

            {/* Save indicator */}
            {saveEntryMutation.isPending && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <div className="animate-spin">
                  <Save className="w-4 h-4" />
                </div>
                Saving...
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
    </TabsContent>

    {/* AI Prompts Tab */}
    <TabsContent value="prompts" className="flex-1 overflow-auto m-0">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-primary" />
              One-Click AI Prompts
            </CardTitle>
            <CardDescription>
              Get personalized journal prompts based on your activities, tasks, and recent entries
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={() => generatePromptMutation.mutate()}
              disabled={generatePromptMutation.isPending}
              className="w-full gap-2"
              data-testid="button-generate-prompt"
            >
              {generatePromptMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating personalized prompt...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Personalized Prompt
                </>
              )}
            </Button>

            {generatedPrompt && (
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-4 space-y-4">
                  <p className="text-lg italic">"{generatedPrompt}"</p>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyPrompt(generatedPrompt)}
                      className="gap-2"
                    >
                      {copiedPrompt === generatedPrompt ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      Copy
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleUsePromptInJournal(generatedPrompt)}
                      className="gap-2"
                    >
                      <PenTool className="w-4 h-4" />
                      Write Response
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </div>
    </TabsContent>

    {/* Themed Packs Tab */}
    <TabsContent value="packs" className="flex-1 overflow-auto m-0">
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Themed Journal Packs</h2>
          <p className="text-muted-foreground">Curated prompts for focused self-reflection</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {packsData?.packs?.map((pack) => {
            const PackIcon = getPackIcon(pack.icon);
            return (
              <Card
                key={pack.id}
                className="hover-elevate cursor-pointer transition-all"
                onClick={() => setSelectedPack(pack)}
                data-testid={`pack-${pack.id}`}
              >
                <CardHeader className="pb-2">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${pack.color} text-white flex items-center justify-center mb-2`}>
                    <PackIcon className="w-6 h-6" />
                  </div>
                  <CardTitle className="text-lg">{pack.name}</CardTitle>
                  <CardDescription>{pack.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge variant="secondary">{pack.prompts.length} prompts</Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Selected Pack Dialog */}
        {selectedPack && (
          <Dialog open={!!selectedPack} onOpenChange={() => setSelectedPack(null)}>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {(() => {
                    const PackIcon = getPackIcon(selectedPack.icon);
                    return <PackIcon className="w-5 h-5" />;
                  })()}
                  {selectedPack.name}
                </DialogTitle>
                <DialogDescription>{selectedPack.description}</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                {selectedPack.prompts.map((prompt, idx) => (
                  <Card key={idx} className="hover-elevate">
                    <CardContent className="p-4">
                      <p className="text-sm mb-3">{prompt}</p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyPrompt(prompt)}
                        >
                          {copiedPrompt === prompt ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            handleUsePromptInJournal(prompt);
                            setSelectedPack(null);
                          }}
                        >
                          Use This
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </TabsContent>

    {/* Templates Tab */}
    <TabsContent value="templates" className="flex-1 overflow-auto m-0">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Custom Templates</h2>
            <p className="text-muted-foreground text-sm">Create reusable journal structures</p>
          </div>
          <Button onClick={() => setShowTemplateDialog(true)} className="gap-2" data-testid="button-create-template">
            <Plus className="w-4 h-4" />
            New Template
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templatesData?.templates?.map((template) => (
            <Card key={template.id} className="hover-elevate">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <CardDescription>{template.description || 'Custom template'}</CardDescription>
                  </div>
                  {!template.isDefault && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteTemplateMutation.mutate(template.id)}
                      data-testid={`delete-template-${template.id}`}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {template.prompts.slice(0, 3).map((prompt, idx) => (
                    <p key={idx} className="text-sm text-muted-foreground truncate">
                      {idx + 1}. {prompt}
                    </p>
                  ))}
                  {template.prompts.length > 3 && (
                    <p className="text-xs text-muted-foreground">+{template.prompts.length - 3} more prompts</p>
                  )}
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-3 w-full"
                  onClick={() => {
                    template.prompts.forEach(p => handleUsePromptInJournal(p));
                  }}
                >
                  Use Template
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </TabsContent>

    {/* Insights Tab */}
    <TabsContent value="insights" className="flex-1 overflow-auto m-0">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold">Your Journal Insights</h2>
          <p className="text-muted-foreground">Data visualizations and AI-powered analysis</p>
        </div>

        {statsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : statsData ? (
          <>
            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4 text-center">
                  <div className="text-3xl font-bold text-primary">{statsData.stats?.totalEntries || 0}</div>
                  <p className="text-sm text-muted-foreground">Total Entries</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <div className="text-3xl font-bold text-emerald-500">{statsData.stats?.completedTasks || 0}</div>
                  <p className="text-sm text-muted-foreground">Tasks Completed</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <div className="text-3xl font-bold text-amber-500">{statsData.stats?.journalingStreak || 0}</div>
                  <p className="text-sm text-muted-foreground">Day Streak</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <div className="text-3xl font-bold text-blue-500">{statsData.stats?.totalActivities || 0}</div>
                  <p className="text-sm text-muted-foreground">Activities</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Entries by Category */}
              {statsData.charts?.entriesByCategory && statsData.charts.entriesByCategory.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Entries by Category</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={statsData.charts.entriesByCategory}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {statsData.charts.entriesByCategory.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Activity Progress */}
              {statsData.charts?.activityProgress && statsData.charts.activityProgress.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Activity Progress</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {statsData.charts.activityProgress.slice(0, 5).map((activity, idx) => (
                      <div key={idx}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="truncate max-w-[70%]">{activity.name}</span>
                          <span className="text-muted-foreground">{activity.completed}/{activity.total}</span>
                        </div>
                        <Progress value={activity.progress} className="h-2" />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* 7-Day Activity */}
              {statsData.charts?.last7Days && statsData.charts.last7Days.length > 0 && (
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-base">Last 7 Days Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={statsData.charts.last7Days}>
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="entries" fill="#8b5cf6" name="Entries" />
                        <Bar dataKey="tasks" fill="#22c55e" name="Tasks" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* AI Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  AI-Powered Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => getSummaryMutation.mutate()}
                  disabled={getSummaryMutation.isPending}
                  className="w-full gap-2"
                  data-testid="button-get-summary"
                >
                  {getSummaryMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analyzing your journal...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate AI Summary
                    </>
                  )}
                </Button>

                {getSummaryMutation.data?.summary && (
                  <div className="mt-4 space-y-4">
                    <div className="p-4 bg-primary/5 rounded-lg">
                      <h4 className="font-medium mb-2">Key Themes</h4>
                      <div className="flex flex-wrap gap-2">
                        {getSummaryMutation.data.summary.themes.map((theme: string, idx: number) => (
                          <Badge key={idx} variant="secondary">{theme}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <h4 className="font-medium mb-2">Insights</h4>
                      <p className="text-sm text-muted-foreground">{getSummaryMutation.data.summary.insights}</p>
                    </div>
                    {getSummaryMutation.data.summary.recommendations?.length > 0 && (
                      <div className="p-4 bg-emerald-500/10 rounded-lg">
                        <h4 className="font-medium mb-2">Recommendations</h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {getSummaryMutation.data.summary.recommendations.map((rec: string, idx: number) => (
                            <li key={idx} className="flex gap-2">
                              <Target className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No data available yet. Start journaling to see your insights!</p>
          </div>
        )}
      </div>
    </TabsContent>
  </Tabs>

  {/* Add Custom Category Dialog */}
  <Dialog open={showAddCategoryDialog} onOpenChange={setShowAddCategoryDialog}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Add Custom Category</DialogTitle>
        <DialogDescription>
          Create a new category to organize your journal entries.
        </DialogDescription>
      </DialogHeader>
      
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Category Name</label>
          <Input
            placeholder="e.g., Goals, Dreams, Quotes..."
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddCustomCategory()}
            data-testid="input-category-name"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Color</label>
          <div className="flex gap-2 flex-wrap">
            {colorOptions.map((color) => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                className={`w-10 h-10 rounded-lg bg-gradient-to-br ${color} ${
                  selectedColor === color ? 'ring-2 ring-offset-2 ring-primary' : ''
                } transition-all`}
                data-testid={`color-${color}`}
              />
            ))}
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button
          variant="outline"
          onClick={() => {
            setShowAddCategoryDialog(false);
            setNewCategoryName('');
            setSelectedColor('from-teal-500 to-cyan-500');
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleAddCustomCategory}
          disabled={!newCategoryName.trim() || saveCustomCategoryMutation.isPending}
          data-testid="button-create-category"
        >
          {saveCustomCategoryMutation.isPending ? 'Creating...' : 'Create Category'}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  {/* Create Template Dialog */}
  <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Create Custom Template</DialogTitle>
        <DialogDescription>
          Build a reusable set of prompts for your journaling practice.
        </DialogDescription>
      </DialogHeader>
      
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Template Name</label>
          <Input
            placeholder="e.g., Morning Reflection, Weekly Review..."
            value={newTemplateName}
            onChange={(e) => setNewTemplateName(e.target.value)}
            data-testid="input-template-name"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Prompts</label>
          {newTemplatePrompts.map((prompt, idx) => (
            <div key={idx} className="flex gap-2">
              <Input
                placeholder={`Prompt ${idx + 1}`}
                value={prompt}
                onChange={(e) => {
                  const updated = [...newTemplatePrompts];
                  updated[idx] = e.target.value;
                  setNewTemplatePrompts(updated);
                }}
                data-testid={`input-prompt-${idx}`}
              />
              {newTemplatePrompts.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setNewTemplatePrompts(newTemplatePrompts.filter((_, i) => i !== idx))}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setNewTemplatePrompts([...newTemplatePrompts, ''])}
            className="w-full gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Prompt
          </Button>
        </div>
      </div>

      <DialogFooter>
        <Button
          variant="outline"
          onClick={() => {
            setShowTemplateDialog(false);
            setNewTemplateName('');
            setNewTemplatePrompts(['']);
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={() => createTemplateMutation.mutate({
            name: newTemplateName,
            prompts: newTemplatePrompts.filter(p => p.trim()),
          })}
          disabled={!newTemplateName.trim() || newTemplatePrompts.every(p => !p.trim()) || createTemplateMutation.isPending}
          data-testid="button-save-template"
        >
          {createTemplateMutation.isPending ? 'Creating...' : 'Create Template'}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
  </div>
  );
}
