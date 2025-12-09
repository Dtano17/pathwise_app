/**
 * Offline Sync Indicator Component
 *
 * Shows online/offline status and pending sync count
 * Automatically syncs when connection is restored
 */

import { useState, useEffect } from 'react';
import { Cloud, CloudOff, RefreshCw, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  getOfflineJournals,
  syncOfflineJournals,
  hapticsSuccess,
  hapticsLight,
} from '@/lib/mobile';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';

export function OfflineSyncIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [justSynced, setJustSynced] = useState(false);
  const { toast } = useToast();

  // Check pending journals
  const checkPending = async () => {
    const journals = await getOfflineJournals();
    setPendingCount(journals.length);
  };

  // Handle sync
  const handleSync = async () => {
    if (!isOnline || pendingCount === 0) return;

    setIsSyncing(true);
    hapticsLight();

    try {
      const result = await syncOfflineJournals();

      if (result.synced > 0) {
        hapticsSuccess();
        setJustSynced(true);
        toast({
          title: 'Sync complete!',
          description: `${result.synced} journal${result.synced > 1 ? 's' : ''} synced successfully`,
        });

        setTimeout(() => setJustSynced(false), 3000);
        await checkPending();
      }

      if (result.failed > 0) {
        toast({
          title: 'Some items failed to sync',
          description: `${result.failed} journal${result.failed > 1 ? 's' : ''} could not be synced`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Sync failed:', error);
      toast({
        title: 'Sync failed',
        description: 'Could not sync offline journals. Will retry automatically.',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: 'Back online',
        description: 'Syncing offline changes...',
      });
      // Auto-sync when coming back online
      setTimeout(handleSync, 1000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: 'You are offline',
        description: 'Changes will be saved locally and synced when online',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check pending on mount
    checkPending();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Periodic check for pending items
  useEffect(() => {
    const interval = setInterval(checkPending, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  if (!isOnline) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="secondary" className="gap-1.5">
            <CloudOff className="w-3 h-3" />
            Offline
            {pendingCount > 0 && (
              <span className="ml-1 bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 text-xs font-bold">
                {pendingCount}
              </span>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>You are offline</p>
          {pendingCount > 0 && (
            <p className="text-xs mt-1">{pendingCount} items pending sync</p>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }

  if (justSynced) {
    return (
      <Badge variant="default" className="gap-1.5 bg-green-500 hover:bg-green-600">
        <Check className="w-3 h-3" />
        Synced
      </Badge>
    );
  }

  if (pendingCount > 0) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={isSyncing}
            className="h-7 gap-1.5"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : `Sync (${pendingCount})`}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Sync {pendingCount} offline journal{pendingCount > 1 ? 's' : ''}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" className="gap-1.5">
          <Cloud className="w-3 h-3 text-green-500" />
          Online
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p>All changes synced</p>
      </TooltipContent>
    </Tooltip>
  );
}
