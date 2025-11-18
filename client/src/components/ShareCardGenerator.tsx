import { useRef, useState } from 'react';
import { toPng, toJpeg } from 'html-to-image';
import jsPDF from 'jspdf';
import JSZip from 'jszip';
import { Download, Loader2, Image as ImageIcon, FileText, Share2 } from 'lucide-react';
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

interface ShareCardGeneratorProps {
  activityId: string;
  activityTitle: string;
  activityCategory: string;
  backdrop: string;
  creatorName?: string;
  creatorSocial?: { platform: string; handle: string; postUrl?: string };
  planSummary?: string;
}

export function ShareCardGenerator({
  activityId,
  activityTitle,
  activityCategory,
  backdrop,
  creatorName,
  creatorSocial,
  planSummary,
}: ShareCardGeneratorProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('instagram_feed');
  const [selectedFormat, setSelectedFormat] = useState<'png' | 'jpg' | 'pdf'>('png');
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const platform = PLATFORM_TEMPLATES[selectedPlatform];

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
   * Download platform pack (multiple formats)
   */
  const handleDownloadPack = async (packId: string) => {
    setIsGenerating(true);

    try {
      const pack = PLATFORM_PACKS[packId];
      if (!pack) throw new Error('Invalid pack');

      const zip = new JSZip();

      // Generate each platform
      for (const platformId of pack.platforms) {
        const format = getRecommendedFormat(platformId);
        const blob = await generateShareCard(platformId, format);

        if (blob) {
          zip.file(`${platformId}.${format}`, blob);

          // Also generate caption text file
          const { fullText } = generatePlatformCaption(
            activityTitle,
            activityCategory,
            platformId,
            creatorName,
            creatorSocial?.handle
          );
          zip.file(`${platformId}-caption.txt`, fullText);
        }
      }

      // Download ZIP
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `journalmate-${activityId}-${packId}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Track shares
      await fetch(`/api/activities/${activityId}/track-share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ platform: packId, count: pack.platforms.length }),
      });

      toast({
        title: 'Download Complete!',
        description: `${pack.name} downloaded with ${pack.platforms.length} formats`,
      });
    } catch (error: any) {
      toast({
        title: 'Download Failed',
        description: error.message || 'Failed to generate pack',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
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
    <div className="space-y-6">
      {/* Platform Selector */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium">Select Platform</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {Object.values(PLATFORM_TEMPLATES).map(template => (
            <Button
              key={template.id}
              variant={selectedPlatform === template.id ? 'default' : 'outline'}
              onClick={() => {
                setSelectedPlatform(template.id);
                setSelectedFormat(getRecommendedFormat(template.id));
              }}
              className="justify-start gap-2 h-auto py-3"
            >
              <div className="text-left">
                <div className="font-medium text-sm">{template.name}</div>
                <div className="text-xs text-muted-foreground">{template.aspectRatio}</div>
              </div>
            </Button>
          ))}
        </div>
      </div>

      {/* Format Selector */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <label className="text-sm font-medium">Export Format</label>
          <Select value={selectedFormat} onValueChange={(val: any) => setSelectedFormat(val)}>
            <SelectTrigger className="mt-1">
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

        <div className="flex gap-2">
          <Button onClick={handleDownloadSingle} disabled={isGenerating}>
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Download
          </Button>
          <Button variant="outline" onClick={handleCopyCaption}>
            <FileText className="w-4 h-4 mr-2" />
            Copy Caption
          </Button>
        </div>
      </div>

      {/* Live Preview */}
      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground mb-3">Preview:</p>
          <div className="flex justify-center bg-muted/20 rounded-lg p-4">
            {/* Share Card Template */}
            <div
              ref={cardRef}
              style={{
                width: `${Math.min(platform?.width || 1080, 600)}px`,
                height: `${Math.min(platform?.height || 1080, 600) * ((platform?.height || 1080) / (platform?.width || 1080))}px`,
                aspectRatio: `${platform?.width}/${platform?.height}`,
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
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

              {/* Content */}
              <div className="absolute inset-0 flex flex-col justify-between p-8">
                {/* Header - JournalMate.ai logo */}
                <div className="flex justify-between items-start">
                  <Badge className="bg-primary text-primary-foreground">JournalMate.ai</Badge>
                  {creatorSocial && (
                    <Badge variant="secondary" className="bg-white/20 text-white backdrop-blur-sm">
                      ✓ Verified
                    </Badge>
                  )}
                </div>

                {/* Main Content */}
                <div className="space-y-4">
                  <h1
                    className="text-white font-bold drop-shadow-lg leading-tight"
                    style={{
                      fontSize: platform?.width > 1200 ? '3rem' : '2rem',
                    }}
                  >
                    {activityTitle}
                  </h1>

                  {planSummary && (
                    <p className="text-white/90 text-lg line-clamp-2">{planSummary}</p>
                  )}

                  {creatorName && (
                    <div className="flex items-center gap-2 text-white/80">
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

      {/* Platform Packs */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium">Download Platform Packs</h3>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(PLATFORM_PACKS).map(([packId, pack]) => (
            <Button
              key={packId}
              variant="outline"
              onClick={() => handleDownloadPack(packId)}
              disabled={isGenerating}
              className="h-auto py-3 justify-start"
            >
              <Share2 className="w-4 h-4 mr-2" />
              <div className="text-left">
                <div className="font-medium text-sm">{pack.name}</div>
                <div className="text-xs text-muted-foreground">
                  {pack.platforms.length} formats
                </div>
              </div>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
