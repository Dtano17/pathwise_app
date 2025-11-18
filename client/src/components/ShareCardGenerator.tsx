import { useRef, useState, useEffect } from 'react';
import { toPng, toJpeg } from 'html-to-image';
import jsPDF from 'jspdf';
import { Download, Loader2, Image as ImageIcon, FileText, Check, Circle } from 'lucide-react';
import { SiInstagram, SiTiktok, SiX, SiFacebook, SiLinkedin, SiPinterest, SiWhatsapp } from 'react-icons/si';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  PLATFORM_TEMPLATES,
  PLATFORM_PACKS,
  generatePlatformCaption,
  getRecommendedFormat,
  type PlatformTemplate,
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
}

export function ShareCardGenerator({
  activityId,
  activityTitle,
  activityCategory,
  backdrop,
  creatorName,
  creatorSocial,
  planSummary,
  tasks = [],
}: ShareCardGeneratorProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('instagram_story');
  const [selectedFormat, setSelectedFormat] = useState<'png' | 'jpg' | 'pdf'>('png');
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{ current: number; total: number } | null>(null);
  const { toast } = useToast();

  const platform = PLATFORM_TEMPLATES[selectedPlatform];

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
    const { fullText } = generatePlatformCaption(
      activityTitle,
      activityCategory,
      selectedPlatform,
      creatorName,
      creatorSocial?.handle
    );

    try {
      await navigator.clipboard.writeText(fullText);
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

  const { caption, hashtags } = generatePlatformCaption(
    activityTitle,
    activityCategory,
    selectedPlatform,
    creatorName,
    creatorSocial?.handle
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Info Banner */}
      <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
        💡 Files download individually to your Downloads folder - no virus warnings!
      </div>

      {/* Platform Selector */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium">Choose Platform</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {Object.values(PLATFORM_TEMPLATES).map(template => {
            const IconComponent = getPlatformIcon(template.id);
            return (
              <Button
                key={template.id}
                variant={selectedPlatform === template.id ? 'default' : 'outline'}
                onClick={() => {
                  setSelectedPlatform(template.id);
                  setSelectedFormat(getRecommendedFormat(template.id));
                }}
                className="justify-start gap-2 h-auto py-3 min-h-[44px]"
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

      {/* Format Selector & Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
        <div className="flex-1">
          <label className="text-sm font-medium">Export Format</label>
          <Select value={selectedFormat} onValueChange={(val: any) => setSelectedFormat(val)}>
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

        <div className="flex gap-2 sm:pt-6">
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
        <CardContent className="p-3 sm:p-6">
          <p className="text-sm text-muted-foreground mb-3">Preview:</p>
          <div className="flex justify-center bg-muted/20 rounded-lg p-2 sm:p-4 overflow-x-auto">
            {/* Share Card Template */}
            <div
              ref={cardRef}
              style={{
                width: `${platform?.width || 1080}px`,
                height: `${platform?.height || 1080}px`,
                maxWidth: '100%',
                aspectRatio: `${platform?.width}/${platform?.height}`,
              }}
              className="relative overflow-hidden rounded-lg shadow-xl bg-white flex-shrink-0"
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
              <div className="absolute inset-0 flex flex-col justify-between p-8" style={{ padding: platform?.width > 1200 ? '3rem' : '2rem' }}>
                {/* Header - Brand & Verification */}
                <div className="flex justify-between items-start">
                  <Badge className="bg-primary text-primary-foreground px-4 py-1.5 text-sm font-semibold">
                    JournalMate
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
                    {activityTitle}
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

                  {/* Tasks List - Instagram Story Style */}
                  {tasks && tasks.length > 0 && (
                    <div 
                      className="bg-white/10 backdrop-blur-md rounded-xl p-4 space-y-2.5"
                      style={{
                        maxHeight: platform?.width > 1200 ? '600px' : '400px',
                        overflowY: 'auto'
                      }}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-px flex-1 bg-white/30" />
                        <span className="text-white/90 text-sm font-semibold uppercase tracking-wider">
                          {tasks.length} Tasks
                        </span>
                        <div className="h-px flex-1 bg-white/30" />
                      </div>
                      {tasks.slice(0, 8).map((task, idx) => (
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
                      {tasks.length > 8 && (
                        <p className="text-white/60 text-sm text-center pt-2">
                          +{tasks.length - 8} more tasks...
                        </p>
                      )}
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
        </CardContent>
      </Card>

      {/* Caption Preview */}
      <Card>
        <CardContent className="p-4">
          <h4 className="text-sm font-medium mb-2">Caption for {platform?.name}</h4>
          <div className="bg-muted rounded-md p-3 space-y-2">
            <p className="text-sm whitespace-pre-line">{caption}</p>
            {hashtags.length > 0 && (
              <p className="text-xs text-primary">{hashtags.join(' ')}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {caption.length + hashtags.join(' ').length}/{platform?.captionLimit} characters
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
            const packEmojis: Record<string, string> = {
              instagram_pack: '📸',
              tiktok_pack: '🎵',
              professional_pack: '💼',
              creator_bundle: '🌟',
            };
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
                  <span className="text-2xl flex-shrink-0">{packEmojis[packId] || '📦'}</span>
                  <div className="text-left flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{pack.name}</div>
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
}
