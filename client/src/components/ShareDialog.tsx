import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  Link as LinkIcon, 
  Mail, 
  MessageSquare, 
  MoreHorizontal,
  Copy,
  Code,
  Image as ImageIcon
} from 'lucide-react';
import { SiWhatsapp, SiFacebook, SiX, SiMessenger, SiInstagram, SiLinkedin, SiTelegram } from 'react-icons/si';
import { useToast } from '@/hooks/use-toast';
import { getContextualEmoji, generatePlatformCaption } from '@/lib/shareCardTemplates';
import { ShareCardGenerator, type ShareCardGeneratorRef } from './ShareCardGenerator';
import { useQuery } from '@tanstack/react-query';

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  url?: string;
  category?: string;
  progressPercent?: number;
  activityId?: string;
  planSummary?: string;
  backdrop?: string;
  onOpenSharePreview?: () => void;
}

export default function ShareDialog({
  open,
  onOpenChange,
  title,
  description,
  url,
  category = 'other',
  progressPercent,
  activityId,
  planSummary,
  backdrop,
  onOpenSharePreview
}: ShareDialogProps) {
  const { toast } = useToast();
  const [isSharing, setIsSharing] = useState(false);
  const shareCardGeneratorRef = useRef<ShareCardGeneratorRef>(null);

  // Fetch activity tasks for share card
  const { data: activityTasks = [], isLoading: isLoadingTasks, isError: isTasksError } = useQuery({
    queryKey: ['/api/activities', activityId, 'tasks'],
    queryFn: async () => {
      if (!activityId) return [];
      const response = await fetch(`/api/activities/${activityId}/tasks`, {
        credentials: 'include'
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
    enabled: open && !!activityId,
  });
  
  // If no URL provided, construct the share URL from activityId
  const shareUrl = url || (activityId ? `https://journalmate.ai/shared/${activityId}` : window.location.href);
  
  // Get contextual emoji based on activity title
  const contextualEmoji = getContextualEmoji(title, category);
  
  // Format title with emoji and progress
  const progressText = progressPercent !== undefined ? ` - ${progressPercent}% complete!` : '';
  const formattedTitle = `${contextualEmoji} ${title}${progressText}`;
  
  // Base share text
  const baseShareText = planSummary || description;
  
  // WhatsApp-specific caption with enhanced formatting
  const whatsappCaption = generatePlatformCaption(
    title,
    category,
    'whatsapp',
    undefined,
    undefined,
    planSummary,
    activityId
  ).fullText;
  
  // Standard share text for other platforms
  const standardShareText = `${formattedTitle}\n\n${baseShareText}\n\n${contextualEmoji} Customize this plan: ${shareUrl}\n\n✨ Plan your next adventure with JournalMate.ai`;
  
  // Twitter-specific short caption (under 280 chars)
  const twitterStaticText = `${contextualEmoji} Customize this plan: ${shareUrl}\n\n✨ JournalMate.ai`;
  const twitterMaxTitleLength = 280 - twitterStaticText.length - 5; // Reserve space for emoji + newlines
  const truncatedTitle = title.length > twitterMaxTitleLength 
    ? title.substring(0, twitterMaxTitleLength - 3) + '...' 
    : title;
  const twitterShareText = `${contextualEmoji} ${truncatedTitle}\n\n${twitterStaticText}`;

  // Helper function to share image with platform-specific optimizations
  const shareImageWithPlatform = async (platformId: string, platformName: string, captionText: string) => {
    if (!activityId || !shareCardGeneratorRef.current) {
      toast({
        title: 'Cannot Share Image',
        description: 'Image sharing is only available for saved activities.',
        variant: 'destructive'
      });
      return;
    }

    setIsSharing(true);
    try {
      // Generate sharecard optimized for the platform
      const blob = await shareCardGeneratorRef.current.generateShareCard(platformId, 'jpg');
      
      if (!blob) {
        throw new Error('Failed to generate image');
      }

      const fileName = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${platformName.toLowerCase()}.jpg`;
      const file = new File([blob], fileName, { type: 'image/jpeg' });

      // Check if Web Share API with files is supported
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        // Copy caption to clipboard for easy pasting
        try {
          await navigator.clipboard.writeText(captionText);
          toast({ 
            title: 'Caption Copied!',
            description: `Caption copied to clipboard - paste it when sharing to ${platformName}`,
            duration: 3000
          });
        } catch (clipboardError) {
          console.warn('Could not copy to clipboard:', clipboardError);
        }

        // Share the file using native share sheet
        await navigator.share({ files: [file] });
        
        toast({ 
          title: 'Shared Successfully!',
          description: `Choose ${platformName} from the share menu`
        });
        onOpenChange(false);
      } else {
        // Fallback: Download the image and copy caption
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);
        
        try {
          await navigator.clipboard.writeText(captionText);
          toast({ 
            title: 'Image Downloaded',
            description: `Caption copied! Upload the image to ${platformName} and paste the caption.`,
            duration: 4000
          });
        } catch {
          toast({ 
            title: 'Image Downloaded',
            description: `Upload the downloaded image to ${platformName}.`
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
      setIsSharing(false);
    }
  };

  // Share Image function - uses SharePreviewDialog when available, falls back to inline share
  const handleShareImage = async () => {
    if (!activityId) {
      toast({
        title: 'Cannot Share Image',
        description: 'Image sharing is only available for saved activities.',
        variant: 'destructive'
      });
      return;
    }

    // If we have the callback and backdrop, open SharePreviewDialog for full preview/download/share experience
    if (onOpenSharePreview && backdrop) {
      onOpenChange(false);
      onOpenSharePreview();
      return;
    }

    // Fallback: use generic sharecard
    const shareCaption = `${contextualEmoji} Customize this plan: ${shareUrl}\n\n✨ Plan your next adventure with JournalMate.ai`;
    await shareImageWithPlatform('instagram_feed', 'Share', shareCaption);
  };

  const shareOptions = [
    {
      name: 'Share Image',
      icon: ImageIcon,
      action: handleShareImage,
      testId: 'share-image',
      disabled: !activityId || isSharing || isLoadingTasks || isTasksError
    },
    {
      name: 'Copy Link',
      icon: Copy,
      action: () => {
        navigator.clipboard.writeText(standardShareText);
        toast({ title: 'Link Copied!', description: 'Share text copied to clipboard' });
        onOpenChange(false);
      },
      testId: 'share-copy-link'
    },
    {
      name: 'Email',
      icon: Mail,
      action: () => {
        const subject = encodeURIComponent(formattedTitle);
        const body = encodeURIComponent(standardShareText);
        window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
      },
      testId: 'share-email'
    },
    {
      name: 'Messages',
      icon: MessageSquare,
      action: () => {
        const text = encodeURIComponent(standardShareText);
        window.open(`sms:?&body=${text}`, '_blank');
      },
      testId: 'share-messages'
    },
    {
      name: 'WhatsApp',
      icon: SiWhatsapp,
      action: async () => {
        // Share with WhatsApp-optimized landscape sharecard
        await shareImageWithPlatform('whatsapp', 'WhatsApp', whatsappCaption);
      },
      testId: 'share-whatsapp',
      disabled: !activityId || isSharing || isLoadingTasks || isTasksError
    },
    {
      name: 'Messenger',
      icon: SiMessenger,
      action: () => {
        // Messenger requires a Facebook App ID, so we'll use native share as fallback
        if (navigator.share) {
          navigator.share({
            title: formattedTitle,
            text: baseShareText,
            url: shareUrl,
          }).then(() => {
            toast({ title: 'Share via Messenger', description: 'Choose Messenger from the share options' });
          }).catch(() => {
            // User cancelled, copy to clipboard as fallback
            navigator.clipboard.writeText(shareUrl);
            toast({ title: 'Link Copied!', description: 'Share this link in Messenger' });
          });
        } else {
          // No native share, just copy the link
          navigator.clipboard.writeText(shareUrl);
          toast({ title: 'Link Copied!', description: 'Share this link in Messenger' });
        }
      },
      testId: 'share-messenger'
    },
    {
      name: 'Instagram',
      icon: SiInstagram,
      action: async () => {
        // Share with Instagram-optimized square sharecard
        const instagramCaption = generatePlatformCaption(
          title,
          category,
          'instagram',
          undefined,
          undefined,
          planSummary,
          activityId
        ).fullText;
        await shareImageWithPlatform('instagram_feed', 'Instagram', instagramCaption);
      },
      testId: 'share-instagram',
      disabled: !activityId || isSharing || isLoadingTasks || isTasksError
    },
    {
      name: 'Facebook',
      icon: SiFacebook,
      action: async () => {
        // Share with Facebook-optimized landscape sharecard
        const facebookCaption = generatePlatformCaption(
          title,
          category,
          'facebook',
          undefined,
          undefined,
          planSummary,
          activityId
        ).fullText;
        await shareImageWithPlatform('facebook', 'Facebook', facebookCaption);
      },
      testId: 'share-facebook',
      disabled: !activityId || isSharing || isLoadingTasks || isTasksError
    },
    {
      name: 'Twitter',
      icon: SiX,
      action: async () => {
        // Share with Twitter-optimized landscape sharecard
        await shareImageWithPlatform('twitter', 'Twitter', twitterShareText);
      },
      testId: 'share-twitter',
      disabled: !activityId || isSharing || isLoadingTasks || isTasksError
    },
    {
      name: 'LinkedIn',
      icon: SiLinkedin,
      action: async () => {
        // Share with LinkedIn-optimized landscape sharecard
        const linkedinCaption = generatePlatformCaption(
          title,
          category,
          'linkedin',
          undefined,
          undefined,
          planSummary,
          activityId
        ).fullText;
        await shareImageWithPlatform('linkedin', 'LinkedIn', linkedinCaption);
      },
      testId: 'share-linkedin',
      disabled: !activityId || isSharing || isLoadingTasks || isTasksError
    },
    {
      name: 'Telegram',
      icon: SiTelegram,
      action: async () => {
        // Share with Telegram-optimized square sharecard
        const telegramCaption = generatePlatformCaption(
          title,
          category,
          'telegram',
          undefined,
          undefined,
          planSummary,
          activityId
        ).fullText;
        await shareImageWithPlatform('telegram', 'Telegram', telegramCaption);
      },
      testId: 'share-telegram',
      disabled: !activityId || isSharing || isLoadingTasks || isTasksError
    },
    {
      name: 'Embed',
      icon: Code,
      action: () => {
        const embedCode = `<iframe src="${shareUrl}" width="100%" height="600" frameborder="0"></iframe>`;
        navigator.clipboard.writeText(embedCode);
        toast({ title: 'Embed Code Copied!', description: 'Paste this code to embed the plan' });
        onOpenChange(false);
      },
      testId: 'share-embed'
    },
    {
      name: 'More options',
      icon: MoreHorizontal,
      action: () => {
        if (navigator.share) {
          navigator.share({
            title: formattedTitle,
            text: baseShareText,
            url: shareUrl,
          }).then(() => {
            toast({ title: 'Shared Successfully!' });
            onOpenChange(false);
          }).catch(() => {
            // User cancelled
          });
        } else {
          toast({ 
            title: 'Not Supported', 
            description: 'Native sharing is not available on this device',
            variant: 'destructive'
          });
        }
      },
      testId: 'share-more'
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader backLabel="Back to Activity">
          <DialogTitle>Share Plan</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-4">
          {shareOptions.map((option) => (
            <Button
              key={option.name}
              variant="outline"
              className="h-auto py-4 flex flex-col gap-2 hover-elevate"
              onClick={option.action}
              data-testid={option.testId}
              disabled={'disabled' in option ? option.disabled : false}
            >
              <option.icon className="w-5 h-5" />
              <span className="text-sm">{option.name}</span>
            </Button>
          ))}
        </div>

        {/* Hidden ShareCardGenerator for image generation - positioned off-screen with proper dimensions */}
        {activityId && (
          <div className="fixed top-0 left-[-10000px] opacity-0 pointer-events-none z-[-1] w-[1080px] h-[1080px]" aria-hidden="true">
            <ShareCardGenerator
              ref={shareCardGeneratorRef}
              activityId={activityId}
              activityTitle={title}
              activityCategory={category}
              backdrop={backdrop || 'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=1600&q=80'}
              planSummary={planSummary}
              tasks={activityTasks}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
