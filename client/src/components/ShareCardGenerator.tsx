import { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { toPng, toJpeg } from 'html-to-image';
import jsPDF from 'jspdf';
import { Download, Loader2, Image as ImageIcon, FileText, Check, Circle, Share2, Copy, RotateCcw } from 'lucide-react';
import { SiInstagram, SiTiktok, SiX, SiFacebook, SiLinkedin, SiPinterest, SiWhatsapp } from 'react-icons/si';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  PLATFORM_TEMPLATES,
  PLATFORM_PACKS,
  generatePlatformCaption,
  generateFormattedCaption,
  CAPTION_FORMATS,
  getRecommendedFormat,
  getContextualEmoji,
  type PlatformTemplate,
  type CaptionStyle,
} from '@/lib/shareCardTemplates';

interface Task {
  id: string;
  title: string;
  description?: string | null;
  category: string;
  priority: string;
  completed: boolean;
}

interface ShareCardGeneratorProps {
  activityId: string;
  activityTitle: string;
  activityCategory: string;
  backdrop: string;
  creatorName?: string;
  creatorSocial?: { platform: string; handle: string; postUrl?: string };
  planSummary?: string;
  tasks?: Task[];
  shareCaption?: string; // Unified caption from parent
  // Controlled mode props (optional)
  controlledPlatform?: string;
  controlledFormat?: 'png' | 'jpg' | 'pdf';
  onPlatformChange?: (platform: string) => void;
  onFormatChange?: (format: 'png' | 'jpg' | 'pdf') => void;
  hideControls?: boolean; // Hide platform/format selectors and buttons when in controlled mode
}

export interface ShareCardGeneratorRef {
  generateShareCard: (platformId: string, format: 'png' | 'jpg' | 'pdf') => Promise<Blob | null>;
}

