import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles, Bookmark, MapPin, Tag, DollarSign } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface SocialMediaShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  extractedContent: string;
  onPlanNow: () => void;
}

interface SavedContentResult {
  success: boolean;
  savedContent: {
    id: string;
    title: string | null;
    city: string | null;
    category: string;
    categoryDisplay: string;
    budgetDisplay: string;
    venues: Array<{ name: string; type: string }>;
  };
  journalEntryId?: string;
}

export function SocialMediaShareDialog({
  isOpen,
  onClose,
  url,
  extractedContent,
  onPlanNow
}: SocialMediaShareDialogProps) {
  const [userNotes, setUserNotes] = useState('');
  const [autoJournal, setAutoJournal] = useState(true);
  const [saveResult, setSaveResult] = useState<SavedContentResult | null>(null);
  const { toast } = useToast();

  const saveMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/user/saved-content', {
        sourceUrl: url,
        extractedContent,
        userNotes: userNotes || null,
        autoJournal
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save content');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setSaveResult(data);
      queryClient.invalidateQueries({ queryKey: ['/api/user/saved-content'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/saved-locations'] });
      
      toast({
        title: 'Saved for later!',
        description: data.savedContent.city 
          ? `Added to your ${data.savedContent.city} collection`
          : 'Content saved to your preferences'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to save',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const handleSaveForLater = () => {
    saveMutation.mutate();
  };

  const handlePlanNow = () => {
    onClose();
    onPlanNow();
  };

  const handleClose = () => {
    setSaveResult(null);
    setUserNotes('');
    onClose();
  };

  const platform = url.includes('instagram') ? 'Instagram' : 
                   url.includes('tiktok') ? 'TikTok' : 
                   url.includes('youtube') ? 'YouTube' : 'social media';

  if (saveResult) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bookmark className="h-5 w-5 text-emerald-500" />
              Saved Successfully!
            </DialogTitle>
            <DialogDescription>
              {saveResult.savedContent.title || 'Content'} has been added to your preferences
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {saveResult.savedContent.city && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{saveResult.savedContent.city}</span>
              </div>
            )}
            
            <div className="flex items-center gap-2 text-sm">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <span>{saveResult.savedContent.categoryDisplay}</span>
            </div>
            
            {saveResult.savedContent.budgetDisplay && saveResult.savedContent.budgetDisplay !== 'Unknown' && (
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span>{saveResult.savedContent.budgetDisplay}</span>
              </div>
            )}
            
            {saveResult.savedContent.venues && saveResult.savedContent.venues.length > 0 && (
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-2">Saved venues:</p>
                <div className="flex flex-wrap gap-1">
                  {saveResult.savedContent.venues.slice(0, 5).map((venue, i) => (
                    <span 
                      key={i}
                      className="bg-background px-2 py-0.5 rounded text-xs"
                    >
                      {venue.name}
                    </span>
                  ))}
                  {saveResult.savedContent.venues.length > 5 && (
                    <span className="text-xs text-muted-foreground">
                      +{saveResult.savedContent.venues.length - 5} more
                    </span>
                  )}
                </div>
              </div>
            )}
            
            {saveResult.journalEntryId && (
              <p className="text-xs text-muted-foreground">
                A journal entry has been created for this content.
              </p>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={handleClose}
              data-testid="button-done"
            >
              Done
            </Button>
            <Button 
              className="flex-1"
              onClick={handlePlanNow}
              data-testid="button-plan-now-after-save"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Plan This Now
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>What would you like to do?</DialogTitle>
          <DialogDescription>
            You shared {platform} content. Choose how to handle it.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="grid gap-3">
            <Button 
              className="h-auto py-4 justify-start"
              onClick={handlePlanNow}
              disabled={saveMutation.isPending}
              data-testid="button-plan-now"
            >
              <Sparkles className="h-5 w-5 mr-3 shrink-0" />
              <div className="text-left">
                <div className="font-medium">Plan this now</div>
                <div className="text-xs opacity-80 font-normal">
                  Create an action plan based on this content
                </div>
              </div>
            </Button>
            
            <Button 
              variant="outline"
              className="h-auto py-4 justify-start"
              onClick={handleSaveForLater}
              disabled={saveMutation.isPending}
              data-testid="button-save-for-later"
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-5 w-5 mr-3 shrink-0 animate-spin" />
              ) : (
                <Bookmark className="h-5 w-5 mr-3 shrink-0" />
              )}
              <div className="text-left">
                <div className="font-medium">Save for later</div>
                <div className="text-xs opacity-80 font-normal">
                  Add to your saved spots & preferences
                </div>
              </div>
            </Button>
          </div>
          
          <div className="border-t pt-4 space-y-3">
            <div>
              <Label htmlFor="notes" className="text-sm">
                Add a note (optional)
              </Label>
              <Textarea
                id="notes"
                placeholder="Why you're saving this..."
                value={userNotes}
                onChange={(e) => setUserNotes(e.target.value)}
                className="mt-1.5 resize-none"
                rows={2}
                data-testid="input-user-notes"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-journal" className="text-sm">
                Create journal entry
              </Label>
              <Switch
                id="auto-journal"
                checked={autoJournal}
                onCheckedChange={setAutoJournal}
                data-testid="switch-auto-journal"
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function isSocialMediaUrl(url: string): boolean {
  const socialPatterns = [
    /instagram\.com/i,
    /tiktok\.com/i,
    /youtube\.com/i,
    /youtu\.be/i,
    /twitter\.com/i,
    /x\.com/i
  ];
  return socialPatterns.some(pattern => pattern.test(url));
}

export function extractUrlFromText(text: string): string | null {
  const urlPattern = /(https?:\/\/[^\s]+)/i;
  const match = text.match(urlPattern);
  return match ? match[1] : null;
}
