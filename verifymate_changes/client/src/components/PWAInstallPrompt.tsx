import { useState, useEffect } from 'react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function PWAInstallPrompt() {
  const { isInstallable, promptInstall } = usePWAInstall();
  const [isDismissed, setIsDismissed] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      setIsDismissed(true);
    }

    const handleInteraction = () => {
      setHasInteracted(true);
      window.removeEventListener('scroll', handleInteraction);
      window.removeEventListener('click', handleInteraction);
    };

    window.addEventListener('scroll', handleInteraction);
    window.addEventListener('click', handleInteraction);

    return () => {
      window.removeEventListener('scroll', handleInteraction);
      window.removeEventListener('click', handleInteraction);
    };
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  const handleInstall = () => {
    promptInstall();
  };

  if (!isInstallable || isDismissed || !hasInteracted) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed left-4 right-4 z-50 md:left-auto md:right-4 md:w-96"
        style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom, 0px) + var(--android-safe-area-bottom, 0px))' }}
      >
        <Card className="p-4 shadow-lg border-primary/20">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Download className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm mb-1">Install JournalMate</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Get quick access and work offline. Install our app for the best experience.
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleInstall}
                  className="flex-1"
                  data-testid="button-install-pwa"
                >
                  Install App
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDismiss}
                  data-testid="button-dismiss-install"
                >
                  Not Now
                </Button>
              </div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="flex-shrink-0 h-6 w-6"
              onClick={handleDismiss}
              data-testid="button-close-install"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
