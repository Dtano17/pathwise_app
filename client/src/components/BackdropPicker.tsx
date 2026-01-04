import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Loader2, ImageIcon, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface BackdropOption {
  url: string;
  source: 'tavily' | 'unsplash' | 'user';
  label?: string;
}

interface BackdropPickerProps {
  activityId: string;
  currentBackdrop?: string;
  onBackdropChange?: (url: string) => void;
  className?: string;
}

export function BackdropPicker({
  activityId,
  currentBackdrop,
  onBackdropChange,
  className
}: BackdropPickerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUrl, setSelectedUrl] = useState<string | undefined>(currentBackdrop);
  const [refreshCounter, setRefreshCounter] = useState(0);

  // Fetch backdrop options - refreshCounter in key forces new query each time
  const { data: options = [], isLoading, isRefetching } = useQuery({
    queryKey: ['backdrop-options', activityId, refreshCounter],
    queryFn: async () => {
      // Pass refresh counter to server for query variation
      const response = await fetch(`/api/activities/${activityId}/backdrop-options?variation=${refreshCounter}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch backdrop options');
      const data = await response.json();
      return data.options as BackdropOption[];
    },
    enabled: !!activityId,
    staleTime: 0,
    gcTime: 0, // Don't cache at all - we want fresh results each refresh
  });
  
  // Handle refresh - increment counter to force new query
  const handleRefresh = () => {
    setRefreshCounter(prev => prev + 1);
  };

  // Mutation to update backdrop
  const updateBackdropMutation = useMutation({
    mutationFn: async (backdropUrl: string) => {
      return apiRequest('PATCH', `/api/activities/${activityId}/backdrop`, { backdropUrl });
    },
    onSuccess: (_, backdropUrl) => {
      setSelectedUrl(backdropUrl);
      onBackdropChange?.(backdropUrl);
      queryClient.invalidateQueries({ queryKey: ['/api/activities', activityId] });
      toast({
        title: 'Backdrop Updated',
        description: 'Your activity backdrop has been changed',
      });
    },
    onError: () => {
      toast({
        title: 'Update Failed',
        description: 'Could not update the backdrop. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleSelect = (url: string) => {
    if (url === selectedUrl) return;
    updateBackdropMutation.mutate(url);
  };

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center py-8", className)}>
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        <span className="ml-2 text-sm text-slate-500">Loading backdrop options...</span>
      </div>
    );
  }

  if (options.length === 0) {
    return (
      <div className={cn("text-center py-4 text-slate-500", className)}>
        <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No backdrop options available</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Choose Backdrop Image
        </h4>
        <button
          onClick={handleRefresh}
          disabled={isRefetching || isLoading}
          className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1"
          data-testid="button-refresh-backdrops"
        >
          <RefreshCw className={cn("h-3 w-3", isRefetching && "animate-spin")} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {options.map((option, index) => {
          const isSelected = option.url === selectedUrl;
          const isPending = updateBackdropMutation.isPending && updateBackdropMutation.variables === option.url;

          return (
            <button
              key={`${option.url}-${index}`}
              onClick={() => handleSelect(option.url)}
              disabled={updateBackdropMutation.isPending}
              className={cn(
                "relative aspect-video rounded-lg overflow-hidden border-2 transition-all",
                "hover:scale-[1.02] hover:shadow-md",
                isSelected
                  ? "border-emerald-500 ring-2 ring-emerald-500/20"
                  : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
              )}
            >
              <img
                src={option.url}
                alt={option.label || 'Backdrop option'}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => {
                  // Hide broken images
                  e.currentTarget.style.display = 'none';
                }}
              />

              {/* Gradient overlay for label visibility */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

              {/* Label */}
              <div className="absolute bottom-1.5 left-2 right-2">
                <span className="text-xs text-white font-medium drop-shadow-sm">
                  {option.label || (option.source === 'tavily' ? 'Web' : 'Curated')}
                </span>
              </div>

              {/* Selected checkmark */}
              {isSelected && !isPending && (
                <div className="absolute top-2 right-2 bg-emerald-500 rounded-full p-1">
                  <Check className="h-3 w-3 text-white" />
                </div>
              )}

              {/* Loading spinner */}
              {isPending && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                </div>
              )}

              {/* Source badge */}
              {option.source === 'unsplash' && (
                <div className="absolute top-2 left-2 bg-black/50 rounded px-1.5 py-0.5">
                  <span className="text-[10px] text-white/80">HD</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
        Select an image to use as your activity backdrop
      </p>
    </div>
  );
}
