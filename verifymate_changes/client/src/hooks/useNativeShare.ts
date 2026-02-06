import { useCallback } from 'react';
import { Share } from '@capacitor/share';
import { useToast } from './use-toast';

interface ShareOptions {
  title?: string;
  text: string;
  url?: string;
  dialogTitle?: string;
}

export function useNativeShare() {
  const { toast } = useToast();

  const isNative = useCallback(() => {
    return typeof window !== 'undefined' && !window.location.protocol.includes('http');
  }, []);

  const canShare = useCallback(async () => {
    try {
      return await Share.canShare();
    } catch {
      return { value: false };
    }
  }, []);

  const share = useCallback(async (options: ShareOptions) => {
    try {
      const result = await canShare();
      
      if (result.value) {
        // Use native share on mobile
        await Share.share({
          title: options.title || 'JournalMate',
          text: options.text,
          url: options.url,
          dialogTitle: options.dialogTitle || 'Share Plan',
        });
        return { success: true, method: 'native' };
      }
    } catch (error) {
      // Silently fall through to web methods
    }

    // Web fallback methods
    try {
      // Try modern Web Share API first
      if (navigator.share) {
        await navigator.share({
          title: options.title || 'JournalMate',
          text: options.text,
          url: options.url,
        });
        return { success: true, method: 'web-share-api' };
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.warn('Web Share API error:', error);
      }
    }

    // Clipboard fallback
    try {
      const shareText = `${options.title || 'JournalMate'}\n${options.text}${options.url ? `\n\n${options.url}` : ''}`;
      await navigator.clipboard.writeText(shareText);
      toast({
        title: 'Copied to clipboard',
        description: 'Share link copied. You can paste it anywhere.',
      });
      return { success: true, method: 'clipboard' };
    } catch (error) {
      toast({
        title: 'Share failed',
        description: 'Please try again or copy the link manually.',
        variant: 'destructive',
      });
      return { success: false, method: 'failed' };
    }
  }, [canShare, toast]);

  const shareViaEmail = useCallback((options: ShareOptions) => {
    const subject = encodeURIComponent(options.title || 'JournalMate Plan');
    const body = encodeURIComponent(
      `${options.text}${options.url ? `\n\n${options.url}` : ''}`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }, []);

  const shareViaSMS = useCallback((options: ShareOptions) => {
    const body = encodeURIComponent(
      `${options.text}${options.url ? ` ${options.url}` : ''}`
    );
    window.location.href = `sms:?body=${body}`;
  }, []);

  return {
    share,
    shareViaEmail,
    shareViaSMS,
    canShare,
  };
}
