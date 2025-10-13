import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Image, Sparkles } from 'lucide-react';

interface Activity {
  id: string;
  title: string;
  planSummary?: string;
  shareTitle?: string;
  backdrop?: string;
  category: string;
}

interface SharePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity: Activity;
  onConfirmShare: () => void;
}

const backdropPresets = [
  {
    url: 'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=1600&q=80',
    name: 'Times Square',
    category: 'nyc'
  },
  {
    url: 'https://images.unsplash.com/photo-1518391846015-55a9cc003b25?w=1600&q=80',
    name: 'Brooklyn Bridge',
    category: 'nyc'
  },
  {
    url: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=1600&q=80',
    name: 'Central Park',
    category: 'nature'
  },
  {
    url: 'https://images.unsplash.com/photo-1485871981521-5b1fd3805eee?w=1600&q=80',
    name: 'Manhattan Skyline',
    category: 'nyc'
  }
];

export function SharePreviewDialog({ open, onOpenChange, activity, onConfirmShare }: SharePreviewDialogProps) {
  const [shareTitle, setShareTitle] = useState(activity.shareTitle || activity.planSummary || activity.title);
  const [backdrop, setBackdrop] = useState(activity.backdrop || '');
  const [customBackdrop, setCustomBackdrop] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    setShareTitle(activity.shareTitle || activity.planSummary || activity.title);
    setBackdrop(activity.backdrop || '');
    setCustomBackdrop('');
  }, [activity, open]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const updates = {
        shareTitle: shareTitle !== (activity.planSummary || activity.title) ? shareTitle : undefined,
        backdrop: backdrop || undefined
      };
      return apiRequest('PUT', `/api/activities/${activity.id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
      onConfirmShare();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update share settings',
        variant: 'destructive',
      });
    },
  });

  const handleBackdropSelect = (url: string) => {
    setBackdrop(url);
    setCustomBackdrop('');
  };

  const handleCustomBackdrop = () => {
    if (customBackdrop) {
      setBackdrop(customBackdrop);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Customize Your Shared Activity
          </DialogTitle>
          <DialogDescription>
            Edit how your activity appears when shared with others
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Share Title */}
          <div className="space-y-2">
            <Label htmlFor="share-title">Share Title</Label>
            <Input
              id="share-title"
              value={shareTitle}
              onChange={(e) => setShareTitle(e.target.value)}
              placeholder="Enter a catchy title for sharing..."
              data-testid="input-share-title"
            />
            <p className="text-xs text-muted-foreground">
              This title will be displayed on your shared activity page
            </p>
          </div>

          {/* Backdrop Selector */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Image className="w-4 h-4" />
              Background Image
            </Label>
            
            {/* Preset Backdrops */}
            <div>
              <p className="text-sm text-muted-foreground mb-2">Choose a preset:</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {backdropPresets.map((preset) => (
                  <button
                    key={preset.url}
                    onClick={() => handleBackdropSelect(preset.url)}
                    className={`relative aspect-video rounded-md overflow-hidden border-2 transition-all hover:scale-105 ${
                      backdrop === preset.url ? 'border-primary ring-2 ring-primary' : 'border-transparent'
                    }`}
                    data-testid={`backdrop-preset-${preset.category}`}
                  >
                    <img 
                      src={preset.url} 
                      alt={preset.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-end p-1.5">
                      <span className="text-xs text-white font-medium">{preset.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom URL */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Or enter a custom image URL:</p>
              <div className="flex gap-2">
                <Input
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={customBackdrop}
                  onChange={(e) => setCustomBackdrop(e.target.value)}
                  data-testid="input-custom-backdrop"
                />
                <Button 
                  variant="outline" 
                  onClick={handleCustomBackdrop}
                  disabled={!customBackdrop}
                  data-testid="button-apply-custom-backdrop"
                >
                  Apply
                </Button>
              </div>
            </div>

            {/* Preview */}
            {backdrop && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Preview:</p>
                <div className="relative aspect-video rounded-md overflow-hidden border">
                  <img 
                    src={backdrop} 
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23ddd" width="400" height="300"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3EInvalid Image%3C/text%3E%3C/svg%3E';
                    }}
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-4">
                    <h3 className="text-white text-xl font-bold text-center drop-shadow-lg">
                      {shareTitle}
                    </h3>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel-share-preview"
            >
              Cancel
            </Button>
            <Button
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending}
              data-testid="button-confirm-share"
              className="gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {updateMutation.isPending ? 'Saving...' : 'Save & Share'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
