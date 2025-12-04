import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { 
  MapPin, 
  Trash2, 
  ExternalLink, 
  Utensils, 
  Wine, 
  Music, 
  Dumbbell,
  Camera,
  Sparkles,
  BookmarkCheck,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { SiInstagram, SiTiktok, SiYoutube } from 'react-icons/si';

interface SavedVenue {
  name: string;
  type: string;
  priceRange?: string;
}

interface SavedContent {
  id: number;
  sourceUrl: string;
  platform: string;
  location: string;
  city: string;
  country: string;
  category: string;
  venues: SavedVenue[];
  budgetTier: string;
  rawContent: string;
  createdAt: string;
}

interface GroupedContent {
  [location: string]: SavedContent[];
}

interface SavedContentResponse {
  savedContent: SavedContent[];
}

const categoryIcons: Record<string, typeof Utensils> = {
  'food': Utensils,
  'restaurants': Utensils,
  'dining': Utensils,
  'bars': Wine,
  'nightlife': Wine,
  'drinks': Wine,
  'music': Music,
  'entertainment': Music,
  'fitness': Dumbbell,
  'sports': Dumbbell,
  'activities': Camera,
  'sightseeing': Camera,
  'tours': Camera,
};

const platformIcons: Record<string, typeof SiInstagram> = {
  'instagram': SiInstagram,
  'tiktok': SiTiktok,
  'youtube': SiYoutube,
};

const budgetColors: Record<string, string> = {
  'budget': 'bg-green-500/10 text-green-600 dark:text-green-400',
  'moderate': 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  'luxury': 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  'premium': 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
};

export default function MySavedSpots() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [expandedLocations, setExpandedLocations] = useState<Set<string>>(new Set());

  const { data: response, isLoading } = useQuery<SavedContentResponse>({
    queryKey: ['/api/user/saved-content'],
    enabled: isAuthenticated,
  });
  
  const savedContent = response?.savedContent ?? [];

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/user/saved-content/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/saved-content'] });
      toast({
        title: "Removed",
        description: "Saved spot has been removed from your collection.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove saved spot.",
        variant: "destructive",
      });
    },
  });

  const groupedByLocation: GroupedContent = savedContent.reduce((acc, item) => {
    const key = item.location || item.city || 'Unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as GroupedContent);

  const toggleLocation = (location: string) => {
    setExpandedLocations(prev => {
      const next = new Set(prev);
      if (next.has(location)) {
        next.delete(location);
      } else {
        next.add(location);
      }
      return next;
    });
  };

  const getCategoryIcon = (category: string) => {
    const normalizedCategory = category.toLowerCase();
    for (const [key, Icon] of Object.entries(categoryIcons)) {
      if (normalizedCategory.includes(key)) {
        return Icon;
      }
    }
    return Sparkles;
  };

  const getPlatformIcon = (platform: string) => {
    const normalizedPlatform = platform.toLowerCase();
    return platformIcons[normalizedPlatform] || ExternalLink;
  };

  if (!isAuthenticated) {
    return (
      <Card data-testid="card-saved-spots-auth-required">
        <CardContent className="p-6 sm:p-8 text-center">
          <BookmarkCheck className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-muted-foreground" />
          <h3 className="text-base sm:text-lg font-semibold mb-2">Sign in required</h3>
          <p className="text-sm sm:text-base text-muted-foreground">
            Please sign in to view your saved spots.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card data-testid="card-saved-spots-loading">
        <CardContent className="p-6 sm:p-8 text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-12 w-12 bg-muted rounded-full mx-auto" />
            <div className="h-4 w-32 bg-muted rounded mx-auto" />
            <div className="h-3 w-48 bg-muted rounded mx-auto" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (savedContent.length === 0) {
    return (
      <Card data-testid="card-saved-spots-empty">
        <CardContent className="p-6 sm:p-8 text-center">
          <BookmarkCheck className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-muted-foreground" />
          <h3 className="text-base sm:text-lg font-semibold mb-2">No saved spots yet</h3>
          <p className="text-sm sm:text-base text-muted-foreground mb-4">
            When you share Instagram or TikTok content and choose "Save for later", 
            your saved venues will appear here organized by location.
          </p>
          <p className="text-xs text-muted-foreground">
            Next time you plan a trip, we'll automatically suggest these spots!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4" data-testid="container-saved-spots">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookmarkCheck className="w-5 h-5 text-purple-600" />
          <h2 className="text-lg font-semibold">My Saved Spots</h2>
        </div>
        <Badge variant="secondary" data-testid="badge-total-count">
          {savedContent.length} saved
        </Badge>
      </div>

      <p className="text-sm text-muted-foreground">
        Your curated collection of places to visit. These will be suggested when you plan trips to these locations.
      </p>

      <div className="space-y-3">
        {Object.entries(groupedByLocation).map(([location, items]) => {
          const isExpanded = expandedLocations.has(location);
          const allVenues = items.flatMap(item => item.venues || []);
          const uniqueCategories = Array.from(new Set(items.map(item => item.category)));
          
          return (
            <Card key={location} data-testid={`card-location-${location.toLowerCase().replace(/\s+/g, '-')}`}>
              <CardHeader 
                className="p-3 sm:p-4 cursor-pointer hover-elevate"
                onClick={() => toggleLocation(location)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-purple-600" />
                    <CardTitle className="text-base font-medium">{location}</CardTitle>
                    <Badge variant="outline" className="text-xs">
                      {items.length} {items.length === 1 ? 'item' : 'items'}
                    </Badge>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                
                {!isExpanded && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {uniqueCategories.slice(0, 3).map(cat => (
                      <Badge 
                        key={cat} 
                        variant="secondary" 
                        className="text-xs"
                      >
                        {cat}
                      </Badge>
                    ))}
                    {allVenues.length > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {allVenues.length} venues
                      </Badge>
                    )}
                  </div>
                )}
              </CardHeader>

              {isExpanded && (
                <CardContent className="p-3 sm:p-4 pt-0 space-y-3">
                  {items.map((item, idx) => {
                    const CategoryIcon = getCategoryIcon(item.category);
                    const PlatformIcon = getPlatformIcon(item.platform);
                    
                    return (
                      <div key={item.id}>
                        {idx > 0 && <Separator className="mb-3" />}
                        <div 
                          className="space-y-2"
                          data-testid={`saved-item-${item.id}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div className="p-1.5 rounded-md bg-muted">
                                <PlatformIcon className="w-3.5 h-3.5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge className={budgetColors[item.budgetTier] || 'bg-gray-500/10'}>
                                    {item.budgetTier || 'Unknown'}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    <CategoryIcon className="w-3 h-3 mr-1" />
                                    {item.category}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(item.sourceUrl, '_blank');
                                }}
                                data-testid={`button-view-source-${item.id}`}
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteMutation.mutate(item.id);
                                }}
                                disabled={deleteMutation.isPending}
                                data-testid={`button-delete-${item.id}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>

                          {item.venues && item.venues.length > 0 && (
                            <div className="ml-8 space-y-1">
                              {item.venues.map((venue, vIdx) => (
                                <div 
                                  key={vIdx}
                                  className="flex items-center justify-between text-sm py-1 px-2 rounded-md bg-muted/50"
                                  data-testid={`venue-${item.id}-${vIdx}`}
                                >
                                  <span className="font-medium">{venue.name}</span>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>{venue.type}</span>
                                    {venue.priceRange && (
                                      <Badge variant="outline" className="text-xs px-1.5 py-0">
                                        {venue.priceRange}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          <p className="text-xs text-muted-foreground ml-8">
                            Saved {new Date(item.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
