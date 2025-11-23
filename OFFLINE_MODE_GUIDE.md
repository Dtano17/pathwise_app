# Offline Mode Implementation Guide

## Overview
This guide explains how to implement offline-first functionality for JournalMate, enabling full app usage without internet connectivity with intelligent background synchronization.

**IMPORTANT**: This project has strict guidelines against modifying `vite.config.ts`. This guide uses the existing Vite setup and adds offline capabilities without touching the Vite configuration.

## Architecture

### Offline-First Strategy
```
┌─────────────────┐
│   React App     │
│  (Always Online)│
└────────┬────────┘
         │
         ├─────────────────┐
         │                 │
    ┌────▼────┐      ┌─────▼──────┐
    │ IndexedDB│      │ Capacitor  │
    │ (Cache)  │      │ (Native)   │
    └────┬────┘      └─────┬──────┘
         │                 │
         └────────┬────────┘
                  │
          ┌───────▼────────┐
          │  Backend API   │
          │  (PostgreSQL)  │
          └────────────────┘
```

## Implementation Steps

### Step 1: Install Dependencies

```bash
npm install idb
```

**Note**: We use IndexedDB for offline storage on both web and native. Capacitor provides native persistence automatically, and IndexedDB works consistently across platforms.

### Step 2: Create Offline Storage Manager

**File: `client/src/lib/offlineStorage.ts`**

This implementation uses IndexedDB for offline data persistence. Capacitor automatically handles native storage, and IndexedDB works seamlessly across web and native platforms.


```typescript
import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface JournalMateDB extends DBSchema {
  activities: {
    key: string;
    value: Activity & { _syncStatus: 'pending' | 'synced'; _lastModified: number };
    indexes: { 'by-sync-status': string; 'by-user': string };
  };
  tasks: {
    key: string;
    value: Task & { _syncStatus: 'pending' | 'synced'; _lastModified: number };
    indexes: { 'by-sync-status': string; 'by-activity': string };
  };
  journal_entries: {
    key: string;
    value: JournalEntry & { _syncStatus: 'pending' | 'synced'; _lastModified: number };
    indexes: { 'by-sync-status': string; 'by-user': string };
  };
  sync_queue: {
    key: number;
    value: {
      id: number;
      type: 'create' | 'update' | 'delete';
      entity: 'activity' | 'task' | 'journal_entry';
      entityId: string;
      data: any;
      timestamp: number;
      retries: number;
    };
    indexes: { 'by-timestamp': number };
  };
}

let db: IDBPDatabase<JournalMateDB>;

export async function initOfflineDB(): Promise<void> {
  db = await openDB<JournalMateDB>('journalmate-offline', 1, {
    upgrade(db) {
      // Activities store
      const activityStore = db.createObjectStore('activities', { keyPath: 'id' });
      activityStore.createIndex('by-sync-status', '_syncStatus');
      activityStore.createIndex('by-user', 'userId');

      // Tasks store
      const taskStore = db.createObjectStore('tasks', { keyPath: 'id' });
      taskStore.createIndex('by-sync-status', '_syncStatus');
      taskStore.createIndex('by-activity', 'activityId');

      // Journal entries store
      const journalStore = db.createObjectStore('journal_entries', { keyPath: 'id' });
      journalStore.createIndex('by-sync-status', '_syncStatus');
      journalStore.createIndex('by-user', 'userId');

      // Sync queue
      const syncStore = db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true });
      syncStore.createIndex('by-timestamp', 'timestamp');
    },
  });

  console.log('[OFFLINE] IndexedDB initialized');
}

// Save activity offline
export async function saveActivityOffline(activity: Activity): Promise<void> {
  await db.put('activities', {
    ...activity,
    _syncStatus: 'pending',
    _lastModified: Date.now(),
  });

  await addToSyncQueue('create', 'activity', activity.id, activity);
}

// Get all pending sync items
export async function getPendingSyncItems(): Promise<any[]> {
  return await db.getAllFromIndex('sync_queue', 'by-timestamp');
}

// Add item to sync queue
async function addToSyncQueue(
  type: 'create' | 'update' | 'delete',
  entity: 'activity' | 'task' | 'journal_entry',
  entityId: string,
  data: any
): Promise<void> {
  await db.add('sync_queue', {
    type,
    entity,
    entityId,
    data,
    timestamp: Date.now(),
    retries: 0,
  } as any);
}

// Mark item as synced
export async function markAsSynced(entity: string, id: string): Promise<void> {
  const item = await db.get(entity as any, id);
  if (item) {
    await db.put(entity as any, {
      ...item,
      _syncStatus: 'synced',
      _lastModified: Date.now(),
    });
  }
}

// Clear sync queue
export async function clearSyncQueue(): Promise<void> {
  await db.clear('sync_queue');
}

// Get offline activities
export async function getOfflineActivities(userId: string): Promise<Activity[]> {
  const all = await db.getAllFromIndex('activities', 'by-user', userId);
  return all.map(item => {
    const { _syncStatus, _lastModified, ...activity } = item;
    return activity as Activity;
  });
}

// Get offline tasks
export async function getOfflineTasks(activityId: string): Promise<Task[]> {
  const all = await db.getAllFromIndex('tasks', 'by-activity', activityId);
  return all.map(item => {
    const { _syncStatus, _lastModified, ...task } = item;
    return task as Task;
  });
}

// Delete offline item
export async function deleteOfflineItem(entity: string, id: string): Promise<void> {
  await db.delete(entity as any, id);
}
```

