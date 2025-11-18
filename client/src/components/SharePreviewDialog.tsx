import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Image, Sparkles, Upload, Shield, ShieldCheck, ChevronDown, Users, Download, Share2, BadgeCheck } from 'lucide-react';
import { Card, CardHeader, CardContent, CardDescription } from '@/components/ui/card';
import { ShareCardGenerator } from './ShareCardGenerator';
import { SocialVerificationTab, type SocialMediaLinks } from './SocialVerificationTab';

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
  onConfirmShare: (shareData: { shareTitle: string; backdrop: string; shareableLink?: string; socialText?: string }) => void;
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
  const [activeTab, setActiveTab] = useState('quick-share');
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
  const [publishToCommunity, setPublishToCommunity] = useState(false);
  const [twitterHandle, setTwitterHandle] = useState('');
  const [instagramHandle, setInstagramHandle] = useState('');
  const [threadsHandle, setThreadsHandle] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [socialLinks, setSocialLinks] = useState<SocialMediaLinks>({});
  const [createGroup, setCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch activity tasks for share card
  const { data: activityTasks = [] } = useQuery({
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
    enabled: open && activeTab === 'download-cards',
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
            websiteUrl: websiteUrl?.trim() || undefined
          })
        });
        
        if (!publishResponse.ok) {
          const error = await publishResponse.json();
          throw new Error(error.error || 'Failed to publish to community');
        }
        
        const publishData = await publishResponse.json();
        publishedToCommunity = publishData.publishedToCommunity || false;
      }

      // Then trigger share with optional group creation
      const shareData: any = {
        createGroup,
      };
      
      if (createGroup) {
        shareData.groupName = groupName.trim();
        shareData.groupDescription = groupDescription.trim() || null;
      }

      // Use fetch to properly handle error responses
      const response = await fetch(`/api/activities/${activity.id}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(shareData)
      });

      const data = await response.json();

      // Check for subscription tier error
      if (!response.ok) {
        if (response.status === 403 && data.message) {
          throw new Error(data.message);
        }
        throw new Error(data.error || 'Failed to share activity');
      }

      return { ...data, publishedToCommunity };
    },
    onSuccess: async (data: any) => {
      // Wait for cache invalidation to complete
      await queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/community-plans'] });
      
      // Show success message
      let description = 'Activity shared successfully!';
      if (data.publishedToCommunity && data.groupCreated) {
        description = 'Activity published to Community Discovery and group created!';
      } else if (data.publishedToCommunity) {
        description = 'Activity published to Community Discovery!';
      } else if (data.groupCreated) {
        description = 'Activity shared and group created successfully!';
      }
      
      toast({
        title: 'Success!',
        description,
      });
      
      // Pass the updated values AND shareableLink to parent
      onConfirmShare({ shareTitle, backdrop, shareableLink: data.shareableLink, socialText: data.socialText });
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full p-4 sm:p-6">
        <DialogHeader className="space-y-2">
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Sparkles className="w-5 h-5 text-primary flex-shrink-0" />
            <span className="truncate">Share & Customize Your Activity</span>
          </DialogTitle>
          <DialogDescription className="text-sm">
            Quick share, download cards, or verify with social media
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-4">
          <TabsList className="grid w-full grid-cols-3 h-auto">
            <TabsTrigger value="quick-share" className="flex items-center gap-1 sm:gap-2 min-h-[44px] text-xs sm:text-sm">
              <Share2 className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline">Quick Share</span>
              <span className="sm:hidden">Share</span>
            </TabsTrigger>
            <TabsTrigger value="download-cards" className="flex items-center gap-1 sm:gap-2 min-h-[44px] text-xs sm:text-sm">
              <Download className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline">Download Cards</span>
              <span className="sm:hidden">Cards</span>
            </TabsTrigger>
            <TabsTrigger value="social-verify" className="flex items-center gap-1 sm:gap-2 min-h-[44px] text-xs sm:text-sm">
              <BadgeCheck className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline">Social Verification</span>
              <span className="sm:hidden">Verify</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Quick Share (existing functionality) */}
          <TabsContent value="quick-share" className="space-y-6 py-4">
          {/* Share Title */}
          <div className="space-y-2">
            <Label htmlFor="share-title">Share Title</Label>
            <Input
              id="share-title"
              value={shareTitle}
              onChange={(e) => setShareTitle(e.target.value)}
              placeholder="Enter a catchy title for sharing..."
              maxLength={140}
              data-testid="input-share-title"
            />
            <div className="flex items-center justify-between text-xs">
              <p className="text-muted-foreground">
                This title will be displayed on your shared activity page
              </p>
              <span className={`font-medium ${shareTitle.length > 100 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                {shareTitle.length}/140
              </span>
            </div>
            {shareTitle.length > 100 && (
              <p className="text-xs text-amber-600">
                Tip: Shorter titles (under 100 chars) display better on social media
              </p>
            )}
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

          {/* Publish to Community Discovery */}
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center gap-2">
              <Checkbox 
                id="publish-community"
                checked={publishToCommunity}
                onCheckedChange={(checked) => setPublishToCommunity(checked as boolean)}
                data-testid="checkbox-publish-community"
              />
              <Label htmlFor="publish-community" className="flex items-center gap-2 cursor-pointer">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span className="font-medium">Publish to Community Discovery</span>
              </Label>
            </div>
            
            {publishToCommunity && (
              <div className="pl-6 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Your plan will be featured in the Community Discovery section for others to explore and use.
                </p>
                {privacyPreset === 'off' && (
                  <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4" />
                    Tip: Enable Privacy Shield above to protect personal details before publishing.
                  </p>
                )}
                
                {/* Social Media Links Section */}
                <div className="space-y-3 border-t pt-4">
                  <p className="text-sm font-medium">
                    Social Media Verification <span className="text-destructive">*</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    At least one social media link is required for community publishing
                  </p>
                  
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="twitter-handle" className="text-sm">
                        Twitter/X Profile
                      </Label>
                      <Input
                        id="twitter-handle"
                        value={twitterHandle}
                        onChange={(e) => setTwitterHandle(e.target.value)}
                        placeholder="https://twitter.com/yourusername"
                        data-testid="input-twitter-handle"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="instagram-handle" className="text-sm">
                        Instagram Profile
                      </Label>
                      <Input
                        id="instagram-handle"
                        value={instagramHandle}
                        onChange={(e) => setInstagramHandle(e.target.value)}
                        placeholder="https://instagram.com/yourusername"
                        data-testid="input-instagram-handle"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="threads-handle" className="text-sm">
                        Threads Profile
                      </Label>
                      <Input
                        id="threads-handle"
                        value={threadsHandle}
                        onChange={(e) => setThreadsHandle(e.target.value)}
                        placeholder="https://threads.net/@yourusername"
                        data-testid="input-threads-handle"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="website-url" className="text-sm">
                        Website URL
                      </Label>
                      <Input
                        id="website-url"
                        value={websiteUrl}
                        onChange={(e) => setWebsiteUrl(e.target.value)}
                        placeholder="https://yourwebsite.com"
                        data-testid="input-website-url"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Group Creation Section */}
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Checkbox 
                id="create-group"
                checked={createGroup}
                onCheckedChange={(checked) => setCreateGroup(checked as boolean)}
                data-testid="checkbox-create-group"
              />
              <Label htmlFor="create-group" className="flex items-center gap-2 cursor-pointer">
                <Users className="w-4 h-4" />
                <span className="font-medium">Create Group - Allow contributors to propose changes (admin approval required)</span>
              </Label>
            </div>

            {createGroup && (
              <Card className="border-dashed">
                <CardContent className="pt-6 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="group-name">
                      Group Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="group-name"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      placeholder="Enter a name for your group..."
                      maxLength={100}
                      data-testid="input-group-name"
                    />
                    <p className="text-xs text-muted-foreground">
                      Maximum 100 characters
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="group-description">
                      Description (optional)
                    </Label>
                    <Input
                      id="group-description"
                      value={groupDescription}
                      onChange={(e) => setGroupDescription(e.target.value)}
                      placeholder="What is this group about?..."
                      maxLength={500}
                      data-testid="input-group-description"
                    />
                    <p className="text-xs text-muted-foreground">
                      Maximum 500 characters
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

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
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-4 sm:p-6">
                      <div className="flex flex-col items-center justify-center max-w-[90%] sm:max-w-[80%]">
                        <h3 
                          className="text-white font-bold text-center drop-shadow-lg break-words leading-tight line-clamp-3 sm:line-clamp-2" 
                          style={{ fontSize: 'clamp(1.125rem, 2vw + 0.5rem, 1.5rem)' }}
                        >
                          {shareTitle}
                        </h3>
                      </div>
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
          </TabsContent>

          {/* Tab 2: Download Cards */}
          <TabsContent value="download-cards" className="py-4">
            <ShareCardGenerator
              activityId={activity.id}
              activityTitle={shareTitle}
              activityCategory={activity.category}
              backdrop={backdrop || ''}
              planSummary={activity.planSummary || undefined}
              tasks={activityTasks}
            />
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
  );
}
