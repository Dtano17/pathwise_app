/**
 * Offline Storage Manager for Capacitor
 *
 * Provides persistent storage for offline mode, file caching,
 * and journal data synchronization
 */

import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { isNative } from './platform';

export interface CachedData {
  key: string;
  data: any;
  timestamp: number;
  expiresAt?: number;
}

export interface StorageOptions {
  directory?: Directory;
  encoding?: Encoding;
}

/**
 * Save data to persistent storage (key-value)
 */
export async function saveData(key: string, value: any): Promise<void> {
  try {
    const jsonValue = JSON.stringify(value);

    if (isNative()) {
      // Use Capacitor Preferences for native
      await Preferences.set({ key, value: jsonValue });
    } else {
      // Use localStorage for web
      localStorage.setItem(key, jsonValue);
    }
  } catch (error) {
    console.error(`Failed to save data for key "${key}":`, error);
    throw error;
  }
}

/**
 * Load data from persistent storage
 */
export async function loadData<T = any>(key: string): Promise<T | null> {
  try {
    let jsonValue: string | null;

    if (isNative()) {
      // Use Capacitor Preferences for native
      const result = await Preferences.get({ key });
      jsonValue = result.value;
    } else {
      // Use localStorage for web
      jsonValue = localStorage.getItem(key);
    }

    if (!jsonValue) {
      return null;
    }

    return JSON.parse(jsonValue) as T;
  } catch (error) {
    console.error(`Failed to load data for key "${key}":`, error);
    return null;
  }
}

/**
 * Remove data from storage
 */
export async function removeData(key: string): Promise<void> {
  try {
    if (isNative()) {
      await Preferences.remove({ key });
    } else {
      localStorage.removeItem(key);
    }
  } catch (error) {
    console.error(`Failed to remove data for key "${key}":`, error);
  }
}

/**
 * Clear all stored data
 */
export async function clearAllData(): Promise<void> {
  try {
    if (isNative()) {
      await Preferences.clear();
    } else {
      localStorage.clear();
    }
  } catch (error) {
    console.error('Failed to clear all data:', error);
  }
}

/**
 * Save file to filesystem
 */
export async function saveFile(
  fileName: string,
  data: string,
  options: StorageOptions = {}
): Promise<string> {
  if (!isNative()) {
    // Web fallback: save to localStorage with file prefix
    const key = `file:${fileName}`;
    await saveData(key, data);
    return key;
  }

  try {
    const directory = options.directory || Directory.Documents;
    const encoding = options.encoding || Encoding.UTF8;

    const result = await Filesystem.writeFile({
      path: fileName,
      data,
      directory,
      encoding,
    });

    return result.uri;
  } catch (error) {
    console.error(`Failed to save file "${fileName}":`, error);
    throw error;
  }
}

/**
 * Read file from filesystem
 */
export async function readFile(
  fileName: string,
  options: StorageOptions = {}
): Promise<string | null> {
  if (!isNative()) {
    // Web fallback: read from localStorage
    const key = `file:${fileName}`;
    return await loadData<string>(key);
  }

  try {
    const directory = options.directory || Directory.Documents;
    const encoding = options.encoding || Encoding.UTF8;

    const result = await Filesystem.readFile({
      path: fileName,
      directory,
      encoding,
    });

    return result.data as string;
  } catch (error) {
    console.error(`Failed to read file "${fileName}":`, error);
    return null;
  }
}

/**
 * Delete file from filesystem
 */
export async function deleteFile(fileName: string, options: StorageOptions = {}): Promise<void> {
  if (!isNative()) {
    // Web fallback: remove from localStorage
    const key = `file:${fileName}`;
    await removeData(key);
    return;
  }

  try {
    const directory = options.directory || Directory.Documents;

    await Filesystem.deleteFile({
      path: fileName,
      directory,
    });
  } catch (error) {
    console.error(`Failed to delete file "${fileName}":`, error);
  }
}

/**
 * Check if file exists
 */