export const ShareCardGenerator = forwardRef<ShareCardGeneratorRef, ShareCardGeneratorProps>(({
  activityId,
  activityTitle,
  activityCategory,
  backdrop,
  creatorName,
  creatorSocial,
  planSummary,
  tasks = [],
  shareCaption,
  controlledPlatform,
  controlledFormat,
  onPlatformChange,
  onFormatChange,
  hideControls = false,
}, ref) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [internalPlatform, setInternalPlatform] = useState<string>('instagram_story');
  const [internalFormat, setInternalFormat] = useState<'png' | 'jpg' | 'pdf'>('png');
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{ current: number; total: number } | null>(null);
  const [canShareFiles, setCanShareFiles] = useState(false);
  const [previewScale, setPreviewScale] = useState(1);
  const [captionStyle, setCaptionStyle] = useState<CaptionStyle>('standard');
  const [customCaption, setCustomCaption] = useState('');
  const [captionEdited, setCaptionEdited] = useState(false);
  const { toast } = useToast();

  // Generate share URL
  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/share/${activityId}`
    : '';

  // Generate caption based on current style
  const generatedCaption = generateFormattedCaption(
    activityTitle,
    activityCategory,
    shareUrl,
    captionStyle,
    {
      description: planSummary,
      tasks: tasks.map(t => ({ completed: t.completed })),
      includeHashtags: captionStyle === 'social'
    }
  );

  // Use shared caption if provided, otherwise fallback to local logic
  const displayCaption = shareCaption !== undefined ? shareCaption : (captionEdited ? customCaption : generatedCaption);

  // Check if Web Share API with files is supported
  useEffect(() => {
    const checkShareSupport = async () => {
      if (navigator.canShare) {
        try {
          // Create a dummy file to test
          const testFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
          const canShare = navigator.canShare({ files: [testFile] });
          setCanShareFiles(canShare);
        } catch {
          setCanShareFiles(false);
        }
      } else {
        setCanShareFiles(false);
      }
    };
    checkShareSupport();
  }, []);

  // Use controlled props if provided, otherwise use internal state
  const selectedPlatform = controlledPlatform ?? internalPlatform;
  const selectedFormat = controlledFormat ?? internalFormat;

  const platform = PLATFORM_TEMPLATES[selectedPlatform];

  // Calculate preview scale for mobile responsiveness
  useEffect(() => {
    const calculateScale = () => {
      if (previewContainerRef.current && platform) {
        const container = previewContainerRef.current;
        // Use a more robust way to get available width
        const availableWidth = Math.min(
          container.clientWidth,
          window.innerWidth - 48 // Account for dialog padding and safe area
        );
        const containerWidth = Math.max(availableWidth - 32, 280); // Ensure minimum width
        const containerHeight = window.innerHeight * 0.5; // Use 50% of viewport height for better fit

        const widthScale = containerWidth / (platform.width || 1080);
        const heightScale = containerHeight / (platform.height || 1080);

        // Use the smaller scale to ensure content fits, but allow a bit more growth
        const scale = Math.min(widthScale, heightScale, 1);
        setPreviewScale(scale);
      }
    };

    // Run immediately and after a short delay to ensure layout is stable
    calculateScale();
    const timer = setTimeout(calculateScale, 100);
    
    window.addEventListener('resize', calculateScale);
    return () => {
      window.removeEventListener('resize', calculateScale);
      clearTimeout(timer);
    };
  }, [platform, selectedPlatform, activityId]); // Added activityId to trigger on tab switch if needed

  // Handle platform change
  const handlePlatformChange = (newPlatform: string) => {
    if (onPlatformChange) {
      onPlatformChange(newPlatform);
    } else {
      setInternalPlatform(newPlatform);
    }
  };

  // Handle format change
  const handleFormatChange = (newFormat: 'png' | 'jpg' | 'pdf') => {
    if (onFormatChange) {
      onFormatChange(newFormat);
    } else {
      setInternalFormat(newFormat);
    }
  };

  // Expose generateShareCard method via ref
  useImperativeHandle(ref, () => ({
    generateShareCard,
  }));

  // Get platform icon component
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
    return iconMap[platformId] || ImageIcon;
  };

  /**
   * Generate share card image/PDF
   */
  const generateShareCard = async (
    platformId: string,
    format: 'png' | 'jpg' | 'pdf'
  ): Promise<Blob | null> => {
    if (!cardRef.current) return null;

    try {
      // Set dimensions for the platform
      const platformTemplate = PLATFORM_TEMPLATES[platformId];
      cardRef.current.style.width = `${platformTemplate.width}px`;
      cardRef.current.style.height = `${platformTemplate.height}px`;

      // Wait for images to load
      await new Promise(resolve => setTimeout(resolve, 500));

      if (format === 'pdf') {
        // Generate PDF
        const imgData = await toPng(cardRef.current, {
          quality: 1.0,
          pixelRatio: 2,
        });

        const pdf = new jsPDF({
          orientation: platformTemplate.width > platformTemplate.height ? 'landscape' : 'portrait',
          unit: 'px',
          format: [platformTemplate.width, platformTemplate.height],
        });

        pdf.addImage(
          imgData,
          'PNG',
          0,
          0,
          platformTemplate.width,
          platformTemplate.height
        );

        return pdf.output('blob');
      } else if (format === 'jpg') {
        // Generate JPG
        const dataUrl = await toJpeg(cardRef.current, {
          quality: 0.95,
          pixelRatio: 2,
        });

        const response = await fetch(dataUrl);
        return await response.blob();
      } else {
        // Generate PNG
        const dataUrl = await toPng(cardRef.current, {
          quality: 1.0,
          pixelRatio: 2,
        });

        const response = await fetch(dataUrl);
        return await response.blob();
      }
    } catch (error) {
      console.error('[ShareCardGenerator] Generation failed:', error);
      return null;
    }
  };

  /**
   * Download single share card
   */
  const handleDownloadSingle = async () => {
    setIsGenerating(true);

    try {
      const blob = await generateShareCard(selectedPlatform, selectedFormat);

      if (!blob) {
        throw new Error('Failed to generate share card');
      }

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `journalmate-${activityId}-${selectedPlatform}.${selectedFormat}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Track share count
      await fetch(`/api/activities/${activityId}/track-share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ platform: selectedPlatform }),
      });

      toast({
        title: 'Download Complete!',
        description: `Share card saved as ${selectedPlatform}.${selectedFormat}`,
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

  /**
   * Share single share card using native share API
   */
  const handleShareImage = async () => {
    setIsGenerating(true);

    try {
      // Only allow JPG/PNG for sharing (not PDF)
      const shareFormat = selectedFormat === 'pdf' ? 'jpg' : selectedFormat;
      const blob = await generateShareCard(selectedPlatform, shareFormat);

      if (!blob) {
        throw new Error('Failed to generate share card');
      }

      // Create a File object from the blob
      const file = new File([blob], `journalmate-${selectedPlatform}.${shareFormat}`, {
        type: shareFormat === 'jpg' ? 'image/jpeg' : 'image/png'
      });

      // Use the platform-specific caption
      const captionToShare = platformCaption;

      // Try to use Web Share API if supported
      let shareSuccessful = false;

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          // Copy caption to clipboard first
          try {
            await navigator.clipboard.writeText(captionToShare);
            toast({
              title: '📋 Caption Copied!',
              description: 'Caption ready to paste when sharing',
              duration: 3000
            });
          } catch (clipboardError) {
            console.warn('Could not copy to clipboard:', clipboardError);
          }

          // Try sharing with both file and text (better for WhatsApp, Telegram)
          // Some platforms like WhatsApp need text included to show in share menu
          const shareData: ShareData = {
            files: [file],
            text: captionToShare,
          };

          // Check if the full share data is supported, if not fall back to file only
          if (navigator.canShare(shareData)) {
            await navigator.share(shareData);
          } else {
            // Fallback to file-only sharing (iOS Safari)
            await navigator.share({ files: [file] });
          }

          // Track share count
          await fetch(`/api/activities/${activityId}/track-share`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ platform: selectedPlatform }),
          });

          toast({ title: 'Shared Successfully!' });
          shareSuccessful = true;
        } catch (shareError: any) {
          if (shareError.name === 'AbortError') {
            // User cancelled - that's okay
            shareSuccessful = true;
          } else {
            // If share fails, fall back to download
            console.warn('Share API failed, falling back to download:', shareError);
          }
        }
      }
      
      // Fallback: Download the image and copy caption if share didn't work
      if (!shareSuccessful) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `journalmate-${selectedPlatform}.${shareFormat}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        try {
          await navigator.clipboard.writeText(captionToShare);
          toast({
            title: 'Image Downloaded',
            description: 'Caption copied to clipboard. Image has been downloaded - share it manually.',
            duration: 3000
          });
        } catch {
          toast({
            title: 'Image Downloaded',
            description: 'Image has been downloaded. Share it manually from your downloads folder.'
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

  /**
   * Download platform pack (sequential individual file downloads - no ZIP!)
   */
  const handleDownloadPack = async (packId: string) => {
    setIsGenerating(true);
    setDownloadProgress({ current: 0, total: 0 });

    try {
      const pack = PLATFORM_PACKS[packId as keyof typeof PLATFORM_PACKS];
      if (!pack) throw new Error('Invalid pack');

      const totalFiles = pack.platforms.length;
      setDownloadProgress({ current: 0, total: totalFiles });

      // Show initial toast
      toast({
        title: `📦 Preparing ${pack.name}`,
        description: `Downloading ${totalFiles} files individually to avoid browser warnings`,
      });

      // Download each platform file sequentially
      let successCount = 0;
      let failedPlatforms: string[] = [];
      
      for (let i = 0; i < pack.platforms.length; i++) {
        const platformId = pack.platforms[i];
        const format = getRecommendedFormat(platformId);
        
        setDownloadProgress({ current: i + 1, total: totalFiles });
        
        try {
          const blob = await generateShareCard(platformId, format);

          if (!blob) {
            throw new Error(`Failed to generate ${platformId}`);
          }

          // Download individual file with proper cleanup timing
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `journalmate-${platformId}.${format}`;
          link.setAttribute('aria-label', `Download ${platformId} share card`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // Defer URL cleanup to ensure download starts
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          
          successCount++;

          // Small delay between downloads to prevent browser blocking
          if (i < pack.platforms.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        } catch (error) {
          console.error(`Failed to download ${platformId}:`, error);
          failedPlatforms.push(platformId);
        }
      }
      
      // Track actual successful shares
      if (successCount > 0) {
        await fetch(`/api/activities/${activityId}/track-share`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ platform: packId, count: successCount }),
        });
      }

      // Show appropriate completion message
      if (failedPlatforms.length === 0) {
        toast({
          title: '✅ Download Complete!',
          description: `${totalFiles} files saved to your Downloads folder`,
        });
      } else if (successCount > 0) {
        toast({
          title: '⚠️ Partial Download',
          description: `${successCount} of ${totalFiles} files downloaded. ${failedPlatforms.length} failed.`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: '❌ Download Failed',
          description: `All ${totalFiles} files failed to download. Please try again.`,
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Download Failed',
        description: error.message || 'Failed to generate pack',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
      setDownloadProgress(null);
    }
  };

  /**
   * Copy caption to clipboard
   */
  const handleCopyCaption = async () => {
    try {
      await navigator.clipboard.writeText(platformCaption);
      toast({
        title: 'Caption Copied!',
        description: 'Paste it when sharing your card',
      });
    } catch (error) {
      toast({
        title: 'Copy Failed',
        description: 'Could not copy caption to clipboard',
        variant: 'destructive',
      });
    }
  };

  /**
   * Refresh caption with current style
   */
  const handleRefreshCaption = () => {
    setCustomCaption(generatedCaption);
    setCaptionEdited(false);
    toast({
      title: 'Caption Refreshed',
      description: `Using ${CAPTION_FORMATS.find(f => f.id === captionStyle)?.name} format`,
    });
  };

  const { caption: platformCaption, hashtags } = generatePlatformCaption(
    activityTitle,
    activityCategory,
    selectedPlatform,
    creatorName,
    creatorSocial?.handle,
    planSummary,
    activityId
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      {!hideControls && (
        <>
          {/* Platform Selector */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Choose Platform</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {Object.values(PLATFORM_TEMPLATES).map(template => {
                const IconComponent = getPlatformIcon(template.id);
                return (
                  <Button
                    key={template.id}
                    variant={selectedPlatform === template.id ? 'default' : 'outline'}
                    onClick={() => {
                      handlePlatformChange(template.id);
                      handleFormatChange(getRecommendedFormat(template.id));
                    }}
                    className="justify-start gap-2 h-auto py-3 min-h-[44px] w-full"
                    data-testid={`button-platform-${template.id}`}
                    aria-label={`Select ${template.name} format`}
                    title={template.name}
                  >
                    <IconComponent className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                    <span className="text-sm font-medium text-left line-clamp-1">{template.name}</span>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
            {/* Export Format Selector */}
            <div className="flex-1">
              <label className="text-sm font-medium">Export Format</label>
              <Select value={selectedFormat} onValueChange={(val: any) => handleFormatChange(val)}>
                <SelectTrigger className="mt-1 min-h-[44px]" data-testid="select-format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {platform?.exportFormats.map(format => (
                    <SelectItem key={format} value={format}>
                      {format.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 sm:pt-6 flex-wrap">
              <Button 
                onClick={handleDownloadSingle} 
                disabled={isGenerating}
                className="flex-1 sm:flex-none min-h-[44px]"
                data-testid="button-download-single"
              >
                {isGenerating && !downloadProgress ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Download
              </Button>
              <Button 
                variant="default"
                onClick={handleShareImage} 
                disabled={isGenerating || selectedFormat === 'pdf'}
                className="flex-1 sm:flex-none min-h-[44px]"
                data-testid="button-share-image"
                title={canShareFiles ? 'Share via native share menu' : 'Download image and caption for manual sharing'}
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Share2 className="w-4 h-4 mr-2" />
                )}
                {canShareFiles ? 'Share' : 'Share (Download)'}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleCopyCaption}
                className="flex-1 sm:flex-none min-h-[44px]"
                data-testid="button-copy-caption"
              >
                <FileText className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Copy Caption</span>
                <span className="sm:hidden">Caption</span>
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Download Progress */}
      {downloadProgress && (
        <div className="bg-primary/10 rounded-lg p-3 text-sm">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span className="font-medium">
              Downloading {downloadProgress.current} of {downloadProgress.total}...
            </span>
          </div>
        </div>
      )}

      {/* Live Preview */}
      <Card className="overflow-hidden">
        <CardContent className="p-2 sm:p-6">
          <p className="text-sm text-muted-foreground mb-2 sm:mb-3">Preview:</p>
          <div
            ref={previewContainerRef}
            className="flex justify-center bg-muted/20 rounded-lg p-2 sm:p-4 overflow-hidden"
          >
            {/* Scaling container for mobile responsiveness - uses CSS transform to fit any screen */}
            <div
              style={{
                transform: `scale(${previewScale})`,
                transformOrigin: 'top center',
                width: `${platform?.width || 1080}px`,
                height: `${(platform?.height || 1080) * previewScale}px`,
              }}
            >
              {/* Share Card Template */}
              <div
                ref={cardRef}
                style={{
                  width: `${platform?.width || 1080}px`,
                  height: `${platform?.height || 1080}px`,
                }}
                className="relative overflow-hidden rounded-lg shadow-xl bg-white"
              >
              {/* Backdrop Image */}
              <img
                src={backdrop}
                alt="backdrop"
                className="absolute inset-0 w-full h-full object-cover"
              />

              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/80" />

              {/* Content */}
              <div className="relative flex flex-col min-h-full p-8" style={{ padding: platform?.width > 1200 ? '3rem' : '2rem' }}>
                {/* Header - Brand & Verification */}
                <div className="flex justify-between items-start">
                  <Badge className="bg-primary text-primary-foreground px-4 py-1.5 text-sm font-semibold">
                    JournalMate.ai
                  </Badge>
                  {creatorSocial && (
                    <Badge variant="secondary" className="bg-white/20 text-white backdrop-blur-sm px-3 py-1">
                      ✓ Verified
                    </Badge>
                  )}
                </div>

                {/* Main Content */}
                <div className="space-y-4" style={{ marginTop: 'auto', marginBottom: 'auto' }}>
                  <h1
                    className="text-white font-bold drop-shadow-lg leading-tight"
                    style={{
                      fontSize: platform?.width > 1200 ? '3.5rem' : platform?.width > 800 ? '2.5rem' : '2rem',
                    }}
                  >
                    {getContextualEmoji(activityTitle, activityCategory)} {activityTitle}
                  </h1>

                  {planSummary && (
                    <p 
                      className="text-white/95 drop-shadow-md" 
                      style={{ 
                        fontSize: platform?.width > 1200 ? '1.5rem' : platform?.width > 800 ? '1.25rem' : '1rem',
                        lineHeight: '1.4'
                      }}
                    >
                      {planSummary}
                    </p>
                  )}

                  {/* Tasks List - Instagram Story Style with scroll */}
                  {tasks && tasks.length > 0 && (
                    <div
                      className="bg-white/10 backdrop-blur-md rounded-xl p-4 space-y-2.5 max-h-96 overflow-y-auto"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-px flex-1 bg-white/30" />
                        <span className="text-white/90 text-sm font-semibold uppercase tracking-wider">
                          {tasks.length} Tasks
                        </span>
                        <div className="h-px flex-1 bg-white/30" />
                      </div>
                      {tasks.map((task, idx) => (
                        <div
                          key={task.id}
                          className="flex items-start gap-3 text-white/95 group"
                        >
                          <div className="flex-shrink-0 mt-0.5">
                            {task.completed ? (
                              <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            ) : (
                              <Circle className="w-5 h-5 text-white/60" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p 
                              className={`text-sm font-medium leading-snug ${task.completed ? 'line-through text-white/70' : ''}`}
                              style={{ fontSize: platform?.width > 1200 ? '1.1rem' : '0.95rem' }}
                            >
                              {task.title}
                            </p>
                            {task.priority === 'high' && !task.completed && (
                              <span className="inline-block mt-1 px-2 py-0.5 bg-red-500/80 text-white text-xs rounded-full">
                                High Priority
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {creatorName && (
                    <div className="flex items-center gap-2 text-white/90 pt-2">
                      <span className="text-sm">Created by</span>
                      <span className="font-semibold">{creatorName}</span>
                      {creatorSocial && (
                        <span className="text-sm">• {creatorSocial.handle}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Caption Preview */}
      <Card>
        <CardContent className="p-4">
          <h4 className="text-sm font-medium mb-2">Caption for {platform?.name}</h4>
          <div className="bg-muted rounded-md p-3 space-y-2">
            <p className="text-sm whitespace-pre-line">{platformCaption}</p>
            {hashtags.length > 0 && (
              <p className="text-xs text-primary">{hashtags.join(' ')}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {platformCaption.length + hashtags.join(' ').length}/{platform?.captionLimit} characters
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Platform Bundles */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Download Bundles</h3>
          <span className="text-xs text-muted-foreground">Multiple files</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {Object.entries(PLATFORM_PACKS).map(([packId, pack]) => {
            return (
              <Button
                key={packId}
                variant="outline"
                onClick={() => handleDownloadPack(packId)}
                disabled={isGenerating}
                className="h-auto py-3 justify-start min-h-[60px] hover-elevate active-elevate-2"
                data-testid={`button-pack-${packId}`}
              >
                <div className="flex items-center gap-3 w-full">
                  <div className="text-left flex-1 min-w-0">
                    <div className="font-medium text-sm">{pack.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {pack.platforms.length} files • Downloads separately
                    </div>
                  </div>
                </div>
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
});

ShareCardGenerator.displayName = 'ShareCardGenerator';
