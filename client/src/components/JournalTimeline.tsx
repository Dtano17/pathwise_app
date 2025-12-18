import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Search, Filter, RefreshCw, Image as ImageIcon, Smile, MapPin, Tag, Download, ArrowLeft, Sparkles, PlusCircle, ExternalLink, Hash } from 'lucide-react';
import { SiInstagram, SiTiktok, SiYoutube, SiFacebook, SiReddit, SiX, SiOpenai } from 'react-icons/si';
import { getCategoryColor } from '@/hooks/useKeywordDetection';
import ExportDialog from './ExportDialog';
import { ImageGalleryModal } from './ImageGalleryModal';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

// Category icons for smart rendering
const categoryIcons: Record<string, string> = {
  books: '📚',
  reading: '📚',
  'books-reading': '📚',
  restaurants: '🍽️',
  food: '🍽️',
  movies: '🎬',
  'movies-tv': '🎬',
  music: '🎵',
  travel: '✈️',
  fitness: '💪',
  health: '🏥',
  learning: '📖',
  career: '💼',
  finance: '💰',
  relationships: '❤️',
  creativity: '🎨',
  hobbies: '⭐',
  style: '👗',
  favorites: '⭐',
  notes: '📝',
};

// Smart text renderer that extracts and highlights titles, authors, etc.
function SmartTextRenderer({ text, category, sourceUrl }: { text: string; category?: string; sourceUrl?: string }) {
  // Get category icon
  const categoryKey = category?.toLowerCase().replace(/[^a-z]/g, '-') || '';
  const icon = categoryIcons[categoryKey] || categoryIcons[category?.split('-')[0] || ''] || '';
  
  // Pattern: "Title" by Author - Description
  // Or: Read 'Title' by Author - Description
  // Or: Title by Author (Recommender's choice) - Description
  // Or: Inspired by ...
  
  // Check for "Inspired by" pattern
  const inspiredByMatch = text.match(/^Inspired\s+by\s+(.+?)(?:\s*[-–—]\s*(.*))?$/i);
  
  // Try to extract title in quotes
  const quotedTitleMatch = text.match(/^(Read |Study |Complete |Watch |Listen to )?['"]([^'"]+)['"]/i);
  
  // Try to extract "by Author" pattern
  const byAuthorMatch = text.match(/\bby\s+([A-Z][a-zA-Z\s&.'-]+?)(?:\s*[-–—]\s*|\s*\(|\s*$)/i);
  
  // Try to extract parenthetical recommendation like "(Warren Buffett's choice)"
  const recommenderMatch = text.match(/\(([A-Z][a-zA-Z\s.']+(?:'s)?\s*(?:choice|pick|recommendation|favorite))\)/i);
  
  // Split on " - " to separate title/author from description
  const dashSplit = text.split(/\s*[-–—]\s*/);
  const hasDescription = dashSplit.length > 1;
  
  // Handle "Inspired by" pattern
  if (inspiredByMatch) {
    const inspiredText = inspiredByMatch[1].trim();
    const descriptionPart = inspiredByMatch[2]?.trim() || '';
    
    return (
      <div className="space-y-1">
        <div className="flex items-start gap-2">
          {icon && <span className="text-lg flex-shrink-0">{icon}</span>}
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
      
      // Get the rest after the quoted title
      const afterTitle = text.slice(quotedTitleMatch[0].length);
      
      // Extract author from the rest
      const authorInRest = afterTitle.match(/^\s*by\s+([A-Z][a-zA-Z\s&.'-]+?)(?:\s*[-–—]\s*|\s*\(|\s*$)/i);
      if (authorInRest) {
        authorPart = authorInRest[1].trim();
        const afterAuthor = afterTitle.slice(authorInRest[0].length);
        descriptionPart = afterAuthor.replace(/^\s*[-–—]\s*/, '').trim();
      } else if (hasDescription) {
        descriptionPart = dashSplit.slice(1).join(' - ').trim();
      }
    } else if (byAuthorMatch && hasDescription) {
      // Format: "Title by Author - Description"
      const beforeBy = text.split(/\s+by\s+/i)[0];
      titlePart = beforeBy.replace(/^(Read |Study |Complete |Watch |Listen to )/i, '');
      prefix = text.match(/^(Read |Study |Complete |Watch |Listen to )/i)?.[1] || '';
      authorPart = byAuthorMatch[1].trim();
      
      // Get description after the dash
      const dashIndex = text.indexOf(' - ');
      if (dashIndex > -1) {
        descriptionPart = text.slice(dashIndex + 3).trim();
      }
    }
    
    // Clean up recommender info from description if present
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
          {icon && <span className="text-lg flex-shrink-0">{icon}</span>}
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
                ⭐ {recommender}
              </p>
            )}
          </div>
        </div>
        {descriptionPart && (
          <p className="text-sm text-muted-foreground pl-7">
            {descriptionPart}
          </p>
        )}
      </div>
    );
  }
  
  // Fallback: just show the text with icon
  return (
    <div className="flex items-start gap-2">
      {icon && <span className="text-lg flex-shrink-0">{icon}</span>}
      <p className="text-sm whitespace-pre-wrap break-words flex-1">{text}</p>
    </div>
  );
}

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
  sourceUrl?: string;
  originalUrl?: string;
  platform?: string;
  platformEmoji?: string;
  categoryEmoji?: string;
  hashtags?: string[];
  isImported?: boolean;
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

const getPlatformIcon = (platform?: string) => {
  if (!platform) return null;
  const iconClass = "w-3.5 h-3.5";
  switch (platform.toLowerCase()) {
    case 'instagram': return <SiInstagram className={`${iconClass} text-pink-500`} />;
    case 'tiktok': return <SiTiktok className={iconClass} />;
    case 'youtube': return <SiYoutube className={`${iconClass} text-red-500`} />;
    case 'facebook': return <SiFacebook className={`${iconClass} text-blue-600`} />;
    case 'reddit': return <SiReddit className={`${iconClass} text-orange-500`} />;
    case 'twitter':
    case 'x': return <SiX className={iconClass} />;
    case 'chatgpt': return <SiOpenai className={`${iconClass} text-green-500`} />;
    default: return null;
  }
};

const platformColors: Record<string, string> = {
  instagram: 'bg-gradient-to-r from-pink-500 to-purple-500 text-white border-0',
  tiktok: 'bg-black text-white border-0',
  youtube: 'bg-red-500 text-white border-0',
  facebook: 'bg-blue-600 text-white border-0',
  reddit: 'bg-orange-500 text-white border-0',
  twitter: 'bg-sky-500 text-white border-0',
  x: 'bg-black text-white border-0',
  chatgpt: 'bg-green-500 text-white border-0',
  claude: 'bg-amber-500 text-white border-0'
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

  // Mutation to create activity from journal entry with AI-generated tasks
  const createActivityMutation = useMutation({
    mutationFn: async (entry: JournalEntry & { category: string }) => {
      // Call the AI-powered endpoint that breaks down journal content into actionable tasks
      const response = await apiRequest('POST', `/api/journal/entries/${entry.id}/create-activity`, {});
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create activity');
      }
      
      return result;
    },
    onMutate: (entry) => {
      setCreatingActivityId(entry.id);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
      queryClient.invalidateQueries({ queryKey: ['/api/journal/entries'] });
      const tasksCount = data.tasksCreated || 0;
      toast({
        title: "Activity Created with Action Steps!",
        description: `Created ${tasksCount} actionable task${tasksCount !== 1 ? 's' : ''} from your journal entry. Check the Activities tab to start tracking progress.`,
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

                            {entry.platform && entry.isImported && (
                              <Badge 
                                className={`${platformColors[entry.platform.toLowerCase()] || 'bg-muted text-muted-foreground'} text-xs flex-shrink-0`}
                                data-testid={`badge-platform-${entry.id}`}
                              >
                                {getPlatformIcon(entry.platform)}
                                <span className="ml-1 capitalize">{entry.platform}</span>
                              </Badge>
                            )}

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
                      <SmartTextRenderer text={entry.text} category={entry.category} sourceUrl={entry.sourceUrl} />

                      {/* Source link for imported content */}
                      {entry.isImported && entry.sourceUrl && (
                        <a 
                          href={entry.originalUrl || entry.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                          data-testid={`link-source-${entry.id}`}
                        >
                          <ExternalLink className="h-3 w-3" />
                          <span>View original on {entry.platform}</span>
                        </a>
                      )}

                      {/* Hashtags for imported content */}
                      {entry.hashtags && entry.hashtags.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap" data-testid={`hashtags-container-${entry.id}`}>
                          {entry.hashtags.slice(0, 6).map((tag, idx) => (
                            <Badge 
                              key={idx} 
                              variant="outline" 
                              className="text-xs px-1.5 py-0 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                              data-testid={`badge-hashtag-${entry.id}-${idx}`}
                            >
                              <Hash className="h-2.5 w-2.5 mr-0.5" />
                              {tag.replace('#', '')}
                            </Badge>
                          ))}
                          {entry.hashtags.length > 6 && (
                            <Badge 
                              variant="outline" 
                              className="text-xs px-1.5 py-0 text-muted-foreground"
                              data-testid={`badge-hashtag-overflow-${entry.id}`}
                            >
                              +{entry.hashtags.length - 6}
                            </Badge>
                          )}
                        </div>
                      )}

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
                          {creatingActivityId === entry.id ? 'Creating tasks...' : 'Break into Action Steps'}
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
