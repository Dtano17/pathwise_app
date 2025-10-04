import { useState } from 'react';
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
  Code
} from 'lucide-react';
import { SiWhatsapp, SiFacebook, SiX, SiMessenger } from 'react-icons/si';
import { useToast } from '@/hooks/use-toast';

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  url?: string;
}

export default function ShareDialog({
  open,
  onOpenChange,
  title,
  description,
  url = window.location.href
}: ShareDialogProps) {
  const { toast } = useToast();

  const shareOptions = [
    {
      name: 'Copy Link',
      icon: Copy,
      action: () => {
        navigator.clipboard.writeText(url);
        toast({ title: 'Link Copied!', description: 'Share link copied to clipboard' });
        onOpenChange(false);
      },
      testId: 'share-copy-link'
    },
    {
      name: 'Email',
      icon: Mail,
      action: () => {
        const subject = encodeURIComponent(title);
        const body = encodeURIComponent(`${description}\n\n${url}`);
        window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
      },
      testId: 'share-email'
    },
    {
      name: 'Messages',
      icon: MessageSquare,
      action: () => {
        const text = encodeURIComponent(`${title}\n${description}\n${url}`);
        window.open(`sms:?&body=${text}`, '_blank');
      },
      testId: 'share-messages'
    },
    {
      name: 'WhatsApp',
      icon: SiWhatsapp,
      action: () => {
        const text = encodeURIComponent(`${title}\n${description}\n${url}`);
        window.open(`https://wa.me/?text=${text}`, '_blank');
      },
      testId: 'share-whatsapp'
    },
    {
      name: 'Messenger',
      icon: SiMessenger,
      action: () => {
        // Messenger requires a Facebook App ID, so we'll use native share as fallback
        if (navigator.share) {
          navigator.share({
            title: title,
            text: description,
            url: url,
          }).then(() => {
            toast({ title: 'Share via Messenger', description: 'Choose Messenger from the share options' });
          }).catch(() => {
            // User cancelled, copy to clipboard as fallback
            navigator.clipboard.writeText(url);
            toast({ title: 'Link Copied!', description: 'Share this link in Messenger' });
          });
        } else {
          // No native share, just copy the link
          navigator.clipboard.writeText(url);
          toast({ title: 'Link Copied!', description: 'Share this link in Messenger' });
        }
      },
      testId: 'share-messenger'
    },
    {
      name: 'Facebook',
      icon: SiFacebook,
      action: () => {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
      },
      testId: 'share-facebook'
    },
    {
      name: 'Twitter',
      icon: SiX,
      action: () => {
        const text = encodeURIComponent(title);
        window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(url)}`, '_blank');
      },
      testId: 'share-twitter'
    },
    {
      name: 'Embed',
      icon: Code,
      action: () => {
        const embedCode = `<iframe src="${url}" width="100%" height="600" frameborder="0"></iframe>`;
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
            title: title,
            text: description,
            url: url,
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
        <DialogHeader>
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
            >
              <option.icon className="w-5 h-5" />
              <span className="text-sm">{option.name}</span>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
