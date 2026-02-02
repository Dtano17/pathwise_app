import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SocialLogin } from '@/components/SocialLogin';
import { Lock } from 'lucide-react';

interface SignInPromptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
}

export function SignInPromptModal({ open, onOpenChange, title, description }: SignInPromptModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-signin-prompt">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-emerald-500 flex items-center justify-center">
              <Lock className="w-8 h-8 text-white" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl" data-testid="text-signin-title">
            {title}
          </DialogTitle>
          <DialogDescription className="text-center text-base pt-2" data-testid="text-signin-description">
            {description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-6 space-y-4">
          <SocialLogin />
          
          <div className="text-center text-sm text-muted-foreground">
            <p>Secure authentication with your favorite provider</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
