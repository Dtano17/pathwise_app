import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, Target, Sparkles, ChevronRight, Share2, Zap, BookOpen, RefreshCw, ChevronDown, MapPin, Loader2, DollarSign, Calculator, Link2 } from 'lucide-react';
import { motion } from 'framer-motion';
import Confetti from 'react-confetti';
import ShareDialog from './ShareDialog';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { SiInstagram, SiTiktok, SiYoutube, SiX, SiFacebook, SiReddit, SiPinterest } from 'react-icons/si';

// Helper to get friendly source label and icon from URL
const getSourceLabel = (url?: string): { name: string; icon: JSX.Element; color: string } | null => {
  if (!url) return null;
  const lowerUrl = url.toLowerCase();
  
  if (lowerUrl.includes('instagram.com')) {
    return { name: 'Instagram', icon: <SiInstagram className="w-4 h-4" />, color: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' };
  }
  if (lowerUrl.includes('tiktok.com')) {
    return { name: 'TikTok', icon: <SiTiktok className="w-4 h-4" />, color: 'bg-black text-white dark:bg-white dark:text-black' };
  }
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
    return { name: 'YouTube', icon: <SiYoutube className="w-4 h-4" />, color: 'bg-red-600 text-white' };
  }
  if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) {
    return { name: 'X (Twitter)', icon: <SiX className="w-4 h-4" />, color: 'bg-black text-white dark:bg-white dark:text-black' };
  }
  if (lowerUrl.includes('facebook.com') || lowerUrl.includes('fb.watch')) {
    return { name: 'Facebook', icon: <SiFacebook className="w-4 h-4" />, color: 'bg-blue-600 text-white' };
  }
  if (lowerUrl.includes('reddit.com')) {
    return { name: 'Reddit', icon: <SiReddit className="w-4 h-4" />, color: 'bg-orange-600 text-white' };
  }
  if (lowerUrl.includes('pinterest.com')) {
    return { name: 'Pinterest', icon: <SiPinterest className="w-4 h-4" />, color: 'bg-red-700 text-white' };
  }
  
  // Generic link for unknown sources - use foreground color for contrast
  return { name: 'Link', icon: <Link2 className="w-4 h-4" />, color: 'bg-muted text-foreground' };
};

// Command ref interface for natural language commands from main input
export interface ClaudePlanCommandRef {
  saveToJournal: () => void;
  toggleBudgetFilter: () => void;
  expandAllAlternatives: () => void;
  collapseAllAlternatives: () => void;
  getState: () => { matchBudgetFilter: boolean; expandedAlternatives: number[] };
}

interface Alternative {
  id: string;
  venueName: string;
  venueType: string;
  location: { city?: string };
  priceRange?: string;
  budgetTier?: string;
  category: string;
  sourceUrl?: string;
  estimatedCost?: number;
}

interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  category: string;
  completed?: boolean;
  timeEstimate?: string;
  context?: string;
  estimatedCost?: number;
}

interface PlanMetadata {
  location?: {
    city?: string;
    country?: string;
    neighborhood?: string;
  };
  budgetTier?: 'budget' | 'moderate' | 'luxury' | 'ultra_luxury';
  estimatedCost?: number;
}

interface ClaudePlanOutputProps {
  planTitle?: string;
  summary?: string;
  tasks: Task[];
  estimatedTimeframe?: string;
  motivationalNote?: string;
  onCompleteTask: (taskId: string) => void;
  onCreateActivity?: (planData: { title: string; description: string; tasks: Task[]; mode?: 'create' | 'update'; activityId?: string }) => void;
  onSetAsTheme?: (data: { activityId: string; activityTitle: string; tasks: { title: string; completed: boolean }[] }) => void;
  onOpenSharePreview?: (activityId: string) => void;
  showConfetti?: boolean;
  activityId?: string;
  isCreating?: boolean;
  backdrop?: string;
  sourceUrl?: string;
  importId?: string;
  planMetadata?: PlanMetadata;
}

interface AlternativesSectionProps {
  taskIndex: number;
  taskId: string;
  location?: string;
  budgetTier?: string;
  sourceUrl?: string;
  importId?: string;
  isExpanded: boolean;
  isDocked: boolean;
  onToggle: () => void;
  onToggleDock: () => void;
  onSwap: (alternative: Alternative) => void;
  onSaveToJournal?: (alternative: Alternative) => void;
  matchBudget?: boolean;
}

