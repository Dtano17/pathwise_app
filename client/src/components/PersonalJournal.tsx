import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { 
  BookOpen, Coffee, Film, Music, MapPin, Heart, Star, 
  Save, Plus, X, Utensils, Palette, Book, Sparkles,
  Plane, Home, ShoppingBag, Gamepad2, Folder
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

export default function PersonalJournal({ onClose }: PersonalJournalProps) {
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState<string>('restaurants');
  const [newItem, setNewItem] = useState('');
  const [journalData, setJournalData] = useState<Record<string, JournalItem[]>>({});
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);
  const [showAddCategoryDialog, setShowAddCategoryDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedColor, setSelectedColor] = useState('from-teal-500 to-cyan-500');

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

  return (
    <div className="h-full flex flex-col lg:flex-row gap-4 p-2 sm:p-4">
      {/* Sidebar - Categories */}
      <div className="w-full lg:w-64 flex-shrink-0">
        <Card className="border-none shadow-sm bg-card/50 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              My Journal
            </CardTitle>
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
              ) : journalData[activeCategory]?.length > 0 ? (
                <div className="space-y-2 pr-4">
                  {journalData[activeCategory].map((item, index) => {
                    // Support both old string format and new rich entry format
                    const isRichEntry = typeof item === 'object' && item !== null;
                    const text = isRichEntry ? item.text : item;
                    const media = isRichEntry ? item.media : null;
                    const timestamp = isRichEntry ? item.timestamp : null;
                    const keywords = isRichEntry ? item.keywords : null;
                    
                    return (
                      <Card 
                        key={index} 
                        className="hover-elevate cursor-default group"
                        data-testid={`journal-entry-${index}`}
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
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
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
                              onClick={() => handleRemoveItem(index)}
                              data-testid={`button-remove-${index}`}
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
                  <h3 className="text-lg font-medium mb-2">No entries yet</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Start capturing your thoughts and preferences. This helps personalize your experience!
                  </p>
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

      {/* Add Custom Category Dialog */}
      <Dialog open={showAddCategoryDialog} onOpenChange={setShowAddCategoryDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader backLabel="Back to Journal">
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
    </div>
  );
}
