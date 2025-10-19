import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Image, Sparkles, Upload, Shield, ShieldCheck, ChevronDown } from 'lucide-react';

interface Activity {
  id: string;
  title: string;
  planSummary?: string | null;
  shareTitle?: string | null;
  backdrop?: string | null;
  category: string;
}

interface SharePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity: Activity;
  onConfirmShare: (shareData: { shareTitle: string; backdrop: string }) => void;
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

type PrivacyPreset = 'off' | 'public' | 'private' | 'custom';

interface PrivacySettings {
  redactNames: boolean;
  redactLocations: boolean;
  redactContact: boolean;
  redactDates: boolean;
  redactContext: boolean;
}

export function SharePreviewDialog({ open, onOpenChange, activity, onConfirmShare }: SharePreviewDialogProps) {
  const [shareTitle, setShareTitle] = useState(activity.shareTitle || activity.planSummary || activity.title);
  const [backdrop, setBackdrop] = useState(activity.backdrop || '');
  const [customBackdrop, setCustomBackdrop] = useState('');
  const [privacyPreset, setPrivacyPreset] = useState<PrivacyPreset>('off');
  const [showPrivacySettings, setShowPrivacySettings] = useState(false);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    redactNames: true,
    redactLocations: true,
    redactContact: true,
    redactDates: true,
    redactContext: true,
  });
  const [redactedPreview, setRedactedPreview] = useState<{ title: string; tasks: { title: string }[] } | null>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
        shareTitle: shareTitle || null,
        backdrop: backdrop || null
      };
      return apiRequest('PUT', `/api/activities/${activity.id}`, updates);
    },
    onSuccess: async () => {
      // Wait for cache invalidation to complete
      await queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
      // Pass the updated values to parent
      onConfirmShare({ shareTitle, backdrop });
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

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid File',
        description: 'Please upload an image file (JPG, PNG, etc.)',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Please upload an image smaller than 5MB',
        variant: 'destructive',
      });
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setBackdrop(base64String);
      setCustomBackdrop('');
    };
    reader.onerror = () => {
      toast({
        title: 'Upload Failed',
        description: 'Failed to read the image file',
        variant: 'destructive',
      });
    };
    reader.readAsDataURL(file);
  };

  // Privacy scan function
  const runPrivacyScan = async () => {
    if (privacyPreset === 'off') {
      setRedactedPreview(null);
      return;
    }

    try {
      setScanLoading(true);
      const response = await apiRequest('POST', `/api/activities/${activity.id}/privacy-scan`, {
        privacySettings
      });
      
      if (response.redacted) {
        setRedactedPreview({
          title: response.activity.title,
          tasks: response.tasks.map((t: any) => ({ title: t.title }))
        });
      } else {
        setRedactedPreview(null);
      }
    } catch (error: any) {
      toast({
        title: 'Privacy Scan Failed',
        description: error.message || 'Failed to scan content for privacy',
        variant: 'destructive',
      });
      setRedactedPreview(null);
    } finally {
      setScanLoading(false);
    }
  };

  // Run privacy scan when settings change
  useEffect(() => {
    if (open && privacyPreset !== 'off') {
      runPrivacyScan();
    } else {
      setRedactedPreview(null);
    }
  }, [privacyPreset, privacySettings, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
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

            {/* Image Upload */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Or upload your own image:</p>
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  data-testid="input-image-upload"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2 flex-1"
                  data-testid="button-upload-image"
                >
                  <Upload className="w-4 h-4" />
                  Upload Image
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Max file size: 5MB (JPG, PNG, GIF, etc.)
              </p>
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
          </div>

          {/* Privacy Shield Section */}
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                {privacyPreset === 'off' ? (
                  <Shield className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                )}
                Privacy Shield
              </Label>
              <Select 
                value={privacyPreset} 
                onValueChange={(value) => {
                  setPrivacyPreset(value as PrivacyPreset);
                  if (value === 'private') {
                    setPrivacySettings({
                      redactNames: true,
                      redactLocations: true,
                      redactContact: true,
                      redactDates: true,
                      redactContext: true,
                    });
                  } else if (value === 'public') {
                    setPrivacySettings({
                      redactNames: false,
                      redactLocations: false,
                      redactContact: false,
                      redactDates: false,
                      redactContext: false,
                    });
                  }
                  setShowPrivacySettings(value === 'custom');
                }}
                data-testid="select-privacy-preset"
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="off">Off</SelectItem>
                  <SelectItem value="public">🌟 Public Creator</SelectItem>
                  <SelectItem value="private">🛡️ Privacy-First</SelectItem>
                  <SelectItem value="custom">⚙️ Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Privacy Info */}
            {privacyPreset === 'off' && (
              <p className="text-xs text-muted-foreground">
                Privacy shield is disabled. All content will be shared as-is.
              </p>
            )}
            {privacyPreset === 'public' && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                Public Creator Mode: Minimal redaction. Perfect for influencers and content creators who want to share full details.
              </p>
            )}
            {privacyPreset === 'private' && (
              <p className="text-xs text-purple-600 dark:text-purple-400">
                Privacy-First Mode: Maximum protection. All PII/PHI will be automatically redacted before sharing.
              </p>
            )}

            {/* Custom Privacy Settings */}
            {showPrivacySettings && privacyPreset === 'custom' && (
              <div className="space-y-3 pl-4 border-l-2 border-purple-200 dark:border-purple-800">
                <p className="text-sm font-medium text-muted-foreground">Select what to redact:</p>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="redact-names"
                      checked={privacySettings.redactNames}
                      onCheckedChange={(checked) => 
                        setPrivacySettings(prev => ({ ...prev, redactNames: checked as boolean }))
                      }
                      data-testid="checkbox-redact-names"
                    />
                    <Label htmlFor="redact-names" className="text-sm cursor-pointer">
                      Exact names (replace with "Someone", "Friend")
                    </Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="redact-locations"
                      checked={privacySettings.redactLocations}
                      onCheckedChange={(checked) => 
                        setPrivacySettings(prev => ({ ...prev, redactLocations: checked as boolean }))
                      }
                      data-testid="checkbox-redact-locations"
                    />
                    <Label htmlFor="redact-locations" className="text-sm cursor-pointer">
                      Exact addresses/locations (use city only or "A location")
                    </Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="redact-contact"
                      checked={privacySettings.redactContact}
                      onCheckedChange={(checked) => 
                        setPrivacySettings(prev => ({ ...prev, redactContact: checked as boolean }))
                      }
                      data-testid="checkbox-redact-contact"
                    />
                    <Label htmlFor="redact-contact" className="text-sm cursor-pointer">
                      Contact info (phone, email)
                    </Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="redact-dates"
                      checked={privacySettings.redactDates}
                      onCheckedChange={(checked) => 
                        setPrivacySettings(prev => ({ ...prev, redactDates: checked as boolean }))
                      }
                      data-testid="checkbox-redact-dates"
                    />
                    <Label htmlFor="redact-dates" className="text-sm cursor-pointer">
                      Specific dates/times (generalize to "morning", "evening")
                    </Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="redact-context"
                      checked={privacySettings.redactContext}
                      onCheckedChange={(checked) => 
                        setPrivacySettings(prev => ({ ...prev, redactContext: checked as boolean }))
                      }
                      data-testid="checkbox-redact-context"
                    />
                    <Label htmlFor="redact-context" className="text-sm cursor-pointer">
                      Personal context (family members, medical info)
                    </Label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Privacy Preview - Original vs Redacted */}
          {privacyPreset !== 'off' && (
            <div className="space-y-3 border-t pt-4">
              <p className="text-sm font-medium flex items-center gap-2">
                {scanLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600" />
                    Scanning for sensitive information...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Privacy Preview
                  </>
                )}
              </p>
              
              {!scanLoading && redactedPreview && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Original Content */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Original</p>
                    <div className="rounded-md border p-3 bg-background space-y-2">
                      <p className="text-sm font-medium">{activity.title}</p>
                      <div className="space-y-1">
                        {activity.planSummary && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{activity.planSummary}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Redacted Content */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Protected Version</p>
                    <div className="rounded-md border border-emerald-200 dark:border-emerald-800 p-3 bg-emerald-50 dark:bg-emerald-950/20 space-y-2">
                      <p className="text-sm font-medium">{redactedPreview.title}</p>
                      {redactedPreview.tasks.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {redactedPreview.tasks.length} task{redactedPreview.tasks.length !== 1 ? 's' : ''} protected
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-3">
            {/* Backdrop Preview */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Backdrop Preview:</p>
              <div className="relative aspect-video rounded-md overflow-hidden border bg-muted">
                {backdrop ? (
                  <>
                    <img 
                      key={backdrop}
                      src={backdrop} 
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23ddd" width="400" height="300"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3EInvalid Image%3C/text%3E%3C/svg%3E';
                      }}
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-4">
                      <h3 className="text-white text-xl md:text-2xl font-bold text-center drop-shadow-lg">
                        {shareTitle}
                      </h3>
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center p-4">
                    <div className="text-center text-muted-foreground">
                      <Image className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Select or upload a backdrop to preview</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
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
