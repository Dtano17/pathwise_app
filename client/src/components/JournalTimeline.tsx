import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Search, Filter, RefreshCw, Image as ImageIcon, Smile, MapPin, Tag } from 'lucide-react';
import { getCategoryColor } from '@/hooks/useKeywordDetection';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [moodFilter, setMoodFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');

  // Fetch journal data
  const { data: prefs, isLoading, refetch } = useQuery<{ journalData?: JournalData }>({
    queryKey: ['/api/user/preferences'],
  });

  const journalData = prefs?.journalData || {};

  // Flatten all entries with category info
  const allEntries = useMemo(() => {
    const entries: Array<JournalEntry & { category: string }> = [];

    Object.entries(journalData).forEach(([category, categoryEntries]) => {
      categoryEntries.forEach(entry => {
        entries.push({ ...entry, category });
      });
    });

    // Sort by timestamp (newest first)
    return entries.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [journalData]);

  // Get unique categories for filter
  const categories = useMemo(() => {
    return [...new Set(allEntries.map(e => e.category))];
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
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 sm:p-6 space-y-4 border-b bg-gradient-to-r from-purple-50 to-emerald-50 dark:from-purple-950/20 dark:to-emerald-950/20">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Journal Timeline</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

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
        <div className="p-4 sm:p-6 space-y-6">
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
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={`${getCategoryColor(entry.category)} text-xs`}>
                              {entry.category}
                            </Badge>

                            {entry.mood && (
                              <Badge variant="outline" className={`${moodColors[entry.mood]} text-xs`}>
                                <Smile className="h-3 w-3 mr-1" />
                                {moodEmojis[entry.mood]} {entry.mood}
                              </Badge>
                            )}

                            {entry.linkedActivityTitle && (
                              <Badge variant="outline" className="text-xs bg-purple-50 dark:bg-purple-900/20">
                                <MapPin className="h-3 w-3 mr-1" />
                                {entry.linkedActivityTitle}
                              </Badge>
                            )}
                          </div>

                          {entry.keywords && entry.keywords.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap">
                              {entry.keywords.map((keyword, idx) => (
                                <Badge key={idx} variant="secondary" className="text-[10px] px-1.5 py-0">
                                  <Tag className="h-2.5 w-2.5 mr-0.5" />
                                  {keyword}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>

                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatTime(entry.timestamp)}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm whitespace-pre-wrap break-words">{entry.text}</p>

                      {entry.media && entry.media.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {entry.media.map((item, idx) => (
                            <div
                              key={idx}
                              className="relative aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer hover:opacity-80 transition-opacity"
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
    </div>
  );
}
