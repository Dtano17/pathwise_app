/**
 * Share Activity Button Component
 *
 * Native share button for activities with social media integration
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Share2, Check } from 'lucide-react';
import {
  isNative,
  shareActivity,
  shareToSocialMedia,
  copyToClipboard,
  hapticsSuccess,
  hapticsLight,
  generateActivityShareLink,
} from '@/lib/mobile';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

interface ShareActivityButtonProps {
  activity: {
    id: string;
    name: string;
    description?: string;
    shareToken?: string;
  };
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showLabel?: boolean;
}

export function ShareActivityButton({
  activity,
  variant = 'outline',
  size = 'default',
  showLabel = true,
}: ShareActivityButtonProps) {
  const [isSharing, setIsSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const shareUrl = activity.shareToken
    ? `${window.location.origin}/share/${activity.shareToken}`
    : generateActivityShareLink(activity.id);

  const handleNativeShare = async () => {
    setIsSharing(true);
    hapticsLight();

    try {
      const result = await shareActivity({
        activityId: activity.id,
        activityName: activity.name,
        description: activity.description,
        shareUrl,
      });

      if (result) {
        hapticsSuccess();
        toast({
          title: 'Shared successfully!',
          description: 'Activity shared with your friends',
        });
      }
    } catch (error) {
      console.error('Failed to share activity:', error);
      toast({
        title: 'Share failed',
        description: 'Could not share activity. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyLink = async () => {
    hapticsLight();
    const success = await copyToClipboard(shareUrl);

    if (success) {
      setCopied(true);
      hapticsSuccess();
      toast({
        title: 'Link copied!',
        description: 'Share link copied to clipboard',
      });

      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSocialShare = async (platform: 'facebook' | 'twitter' | 'whatsapp' | 'linkedin') => {
    hapticsLight();

    await shareToSocialMedia(platform, {
      title: activity.name,
      text: activity.description || `Check out my activity: ${activity.name}`,
      url: shareUrl,
    });
  };

  if (isNative()) {
    // Native: Use native share sheet
    return (
      <Button
        variant={variant}
        size={size}
        onClick={handleNativeShare}
        disabled={isSharing}
      >
        <Share2 className="w-4 h-4" />
        {showLabel && size !== 'icon' && (
          <span className="ml-2">{isSharing ? 'Sharing...' : 'Share'}</span>
        )}
      </Button>
    );
  }

  // Web: Show dropdown with social options
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} disabled={isSharing}>
          {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
          {showLabel && size !== 'icon' && (
            <span className="ml-2">{copied ? 'Copied!' : 'Share'}</span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handleCopyLink}>
          <Share2 className="w-4 h-4 mr-2" />
          Copy Link
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleSocialShare('facebook')}>
          <span className="mr-2">📘</span>
          Share on Facebook
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleSocialShare('twitter')}>
          <span className="mr-2">🐦</span>
          Share on Twitter
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleSocialShare('whatsapp')}>
          <span className="mr-2">💬</span>
          Share on WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleSocialShare('linkedin')}>
          <span className="mr-2">💼</span>
          Share on LinkedIn
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