### Step 3: Create Sync Manager

**File: `client/src/lib/syncManager.ts`**
```typescript
import { initOfflineDB, getPendingSyncItems, markAsSynced, clearSyncQueue } from './offlineStorage';
import { isOnline } from './platform';
import { apiRequest } from './queryClient';

let syncInterval: number | null = null;
let isSyncing = false;

/**
 * Initialize background sync
 */
export async function initSync(): Promise<void> {
  await initOfflineDB();

  // Sync immediately if online
  if (isOnline()) {
    await syncNow();
  }

  // Set up periodic sync every 30 seconds
  syncInterval = window.setInterval(async () => {
    if (isOnline() && !isSyncing) {
      await syncNow();
    }
  }, 30000);

  // Sync when coming online
  window.addEventListener('online', () => {
    console.log('[SYNC] Network online, syncing...');
    syncNow();
  });

  console.log('[SYNC] Sync manager initialized');
}

/**
 * Stop background sync
 */
export function stopSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}

/**
 * Manually trigger sync
 */
export async function syncNow(): Promise<{ success: boolean; synced: number; errors: number }> {
  if (isSyncing) {
    console.log('[SYNC] Already syncing, skipping...');
    return { success: false, synced: 0, errors: 0 };
  }

  if (!isOnline()) {
    console.log('[SYNC] Offline, skipping sync');
    return { success: false, synced: 0, errors: 0 };
  }

  isSyncing = true;
  let syncedCount = 0;
  let errorCount = 0;

  try {
    const pendingItems = await getPendingSyncItems();
    console.log(`[SYNC] Syncing ${pendingItems.length} pending items...`);

    for (const item of pendingItems) {
      try {
        // Sync based on type
        if (item.type === 'create') {
          await apiRequest(`/api/${item.entity}s`, 'POST', item.data);
        } else if (item.type === 'update') {
          await apiRequest(`/api/${item.entity}s/${item.entityId}`, 'PATCH', item.data);
        } else if (item.type === 'delete') {
          await apiRequest(`/api/${item.entity}s/${item.entityId}`, 'DELETE');
        }

        // Mark as synced
        await markAsSynced(`${item.entity}s`, item.entityId);
        syncedCount++;

        console.log(`[SYNC] Synced ${item.entity} ${item.entityId}`);
      } catch (error) {
        console.error(`[SYNC] Failed to sync ${item.entity} ${item.entityId}:`, error);
        errorCount++;

        // Remove from queue after 5 retries
        if (item.retries >= 5) {
          console.warn(`[SYNC] Removing ${item.entity} ${item.entityId} after 5 failed attempts`);
          // Could optionally keep a failed_sync store for user review
        }
      }
    }

    if (syncedCount > 0) {
      await clearSyncQueue();
      console.log(`[SYNC] Complete: ${syncedCount} synced, ${errorCount} errors`);
    }

    return { success: true, synced: syncedCount, errors: errorCount };
  } catch (error) {
    console.error('[SYNC] Sync failed:', error);
    return { success: false, synced: syncedCount, errors: errorCount };
  } finally {
    isSyncing = false;
  }
}

/**
 * Get sync status
 */
export async function getSyncStatus(): Promise<{
  pendingCount: number;
  lastSyncTime: number | null;
  isSyncing: boolean;
}> {
  const pendingItems = await getPendingSyncItems();
  return {
    pendingCount: pendingItems.length,
    lastSyncTime: null, // Could track in localStorage
    isSyncing,
  };
}
```

### Step 4: Integrate with React App

