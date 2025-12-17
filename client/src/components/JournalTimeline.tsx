import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Search, Filter, RefreshCw, Image as ImageIcon, Smile, MapPin, Tag, Download, ArrowLeft, Sparkles, PlusCircle } from 'lucide-react';
import { getCategoryColor } from '@/hooks/useKeywordDetection';
import ExportDialog from './ExportDialog';
import { ImageGalleryModal } from './ImageGalleryModal';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface JournalEntry {
  id: string;
  text: string;
  media?: Array<{url: string; type: 'image' | 'video'; thumbnail?: string}>;
  timestamp: string;
  aiConfidence?: number;
  keywords?: string[];
  activityId?: string;
  linkedActivityTitle?: string;
  mood?: 'great' | 'good' | 'okay' | 'poor';
}

interface JournalData {
  [category: string]: JournalEntry[];
}

interface JournalTimelineProps {
  onClose?: () => void;
}

const moodEmojis = {
  great: '😄',
  good: '🙂',
  okay: '😐',
  poor: '😔'
};

const moodColors = {
  great: 'text-green-600 bg-green-50 border-green-200',
  good: 'text-blue-600 bg-blue-50 border-blue-200',
  okay: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  poor: 'text-red-600 bg-red-50 border-red-200'
};

export default function JournalTimeline({ onClose }: JournalTimelineProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [moodFilter, setMoodFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [galleryImages, setGalleryImages] = useState<Array<{url: string; filename?: string}>>([]);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [creatingActivityId, setCreatingActivityId] = useState<string | null>(null);

  // Fetch journal data from the same endpoint as ConversationalPlanner
  const { data: response, isLoading, refetch } = useQuery<{ entries: Array<JournalEntry & { category: string }> }>({
    queryKey: ['/api/journal/entries'],
  });

  // Mutation to create activity from journal entry
  const createActivityMutation = useMutation({
    mutationFn: async (entry: JournalEntry & { category: string }) => {
      // Generate smart title from entry text
      const title = entry.text.length > 60 
        ? entry.text.substring(0, 57) + '...' 
        : entry.text.split('\n')[0] || 'Untitled Activity';
      
      const response = await apiRequest('POST', '/api/activities', {
        title,
        description: entry.text,
        category: entry.category,
        status: 'planning'
      });
      
      const activity = await response.json();
      
      // Link the journal entry to the created activity
      await apiRequest('PATCH', `/api/journal/entries/${entry.id}`, {
        activityId: activity.id,
        linkedActivityTitle: activity.title
      });
      
      return activity;
    },
    onMutate: (entry) => {
      setCreatingActivityId(entry.id);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
      queryClient.invalidateQueries({ queryKey: ['/api/journal/entries'] });
      toast({
        title: "Activity Created!",
        description: "Your journal entry has been converted to an activity. Check the Activities tab to start tracking tasks.",
      });
      setCreatingActivityId(null);
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.error || error.message || "Failed to create activity";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      setCreatingActivityId(null);
    }
  });

  // All entries are already flattened with category info
  const allEntries = useMemo(() => {
    const entries = response?.entries || [];
    
    // Sort by timestamp (newest first)
    return entries.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [response]);

  // Get unique categories for filter
  const categories = useMemo(() => {
    return Array.from(new Set(allEntries.map(e => e.category)));
  }, [allEntries]);

  // Filter entries
  const filteredEntries = useMemo(() => {
    return allEntries.filter(entry => {
      // Search filter
      if (searchQuery && !entry.text.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Category filter
      if (categoryFilter !== 'all' && entry.category !== categoryFilter) {
        return false;
      }

      // Mood filter
      if (moodFilter !== 'all' && entry.mood !== moodFilter) {
        return false;
      }

      // Date filter
      if (dateFilter !== 'all') {
        const entryDate = new Date(entry.timestamp);
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
        }
      }

      return true;
    });
  }, [allEntries, searchQuery, categoryFilter, moodFilter, dateFilter]);

  // Group entries by date
  const groupedEntries = useMemo(() => {
    const groups: Record<string, typeof filteredEntries> = {};

    filteredEntries.forEach(entry => {
      const date = new Date(entry.timestamp).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(entry);
    });

    return groups;
  }, [filteredEntries]);

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 border-b bg-gradient-to-r from-purple-50 to-emerald-50 dark:from-purple-950/20 dark:to-emerald-950/20 flex-shrink-0">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="gap-1 sm:gap-2 flex-shrink-0"
                data-testid="button-back-journal"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back</span>
              </Button>
            )}
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold truncate">Journal Timeline</h2>
          </div>
          <div className="flex gap-1 sm:gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowExportDialog(true)}
              className="gap-1 sm:gap-2"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Reference Info */}
        {allEntries.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-1">
                  AI-Enriched Journal
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  {allEntries.length} {allEntries.length === 1 ? 'entry' : 'entries'} across {categories.length} {categories.length === 1 ? 'category' : 'categories'} • Automatically organized and enriched with insights
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search entries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={moodFilter} onValueChange={setMoodFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Moods" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Moods</SelectItem>
              <SelectItem value="great">{moodEmojis.great} Great</SelectItem>
              <SelectItem value="good">{moodEmojis.good} Good</SelectItem>
              <SelectItem value="okay">{moodEmojis.okay} Okay</SelectItem>
              <SelectItem value="poor">{moodEmojis.poor} Poor</SelectItem>
            </SelectContent>
          </Select>

          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Past Week</SelectItem>
              <SelectItem value="month">Past Month</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Active Filters Summary */}
        {(categoryFilter !== 'all' || moodFilter !== 'all' || dateFilter !== 'all' || searchQuery) && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
            <span>
              Showing {filteredEntries.length} of {allEntries.length} entries
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter('all');
                setMoodFilter('all');
                setDateFilter('all');
              }}
              className="h-6 text-xs"
            >
              Clear filters
            </Button>
          </div>
        )}
      </div>

      {/* Timeline Feed */}
      <ScrollArea className="flex-1">
        <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
              Loading entries...
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-2">No journal entries found</p>
              {(categoryFilter !== 'all' || moodFilter !== 'all' || dateFilter !== 'all' || searchQuery) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setCategoryFilter('all');
                    setMoodFilter('all');
                    setDateFilter('all');
                  }}
                >
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            Object.entries(groupedEntries).map(([date, entries]) => (
              <div key={date} className="space-y-3">
                {/* Date Separator */}
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold text-muted-foreground">{date}</h3>
                  <div className="flex-1 h-px bg-border" />
                </div>

                {/* Entries for this date */}
                {entries.map((entry) => (
                  <Card key={entry.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge className={`${getCategoryColor(entry.category)} text-xs flex-shrink-0`}>
                              {entry.category}
                            </Badge>

                            {entry.mood && (
                              <Badge variant="outline" className={`${moodColors[entry.mood]} text-xs flex-shrink-0`}>
                                <Smile className="h-3 w-3 mr-1" />
                                {moodEmojis[entry.mood]} {entry.mood}
                              </Badge>
                            )}

                            {entry.linkedActivityTitle && (
                              <Badge variant="outline" className="text-xs bg-purple-50 dark:bg-purple-900/20 flex-shrink-0 max-w-full">
                                <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                                <span className="truncate">{entry.linkedActivityTitle}</span>
                              </Badge>
                            )}
                          </div>

                          {entry.keywords && entry.keywords.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap">
                              {entry.keywords.slice(0, 8).map((keyword, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs px-1.5 py-0 flex-shrink-0">
                                  <Tag className="h-2.5 w-2.5 mr-0.5" />
                                  {keyword}
                                </Badge>
                              ))}
                              {entry.keywords.length > 8 && (
                                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                                  +{entry.keywords.length - 8}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>

                        <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0 sm:self-start">
                          {formatTime(entry.timestamp)}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm whitespace-pre-wrap break-words">{entry.text}</p>

                      {!entry.linkedActivityTitle && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => createActivityMutation.mutate(entry)}
                          disabled={creatingActivityId === entry.id}
                          className="gap-2"
                          data-testid={`button-create-activity-${entry.id}`}
                        >
                          <PlusCircle className="h-4 w-4" />
                          {creatingActivityId === entry.id ? 'Creating...' : 'Create Activity from Journal'}
                        </Button>
                      )}

                      {entry.media && entry.media.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {entry.media.map((item, idx) => (
                            <div
                              key={idx}
                              className="relative aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => {
                                if (item.type === 'image') {
                                  const imageMedia = entry.media?.filter(m => m.type === 'image') || [];
                                  const imageIndex = imageMedia.findIndex(m => m.url === item.url);
                                  setGalleryImages(imageMedia.map(m => ({ url: m.url, filename: m.url.split('/').pop() })));
                                  setGalleryIndex(imageIndex);
                                  setIsGalleryOpen(true);
                                }
                              }}
                              data-testid={`img-thumbnail-${idx}`}
                            >
                              {item.type === 'image' ? (
                                <img
                                  src={item.url}
                                  alt={`Media ${idx + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Export Dialog */}
      <ExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        onUpgradeRequired={() => {
          // Trigger upgrade modal (will be handled by parent component)
          console.log('Upgrade required for export feature');
        }}
      />

      {/* Image Gallery Modal */}
      <ImageGalleryModal
        images={galleryImages}
        initialIndex={galleryIndex}
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
      />
    </div>
  );
}
