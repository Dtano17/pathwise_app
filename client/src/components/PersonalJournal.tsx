import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
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
  Loader2, TrendingUp, PenTool, Copy, Check, RefreshCw, Trash2,
  Settings, Pencil, Merge, Link, Image, Eye, EyeOff, Calendar, ExternalLink,
  Dumbbell, Building2, TreePine, Wine, Clock, PenLine, Play, ShoppingCart,
  CalendarPlus, Globe, Phone, ClipboardList, PartyPopper, Briefcase,
  GraduationCap, Boxes, CheckCircle2, type LucideIcon
} from 'lucide-react';

// Venue type to icon mapping using Lucide icons
// This maps venueType values from the backend to appropriate Lucide icons
const venueTypeIcons: Record<string, LucideIcon> = {
  // Books & Reading
  book: BookOpen,
  biography: Book,
  novel: Book,
  memoir: Book,
  textbook: Book,
  bookstore: BookOpen,
  // Movies & Entertainment
  movie: Film,
  film: Film,
  movie_theater: Film,
  theater: Film,
  cinema: Film,
  screening: Film,
  // Music
  music: Music,
  artist: Music,
  album: Music,
  concert_venue: Music,
  concert: Music,
  // Fitness & Wellness
  exercise: Dumbbell,
  workout: Dumbbell,
  gym: Dumbbell,
  fitness: Dumbbell,
  yoga: Dumbbell,
  fitness_center: Dumbbell,
  yoga_studio: Dumbbell,
  spa: Heart,
  wellness: Heart,
  // Food & Drink
  restaurant: Utensils,
  cafe: Coffee,
  bar: Wine,
  wine_bar: Wine,
  nightclub: Music,
  pub: Wine,
  lounge: Coffee,
  bakery: Utensils,
  diner: Utensils,
  bistro: Utensils,
  eatery: Utensils,
  food_court: Utensils,
  // Travel & Places
  hotel: Building2,
  resort: Building2,
  museum: Building2,
  park: TreePine,
  beach: Plane,
  airport: Plane,
  attraction: Building2,
  landmark: Building2,
  hostel: Building2,
  airbnb: Building2,
  vacation_rental: Building2,
  // Shopping
  store: ShoppingBag,
  mall: ShoppingBag,
  boutique: ShoppingBag,
  fashion_store: ShoppingBag,
  // Default/Unknown
  unknown: MapPin,
  other: MapPin,
};
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line } from 'recharts';

// Category icons for smart rendering using Lucide
const categoryIconComponents: Record<string, LucideIcon> = {
  books: BookOpen,
  reading: BookOpen,
  restaurants: Utensils,
  food: Utensils,
  movies: Film,
  music: Music,
  travel: Plane,
  hobbies: Star,
  style: ShoppingBag,
  favorites: Star,
  notes: FileText,
};