function AlternativesSection({ 
  taskIndex, 
  taskId, 
  location, 
  budgetTier, 
  sourceUrl,
  importId,
  isExpanded, 
  isDocked,
  onToggle, 
  onToggleDock,
  onSwap,
  onSaveToJournal,
  matchBudget
}: AlternativesSectionProps) {
  const [displayCount, setDisplayCount] = useState(23);
  const itemsPerPage = 23;
  
  const queryParams = new URLSearchParams();
  if (location) queryParams.set('location', location);
  if (budgetTier) queryParams.set('budgetTier', budgetTier);
  if (taskId) queryParams.set('excludeIds', taskId);
  if (sourceUrl) queryParams.set('sourceUrl', sourceUrl);
  if (importId) queryParams.set('importId', importId);
  if (matchBudget) queryParams.set('matchBudget', 'true');
  
  const alternativesUrl = `/api/alternatives?${queryParams.toString()}`;
  
  const { data: alternatives, isLoading, error } = useQuery<Alternative[]>({
    queryKey: ['/api/alternatives', location, budgetTier, taskId, sourceUrl, importId, matchBudget],
    queryFn: async () => {
      const response = await fetch(alternativesUrl, { credentials: 'include' });
      if (!response.ok) {
        throw new Error('Failed to fetch alternatives');
      }
      const data = await response.json();
      return data.alternatives || [];
    },
    enabled: isExpanded && !!location,
  });
  
  const displayedAlternatives = alternatives?.slice(0, displayCount) || [];
  const hasMore = (alternatives?.length || 0) > displayCount;

  if (!location) {
    return null;
  }

  const alternativesContent = (
    <div 
      className={`p-3 bg-muted/30 rounded-lg border border-muted ${isDocked ? 'max-h-32 overflow-y-auto' : ''}`}
      data-testid={`alternatives-list-${taskIndex}`}
    >
      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading alternatives...
        </div>
      )}
      
      {error && (
        <p className="text-sm text-destructive">Failed to load alternatives</p>
      )}
      
      {!isLoading && !error && alternatives && alternatives.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {importId || sourceUrl 
            ? "No other items from this source available for swapping" 
            : "No alternatives found for this location"}
        </p>
      )}
      
      {!isLoading && !error && alternatives && alternatives.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-xs text-muted-foreground">
              Showing 1-{Math.min(displayCount, alternatives.length)} of {alternatives.length} 
              {importId || sourceUrl 
                ? <span className="text-primary"> from same source</span>
                : ' from your journal'}
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={onToggleDock}
              data-testid={`button-toggle-dock-${taskIndex}`}
              title={isDocked ? "Expand alternatives" : "Dock alternatives"}
            >
              {isDocked ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3 rotate-180" />
              )}
            </Button>
          </div>
          <div className={`flex flex-col gap-2 ${isDocked ? 'max-h-20' : 'max-h-48'} overflow-y-auto`}>
            {displayedAlternatives.map((alt, altIndex) => (
              <div
                key={alt.id}
                className={`flex items-center justify-between gap-3 p-2 bg-background rounded-md border ${isDocked ? 'p-1.5' : ''}`}
                data-testid={`alternative-item-${altIndex}`}
              >
                <div className="flex-1 min-w-0">
                  <p className={`font-medium truncate ${isDocked ? 'text-xs' : 'text-sm'}`}>{alt.venueName}</p>
                  {!isDocked && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      {alt.location?.city && (
                        <Badge variant="outline" className="text-xs gap-1">
                          <MapPin className="w-2.5 h-2.5" />
                          {alt.location.city}
                        </Badge>
                      )}
                      {alt.budgetTier && (
                        <Badge variant="outline" className="text-xs">
                          {alt.budgetTier}
                        </Badge>
                      )}
                      {alt.estimatedCost ? (
                        <span className="text-xs text-muted-foreground">${alt.estimatedCost}</span>
                      ) : alt.priceRange && (
                        <span className="text-xs text-muted-foreground">{alt.priceRange}</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {onSaveToJournal && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className={isDocked ? 'h-6 w-6 p-0' : ''}
                      onClick={() => onSaveToJournal(alt)}
                      data-testid={`button-journal-alternative-${taskIndex}-${altIndex}`}
                      title="Save to journal"
                    >
                      <BookOpen className="w-3 h-3" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className={isDocked ? 'h-6 px-2 text-xs' : ''}
                    onClick={() => onSwap(alt)}
                    data-testid={`button-swap-alternative-${taskIndex}-${altIndex}`}
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    {isDocked ? '' : 'Swap'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
          {hasMore && (
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs mt-2"
              onClick={() => setDisplayCount(prev => prev + itemsPerPage)}
              data-testid={`button-load-more-alternatives-${taskIndex}`}
            >
              Load {Math.min(itemsPerPage, (alternatives?.length || 0) - displayCount)} more venues
            </Button>
          )}
        </div>
      )}
    </div>
  );

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-xs text-muted-foreground hover:text-foreground mt-2"
          data-testid={`button-view-alternatives-${taskIndex}`}
        >
          <RefreshCw className="w-3 h-3" />
          Swap with alternative
          <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3">
        {alternativesContent}
      </CollapsibleContent>
    </Collapsible>
  );
}

const ClaudePlanOutput = forwardRef<ClaudePlanCommandRef, ClaudePlanOutputProps>(({
  planTitle,
  summary,
  tasks,
  estimatedTimeframe,
  motivationalNote,
  onCompleteTask,
  onCreateActivity,
  onSetAsTheme,
  onOpenSharePreview,
  showConfetti = false,
  activityId,
  isCreating = false,
  backdrop,
  sourceUrl,
  importId,
  planMetadata
}, ref) => {
  const { toast } = useToast();
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
  const [showCelebration, setShowCelebration] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareUrl, setShareUrl] = useState<string>('');
  const [expandedAlternatives, setExpandedAlternatives] = useState<Set<number>>(new Set());
  const [dockedAlternatives, setDockedAlternatives] = useState<Set<number>>(new Set());
  const [swappedTasks, setSwappedTasks] = useState<Map<string, Task>>(new Map());
  const [swappedCostAdjustments, setSwappedCostAdjustments] = useState<Map<string, number>>(new Map());
  const [matchBudgetFilter, setMatchBudgetFilter] = useState(false);

  // Expose command methods to parent via ref for natural language commands
  useImperativeHandle(ref, () => ({
    saveToJournal: () => saveToJournalMutation.mutate(),
    toggleBudgetFilter: () => setMatchBudgetFilter(prev => !prev),
    expandAllAlternatives: () => setExpandedAlternatives(new Set(tasks.map((_, i) => i))),
    collapseAllAlternatives: () => setExpandedAlternatives(new Set()),
    getState: () => ({ 
      matchBudgetFilter, 
      expandedAlternatives: Array.from(expandedAlternatives) 
    })
  }));
  
  // Helper to estimate cost from price range or budget tier
  const estimateCostFromPriceData = (priceRange?: string, budgetTier?: string): number | null => {
    // Try to parse numeric range like "$50-100" or "50-100"
    if (priceRange) {
      const numericMatch = priceRange.match(/\$?(\d+)(?:\s*[-–]\s*\$?(\d+))?/);
      if (numericMatch) {
        const low = parseInt(numericMatch[1], 10);
        const high = numericMatch[2] ? parseInt(numericMatch[2], 10) : low;
        return Math.round((low + high) / 2);
      }
      // Handle dollar signs like "$", "$$", "$$$", "$$$$"
      const dollarMatch = priceRange.match(/^\$+$/);
      if (dollarMatch) {
        const dollarCount = dollarMatch[0].length;
        const tierEstimates: Record<number, number> = { 1: 15, 2: 35, 3: 75, 4: 150 };
        return tierEstimates[dollarCount] || 50;
      }
    }
    // Fall back to budget tier estimates
    if (budgetTier) {
      const tierEstimates: Record<string, number> = {
        budget: 25,
        moderate: 50,
        luxury: 100,
        ultra_luxury: 200
      };
      return tierEstimates[budgetTier] || null;
    }
    return null;
  };

  // Calculate per-task base cost (evenly divide total if no per-task costs)
  const perTaskBaseCost = (planMetadata?.estimatedCost && tasks.length > 0) 
    ? planMetadata.estimatedCost / tasks.length 
    : 0;

  // Calculate dynamic budget total
  const calculateBudgetTotal = (): { total: number; isCustomized: boolean; originalTotal: number } => {
    const originalTotal = planMetadata?.estimatedCost || 0;
    
    if (swappedCostAdjustments.size === 0) {
      return { total: originalTotal, isCustomized: false, originalTotal };
    }
    
    // Sum all cost adjustments (positive = more expensive swap, negative = cheaper swap)
    let adjustmentSum = 0;
    swappedCostAdjustments.forEach(adjustment => {
      adjustmentSum += adjustment;
    });
    
    const adjustedTotal = Math.max(0, originalTotal + adjustmentSum);
    return { total: adjustedTotal, isCustomized: true, originalTotal };
  };

  const budgetData = calculateBudgetTotal();

  // Infer category from tasks (use most common category)
  const category = tasks.length > 0 
    ? (() => {
        const counts = tasks.reduce((acc, task) => {
          acc[task.category] = (acc[task.category] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'other';
      })()
    : 'other';
  
  // Generate share link mutation
  const generateShareLinkMutation = useMutation({
    mutationFn: async () => {
      if (!activityId) {
        throw new Error('No activity ID available');
      }
      const response = await fetch(`/api/activities/${activityId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate share link');
      }
      return response.json();
    },
    onSuccess: (data: { shareableLink: string; socialText: string }) => {
      setShareUrl(data.shareableLink);
      setShowShareDialog(true);
    },
    onError: (error: Error) => {
      toast({
        title: 'Share Failed',
        description: error.message || 'Could not generate share link. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Helper to map task category to journal category
  const mapCategoryToJournalCategory = (category: string): string => {
    const cat = category.toLowerCase();
    if (['restaurants', 'cafes', 'food_cooking', 'food', 'dining'].includes(cat)) return 'restaurants';
    if (['travel_itinerary', 'hotels_accommodation', 'attractions_activities', 'outdoor_nature', 'travel', 'vacation'].includes(cat)) return 'travel';
    if (['bars_nightlife', 'entertainment', 'nightlife', 'bars'].includes(cat)) return 'hobbies';
    if (['wellness_spa', 'fitness', 'wellness', 'health'].includes(cat)) return 'hobbies';
    if (['shopping', 'retail'].includes(cat)) return 'favorites';
    return 'notes';
  };

  // Helper to extract location hints from plan title (e.g., "Lagos Restaurant Guide" → city: "Lagos")
  const extractLocationFromTitle = (title: string | undefined): { city?: string; country?: string } | undefined => {
    if (!title) return undefined;
    
    // Common city/location patterns in titles - supports multi-word cities like "New York", "Rio de Janeiro"
    const cityPatterns = [
      // "New York City Food Tour", "Rio de Janeiro Restaurants"
      /^([A-Z][a-z]+(?:\s+(?:de\s+)?[A-Z][a-z]+)*(?:\s+City)?)\s+(?:Restaurant|Dining|Food|Travel|Trip|Itinerary|Guide|Hotels?|Bars?|Nightlife|Shopping|Attractions?|Tour|Escape)/i,
      // "Trip to New York", "Restaurants in Los Angeles"
      /(?:in|to|for)\s+([A-Z][a-z]+(?:\s+(?:de\s+)?[A-Z][a-z]+)*(?:\s+City)?)/i
    ];
    
    for (const pattern of cityPatterns) {
      const match = title.match(pattern);
      if (match && match[1]) {
        return { city: match[1].trim() };
      }
    }
    return undefined;
  };

  // Save to Journal mutation
  const saveToJournalMutation = useMutation({
    mutationFn: async () => {
      // Get location from planMetadata or extract from title
      const location = planMetadata?.location || extractLocationFromTitle(planTitle);
      
      const entries = tasks.map(task => ({
        category: mapCategoryToJournalCategory(task.category),
        entry: {
          id: `journal-${task.id}-${Date.now()}`,
          text: `${task.title}${task.description ? ` - ${task.description}` : ''}`,
          timestamp: new Date().toISOString(),
          venueName: task.title,
          venueType: task.category,
          location: location,
          budgetTier: planMetadata?.budgetTier,
          estimatedCost: planMetadata?.estimatedCost,
          sourceUrl: sourceUrl
        }
      }));

      const response = await apiRequest('POST', '/api/user/journal/batch', { entries });
      return response.json();
    },
    onSuccess: (data: { success: boolean; count: number }) => {
      toast({
        title: 'Saved to Journal',
        description: `${data.count} item${data.count !== 1 ? 's' : ''} saved to your Personal Journal.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/user-preferences'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Save Failed',
        description: error.message || 'Could not save to journal. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Swap task mutation
  const swapTaskMutation = useMutation({
    mutationFn: async ({ taskId, alternative }: { taskId: string; alternative: Alternative }) => {
      const response = await apiRequest('PATCH', `/api/tasks/${taskId}/swap`, {
        venueName: alternative.venueName,
        venueType: alternative.venueType,
        location: alternative.location,
        priceRange: alternative.priceRange,
        budgetTier: alternative.budgetTier,
        sourceUrl: alternative.sourceUrl
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Swap Failed',
        description: error.message || 'Could not swap task. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Handle swap action
  const handleSwapTask = (taskIndex: number, taskId: string, alternative: Alternative) => {
    // Calculate cost adjustment
    const newCost = alternative.estimatedCost || estimateCostFromPriceData(alternative.priceRange, alternative.budgetTier);
    const originalTask = tasks.find(t => t.id === taskId);
    const originalCost = originalTask?.estimatedCost || perTaskBaseCost;
    
    // Track cost adjustment (new cost - original cost), or remove if no pricing data
    setSwappedCostAdjustments(prev => {
      const next = new Map(prev);
      if (newCost !== null) {
        const adjustment = newCost - originalCost;
        next.set(taskId, adjustment);
      } else {
        // No pricing data - remove any stale entry
        next.delete(taskId);
      }
      return next;
    });
    
    const swappedTask: Task = {
      id: taskId,
      title: alternative.venueName,
      description: `${alternative.venueType}${alternative.priceRange ? ` - ${alternative.priceRange}` : ''}${alternative.location?.city ? ` in ${alternative.location.city}` : ''}`,
      priority: 'medium',
      category: alternative.category,
      estimatedCost: newCost || undefined
    };
    
    setSwappedTasks(prev => new Map(prev).set(taskId, swappedTask));
    setExpandedAlternatives(prev => {
      const next = new Set(prev);
      next.delete(taskIndex);
      return next;
    });
    
    if (activityId && taskId) {
      swapTaskMutation.mutate({ taskId, alternative });
    }
    
    toast({
      title: 'Task Swapped',
      description: `Swapped to "${alternative.venueName}"`,
    });
  };

  // Get effective location for alternatives query
  const getAlternativesLocation = (): string | undefined => {
    if (planMetadata?.location?.city) return planMetadata.location.city;
    const extracted = extractLocationFromTitle(planTitle);
    return extracted?.city;
  };

  // Sync completed tasks from actual task data (additive to preserve optimistic UI, prune stale IDs)
  useEffect(() => {
    const validIds = new Set(tasks.map(t => t.id));
    const completedFromProps = tasks.filter(t => t.completed).map(t => t.id);
    
    setCompletedTasks(prev => {
      // Keep only IDs that are in current tasks list
      const pruned = new Set(Array.from(prev).filter(id => validIds.has(id)));
      // Add server-confirmed completions
      completedFromProps.forEach(id => pruned.add(id));
      return pruned;
    });
    
    // Prune stale swapped tasks and cost adjustments for tasks no longer in the plan
    setSwappedTasks(prev => {
      const pruned = new Map<string, Task>();
      prev.forEach((task, id) => {
        if (validIds.has(id)) {
          pruned.set(id, task);
        }
      });
      return pruned.size !== prev.size ? pruned : prev;
    });
    
    setSwappedCostAdjustments(prev => {
      const pruned = new Map<string, number>();
      prev.forEach((adjustment, id) => {
        if (validIds.has(id)) {
          pruned.set(id, adjustment);
        }
      });
      return pruned.size !== prev.size ? pruned : prev;
    });
  }, [tasks]);

  const handleCompleteTask = (taskId: string) => {
    // Prevent completing preview tasks (tasks without IDs)
    if (!taskId) {
      console.warn('Cannot complete preview task without ID');
      return;
    }
    
    const newCompleted = new Set(completedTasks);
    newCompleted.add(taskId);
    setCompletedTasks(newCompleted);
    setShowCelebration(true);
    onCompleteTask(taskId);
    setTimeout(() => setShowCelebration(false), 3000);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {showCelebration && showConfetti && typeof window !== 'undefined' && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={false}
          numberOfPieces={200}
          colors={['#6C5CE7', '#00B894', '#FDCB6E']}
        />
      )}

      {/* Plan Header */}
      <Card className="p-4 sm:p-6 bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
              <Target className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground break-words" data-testid="text-plan-title">
                {planTitle || 'Your Action Plan'}
              </h2>
              {estimatedTimeframe && (
                <div className="flex items-center gap-2 mt-1">
                  <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground" data-testid="text-timeframe">
                    {estimatedTimeframe}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {summary && (
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed break-words" data-testid="text-plan-summary">
              {summary}
            </p>
          )}
        </div>
      </Card>

      {/* Source Label - Shows friendly platform name with icon - clickable link to source */}
      {sourceUrl && (() => {
        const source = getSourceLabel(sourceUrl);
        return source ? (
          <div className="flex items-center gap-2" data-testid="source-label-container">
            <span className="text-xs text-muted-foreground">Inspired by:</span>
            <a 
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex"
              data-testid="link-source-url"
            >
              <Badge 
                variant="outline" 
                className="gap-1.5 py-1 px-2 cursor-pointer hover-elevate"
                data-testid="badge-source-label"
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center ${source.color}`}>
                  {source.icon}
                </span>
                <span className="text-xs font-medium">{source.name}</span>
              </Badge>
            </a>
          </div>
        ) : null;
      })()}

      {/* Tasks List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Action Steps
        </h3>
        
        {tasks.map((task, index) => {
          const displayTask = swappedTasks.get(task.id) || task;
          const isCompleted = completedTasks.has(task.id) || task.completed;
          
          return (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="w-full"
            >
              <Card className={`p-3 sm:p-5 transition-all duration-300 ${
                isCompleted 
                  ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-700' 
                  : 'hover-elevate'
              }`}>
                <div className="space-y-3 sm:space-y-4">
                  {/* Task Header */}
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                    <div className="flex-1 space-y-2 min-w-0">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 ${
                          isCompleted ? 'bg-green-600' : 'bg-primary/10'
                        }`}>
                          {isCompleted ? (
                            <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                          ) : (
                            <span className="text-xs sm:text-sm font-semibold text-primary">
                              {index + 1}
                            </span>
                          )}
                        </div>
                        <h4 className={`font-semibold text-sm sm:text-base text-foreground break-words ${
                          isCompleted ? 'line-through decoration-2 decoration-green-600' : ''
                        }`} data-testid={`text-task-title-${index}`}>
                          {displayTask.title}
                        </h4>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 ml-9 sm:ml-11">
                        <Badge variant="outline" className={`text-xs ${getPriorityColor(displayTask.priority)}`}>
                          {displayTask.priority}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {displayTask.category}
                        </Badge>
                        {swappedTasks.has(task.id) && (
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                            Swapped
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                      {task.timeEstimate && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-700">
                          <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">{task.timeEstimate}</span>
                        </div>
                      )}
                      
                      {!isCompleted && (
                        <Button
                          onClick={() => handleCompleteTask(task.id)}
                          size="sm"
                          variant="outline"
                          className="gap-2 shrink-0 w-full sm:w-auto"
                          disabled={!task.id || !activityId}
                          data-testid={`button-complete-task-${index}`}
                        >
                          <CheckCircle className="w-4 h-4" />
                          {!activityId ? 'Create Activity First' : 'Complete'}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Task Details */}
                  <div className="ml-9 sm:ml-11 space-y-2 sm:space-y-3">
                    <p className={`text-xs sm:text-sm text-muted-foreground leading-relaxed break-words ${
                      isCompleted ? 'line-through decoration-1 decoration-gray-400 opacity-70' : ''
                    }`} data-testid={`text-task-description-${index}`}>
                      {displayTask.description}
                    </p>
                    
                    {displayTask.context && (
                      <div className="bg-secondary/20 border border-secondary/30 rounded-lg p-2 sm:p-3">
                        <div className="flex items-start gap-2">
                          <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 text-primary mt-0.5 shrink-0" />
                          <p className={`text-xs text-foreground/80 leading-relaxed break-words ${
                            isCompleted ? 'line-through decoration-1 decoration-gray-400 opacity-70' : ''
                          }`} data-testid={`text-task-context-${index}`}>
                            {displayTask.context}
                          </p>
                        </div>
                      </div>
                    )}

                    {isCompleted && (
                      <div className="flex items-center gap-2 text-green-600 text-xs sm:text-sm font-medium">
                        <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                        Task completed! Great job!
                      </div>
                    )}

                    {/* Swappable Alternatives Section */}
                    {!isCompleted && (
                      <AlternativesSection
                        taskIndex={index}
                        taskId={displayTask.id}
                        location={getAlternativesLocation()}
                        budgetTier={planMetadata?.budgetTier}
                        sourceUrl={sourceUrl}
                        importId={importId}
                        isExpanded={expandedAlternatives.has(index)}
                        isDocked={dockedAlternatives.has(index)}
                        matchBudget={matchBudgetFilter}
                        onToggle={() => {
                          setExpandedAlternatives(prev => {
                            const next = new Set(prev);
                            if (next.has(index)) {
                              next.delete(index);
                            } else {
                              next.add(index);
                            }
                            return next;
                          });
                        }}
                        onToggleDock={() => {
                          setDockedAlternatives(prev => {
                            const next = new Set(prev);
                            if (next.has(index)) {
                              next.delete(index);
                            } else {
                              next.add(index);
                            }
                            return next;
                          });
                        }}
                        onSwap={(alternative) => handleSwapTask(index, task.id, alternative)}
                        onSaveToJournal={(alternative) => {
                          const location = planMetadata?.location || extractLocationFromTitle(planTitle);
                          const entry = {
                            category: mapCategoryToJournalCategory(alternative.category),
                            entry: {
                              id: `journal-${alternative.id}-${Date.now()}`,
                              text: `${alternative.venueName}${alternative.venueType ? ` - ${alternative.venueType}` : ''}`,
                              timestamp: new Date().toISOString(),
                              venueName: alternative.venueName,
                              venueType: alternative.venueType,
                              location: alternative.location || location,
                              budgetTier: alternative.budgetTier,
                              priceRange: alternative.priceRange,
                              estimatedCost: alternative.estimatedCost,
                              sourceUrl: alternative.sourceUrl || sourceUrl
                            }
                          };
                          apiRequest('POST', '/api/user/journal/batch', { entries: [entry] })
                            .then(() => {
                              toast({
                                title: 'Saved to Journal',
                                description: `"${alternative.venueName}" added to your Personal Journal.`,
                              });
                              queryClient.invalidateQueries({ queryKey: ['/api/user-preferences'] });
                            })
                            .catch((err) => {
                              toast({
                                title: 'Save Failed',
                                description: err.message || 'Could not save to journal.',
                                variant: 'destructive',
                              });
                            });
                        }}
                      />
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Budget Total Section */}
      {budgetData.originalTotal > 0 && (
        <Card className="p-4 sm:p-5 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-700">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-amber-600 rounded-full flex items-center justify-center shrink-0">
                  <DollarSign className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-amber-900 dark:text-amber-100">Estimated Budget</h4>
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    {planMetadata?.budgetTier && (
                      <span className="capitalize">{planMetadata.budgetTier.replace('_', ' ')} tier</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-baseline gap-2 justify-end">
                  <p className="text-2xl font-bold text-amber-900 dark:text-amber-100" data-testid="text-budget-total">
                    ${Math.round(budgetData.total).toLocaleString()}
                  </p>
                  {budgetData.isCustomized && budgetData.total !== budgetData.originalTotal && (
                    <span className="text-sm text-muted-foreground line-through" data-testid="text-original-budget">
                      ${Math.round(budgetData.originalTotal).toLocaleString()}
                    </span>
                  )}
                </div>
                <Badge 
                  variant="outline" 
                  className={`text-xs mt-1 ${
                    budgetData.isCustomized 
                      ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700' 
                      : 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700'
                  }`}
                  data-testid="badge-budget-source"
                >
                  {budgetData.isCustomized ? (
                    <span className="flex items-center gap-1">
                      <Calculator className="w-3 h-3" />
                      User-customized ({swappedTasks.size} swap{swappedTasks.size !== 1 ? 's' : ''})
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      AI-generated
                    </span>
                  )}
                </Badge>
              </div>
            </div>
            
            {budgetData.isCustomized && (
              <div className="pt-2 border-t border-amber-200 dark:border-amber-700">
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  {budgetData.total > budgetData.originalTotal 
                    ? `Budget increased by $${Math.round(budgetData.total - budgetData.originalTotal).toLocaleString()} after swapping venues.`
                    : budgetData.total < budgetData.originalTotal
                    ? `You're saving $${Math.round(budgetData.originalTotal - budgetData.total).toLocaleString()} with your personalized selections!`
                    : `You've personalized this plan by swapping ${swappedTasks.size} venue${swappedTasks.size !== 1 ? 's' : ''} with alternatives from your journal.`
                  }
                </p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Motivational Note */}
      {motivationalNote && (
        <Card className="p-4 bg-gradient-to-br from-secondary/5 to-primary/5 border-dashed border-2 border-primary/20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <p className="text-sm text-foreground font-medium" data-testid="text-motivational-note">
              {motivationalNote}
            </p>
          </div>
        </Card>
      )}

      {/* Activity Progress Tracking */}
      {activityId && (
        <Card className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 border-emerald-200 dark:border-emerald-700">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center">
                <Target className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-emerald-900 dark:text-emerald-100">Activity Created!</h4>
                <p className="text-xs text-emerald-700 dark:text-emerald-300">Track your progress below</p>
              </div>
            </div>
            {(() => {
              const completedCount = tasks.filter(t => t.completed || completedTasks.has(t.id)).length;
              const progressPercent = tasks.length > 0 ? Math.min(100, (completedCount / tasks.length) * 100) : 0;
              return (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-emerald-800 dark:text-emerald-200 font-medium">Progress</span>
                    <span className="text-emerald-900 dark:text-emerald-100 font-bold">{completedCount} / {tasks.length} tasks</span>
                  </div>
                  <div className="w-full bg-emerald-200/50 dark:bg-emerald-800/30 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-3 rounded-full transition-all duration-500 flex items-center justify-end pr-1"
                      style={{ width: `${progressPercent}%` }}
                    >
                      {progressPercent > 15 && (
                        <span className="text-[10px] font-bold text-white">{Math.round(progressPercent)}%</span>
                      )}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </Card>
      )}
      
      {/* Progress Summary (when no activity created yet) */}
      {!activityId && (
        <div className="text-center pt-4">
          {(() => {
            const completedCount = tasks.filter(t => t.completed || completedTasks.has(t.id)).length;
            const progressPercent = tasks.length > 0 ? Math.min(100, (completedCount / tasks.length) * 100) : 0;
            return (
              <>
                <p className="text-sm text-muted-foreground">
                  {completedCount} of {tasks.length} tasks completed
                </p>
                <div className="w-full bg-secondary/20 rounded-full h-2 mt-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Action Buttons */}
      <div className="pt-6 border-t">
        <h3 className="text-sm font-semibold text-center mb-4 text-muted-foreground">
          Quick Actions
        </h3>
        <div className="flex flex-wrap gap-3 justify-center">
          {/* Create Activity - Always visible, disabled after creation */}
          {onCreateActivity && (
            <Button
              onClick={() => onCreateActivity({
                title: planTitle || 'Generated Plan',
                description: summary || 'AI-generated activity plan',
                tasks: tasks,
                mode: activityId ? 'update' : 'create',
                activityId: activityId
              })}
              className="gap-2"
              variant="default"
              disabled={isCreating}
              data-testid="button-create-activity-from-plan"
            >
              <Target className="w-4 h-4" />
              {isCreating ? 'Saving...' : activityId ? 'Save Changes' : 'Create Activity'}
            </Button>
          )}

          {/* Share to Social Media */}
          <Button
            onClick={() => {
              if (!activityId) {
                toast({
                  title: 'Cannot Share',
                  description: 'Please create the activity first before sharing.',
                  variant: 'destructive',
                });
                return;
              }
              generateShareLinkMutation.mutate();
            }}
            className="gap-2"
            variant="outline"
            disabled={!activityId || generateShareLinkMutation.isPending}
            data-testid="button-share-plan"
          >
            <Share2 className="w-4 h-4" />
            {generateShareLinkMutation.isPending ? 'Generating...' : 'Share Plan'}
          </Button>

          {/* Save to Journal */}
          <Button
            onClick={() => saveToJournalMutation.mutate()}
            className="gap-2"
            variant="outline"
            disabled={saveToJournalMutation.isPending}
            data-testid="button-save-to-journal"
          >
            <BookOpen className="w-4 h-4" />
            {saveToJournalMutation.isPending ? 'Saving...' : 'Save to Journal'}
          </Button>

          {/* Set as Theme */}
          {onSetAsTheme && activityId && (
            <Button
              onClick={() => onSetAsTheme({
                activityId: activityId,
                activityTitle: planTitle || 'My Plan',
                tasks: tasks.map(t => ({ title: t.title, completed: t.completed || false }))
              })}
              className="gap-2"
              variant="outline"
              data-testid="button-set-as-theme"
            >
              <Zap className="w-4 h-4" />
              Set as Theme
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground text-center mt-3">
          {!activityId 
            ? "Create an activity to share and track progress, or set this plan as today's theme"
            : "Share your progress or set this as today's focus theme"}
        </p>
      </div>

      {/* Share Dialog */}
      <ShareDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        title={planTitle || 'My Action Plan'}
        description={summary || `Generated plan with ${tasks.length} tasks`}
        url={shareUrl}
        category={category}
        progressPercent={Math.round((completedTasks.size / tasks.length) * 100)}
        activityId={activityId}
        planSummary={summary}
        backdrop={backdrop}
        onOpenSharePreview={activityId ? () => onOpenSharePreview?.(activityId) : undefined}
      />
    </motion.div>
  );
});

export default ClaudePlanOutput;