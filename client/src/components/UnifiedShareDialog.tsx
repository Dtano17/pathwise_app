import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Download, Share2, Loader2, Shield, Users } from 'lucide-react';
import { SiInstagram, SiTiktok, SiX, SiFacebook, SiLinkedin, SiPinterest, SiWhatsapp } from 'react-icons/si';
import { useToast } from '@/hooks/use-toast';
import {
  ShareCardGenerator,
  type ShareCardGeneratorRef,
} from './ShareCardGenerator';
import {
  PLATFORM_TEMPLATES,
  generatePlatformCaption,
  getRecommendedFormat,
} from '@/lib/shareCardTemplates';

interface Activity {
  id: string;
  title: string;
  category: string;
  backdrop?: string;
  planSummary?: string;
}

interface UnifiedShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity: Activity;
  creatorName?: string;
  creatorSocial?: { platform: string; handle: string; postUrl?: string };
}

export default function UnifiedShareDialog({
  open,
  onOpenChange,
  activity,
  creatorName,
  creatorSocial,
}: UnifiedShareDialogProps) {
  const { toast } = useToast();
  const shareCardGeneratorRef = useRef<ShareCardGeneratorRef>(null);

  const [selectedPlatform, setSelectedPlatform] = useState<string>('instagram_story');
  const [selectedFormat, setSelectedFormat] = useState<'png' | 'jpg' | 'pdf'>('jpg');
  const [privacyShield, setPrivacyShield] = useState(false);
  const [publishToCommunity, setPublishToCommunity] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: activityTasks = [], isLoading: isLoadingTasks } = useQuery({
    queryKey: ['/api/activities', activity.id, 'tasks'],
    queryFn: async () => {
      const response = await fetch(`/api/activities/${activity.id}/tasks`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to load tasks');
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
    enabled: open && !!activity.id,
  });

  const platformTemplate = PLATFORM_TEMPLATES[selectedPlatform];
  const captionData = generatePlatformCaption(
    activity.title,
    activity.category,
    selectedPlatform,
    creatorName,
    creatorSocial?.handle,
    activity.planSummary,
    activity.id
  );

  const getPlatformIcon = (platformId: string) => {
    const iconMap: Record<string, any> = {
      instagram_story: SiInstagram,
      instagram_feed: SiInstagram,
      instagram_portrait: SiInstagram,
      tiktok: SiTiktok,
      twitter: SiX,
      facebook: SiFacebook,
      linkedin: SiLinkedin,
      pinterest: SiPinterest,
      whatsapp: SiWhatsapp,
    };
    return iconMap[platformId] || Share2;
  };

  const handlePlatformChange = (platformId: string) => {
    setSelectedPlatform(platformId);
    const recommendedFormat = getRecommendedFormat(platformId);
    setSelectedFormat(recommendedFormat);
  };

  const handleDownload = async () => {
    if (!shareCardGeneratorRef.current) {
      toast({
        title: 'Not Ready',
        description: 'Please wait a moment and try again.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);

    try {
      const blob = await shareCardGeneratorRef.current.generateShareCard(
        selectedPlatform,
        selectedFormat
      );

      if (!blob) {
        throw new Error('Failed to generate share card');
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `journalmate-${activity.id}-${selectedPlatform}.${selectedFormat}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      await fetch(`/api/activities/${activity.id}/track-share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ platform: selectedPlatform }),
      });

      toast({
        title: 'Download Complete!',
        description: `Share card saved as ${platformTemplate.name}.${selectedFormat}`,
      });
    } catch (error: any) {
      toast({
        title: 'Download Failed',
        description: error.message || 'Failed to generate share card',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async () => {
    if (!shareCardGeneratorRef.current) {
      toast({
        title: 'Not Ready',
        description: 'Please wait a moment and try again.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);

    try {
      const shareFormat = selectedFormat === 'pdf' ? 'jpg' : selectedFormat;
      const blob = await shareCardGeneratorRef.current.generateShareCard(
        selectedPlatform,
        shareFormat
      );

      if (!blob) {
        throw new Error('Failed to generate share card');
      }

      const file = new File(
        [blob],
        `journalmate-${selectedPlatform}.${shareFormat}`,
        { type: shareFormat === 'jpg' ? 'image/jpeg' : 'image/png' }
      );

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.clipboard.writeText(captionData.fullText);
          toast({
            title: 'Caption Copied!',
            description: 'Share link copied to clipboard - paste it when sharing the image',
            duration: 3000,
          });
        } catch (clipboardError) {
          console.warn('Could not copy to clipboard:', clipboardError);
        }

        await navigator.share({
          files: [file],
        });

        await fetch(`/api/activities/${activity.id}/track-share`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ platform: selectedPlatform }),
        });

        toast({ title: 'Shared Successfully!' });
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `journalmate-${selectedPlatform}.${shareFormat}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        try {
          await navigator.clipboard.writeText(captionData.fullText);
          toast({
            title: 'Image Downloaded',
            description: 'Share link copied to clipboard. Image sharing not supported on this device.',
            duration: 3000,
          });
        } catch {
          toast({
            title: 'Image Downloaded',
            description: 'Image sharing not supported on this device. Image has been downloaded instead.',
          });
        }
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        toast({
          title: 'Share Failed',
          description: error.message || 'Could not share image. Please try again.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const platformOptions = [
    { id: 'instagram_story', name: 'Instagram Story' },
    { id: 'instagram_feed', name: 'Instagram Feed (Square)' },
    { id: 'instagram_portrait', name: 'Instagram Feed (Portrait)' },
    { id: 'tiktok', name: 'TikTok' },
    { id: 'twitter', name: 'Twitter/X' },
    { id: 'facebook', name: 'Facebook' },
    { id: 'linkedin', name: 'LinkedIn' },
    { id: 'pinterest', name: 'Pinterest' },
    { id: 'whatsapp', name: 'WhatsApp' },
  ];

  const formatOptions = platformTemplate?.exportFormats || ['jpg', 'png'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>Share Your Plan</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
          {/* Left: Live Preview */}
          <div className="flex-1 bg-muted/30 flex items-center justify-center p-6 overflow-auto">
            <div className="w-full max-w-md">
              {isLoadingTasks ? (
                <div className="flex items-center justify-center h-96">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="shadow-xl rounded-lg overflow-hidden">
                  <ShareCardGenerator
                    ref={shareCardGeneratorRef}
                    activityId={activity.id}
                    activityTitle={activity.title}
                    activityCategory={activity.category}
                    backdrop={activity.backdrop || ''}
                    creatorName={creatorName}
                    creatorSocial={creatorSocial}
                    planSummary={activity.planSummary}
                    tasks={activityTasks}
                    controlledPlatform={selectedPlatform}
                    controlledFormat={selectedFormat}
                    previewOnly={true}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Right: Controls Panel */}
          <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l bg-background flex flex-col">
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Platform Selector */}
              <div className="space-y-2">
                <Label htmlFor="platform-select" data-testid="label-platform">Platform</Label>
                <Select value={selectedPlatform} onValueChange={handlePlatformChange}>
                  <SelectTrigger id="platform-select" data-testid="select-platform">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {platformOptions.map((option) => {
                      const Icon = getPlatformIcon(option.id);
                      return (
                        <SelectItem key={option.id} value={option.id}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            <span>{option.name}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {platformTemplate?.aspectRatio} • {platformTemplate?.description}
                </p>
              </div>

              {/* Format Selector */}
              <div className="space-y-2">
                <Label htmlFor="format-select" data-testid="label-format">Format</Label>
                <Select value={selectedFormat} onValueChange={(value: any) => setSelectedFormat(value)}>
                  <SelectTrigger id="format-select" data-testid="select-format">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {formatOptions.map((format) => (
                      <SelectItem key={format} value={format}>
                        {format.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Caption Preview */}
              <div className="space-y-2">
                <Label data-testid="label-caption">Caption Preview</Label>
                <div className="rounded-md bg-muted/50 p-3 text-sm space-y-2 max-h-48 overflow-y-auto">
                  <p className="text-foreground whitespace-pre-wrap break-words">
                    {captionData.fullText}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {captionData.fullText.length} / {platformTemplate?.captionLimit} characters
                </p>
              </div>

              <Separator />

              {/* Privacy Shield */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="privacy-shield" className="cursor-pointer" data-testid="label-privacy">
                    Privacy Shield
                  </Label>
                </div>
                <Switch
                  id="privacy-shield"
                  checked={privacyShield}
                  onCheckedChange={setPrivacyShield}
                  data-testid="switch-privacy"
                />
              </div>
              <p className="text-xs text-muted-foreground -mt-2">
                Hide personal information from share card
              </p>

              {/* Publish to Community */}
              <div className="flex items-start gap-3">
                <Checkbox
                  id="publish-community"
                  checked={publishToCommunity}
                  onCheckedChange={(checked: boolean) => setPublishToCommunity(checked)}
                  data-testid="checkbox-community"
                />
                <div className="flex flex-col gap-1">
                  <Label htmlFor="publish-community" className="cursor-pointer flex items-center gap-2" data-testid="label-community">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    Publish to Community
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Share this plan with the JournalMate community
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-6 border-t space-y-2">
              <Button
                onClick={handleDownload}
                disabled={isGenerating || isLoadingTasks}
                className="w-full"
                size="lg"
                data-testid="button-download"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Download
                  </>
                )}
              </Button>

              <Button
                onClick={handleShare}
                disabled={isGenerating || isLoadingTasks}
                variant="secondary"
                className="w-full"
                size="lg"
                data-testid="button-share"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Share2 className="h-4 w-4" />
                    Share
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
