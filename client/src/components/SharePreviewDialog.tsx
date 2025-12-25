import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Image, Sparkles, Upload, Shield, ShieldCheck, ChevronDown, Users, Download, Share2, BadgeCheck, AlertTriangle, X, Loader2, Link, Copy, ImageIcon } from 'lucide-react';
import { Card, CardHeader, CardContent, CardDescription } from '@/components/ui/card';
import { ShareCardGenerator, type ShareCardGeneratorRef } from './ShareCardGenerator';
import { SocialVerificationTab, type SocialMediaLinks } from './SocialVerificationTab';
import { generatePlatformCaption } from '@/lib/shareCardTemplates';

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
  onConfirmShare: (shareData: {
    shareTitle: string;
    backdrop: string;
    shareableLink?: string;
    socialText?: string;
    shareCardImageBlob?: Blob;      // The generated share card image blob
    shareCardImageFile?: File;      // File object for native share API
  }) => void;
}

// Fallback presets (used when API fails or during loading)
const defaultBackdropPresets = [
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

interface BackdropOption {
  url: string;
  source: 'tavily' | 'unsplash' | 'user';
  label?: string;
}

type PrivacyPreset = 'off' | 'public' | 'private' | 'custom';

interface PrivacySettings {
  redactNames: boolean;
  redactLocations: boolean;
  redactContact: boolean;
  redactDates: boolean;
  redactContext: boolean;
}

export function SharePreviewDialog({ open, onOpenChange, activity, onConfirmShare }: SharePreviewDialogProps) {
  // Tab state - Share Cards is the default/main tab
  const [activeTab, setActiveTab] = useState('share-cards');


  // Share configuration state
  const [shareTitle, setShareTitle] = useState(activity.shareTitle || activity.planSummary || activity.title);
  const [backdrop, setBackdrop] = useState(activity.backdrop || '');
  const [customBackdrop, setCustomBackdrop] = useState('');

  // Fetch dynamic backdrop options based on activity
  const { data: backdropOptions = [], isLoading: isLoadingBackdrops } = useQuery({
    queryKey: ['backdrop-options', activity.id],
    queryFn: async () => {
      const response = await fetch(`/api/activities/${activity.id}/backdrop-options`, {
        credentials: 'include'
      });
      if (!response.ok) return [];
      const data = await response.json();
      return data.options as BackdropOption[];
    },
    enabled: open && !!activity.id,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Use dynamic options if available, otherwise fallback to defaults
  const backdropPresets = backdropOptions.length > 0
    ? backdropOptions.map((opt: BackdropOption) => ({
        url: opt.url,
        name: opt.label || (opt.source === 'tavily' ? 'Web' : 'HD Curated'),
        category: opt.source
      }))
    : defaultBackdropPresets;

  // Auto-select first dynamic backdrop when options load and no backdrop is set
  useEffect(() => {
    if (backdropOptions.length > 0 && !backdrop && !activity.backdrop) {
      setBackdrop(backdropOptions[0].url);
    }
  }, [backdropOptions, backdrop, activity.backdrop]);

  // Privacy & Publishing state
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
  const [publishToCommunity, setPublishToCommunity] = useState(false);
  
  // Social media state
  const [twitterHandle, setTwitterHandle] = useState('');
  const [instagramHandle, setInstagramHandle] = useState('');
  const [threadsHandle, setThreadsHandle] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [socialLinks, setSocialLinks] = useState<SocialMediaLinks>({});
  
  // Group creation state
  const [createGroup, setCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  
  // Duplicate detection state
  const [duplicateDetected, setDuplicateDetected] = useState(false);
  const [duplicateMessage, setDuplicateMessage] = useState('');
  const [forceDuplicate, setForceDuplicate] = useState(false);


  const fileInputRef = useRef<HTMLInputElement>(null);
  const shareCardRef = useRef<ShareCardGeneratorRef>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch activity tasks for share card preview - load immediately when dialog opens
  const { data: activityTasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['/api/activities', activity.id, 'tasks'],
    queryFn: async () => {
      const response = await fetch(`/api/activities/${activity.id}/tasks`, {
        credentials: 'include'
      });
      if (!response.ok) return [];
      const data = await response.json();
      return data.map((task: any) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        category: task.category,
        priority: task.priority,
        completed: task.completed || false,
      }));
    },
    enabled: open, // Fetch as soon as dialog opens
  });

  useEffect(() => {
    setShareTitle(activity.shareTitle || activity.planSummary || activity.title);
    setBackdrop(activity.backdrop || '');
    setCustomBackdrop('');
    setPublishToCommunity(false);
    setTwitterHandle('');
    setInstagramHandle('');
    setThreadsHandle('');
    setWebsiteUrl('');
    setCreateGroup(false);
    setGroupName('');
    setGroupDescription('');
  }, [activity, open]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      // Validate group creation
      if (createGroup && (!groupName || groupName.trim().length === 0)) {
        throw new Error('Group name is required');
      }
      if (groupName && groupName.length > 100) {
        throw new Error('Group name cannot exceed 100 characters');
      }
      if (groupDescription && groupDescription.length > 500) {
        throw new Error('Group description cannot exceed 500 characters');
      }

      // Validate social media links when publishToCommunity is true
      if (publishToCommunity) {
        const hasValidLink = [
          twitterHandle?.trim(),
          instagramHandle?.trim(),
          threadsHandle?.trim(),
          websiteUrl?.trim()
        ].some(link => link && link.length > 0);
        
        if (!hasValidLink) {
          throw new Error('At least one social media link is required when publishing to Community Discovery');
        }
      }

      // First update activity with shareTitle and backdrop
      const updates = {
        shareTitle: shareTitle || null,
        backdrop: backdrop || null
      };
      await apiRequest('PUT', `/api/activities/${activity.id}`, updates);

      // Publish to community if requested
      let publishedToCommunity = false;
      let publishData: any = null; // Declare outside the if block
      if (publishToCommunity) {
        const publishResponse = await fetch(`/api/activities/${activity.id}/publish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            privacySettings,
            privacyPreset,
            twitterHandle: twitterHandle?.trim() || undefined,
            instagramHandle: instagramHandle?.trim() || undefined,
            threadsHandle: threadsHandle?.trim() || undefined,
            websiteUrl: websiteUrl?.trim() || undefined,
            forceDuplicate
          })
        });
        
        if (!publishResponse.ok) {
          const error = await publishResponse.json();
          
          // Handle duplicate plan detection (409 Conflict)
          if (publishResponse.status === 409) {
            const duplicateMsg = error.message || 
              `You've already published a similar plan. Please use a different title or update your existing plan.`;
            
            // Set duplicate state first, then throw
            // The setTimeout ensures state is set before mutation enters error state
            setTimeout(() => {
              setDuplicateMessage(duplicateMsg);
              setDuplicateDetected(true);
            }, 0);
            
            // Stop the mutation flow - user must acknowledge duplicate
            throw new Error('DUPLICATE_PLAN_DETECTED');
          }
          
          throw new Error(error.error || 'Failed to publish to community');
        }
        
        publishData = await publishResponse.json();
        publishedToCommunity = publishData.publishedToCommunity || false;
      }

      // Generate beautiful share card image for OG tags AND native sharing
      let shareCardImageData: string | undefined;
      let captionText: string | undefined;
      let generatedBlob: Blob | undefined;
      let generatedFile: File | undefined;

      if (backdrop) {
        // Wait for ShareCardGenerator to mount and expose ref
        // Small delay ensures React has rendered the hidden component
        await new Promise(resolve => setTimeout(resolve, 300));
        
        if (!shareCardRef.current) {
          console.warn('[SharePreview] ShareCardGenerator ref not available - image generation skipped');
        }
      }

      if (backdrop && shareCardRef.current) {
        try {
          console.log('[SharePreview] Generating share card image...');
          const imageBlob = await shareCardRef.current.generateShareCard('instagram_feed', 'jpg');
          if (imageBlob) {
            console.log('[SharePreview] Share card image generated successfully:', imageBlob.size, 'bytes');
            // Store the blob for native sharing
            generatedBlob = imageBlob;

            // Create File object for native share API
            const safeFileName = shareTitle
              .replace(/[^a-z0-9]/gi, '-')
              .toLowerCase()
              .substring(0, 50); // Limit filename length
            generatedFile = new File(
              [imageBlob],
              `${safeFileName || 'activity'}.jpg`,
              { type: 'image/jpeg' }
            );

            // Convert to base64 for OG tags
            const reader = new FileReader();
            shareCardImageData = await new Promise((resolve, reject) => {
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(imageBlob);
            });
          }

          // Generate caption with platform-agnostic text
          const caption = generatePlatformCaption(
            shareTitle,
            activity.category,
            'instagram_feed',
            undefined,
            undefined,
            activity.planSummary || undefined,
            activity.id
          );
          captionText = caption.fullText;
        } catch (error) {
          console.warn('Failed to generate share card image:', error);
          // Continue without the image - it's optional
        }
      }

      // Smart share logic: Only trigger share if creating a group or if NOT publishing
      // When only publishing to Community Discovery, skip the share endpoint
      const shouldShare = createGroup || !publishToCommunity;
      
      let data: any = { 
        publishedToCommunity,
        shareableLink: publishData?.shareableLink || undefined
      };
      
      if (shouldShare) {
        // Then trigger share with optional group creation
        const shareData: any = {
          createGroup,
        };
        
        if (createGroup) {
          shareData.groupName = groupName.trim();
          shareData.groupDescription = groupDescription.trim() || null;
        }
        
        // Include caption for OG tags (skip large base64 image in request)
        if (captionText) {
          shareData.shareCaption = captionText;
        }

        // Use fetch to properly handle error responses
        const response = await fetch(`/api/activities/${activity.id}/share`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(shareData)
        });

        data = await response.json();

        // Check for subscription tier error
        if (!response.ok) {
          if (response.status === 403 && data.message) {
            throw new Error(data.message);
          }
          throw new Error(data.error || 'Failed to share activity');
        }
        
        data.publishedToCommunity = publishedToCommunity;
      }

      // Include image blob/file in the returned data
      return {
        ...data,
        generatedBlob,
        generatedFile,
      };
    },
    onSuccess: async (data: any) => {
      // Reset all duplicate-related state on success
      setForceDuplicate(false);
      setDuplicateDetected(false);
      setDuplicateMessage('');

      // Wait for cache invalidation to complete
      await queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/community-plans'] });

      // Show success message
      let description = 'Share settings saved successfully!';
      if (data.publishedToCommunity && data.groupCreated) {
        description = 'Published to Community Discovery and group created!';
      } else if (data.publishedToCommunity) {
        description = 'Published to Community Discovery!';
      } else if (data.groupCreated) {
        description = 'Group created successfully!';
      }

      toast({
        title: 'Success!',
        description,
      });

      // Call onConfirmShare and close dialog
      onConfirmShare({
        shareTitle,
        backdrop,
        shareableLink: data.shareableLink || undefined,
        socialText: data.socialText || undefined
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      // Don't show toast for duplicate detection - handled by dialog
      if (error.message === 'DUPLICATE_PLAN_DETECTED') {
        return;
      }
      
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

  // Copy share link to clipboard
  const handleCopyLink = async () => {
    const shareUrl = `https://journalmate.ai/shared/${activity.id}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: 'Link Copied!',
        description: 'Share link copied to clipboard',
      });
    } catch (error) {
      toast({
        title: 'Copy Failed',
        description: 'Could not copy link to clipboard',
        variant: 'destructive',
      });
    }
  };

  // Native share for link
  const handleNativeShare = async () => {
    const shareUrl = `https://journalmate.ai/shared/${activity.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: activity.planSummary || shareTitle,
          url: shareUrl,
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
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
      
      if ((response as any).redacted) {
        setRedactedPreview({
          title: (response as any).activity.title,
          tasks: (response as any).tasks.map((t: any) => ({ title: t.title }))
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
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] w-[95vw] sm:w-full p-4 sm:p-6 overflow-y-auto">
        <DialogHeader className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl flex-1">
              <Sparkles className="w-5 h-5 text-primary flex-shrink-0" />
              <span className="truncate">Share & Customize Your Activity</span>
            </DialogTitle>
            <button
              onClick={() => onOpenChange(false)}
              className="hidden sm:inline text-muted-foreground hover:text-foreground transition-colors p-1"
              data-testid="button-close-share-preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <DialogDescription className="text-sm">
            Quick share, download cards, or verify with social media
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-4">
          <TabsList className="grid w-full grid-cols-3 h-auto">
            <TabsTrigger value="share-cards" className="flex items-center gap-1 sm:gap-2 min-h-[44px] text-xs sm:text-sm">
              <ImageIcon className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline">Share Image</span>
              <span className="sm:hidden">Image</span>
            </TabsTrigger>
            <TabsTrigger value="link-preview" className="flex items-center gap-1 sm:gap-2 min-h-[44px] text-xs sm:text-sm">
              <Link className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline">Copy Link</span>
              <span className="sm:hidden">Link</span>
            </TabsTrigger>
            <TabsTrigger value="social-verify" className="flex items-center gap-1 sm:gap-2 min-h-[44px] text-xs sm:text-sm">
              <BadgeCheck className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline">Verify</span>
              <span className="sm:hidden">Verify</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Share Cards - Main share option with platform picker + captions */}
          <TabsContent value="share-cards" className="py-4">
            <div className="w-full overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <div className="min-w-[320px]">
                <ShareCardGenerator
                  activityId={activity.id}
                  activityTitle={shareTitle}
                  activityCategory={activity.category}
                  backdrop={backdrop || ''}
                  planSummary={activity.planSummary || undefined}
                  tasks={activityTasks}
                />
              </div>
            </div>
          </TabsContent>

          {/* Tab 2: Copy Link - Simple link sharing with OG preview */}
          <TabsContent value="link-preview" className="space-y-4 py-4">

          {/* Share Link with Copy Button */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Link className="w-4 h-4" />
              Your Share Link
            </Label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                readOnly
                value={`https://journalmate.ai/shared/${activity.id}`}
                className="flex-1 font-mono text-sm"
                data-testid="input-share-link"
              />
              <Button
                variant="outline"
                onClick={handleCopyLink}
                className="gap-2 min-h-[44px]"
                data-testid="button-copy-link"
              >
                <Copy className="w-4 h-4" />
                <span className="sm:inline">Copy Link</span>
              </Button>
            </div>
          </div>

          {/* OG Image Preview (1200x630 aspect ratio) */}
          <div className="space-y-2">
            <Label>Link Preview (What others see when you share)</Label>
            <Card className="overflow-hidden">
              <div className="aspect-[1200/630] relative bg-muted">
                {backdrop ? (
                  <>
                    <img
                      src={backdrop}
                      alt="Link preview backdrop"
                      className="w-full h-full object-cover"
                    />
                    {/* Overlay with title - OG style */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col justify-end p-4 sm:p-6">
                      <p className="text-white/80 text-xs sm:text-sm mb-1">journalmate.ai</p>
                      <h3 className="text-white text-lg sm:text-2xl font-bold line-clamp-2">{shareTitle}</h3>
                      {activity.planSummary && (
                        <p className="text-white/70 text-xs sm:text-sm mt-1 line-clamp-2">{activity.planSummary}</p>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center p-4">
                    <div className="text-center text-muted-foreground">
                      <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Select a backdrop below</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Share Title */}
          <div className="space-y-2">
            <Label htmlFor="share-title">Title</Label>
            <Input
              id="share-title"
              value={shareTitle}
              onChange={(e) => setShareTitle(e.target.value)}
              placeholder="Enter a catchy title..."
              maxLength={140}
              data-testid="input-share-title"
            />
            <span className={`text-xs ${shareTitle.length > 100 ? 'text-amber-600' : 'text-muted-foreground'}`}>
              {shareTitle.length}/140
            </span>
          </div>

          {/* Backdrop Selector - Simplified */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Image className="w-4 h-4" />
              Backdrop
            </Label>
            {isLoadingBackdrops ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="aspect-video rounded-md bg-muted animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                      onError={(e) => {
                        e.currentTarget.parentElement!.style.display = 'none';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <span className="absolute bottom-1 left-1.5 text-[10px] sm:text-xs text-white font-medium drop-shadow-sm">{preset.name}</span>
                  </button>
                ))}
              </div>
            )}
            {/* Custom upload */}
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="gap-2 flex-1 min-h-[44px]"
                size="sm"
              >
                <Upload className="w-4 h-4" />
                Upload
              </Button>
              <div className="flex gap-2 flex-1">
                <Input
                  type="url"
                  placeholder="Or paste image URL..."
                  value={customBackdrop}
                  onChange={(e) => setCustomBackdrop(e.target.value)}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  onClick={handleCustomBackdrop}
                  disabled={!customBackdrop}
                  size="sm"
                  className="min-h-[44px]"
                >
                  Apply
                </Button>
              </div>
            </div>
          </div>

          {/* Share Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
            <Button
              onClick={handleNativeShare}
              className="flex-1 gap-2 min-h-[44px]"
              data-testid="button-share-link"
            >
              <Share2 className="w-4 h-4" />
              Share Link
            </Button>
            <Button
              variant="outline"
              onClick={handleCopyLink}
              className="flex-1 gap-2 min-h-[44px]"
              data-testid="button-copy-link-bottom"
            >
              <Copy className="w-4 h-4" />
              Copy Link
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            For image sharing with captions, use the "Share Image" tab
          </p>
          </TabsContent>

          {/* Tab 3: Social Verification */}
          <TabsContent value="social-verify" className="py-4">
            <SocialVerificationTab
              activityId={activity.id}
              existingLinks={socialLinks}
              onLinksUpdated={(links) => setSocialLinks(links)}
            />
          </TabsContent>
        </Tabs>

      </DialogContent>
    </Dialog>

    {/* Duplicate Plan Detection Dialog */}
    <AlertDialog open={duplicateDetected} onOpenChange={setDuplicateDetected}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            <AlertDialogTitle>Similar Plan Detected</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-2">
            {duplicateMessage}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => {
            setDuplicateDetected(false);
            setDuplicateMessage('');
            setForceDuplicate(false);
            setPublishToCommunity(false);
            toast({
              title: 'Cancelled',
              description: 'Publishing to Community Discovery cancelled. Try changing your plan title to make it unique.',
            });
          }}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction onClick={() => {
            // Close dialog and reset duplicate state
            setDuplicateDetected(false);
            setDuplicateMessage('');
            // Set force flag
            setForceDuplicate(true);
            // Reset mutation state to clear error, then retry with force flag
            updateMutation.reset();
            setTimeout(() => {
              updateMutation.mutate();
            }, 50);
          }}>
            Publish Anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