**File: `client/src/App.tsx`**
```typescript
import { useEffect, useState } from 'react';
import { initSync, getSyncStatus } from '@/lib/syncManager';
import { isOnline } from '@/lib/platform';

export default function App() {
  const [offline, setOffline] = useState(!isOnline());
  const [syncStatus, setSyncStatus] = useState({ pendingCount: 0, isSyncing: false });

  useEffect(() => {
    // Initialize sync on app start
    initSync();

    // Update offline status
    const updateOnlineStatus = () => {
      setOffline(!navigator.onLine);
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Update sync status periodically
    const interval = setInterval(async () => {
      const status = await getSyncStatus();
      setSyncStatus(status);
    }, 5000);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      clearInterval(interval);
    };
  }, []);

  return (
    <div>
      {/* Offline indicator */}
      {offline && (
        <div className="bg-yellow-500 text-white px-4 py-2 text-center">
          You're offline. Changes will sync when you're back online.
          {syncStatus.pendingCount > 0 && ` (${syncStatus.pendingCount} pending)`}
        </div>
      )}
      
      {/* Your app content */}
      <YourAppContent />
    </div>
  );
}
```

### Step 5: Update API Hooks

**File: `client/src/hooks/useOfflineQuery.ts`**
```typescript
import { useQuery, useMutation } from '@tanstack/react-query';
import { isOnline } from '@/lib/platform';
import { getOfflineActivities, saveActivityOffline } from '@/lib/offlineStorage';
import { apiRequest, queryClient } from '@/lib/queryClient';

export function useOfflineActivities(userId: string) {
  return useQuery({
    queryKey: ['/api/activities', userId],
    queryFn: async () => {
      if (isOnline()) {
        // Fetch from server
        return await apiRequest(`/api/activities?userId=${userId}`);
      } else {
        // Fetch from offline storage
        return await getOfflineActivities(userId);
      }
    },
  });
}

export function useCreateActivityOffline() {
  return useMutation({
    mutationFn: async (activity: Activity) => {
      if (isOnline()) {
        // Create on server
        return await apiRequest('/api/activities', 'POST', activity);
      } else {
        // Save offline
        await saveActivityOffline(activity);
        return activity;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
    },
  });
}
```

## Testing Offline Mode

### Chrome DevTools
1. Open DevTools → Network tab
2. Select "Offline" from throttling dropdown
3. Test creating/updating activities
4. Switch back to "Online"
5. Verify data syncs automatically

### Capacitor (Native)
1. Enable Airplane Mode on device
2. Use the app normally
3. Disable Airplane Mode
4. Check console logs for sync messages

## Best Practices

1. **Conflict Resolution**: Implement last-write-wins or timestamp-based merging
2. **Storage Limits**: IndexedDB has ~50MB on web, unlimited on native; implement cleanup for old data
3. **User Feedback**: Show clear indicators for offline mode and pending syncs
4. **Retry Logic**: Exponential backoff for failed syncs
5. **Battery Efficiency**: Limit sync frequency when on battery
6. **Platform Differences**: IndexedDB works the same on web and native via Capacitor

## Production Considerations

- Add encryption for sensitive offline data using Capacitor SecureStorage
- Implement conflict resolution UI for edge cases
- Monitor IndexedDB quota usage on web
- Test with poor network conditions (not just offline/online)
- Add analytics for offline usage patterns
- Leverage Capacitor's Network plugin to detect connectivity changes

## Network Detection with Capacitor

```typescript
import { Network } from '@capacitor/network';

// Listen for network status changes
Network.addListener('networkStatusChange', status => {
  console.log('Network status changed', status);
  if (status.connected) {
    // Trigger sync when back online
    syncNow();
  }
});

// Get current status
const status = await Network.getStatus();
console.log('Network status:', status);
```

## Next Steps

1. Install `idb` package for IndexedDB abstraction
2. Implement `offlineStorage.ts` and `syncManager.ts` as shown above
3. Update API hooks to use offline storage fallback
4. Add offline indicator UI component
5. Integrate with Capacitor Network plugin for connectivity monitoring
6. Test thoroughly with network throttling and airplane mode
7. Deploy and monitor sync reliability

## Why No Service Worker?

This project follows a strict guideline against modifying `vite.config.ts`. Instead of using a service worker (which requires Vite PWA plugin), we:
- Use IndexedDB directly for offline storage
- Leverage Capacitor's built-in network detection
- Implement application-level sync logic
- Get offline support on native apps automatically via Capacitor

This approach is simpler, respects project constraints, and works identically across web and native platforms.