// Smart text renderer that extracts and highlights titles, authors, etc.
function SmartTextRenderer({ text, category, sourceUrl }: { text: string; category?: string; sourceUrl?: string }) {
  const IconComponent = categoryIconComponents[category || ''] || null;
  
  // Check for "Inspired by" pattern
  const inspiredByMatch = text.match(/^Inspired\s+by\s+(.+?)(?:\s*[-–—]\s*(.*))?$/i);
  
  // Pattern: "Title" by Author - Description
  const quotedTitleMatch = text.match(/^(Read |Study |Complete |Watch |Listen to )?['"]([^'"]+)['"]/i);
  const byAuthorMatch = text.match(/\bby\s+([A-Z][a-zA-Z\s&.'-]+?)(?:\s*[-–—]\s*|\s*\(|\s*$)/i);
  const recommenderMatch = text.match(/\(([A-Z][a-zA-Z\s.']+(?:'s)?\s*(?:choice|pick|recommendation|favorite))\)/i);
  const dashSplit = text.split(/\s*[-–—]\s*/);
  const hasDescription = dashSplit.length > 1;
  
  // Handle "Inspired by" pattern
  if (inspiredByMatch) {
    const inspiredText = inspiredByMatch[1].trim();
    const descriptionPart = inspiredByMatch[2]?.trim() || '';
    
    return (
      <div className="space-y-1">
        <div className="flex items-start gap-2">
          {IconComponent && <IconComponent className="w-5 h-5 flex-shrink-0 text-muted-foreground" />}
          <div className="flex-1">
            <p className="text-sm sm:text-base">
              <span className="text-muted-foreground">Inspired by </span>
              {sourceUrl ? (
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-primary hover:underline"
                  data-testid="link-inspired-by"
                >
                  {inspiredText}
                  <ExternalLink className="w-3 h-3 inline ml-1" />
                </a>
              ) : (
                <span className="font-semibold text-foreground">{inspiredText}</span>
              )}
            </p>
          </div>
        </div>
        {descriptionPart && (
          <p className="text-sm text-muted-foreground pl-7">{descriptionPart}</p>
        )}
      </div>
    );
  }
  
  if (quotedTitleMatch || byAuthorMatch) {
    let titlePart = '';
    let authorPart = '';
    let descriptionPart = '';
    let prefix = '';
    
    if (quotedTitleMatch) {
      prefix = quotedTitleMatch[1] || '';
      titlePart = quotedTitleMatch[2];
      const afterTitle = text.slice(quotedTitleMatch[0].length);
      const authorInRest = afterTitle.match(/^\s*by\s+([A-Z][a-zA-Z\s&.'-]+?)(?:\s*[-–—]\s*|\s*\(|\s*$)/i);
      if (authorInRest) {
        authorPart = authorInRest[1].trim();
        descriptionPart = afterTitle.slice(authorInRest[0].length).replace(/^\s*[-–—]\s*/, '').trim();
      } else if (hasDescription) {
        descriptionPart = dashSplit.slice(1).join(' - ').trim();
      }
    } else if (byAuthorMatch && hasDescription) {
      const beforeBy = text.split(/\s+by\s+/i)[0];
      titlePart = beforeBy.replace(/^(Read |Study |Complete |Watch |Listen to )/i, '');
      prefix = text.match(/^(Read |Study |Complete |Watch |Listen to )/i)?.[1] || '';
      authorPart = byAuthorMatch[1].trim();
      const dashIndex = text.indexOf(' - ');
      if (dashIndex > -1) descriptionPart = text.slice(dashIndex + 3).trim();
    }
    
    const recommenderInDesc = descriptionPart.match(/\(([A-Z][a-zA-Z\s.']+(?:'s)?\s*(?:choice|pick|recommendation|favorite))\)/i);
    let recommender = '';
    if (recommenderInDesc) {
      recommender = recommenderInDesc[1];
      descriptionPart = descriptionPart.replace(recommenderInDesc[0], '').trim();
    } else if (recommenderMatch) {
      recommender = recommenderMatch[1];
    }
    
    return (
      <div className="space-y-1">
        <div className="flex items-start gap-2">
          {IconComponent && <IconComponent className="w-5 h-5 flex-shrink-0 text-muted-foreground" />}
          <div className="flex-1">
            <p className="text-sm sm:text-base">
              {prefix && <span className="text-muted-foreground">{prefix}</span>}
              <span className="font-semibold text-foreground">{titlePart}</span>
              {authorPart && (
                <>
                  <span className="text-muted-foreground"> by </span>
                  <span className="font-medium text-primary/80">{authorPart}</span>
                </>
              )}
            </p>
            {recommender && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                <Star className="w-3 h-3 inline mr-1" />{recommender}
              </p>
            )}
          </div>
        </div>
        {descriptionPart && (
          <p className="text-sm text-muted-foreground pl-7">{descriptionPart}</p>
        )}
      </div>
    );
  }
  
  return (
    <div className="flex items-start gap-2">
      {IconComponent && <IconComponent className="w-5 h-5 flex-shrink-0 text-muted-foreground" />}
      <p className="text-sm sm:text-base break-words whitespace-pre-wrap flex-1">{text}</p>
    </div>
  );
}

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
  subcategory?: string;

  // Web enrichment data
  webEnrichment?: {
    venueVerified?: boolean;
    venueType?: string;
    venueName?: string;
    venueDescription?: string;
    location?: {
      address?: string;
      city?: string;
      neighborhood?: string;
      country?: string;
      directionsUrl?: string;
    };
    priceRange?: '$' | '$$' | '$$$' | '$$$$';
    rating?: number;
    reviewCount?: number;
    businessHours?: string;
    phone?: string;
    website?: string;
    reservationUrl?: string;
    primaryImageUrl?: string;
    mediaUrls?: Array<{ url: string; type: 'image' | 'video'; source?: string }>;
    suggestedCategory?: string;
    enrichedAt?: string;
    
    // Book-specific
    author?: string;
    publisher?: string;
    publicationYear?: string;
    purchaseLinks?: Array<{ platform: string; url: string }>;
    
    // Movie-specific
    director?: string;
    releaseYear?: string;
    runtime?: string;
    genre?: string;
    streamingLinks?: Array<{ platform: string; url: string }>;
    
    // Fitness-specific
    muscleGroups?: string[];
    difficulty?: string;
    duration?: string;
    equipment?: string[];

    // Travel-specific (hotels, museums, attractions)
    highlights?: string[];
    amenities?: string[];

    // Shopping-specific (stores, boutiques)
    productCategories?: string[];
  };
}

type JournalItem = string | RichJournalEntry;

interface CustomCategory {
  id: string;
  name: string;
  label?: string;
  emoji?: string;
  color: string;
}

interface PersonalJournalProps {
  onClose?: () => void;
}

interface JournalSettings {
  showDeleteCategory: boolean;
  showRenameCategory: boolean;
  showMergeCategories: boolean;
  showEditCategoryIcon: boolean;
  showEntryCount: boolean;
  showFilters: boolean;
  showSubcategories: boolean;
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
  const [showDeleteCategoryDialog, setShowDeleteCategoryDialog] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<CustomCategory | null>(null);
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
  const [subcategoryFilter, setSubcategoryFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [ratingFilter, setRatingFilter] = useState<string>('all');
  const [genreFilter, setGenreFilter] = useState<string>('all');
  
  // Journal settings state
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [journalSettings, setJournalSettings] = useState<JournalSettings>({
    showDeleteCategory: true,
    showRenameCategory: true,
    showMergeCategories: false,
    showEditCategoryIcon: true,
    showEntryCount: true,
    showFilters: true,
    showSubcategories: true,
  });
  
  // Rename category states
  const [showRenameCategoryDialog, setShowRenameCategoryDialog] = useState(false);
  const [categoryToRename, setCategoryToRename] = useState<CustomCategory | null>(null);
  const [newCategoryLabel, setNewCategoryLabel] = useState('');

  // Smart icon mapping for custom categories based on name/keywords
  const getIconForCategoryName = (name: string): LucideIcon => {
    const lowerName = name.toLowerCase();

    // Planning & Productivity
    if (lowerName.includes('plan') || lowerName.includes('planner')) return ClipboardList;
    if (lowerName.includes('todo') || lowerName.includes('task')) return CheckCircle2;
    if (lowerName.includes('goal') || lowerName.includes('target')) return Target;

    // Social & Community
    if (lowerName.includes('community') || lowerName.includes('social')) return Users;
    if (lowerName.includes('friend') || lowerName.includes('people')) return Heart;

    // Entertainment & Recreation
    if (lowerName.includes('entertainment') || lowerName.includes('entertain')) return PartyPopper;
    if (lowerName.includes('recreation') || lowerName.includes('fun') || lowerName.includes('game')) return Gamepad2;
    if (lowerName.includes('movie') || lowerName.includes('film') || lowerName.includes('tv')) return Film;

    // Work & Professional
    if (lowerName.includes('work') || lowerName.includes('career') || lowerName.includes('job')) return Briefcase;
    if (lowerName.includes('business') || lowerName.includes('office')) return Building2;
    if (lowerName.includes('application') || lowerName.includes('app')) return Package;

    // Organization & Management
    if (lowerName.includes('organization') || lowerName.includes('organize')) return Boxes;
    if (lowerName.includes('management') || lowerName.includes('manage')) return Settings;
    if (lowerName.includes('admin') || lowerName.includes('system')) return BarChart3;

    // Personal Development
    if (lowerName.includes('learning') || lowerName.includes('education') || lowerName.includes('study')) return GraduationCap;
    if (lowerName.includes('accountability') || lowerName.includes('habit')) return CheckCircle2;
    if (lowerName.includes('growth') || lowerName.includes('development')) return TrendingUp;

    // Health & Fitness
    if (lowerName.includes('fitness') || lowerName.includes('workout') || lowerName.includes('exercise')) return Dumbbell;
    if (lowerName.includes('health') || lowerName.includes('wellness')) return Heart;

    // Default fallback
    return Folder;
  };

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

  // Batch enrich entries mutation
  const batchEnrichMutation = useMutation({
    mutationFn: async (force: boolean = false) => {
      const response = await apiRequest('POST', '/api/user/journal/batch-enrich', { force });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/user-preferences'] });
      toast({
        title: "Enrichment Complete",
        description: data.message || `Successfully enriched entries.`,
      });
    },
    onError: (error: any) => {
      console.error('Batch enrichment error:', error);
      toast({
        title: "Enrichment Failed",
        description: "Could not perform batch enrichment. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Load user's journal data  (now supports rich media entries)
  const { data: userData, isLoading } = useQuery({
    queryKey: ['/api/user-preferences'],
    queryFn: async () => {
      const response = await fetch('/api/user-preferences');
      if (!response.ok) throw new Error('Failed to load preferences');
      const data = await response.json();
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Sync local state with query data whenever it updates
  useEffect(() => {
    if (userData?.preferences?.journalData) {
      setJournalData(userData.preferences.journalData);
    }
    if (userData?.preferences?.customJournalCategories) {
      // Handle both object format (from smart categorization) and array format (from manual creation)
      const rawCategories = userData.preferences.customJournalCategories;
      if (Array.isArray(rawCategories)) {
        setCustomCategories(rawCategories);
      } else if (typeof rawCategories === 'object') {
        // Convert object format { categoryId: { id, label, emoji, color } } to array
        const categoriesArray = Object.values(rawCategories).map((cat: any) => ({
          id: cat.id,
          name: cat.label || cat.name || cat.id,
          label: cat.label,
          emoji: cat.emoji,
          color: cat.color || 'from-teal-500 to-cyan-500'
        }));
        setCustomCategories(categoriesArray);
      }
    }
    // Load journal settings from preferences
    if (userData?.preferences?.journalSettings) {
      setJournalSettings(prev => ({
        ...prev,
        ...userData.preferences.journalSettings
      }));
    }
  }, [userData]);

  // Reset subcategory filter when category changes
  useEffect(() => {
    setSubcategoryFilter('all');
  }, [activeCategory]);

  // Merge default and custom categories (custom categories display with emoji and smart icons)
  const allCategories = useMemo(() => [
    ...categories.map(c => ({ ...c, isCustom: false, emoji: undefined as string | undefined })),
    ...customCategories.map(c => ({
      id: c.id,
      label: c.emoji ? `${c.emoji} ${c.label || c.name}` : (c.label || c.name),
      icon: getIconForCategoryName(c.label || c.name), // Use smart icon mapping
      color: c.color,
      isCustom: true,
      emoji: c.emoji
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [customCategories]);

  const currentCategory = useMemo(
    () => allCategories.find(c => c.id === activeCategory),
    [allCategories, activeCategory]
  );

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

  // Delete custom category mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      // Remove the category from the list
      const updatedCategories = customCategories.filter(c => c.id !== categoryId);
      const response = await apiRequest('PUT', '/api/user/journal/custom-categories', {
        customJournalCategories: updatedCategories
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user-preferences'] });
      setShowDeleteCategoryDialog(false);
      setCategoryToDelete(null);
      // If we deleted the active category, switch to default
      if (categoryToDelete && activeCategory === categoryToDelete.id) {
        setActiveCategory('restaurants');
      }
      toast({
        title: "Category Deleted",
        description: "The category and its entries have been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to Delete",
        description: "Could not delete category. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Save journal settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (settings: JournalSettings) => {
      const response = await apiRequest('PUT', '/api/user/journal/settings', {
        journalSettings: settings
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user-preferences'] });
      toast({
        title: "Settings Saved",
        description: "Your journal settings have been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to Save",
        description: "Could not save settings. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Rename custom category mutation
  const renameCategoryMutation = useMutation({
    mutationFn: async ({ categoryId, newName }: { categoryId: string; newName: string }) => {
      const updatedCategories = customCategories.map(c => 
        c.id === categoryId ? { ...c, name: newName, label: newName } : c
      );
      const response = await apiRequest('PUT', '/api/user/journal/custom-categories', {
        customJournalCategories: updatedCategories
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user-preferences'] });
      setShowRenameCategoryDialog(false);
      setCategoryToRename(null);
      setNewCategoryLabel('');
      toast({
        title: "Category Renamed",
        description: "The category has been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to Rename",
        description: "Could not rename category. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Handle settings toggle
  const handleSettingToggle = (setting: keyof JournalSettings) => {
    const newSettings = { ...journalSettings, [setting]: !journalSettings[setting] };
    setJournalSettings(newSettings);
    saveSettingsMutation.mutate(newSettings);
  };

  // New feature queries
  const { data: packsData } = useQuery<{ packs: JournalPack[] }>({
    queryKey: ['/api/journal/packs'],
    enabled: activeTab === 'packs',
    staleTime: 30 * 60 * 1000, // 30 minutes - packs rarely change
  });

  const { data: statsData, isLoading: statsLoading } = useQuery<JournalStats>({
    queryKey: ['/api/journal/stats'],
    enabled: activeTab === 'insights',
    staleTime: 10 * 60 * 1000, // 10 minutes - stats update less frequently
  });

  const { data: templatesData } = useQuery<{ templates: JournalTemplate[] }>({
    queryKey: ['/api/journal/templates'],
    enabled: activeTab === 'templates',
    staleTime: 30 * 60 * 1000, // 30 minutes - templates rarely change
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

  // AI Smart Enrichment mutation - Uses AI to recommend best API for each entry
  const smartEnrichMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/journal/entries/enrich/batch-smart', {
        forceAll: false // Only re-enrich low-confidence entries
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/journal/entries'] });
      toast({
        title: "AI Enrichment Complete!",
        description: `Successfully enriched ${data.processed} journal entries with AI-powered image search.`,
      });
    },
    onError: () => {
      toast({
        title: "Enrichment Failed",
        description: "Could not enrich journal entries. Please try again.",
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

  // Web enrichment mutation for loading details
  const enrichEntryMutation = useMutation({
    mutationFn: async ({ category }: { category: string }) => {
      console.log('[ENRICH] Starting enrichment for category:', category);
      const response = await apiRequest('POST', '/api/user/journal/web-enrich', {
        categories: [category],
        forceRefresh: true
      });
      const data = await response.json();
      console.log('[ENRICH] Response:', data);
      return data;
    },
    onSuccess: (data) => {
      console.log('[ENRICH] Success - enriched:', data.enriched);
      queryClient.invalidateQueries({ queryKey: ['/api/user-preferences'] });
      toast({
        title: "Details loaded!",
        description: `Enriched ${data.enriched || 0} entries with web data.`,
      });
    },
    onError: (error) => {
      console.error('[ENRICH] Error:', error);
      toast({
        title: "Enrichment failed",
        description: "Could not load details from web. Try again later.",
        variant: "destructive"
      });
    }
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

  const handleAddCustomCategory = useCallback(() => {
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
  }, [newCategoryName, selectedColor, customCategories, saveCustomCategoryMutation, toast]);

  const handleAddItem = useCallback(() => {
    if (!newItem.trim()) return;

    const updatedItems = [...(journalData[activeCategory] || []), newItem.trim()];
    setJournalData(prev => ({ ...prev, [activeCategory]: updatedItems }));
    setNewItem('');

    // Auto-save
    saveEntryMutation.mutate({ category: activeCategory, items: updatedItems });
  }, [newItem, journalData, activeCategory, saveEntryMutation]);

  const handleRemoveItem = useCallback((index: number) => {
    const updatedItems = journalData[activeCategory].filter((_, i) => i !== index);
    setJournalData(prev => ({ ...prev, [activeCategory]: updatedItems }));

    // Auto-save
    saveEntryMutation.mutate({ category: activeCategory, items: updatedItems });
  }, [journalData, activeCategory, saveEntryMutation]);

  const handleToggleCompleted = useCallback((index: number) => {
    const items = journalData[activeCategory];
    if (!items) return;

    const updatedItems = items.map((item, i) => {
      if (i === index) {
        if (typeof item === 'object' && item !== null) {
          const newCompleted = !item.completed;
          return {
            ...item,
            completed: newCompleted,
            completedAt: newCompleted ? new Date().toISOString() : undefined
          };
        }
      }
      return item;
    });

    setJournalData(prev => ({ ...prev, [activeCategory]: updatedItems }));

    // Auto-save
    saveEntryMutation.mutate({ category: activeCategory, items: updatedItems });
  }, [journalData, activeCategory, saveEntryMutation]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddItem();
    }
  }, [handleAddItem]);

  // Extract unique locations from all journal entries across all categories (including web enrichment data)
  const uniqueLocations = useMemo(() => {
    const locations = new Set<string>();
    Object.values(journalData).forEach(items => {
      items.forEach(item => {
        if (typeof item === 'object' && item !== null) {
          // Check direct location field
          if (item.location) {
            if (item.location.city) locations.add(item.location.city);
            if (item.location.country) locations.add(item.location.country);
            if (item.location.neighborhood) locations.add(item.location.neighborhood);
          }
          // Check webEnrichment location data
          if (item.webEnrichment?.location) {
            if (item.webEnrichment.location.city) locations.add(item.webEnrichment.location.city);
            if (item.webEnrichment.location.neighborhood) locations.add(item.webEnrichment.location.neighborhood);
          }
        }
      });
    });
    return Array.from(locations).sort();
  }, [journalData]);

  // Extract unique subcategories from entries in the current category
  const uniqueSubcategories = useMemo(() => {
    const subcategories = new Set<string>();
    const entries = journalData[activeCategory] || [];
    entries.forEach(item => {
      if (typeof item === 'object' && item !== null && item.subcategory) {
        subcategories.add(item.subcategory);
      }
    });
    return Array.from(subcategories).sort();
  }, [journalData, activeCategory]);

  // Extract unique genres from entries (for movies/TV shows)
  const uniqueGenres = useMemo(() => {
    const genres = new Set<string>();
    const entries = journalData[activeCategory] || [];
    entries.forEach(item => {
      if (typeof item === 'object' && item !== null && item.webEnrichment?.genre) {
        // Parse comma-separated genres
        const genreList = item.webEnrichment.genre.split(',').map((g: string) => g.trim());
        genreList.forEach((genre: string) => {
          if (genre) genres.add(genre);
        });
      }
    });
    return Array.from(genres).sort();
  }, [journalData, activeCategory]);

  // Budget tier labels
  const budgetTierLabels: Record<string, string> = {
    'budget': 'Budget ($)',
    'moderate': 'Moderate ($$)',
    'luxury': 'Luxury ($$$)',
    'ultra_luxury': 'Ultra Luxury ($$$$)'
  };

  // Map priceRange symbols to budget tier names
  const priceRangeToBudgetTier: Record<string, string> = {
    '$': 'budget',
    '$$': 'moderate',
    '$$$': 'luxury',
    '$$$$': 'ultra_luxury'
  };

  // Filter current category entries
  const filteredEntries = useMemo(() => {
    const entries = journalData[activeCategory] || [];
    return entries.filter(item => {
      // String entries pass through if no filters are active
      if (typeof item === 'string') {
        return locationFilter === 'all' && budgetFilter === 'all' && subcategoryFilter === 'all' && dateFilter === 'all';
      }

      // Check location filter (including webEnrichment location)
      if (locationFilter !== 'all') {
        const directLocation = item.location;
        const enrichedLocation = item.webEnrichment?.location;
        const matchesLocation = 
          (directLocation && (
            directLocation.city === locationFilter ||
            directLocation.country === locationFilter ||
            directLocation.neighborhood === locationFilter
          )) ||
          (enrichedLocation && (
            enrichedLocation.city === locationFilter ||
            enrichedLocation.neighborhood === locationFilter
          ));
        if (!matchesLocation) return false;
      }

      // Check budget filter (from direct budgetTier OR webEnrichment priceRange)
      if (budgetFilter !== 'all') {
        const directBudgetTier = item.budgetTier;
        const enrichedPriceRange = item.webEnrichment?.priceRange;
        const enrichedBudgetTier = enrichedPriceRange ? priceRangeToBudgetTier[enrichedPriceRange] : null;
        
        if (directBudgetTier !== budgetFilter && enrichedBudgetTier !== budgetFilter) {
          return false;
        }
      }

      // Check subcategory filter
      if (subcategoryFilter !== 'all') {
        if (item.subcategory !== subcategoryFilter) return false;
      }

      // Check genre filter (for movies/TV shows)
      if (genreFilter !== 'all') {
        const itemGenres = item.webEnrichment?.genre;
        if (!itemGenres) return false;
        // Check if the selected genre exists in the comma-separated list
        const genreList = itemGenres.split(',').map((g: string) => g.trim());
        if (!genreList.includes(genreFilter)) return false;
      }

      // Check rating filter (from webEnrichment rating)
      if (ratingFilter !== 'all') {
        const rating = item.webEnrichment?.rating;
        if (!rating) return false;
        const minRating = parseFloat(ratingFilter);
        if (rating < minRating) return false;
      }

      // Check date filter
      if (dateFilter !== 'all' && item.timestamp) {
        const entryDate = new Date(item.timestamp);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (dateFilter === 'today') {
          const entryDay = new Date(entryDate);
          entryDay.setHours(0, 0, 0, 0);
          if (entryDay.getTime() !== today.getTime()) return false;
        } else if (dateFilter === 'week') {
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          if (entryDate < weekAgo) return false;
        } else if (dateFilter === 'month') {
          const monthAgo = new Date(today);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          if (entryDate < monthAgo) return false;
        } else if (dateFilter === 'year') {
          const yearAgo = new Date(today);
          yearAgo.setFullYear(yearAgo.getFullYear() - 1);
          if (entryDate < yearAgo) return false;
        }
      }

      return true;
    });
  }, [journalData, activeCategory, locationFilter, budgetFilter, subcategoryFilter, dateFilter, ratingFilter, genreFilter]);

  const hasActiveFilters = locationFilter !== 'all' || budgetFilter !== 'all' || subcategoryFilter !== 'all' || dateFilter !== 'all' || ratingFilter !== 'all' || genreFilter !== 'all';

  const clearFilters = useCallback(() => {
    setLocationFilter('all');
    setBudgetFilter('all');
    setGenreFilter('all');
    setSubcategoryFilter('all');
    setDateFilter('all');
    setRatingFilter('all');
  }, []);

  return (
    <div className="h-full flex flex-col p-2 sm:p-4">
      {/* Feature Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="flex items-center gap-2 mb-4">
          <TabsList className="flex-1 flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="journal" className="flex-1 gap-2 min-h-[44px]" data-testid="tab-journal">
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">Journal</span>
            </TabsTrigger>
            <TabsTrigger value="prompts" className="flex-1 gap-2 min-h-[44px]" data-testid="tab-prompts">
              <Wand2 className="w-4 h-4" />
              <span className="hidden sm:inline">AI Prompts</span>
            </TabsTrigger>
            <TabsTrigger value="packs" className="flex-1 gap-2 min-h-[44px]" data-testid="tab-packs">
              <Package className="w-4 h-4" />
              <span className="hidden sm:inline">Packs</span>
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex-1 gap-2 min-h-[44px]" data-testid="tab-templates">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Templates</span>
            </TabsTrigger>
            <TabsTrigger value="insights" className="flex-1 gap-2 min-h-[44px]" data-testid="tab-insights">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Insights</span>
            </TabsTrigger>
          </TabsList>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSettingsDialog(true)}
            className="flex-shrink-0 min-h-[44px] min-w-[44px]"
            data-testid="button-journal-settings"
          >
            <Settings className="w-5 h-5" />
          </Button>
        </div>

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
                      className="min-h-[44px] min-w-[44px]"
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
            <ScrollArea className="h-[200px] sm:h-[300px] lg:h-[calc(90vh-180px)]">
              <div className="space-y-1">
                {allCategories.map((category) => {
                  const Icon = category.icon;
                  const isActive = activeCategory === category.id;
                  const itemCount = journalData[category.id]?.length || 0;
                  const isCustom = 'isCustom' in category && category.isCustom;
                  const showCategoryActions = isCustom && (journalSettings.showDeleteCategory || journalSettings.showRenameCategory);
                  
                  return (
                    <div key={category.id} className="relative group">
                      <Button
                        variant={isActive ? "secondary" : "ghost"}
                        className={`w-full justify-start gap-3 h-auto py-3 px-3 min-h-[44px] ${isActive ? 'bg-primary/10' : ''} ${showCategoryActions ? 'pr-16' : ''}`}
                        onClick={() => setActiveCategory(category.id)}
                        data-testid={`category-${category.id}`}
                      >
                        <div className={`p-2 rounded-lg bg-gradient-to-br ${category.color} text-white flex-shrink-0`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 text-left">
                          <div className="text-sm font-medium">{category.label}</div>
                          {journalSettings.showEntryCount && itemCount > 0 && (
                            <div className="text-xs text-muted-foreground">
                              {itemCount} {itemCount === 1 ? 'entry' : 'entries'}
                            </div>
                          )}
                        </div>
                      </Button>
                      {isCustom && (
                        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          {journalSettings.showRenameCategory && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 min-h-[32px] min-w-[32px] text-muted-foreground hover:text-foreground"
                              onClick={(e) => {
                                e.stopPropagation();
                                const customCat = customCategories.find(c => c.id === category.id);
                                if (customCat) {
                                  setCategoryToRename(customCat);
                                  setNewCategoryLabel(customCat.label || customCat.name);
                                  setShowRenameCategoryDialog(true);
                                }
                              }}
                              data-testid={`button-rename-category-${category.id}`}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                          )}
                          {journalSettings.showDeleteCategory && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 min-h-[32px] min-w-[32px] text-muted-foreground hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                const customCat = customCategories.find(c => c.id === category.id);
                                if (customCat) {
                                  setCategoryToDelete(customCat);
                                  setShowDeleteCategoryDialog(true);
                                }
                              }}
                              data-testid={`button-delete-category-${category.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                
                <Separator className="my-2" />
                
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 h-auto py-3 px-3 min-h-[44px] border-dashed"
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
      <div className="flex-1 min-w-0 flex flex-col">
        <Card className="border-none shadow-sm h-full flex flex-col">
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
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => enrichEntryMutation.mutate({ category: activeCategory })}
                disabled={enrichEntryMutation.isPending}
                className="gap-1.5 text-xs text-muted-foreground hover:text-foreground flex-shrink-0"
                data-testid="button-refresh-category"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${enrichEntryMutation.isPending ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">
                  {enrichEntryMutation.isPending ? 'Loading...' : 'Refresh Data'}
                </span>
              </Button>
            </div>
            
            {/* Filter Dropdowns - Only show if settings enabled */}
            {journalSettings.showFilters && (
              <div className="flex flex-wrap items-center gap-2 mt-3 sm:mt-4">
                <Select value={locationFilter} onValueChange={setLocationFilter}>
                  <SelectTrigger className="w-[130px] sm:w-[160px] text-xs sm:text-sm" data-testid="select-location-filter">
                    <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
                    <SelectValue placeholder="Location" />
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
                  <SelectTrigger className="w-[130px] sm:w-[180px] text-xs sm:text-sm" data-testid="select-budget-filter">
                    <SelectValue placeholder="Budget" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Budgets</SelectItem>
                    <SelectItem value="budget">Budget ($)</SelectItem>
                    <SelectItem value="moderate">Moderate ($$)</SelectItem>
                    <SelectItem value="luxury">Luxury ($$$)</SelectItem>
                    <SelectItem value="ultra_luxury">Ultra Luxury ($$$$)</SelectItem>
                  </SelectContent>
                </Select>

                {journalSettings.showSubcategories && uniqueSubcategories.length > 0 && activeCategory !== 'movies' && (
                  <Select value={subcategoryFilter} onValueChange={setSubcategoryFilter}>
                    <SelectTrigger className="w-[130px] sm:w-[160px] text-xs sm:text-sm" data-testid="select-subcategory-filter">
                      <Folder className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {uniqueSubcategories.map((subcategory) => (
                        <SelectItem key={subcategory} value={subcategory}>
                          {subcategory.charAt(0).toUpperCase() + subcategory.slice(1).replace(/_/g, ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {/* Genre filter for movies/TV shows category */}
                {activeCategory === 'movies' && uniqueGenres.length > 0 && (
                  <Select value={genreFilter} onValueChange={setGenreFilter}>
                    <SelectTrigger className="w-[130px] sm:w-[160px] text-xs sm:text-sm" data-testid="select-genre-filter">
                      <Film className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
                      <SelectValue placeholder="Genre" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Genres</SelectItem>
                      {uniqueGenres.map((genre) => (
                        <SelectItem key={genre} value={genre}>
                          {genre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-[130px] sm:w-[140px] text-xs sm:text-sm" data-testid="select-date-filter">
                    <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
                    <SelectValue placeholder="Date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">Past Week</SelectItem>
                    <SelectItem value="month">Past Month</SelectItem>
                    <SelectItem value="year">Past Year</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={ratingFilter} onValueChange={setRatingFilter}>
                  <SelectTrigger className="w-[130px] sm:w-[140px] text-xs sm:text-sm" data-testid="select-rating-filter">
                    <Star className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
                    <SelectValue placeholder="Rating" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Ratings</SelectItem>
                    <SelectItem value="4">4+ Stars</SelectItem>
                    <SelectItem value="3.5">3.5+ Stars</SelectItem>
                    <SelectItem value="3">3+ Stars</SelectItem>
                  </SelectContent>
                </Select>

                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="gap-1 min-h-[44px]"
                    data-testid="button-clear-filters"
                  >
                    <X className="w-3 h-3" />
                    Clear Filters
                  </Button>
                )}
              </div>
            )}
          </CardHeader>

          <CardContent className="space-y-4 flex-1 flex flex-col min-h-0">
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
                className="gap-2 flex-shrink-0 min-h-[44px] min-w-[44px]"
                data-testid="button-add-entry"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add</span>
              </Button>
            </div>

            <Separator />

            {/* Entries List */}
            <ScrollArea className="flex-1 min-h-0">
              {isLoading ? (
                <div className="space-y-3 pr-4">
                  {[...Array(3)].map((_, i) => (
                    <Card key={i} className="p-4">
                      <div className="space-y-3">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                        <div className="flex gap-2">
                          <Skeleton className="h-6 w-16" />
                          <Skeleton className="h-6 w-20" />
                        </div>
                      </div>
                    </Card>
                  ))}
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
                    const sourceUrl = isRichEntry ? item.sourceUrl || undefined : undefined;
                    const webEnrichment = isRichEntry ? item.webEnrichment : null;
                    const completed = isRichEntry ? item.completed : false;

                    // Find original index for removal
                    const originalIndex = journalData[activeCategory]?.indexOf(item) ?? -1;

                    // Use web enrichment image if available
                    const primaryImage = webEnrichment?.primaryImageUrl;
                    const hasWebImage = !!primaryImage;

                    return (
                      <Card
                        key={filteredIndex}
                        className="hover-elevate cursor-default group overflow-hidden"
                        data-testid={`journal-entry-${filteredIndex}`}
                      >
                        {/* Web enrichment image header - full image display */}
                        {hasWebImage && (
                          <div className="relative w-full aspect-[2/3] sm:aspect-[3/4] bg-gradient-to-br from-muted/30 to-muted/50">
                            <img
                              src={primaryImage}
                              alt={webEnrichment?.venueName || text.substring(0, 30)}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                // Category-specific gradient fallbacks instead of hiding
                                const fallbackGradients: Record<string, string> = {
                                  books: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                                  movies: 'linear-gradient(135deg, #dc2626 0%, #f97316 100%)',
                                  music: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                                  restaurants: 'linear-gradient(135deg, #ea580c 0%, #facc15 100%)',
                                  travel: 'linear-gradient(135deg, #0284c7 0%, #22d3ee 100%)',
                                  fitness: 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)',
                                  activities: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)',
                                  shopping: 'linear-gradient(135deg, #ec4899 0%, #f472b6 100%)',
                                  hobbies: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                                  style: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
                                  'self-care': 'linear-gradient(135deg, #14b8a6 0%, #2dd4bf 100%)',
                                };
                                const gradient = fallbackGradients[activeCategory];
                                if (gradient) {
                                  // Replace image with colored gradient background
                                  target.style.display = 'none';
                                  const parent = target.parentElement;
                                  if (parent) {
                                    parent.style.background = gradient;
                                    parent.style.minHeight = '120px'; // Ensure fallback has visible height
                                    // Add category icon in center
                                    const iconDiv = document.createElement('div');
                                    iconDiv.className = 'absolute inset-0 flex items-center justify-center text-white/50';
                                    iconDiv.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>';
                                    parent.appendChild(iconDiv);
                                  }
                                } else {
                                  // Hide for unknown categories
                                  target.parentElement!.style.display = 'none';
                                }
                              }}
                            />
                            {/* Verified badge - visible on all devices */}
                            {webEnrichment?.venueVerified && (
                              <div className="absolute top-2 right-2 bg-green-500/90 text-white text-xs sm:text-sm px-2 py-1 rounded-full flex items-center gap-1 shadow-lg">
                                <Check className="w-3 h-3 sm:w-4 sm:h-4" /> Verified
                              </div>
                            )}
                            {/* Mark as Watched/Read/Attended button - floating on image */}
                            <Button
                              variant={completed ? "default" : "secondary"}
                              size="sm"
                              className={`absolute bottom-2 left-2 shadow-lg ${completed ? 'bg-green-600 hover:bg-green-700' : 'bg-background/90 hover:bg-background'}`}
                              onClick={() => handleToggleCompleted(originalIndex)}
                              data-testid={`button-toggle-completed-overlay-${filteredIndex}`}
                            >
                              <CheckCircle2 className={`w-4 h-4 mr-1 ${completed ? 'fill-current' : ''}`} />
                              <span className="text-xs font-medium">
                                {completed ? 'Completed' : 'Mark as Done'}
                              </span>
                            </Button>
                          </div>
                        )}

                        <CardContent className="p-3 sm:p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex-1 min-w-0 space-y-2">
                              {timestamp && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  {/* Content type icon based on enriched venueType */}
                                  {webEnrichment?.venueType && (() => {
                                    const IconComponent = venueTypeIcons[webEnrichment.venueType] || MapPin;
                                    return <IconComponent className="w-4 h-4" />;
                                  })()}
                                  <span>
                                    {new Date(timestamp).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                </div>
                              )}
                              <div className="line-clamp-3 sm:line-clamp-none">
                                <SmartTextRenderer text={text} category={activeCategory} sourceUrl={sourceUrl} />
                              </div>

                              {/* Web enrichment details */}
                              {webEnrichment && (
                                <div className="mt-3 space-y-2">
                                  {/* Price & Rating row */}
                                  <div className="flex flex-wrap items-center gap-2">
                                    {webEnrichment.priceRange && (
                                      <Badge variant="secondary" className="text-xs font-medium">
                                        {webEnrichment.priceRange}
                                      </Badge>
                                    )}
                                    {webEnrichment.rating && (
                                      <Badge variant="outline" className="text-xs flex items-center gap-1">
                                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /> {webEnrichment.rating.toFixed(1)}
                                        {webEnrichment.reviewCount && (
                                          <span className="text-muted-foreground ml-1">({webEnrichment.reviewCount})</span>
                                        )}
                                      </Badge>
                                    )}
                                    {webEnrichment.venueType && (
                                      <Badge variant="outline" className="text-xs capitalize">
                                        {webEnrichment.venueType.replace(/_/g, ' ')}
                                      </Badge>
                                    )}
                                  </div>

                                  {/* Location with directions link */}
                                  {webEnrichment.location?.address && (
                                    <div className="flex flex-wrap items-start gap-2 text-xs text-muted-foreground">
                                      <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                                      <span className="flex-1 min-w-0 break-words">{webEnrichment.location.address}</span>
                                      {webEnrichment.location.directionsUrl && (
                                        <a
                                          href={webEnrichment.location.directionsUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-primary hover:underline flex-shrink-0 whitespace-nowrap"
                                        >
                                          Get Directions →
                                        </a>
                                      )}
                                    </div>
                                  )}

                                  {/* Business hours */}
                                  {webEnrichment.businessHours && (
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <Clock className="w-3.5 h-3.5" />
                                      <span>{webEnrichment.businessHours}</span>
                                    </div>
                                  )}

                                  {/* BOOK-specific info */}
                                  {webEnrichment.venueType === 'book' && (
                                    <div className="space-y-2">
                                      {webEnrichment.author && (
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                          <PenLine className="w-3.5 h-3.5" />
                                          <span>by <span className="font-medium text-foreground">{webEnrichment.author}</span></span>
                                        </div>
                                      )}
                                      {(webEnrichment.publisher || webEnrichment.publicationYear) && (
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                          <Book className="w-3.5 h-3.5" />
                                          <span>
                                            {webEnrichment.publisher}
                                            {webEnrichment.publisher && webEnrichment.publicationYear && ' · '}
                                            {webEnrichment.publicationYear}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* MOVIE-specific info */}
                                  {webEnrichment.venueType === 'movie' && (
                                    <div className="space-y-2">
                                      {webEnrichment.director && (
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                          <Film className="w-3.5 h-3.5" />
                                          <span>Directed by <span className="font-medium text-foreground">{webEnrichment.director}</span></span>
                                        </div>
                                      )}
                                      {(webEnrichment.releaseYear || webEnrichment.runtime || webEnrichment.genre) && (
                                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                          {webEnrichment.releaseYear && <Badge variant="outline" className="text-xs">{webEnrichment.releaseYear}</Badge>}
                                          {webEnrichment.runtime && <Badge variant="outline" className="text-xs">{webEnrichment.runtime}</Badge>}
                                          {webEnrichment.genre && <Badge variant="outline" className="text-xs">{webEnrichment.genre}</Badge>}
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* FITNESS-specific info with multiple instructional images */}
                                  {webEnrichment.venueType === 'exercise' && (
                                    <div className="space-y-3">
                                      {/* Multiple exercise images gallery - full images without cropping */}
                                      {webEnrichment.mediaUrls && webEnrichment.mediaUrls.length > 1 && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                                          {webEnrichment.mediaUrls.slice(0, 4).map((media, idx) => (
                                            <div key={idx} className="relative rounded-md overflow-hidden bg-muted flex items-center justify-center">
                                              <img
                                                src={media.url}
                                                alt={`Exercise step ${idx + 1}`}
                                                className="w-full max-h-[250px] object-contain"
                                                loading="lazy"
                                                onError={(e) => {
                                                  (e.target as HTMLImageElement).parentElement!.style.display = 'none';
                                                }}
                                              />
                                              <div className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                                                Step {idx + 1}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      {webEnrichment.muscleGroups && webEnrichment.muscleGroups.length > 0 && (
                                        <div className="flex flex-wrap items-center gap-1">
                                          <span className="text-xs text-muted-foreground flex items-center gap-1"><Dumbbell className="w-3.5 h-3.5" /> Targets:</span>
                                          {webEnrichment.muscleGroups.map((muscle, idx) => (
                                            <Badge key={idx} variant="outline" className="text-xs capitalize">{muscle}</Badge>
                                          ))}
                                        </div>
                                      )}
                                      {(webEnrichment.difficulty || webEnrichment.duration) && (
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                          {webEnrichment.difficulty && (
                                            <Badge variant="secondary" className="text-xs capitalize">{webEnrichment.difficulty}</Badge>
                                          )}
                                          {webEnrichment.duration && (
                                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {webEnrichment.duration}</span>
                                          )}
                                        </div>
                                      )}
                                      {webEnrichment.equipment && webEnrichment.equipment.length > 0 && (
                                        <div className="flex flex-wrap items-center gap-1">
                                          <span className="text-xs text-muted-foreground flex items-center gap-1"><Dumbbell className="w-3.5 h-3.5" /> Equipment:</span>
                                          {webEnrichment.equipment.map((eq, idx) => (
                                            <Badge key={idx} variant="outline" className="text-xs">{eq}</Badge>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* MUSIC-specific info */}
                                  {(webEnrichment.venueType === 'music' || webEnrichment.venueType === 'artist' || webEnrichment.venueType === 'album' || webEnrichment.venueType === 'concert_venue') && (
                                    <div className="space-y-2">
                                      {webEnrichment.genre && (
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                          <Music className="w-3.5 h-3.5" />
                                          <Badge variant="outline" className="text-xs">{webEnrichment.genre}</Badge>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* TRAVEL-specific info (hotels, museums, attractions) */}
                                  {(webEnrichment.venueType === 'hotel' || webEnrichment.venueType === 'museum' || webEnrichment.venueType === 'attraction') && (
                                    <div className="space-y-2">
                                      {webEnrichment.highlights && webEnrichment.highlights.length > 0 && (
                                        <div className="flex flex-wrap items-center gap-1">
                                          <span className="text-xs text-muted-foreground">Highlights:</span>
                                          {webEnrichment.highlights.slice(0, 3).map((highlight, idx) => (
                                            <Badge key={idx} variant="outline" className="text-xs">{highlight}</Badge>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* SHOPPING-specific info (stores, boutiques) */}
                                  {(webEnrichment.venueType === 'store' || webEnrichment.venueType === 'boutique' || webEnrichment.venueType === 'mall') && (
                                    <div className="space-y-2">
                                      {webEnrichment.productCategories && webEnrichment.productCategories.length > 0 && (
                                        <div className="flex flex-wrap items-center gap-1">
                                          <span className="text-xs text-muted-foreground">Categories:</span>
                                          {webEnrichment.productCategories.slice(0, 4).map((cat, idx) => (
                                            <Badge key={idx} variant="outline" className="text-xs">{cat}</Badge>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Action buttons - responsive: show 2 on mobile, all on desktop */}
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {/* Book purchase links - show first 2 on mobile */}
                                    {webEnrichment.purchaseLinks && webEnrichment.purchaseLinks.length > 0 && (
                                      <>
                                        {webEnrichment.purchaseLinks.slice(0, 2).map((link, idx) => (
                                          <a
                                            key={idx}
                                            href={link.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:bg-primary/90 active:scale-95 transition-transform"
                                          >
                                            <ShoppingCart className="w-3 h-3" /> {link.platform}
                                          </a>
                                        ))}
                                        {/* Show remaining links only on desktop */}
                                        {webEnrichment.purchaseLinks.slice(2).map((link, idx) => (
                                          <a
                                            key={idx + 2}
                                            href={link.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="hidden sm:inline-flex items-center gap-1 text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:bg-primary/90"
                                          >
                                            <ShoppingCart className="w-3 h-3" /> {link.platform}
                                          </a>
                                        ))}
                                      </>
                                    )}

                                    {/* Movie/Music streaming links - show first 2 on mobile */}
                                    {webEnrichment.streamingLinks && webEnrichment.streamingLinks.length > 0 && (
                                      <>
                                        {webEnrichment.streamingLinks.slice(0, 2).map((link, idx) => (
                                          <a
                                            key={idx}
                                            href={link.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:bg-primary/90 active:scale-95 transition-transform"
                                          >
                                            <Play className="w-3 h-3" /> {link.platform}
                                          </a>
                                        ))}
                                        {/* Show remaining links only on desktop */}
                                        {webEnrichment.streamingLinks.slice(2).map((link, idx) => (
                                          <a
                                            key={idx + 2}
                                            href={link.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="hidden sm:inline-flex items-center gap-1 text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:bg-primary/90"
                                          >
                                            <Play className="w-3 h-3" /> {link.platform}
                                          </a>
                                        ))}
                                      </>
                                    )}
                                    
                                    {webEnrichment.reservationUrl && (
                                      <a
                                        href={webEnrichment.reservationUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:bg-primary/90 active:scale-95 transition-transform"
                                      >
                                        <CalendarPlus className="w-3 h-3" /> Reserve
                                      </a>
                                    )}
                                    {webEnrichment.website && (
                                      <a
                                        href={webEnrichment.website}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="hidden sm:inline-flex items-center gap-1 text-xs bg-secondary text-secondary-foreground px-3 py-1.5 rounded-md hover:bg-secondary/80"
                                      >
                                        <Globe className="w-3 h-3" /> Website
                                      </a>
                                    )}
                                    {webEnrichment.phone && (
                                      <a
                                        href={`tel:${webEnrichment.phone}`}
                                        className="inline-flex items-center gap-1 text-xs bg-secondary text-secondary-foreground px-3 py-1.5 rounded-md hover:bg-secondary/80 active:scale-95 transition-transform"
                                      >
                                        <Phone className="w-3 h-3" /> Call
                                      </a>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Load Details button for entries without web enrichment */}
                              {isRichEntry && !webEnrichment?.venueVerified && (
                                <div className="mt-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs gap-1"
                                    disabled={enrichEntryMutation.isPending}
                                    onClick={() => enrichEntryMutation.mutate({ category: activeCategory })}
                                  >
                                    {enrichEntryMutation.isPending ? (
                                      <>
                                        <Loader2 className="w-3 h-3 animate-spin" /> Loading...
                                      </>
                                    ) : (
                                      <>
                                        <RefreshCw className="w-3 h-3" /> Load Details
                                      </>
                                    )}
                                  </Button>
                                </div>
                              )}

                              {media && media.length > 0 && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-3 sm:mt-4">
                                  {media.map((m, idx) => (
                                    <div key={idx} className="relative rounded-md overflow-hidden bg-muted flex items-center justify-center">
                                      {m.type === 'video' ? (
                                        <video
                                          src={m.url}
                                          className="w-full max-h-[300px] object-contain"
                                          controls
                                        />
                                      ) : (
                                        <img
                                          src={m.url}
                                          alt={`Media ${idx + 1}`}
                                          className="w-full max-h-[300px] object-contain"
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
                              className="flex-shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity min-h-[44px] min-w-[44px] p-0"
                              onClick={() => handleRemoveItem(originalIndex)}
                              data-testid={`button-remove-${filteredIndex}`}
                            >
                              <X className="w-5 h-5" />
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
                      <Button variant="outline" size="sm" onClick={clearFilters} className="min-h-[44px]" data-testid="button-clear-filters-empty">
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
              className="w-full gap-2 min-h-[48px]"
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
                      className="gap-2 min-h-[44px]"
                    >
                      {copiedPrompt === generatedPrompt ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      Copy
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleUsePromptInJournal(generatedPrompt)}
                      className="gap-2 min-h-[44px]"
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
          <Button onClick={() => setShowTemplateDialog(true)} className="gap-2 min-h-[44px]" data-testid="button-create-template">
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
                      className="min-h-[44px] min-w-[44px]"
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
                  className="mt-3 w-full min-h-[44px]"
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
                  className="w-full gap-2 min-h-[48px]"
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

  {/* Delete Category Confirmation Dialog */}
  <Dialog open={showDeleteCategoryDialog} onOpenChange={setShowDeleteCategoryDialog}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Delete Category</DialogTitle>
        <DialogDescription>
          Are you sure you want to delete "{categoryToDelete?.label || categoryToDelete?.name}"? 
          All entries in this category will be permanently removed.
        </DialogDescription>
      </DialogHeader>
      
      <DialogFooter className="gap-2 sm:gap-0">
        <Button
          variant="outline"
          onClick={() => {
            setShowDeleteCategoryDialog(false);
            setCategoryToDelete(null);
          }}
        >
          Cancel
        </Button>
        <Button
          variant="destructive"
          onClick={() => {
            if (categoryToDelete) {
              deleteCategoryMutation.mutate(categoryToDelete.id);
            }
          }}
          disabled={deleteCategoryMutation.isPending}
          data-testid="button-confirm-delete-category"
        >
          {deleteCategoryMutation.isPending ? 'Deleting...' : 'Delete Category'}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  {/* Journal Settings Dialog */}
  <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Journal Settings
        </DialogTitle>
        <DialogDescription>
          Customize which features are visible in your journal.
        </DialogDescription>
      </DialogHeader>
      
      <div className="space-y-4 py-4">
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Category Features</h4>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-muted-foreground" />
              <Label htmlFor="show-delete" className="text-sm">Delete Categories</Label>
            </div>
            <Switch
              id="show-delete"
              checked={journalSettings.showDeleteCategory}
              onCheckedChange={() => handleSettingToggle('showDeleteCategory')}
              data-testid="switch-show-delete"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Pencil className="w-4 h-4 text-muted-foreground" />
              <Label htmlFor="show-rename" className="text-sm">Rename Categories</Label>
            </div>
            <Switch
              id="show-rename"
              checked={journalSettings.showRenameCategory}
              onCheckedChange={() => handleSettingToggle('showRenameCategory')}
              data-testid="switch-show-rename"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Image className="w-4 h-4 text-muted-foreground" />
              <Label htmlFor="show-edit-icon" className="text-sm">Edit Category Icons</Label>
            </div>
            <Switch
              id="show-edit-icon"
              checked={journalSettings.showEditCategoryIcon}
              onCheckedChange={() => handleSettingToggle('showEditCategoryIcon')}
              data-testid="switch-show-edit-icon"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Merge className="w-4 h-4 text-muted-foreground" />
              <Label htmlFor="show-merge" className="text-sm">Merge Categories</Label>
            </div>
            <Switch
              id="show-merge"
              checked={journalSettings.showMergeCategories}
              onCheckedChange={() => handleSettingToggle('showMergeCategories')}
              data-testid="switch-show-merge"
            />
          </div>
        </div>
        
        <Separator />
        
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Display Options</h4>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              <Label htmlFor="show-count" className="text-sm">Show Entry Counts</Label>
            </div>
            <Switch
              id="show-count"
              checked={journalSettings.showEntryCount}
              onCheckedChange={() => handleSettingToggle('showEntryCount')}
              data-testid="switch-show-count"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <Label htmlFor="show-filters" className="text-sm">Show Filters</Label>
            </div>
            <Switch
              id="show-filters"
              checked={journalSettings.showFilters}
              onCheckedChange={() => handleSettingToggle('showFilters')}
              data-testid="switch-show-filters"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Folder className="w-4 h-4 text-muted-foreground" />
              <Label htmlFor="show-subcategories" className="text-sm">Show Subcategories</Label>
            </div>
            <Switch
              id="show-subcategories"
              checked={journalSettings.showSubcategories}
              onCheckedChange={() => handleSettingToggle('showSubcategories')}
              data-testid="switch-show-subcategories"
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">AI Features</h4>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Use AI to intelligently find better images for your journal entries by analyzing content and recommending the best data source (TMDB, Google Books, Spotify, or web search).
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                smartEnrichMutation.mutate();
                setShowSettingsDialog(false);
              }}
              disabled={smartEnrichMutation.isPending}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {smartEnrichMutation.isPending ? 'AI Enriching...' : 'AI Enrich All Entries'}
            </Button>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button
          variant="outline"
          onClick={() => setShowSettingsDialog(false)}
        >
          Done
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  {/* Rename Category Dialog */}
  <Dialog open={showRenameCategoryDialog} onOpenChange={setShowRenameCategoryDialog}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Rename Category</DialogTitle>
        <DialogDescription>
          Enter a new name for "{categoryToRename?.label || categoryToRename?.name}".
        </DialogDescription>
      </DialogHeader>
      
      <div className="py-4">
        <Input
          placeholder="New category name"
          value={newCategoryLabel}
          onChange={(e) => setNewCategoryLabel(e.target.value)}
          data-testid="input-rename-category"
        />
      </div>
      
      <DialogFooter className="gap-2 sm:gap-0">
        <Button
          variant="outline"
          onClick={() => {
            setShowRenameCategoryDialog(false);
            setCategoryToRename(null);
            setNewCategoryLabel('');
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={() => {
            if (categoryToRename && newCategoryLabel.trim()) {
              renameCategoryMutation.mutate({
                categoryId: categoryToRename.id,
                newName: newCategoryLabel.trim()
              });
            }
          }}
          disabled={!newCategoryLabel.trim() || renameCategoryMutation.isPending}
          data-testid="button-confirm-rename-category"
        >
          {renameCategoryMutation.isPending ? 'Renaming...' : 'Rename'}
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