export async function fileExists(fileName: string, options: StorageOptions = {}): Promise<boolean> {
  if (!isNative()) {
    const key = `file:${fileName}`;
    const data = await loadData(key);
    return data !== null;
  }

  try {
    const directory = options.directory || Directory.Documents;

    const result = await Filesystem.stat({
      path: fileName,
      directory,
    });

    return result.type === 'file';
  } catch {
    return false;
  }
}

/**
 * Cache data with expiration
 */
export async function cacheData(key: string, data: any, ttlSeconds?: number): Promise<void> {
  const cached: CachedData = {
    key,
    data,
    timestamp: Date.now(),
    expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined,
  };

  await saveData(`cache:${key}`, cached);
}

/**
 * Get cached data (returns null if expired)
 */
export async function getCachedData<T = any>(key: string): Promise<T | null> {
  const cached = await loadData<CachedData>(`cache:${key}`);

  if (!cached) {
    return null;
  }

  // Check expiration
  if (cached.expiresAt && Date.now() > cached.expiresAt) {
    await removeData(`cache:${key}`);
    return null;
  }

  return cached.data as T;
}

/**
 * Save journal entry for offline access
 */
export async function saveJournalOffline(journalId: string, entry: any): Promise<void> {
  await saveData(`journal:${journalId}`, entry);

  // Add to offline queue
  const queue = (await loadData<string[]>('offline:journals')) || [];
  if (!queue.includes(journalId)) {
    queue.push(journalId);
    await saveData('offline:journals', queue);
  }
}

/**
 * Get all offline journal entries
 */
export async function getOfflineJournals(): Promise<any[]> {
  const queue = (await loadData<string[]>('offline:journals')) || [];

  const journals = await Promise.all(
    queue.map(async (id) => {
      const entry = await loadData(`journal:${id}`);
      return entry;
    })
  );

  return journals.filter(Boolean);
}

/**
 * Sync offline journals with server
 */
export async function syncOfflineJournals(): Promise<{ synced: number; failed: number }> {
  const queue = (await loadData<string[]>('offline:journals')) || [];
  let synced = 0;
  let failed = 0;

  for (const journalId of queue) {
    const entry = await loadData(`journal:${journalId}`);
    if (!entry) continue;

    try {
      // Send to server
      const response = await fetch('/api/journal/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });

      if (response.ok) {
        // Remove from offline storage
        await removeData(`journal:${journalId}`);
        synced++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`Failed to sync journal ${journalId}:`, error);
      failed++;
    }
  }

  // Update queue
  const remainingQueue = queue.slice(synced);
  await saveData('offline:journals', remainingQueue);

  return { synced, failed };
}

/**
 * Save image to cache
 */
export async function saveImageToCache(imageId: string, dataUrl: string): Promise<void> {
  if (isNative()) {
    // Save to filesystem on native
    await saveFile(`images/${imageId}.jpg`, dataUrl, {
      directory: Directory.Cache,
    });
  } else {
    // Save to indexed DB or localStorage on web
    await saveData(`image:${imageId}`, dataUrl);
  }
}

/**
 * Get image from cache
 */
export async function getImageFromCache(imageId: string): Promise<string | null> {
  if (isNative()) {
    return await readFile(`images/${imageId}.jpg`, {
      directory: Directory.Cache,
    });
  } else {
    return await loadData<string>(`image:${imageId}`);
  }
}

/**
 * Get storage info (available space, etc.)
 */
export async function getStorageInfo(): Promise<{ available: number; total: number } | null> {
  if (!isNative()) {
    // Web storage quota API
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        available: estimate.quota || 0,
        total: estimate.usage || 0,
      };
    }
    return null;
  }

  // Native filesystem doesn't provide storage info directly
  // This would require a custom plugin
  return null;
}

export default {
  saveData,
  loadData,
  removeData,
  clearAllData,
  saveFile,
  readFile,
  deleteFile,
  fileExists,
  cacheData,
  getCachedData,
  saveJournalOffline,
  getOfflineJournals,
  syncOfflineJournals,
  saveImageToCache,
  getImageFromCache,
  getStorageInfo,
};
