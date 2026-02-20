/**
 * Share Sheet Integration for Capacitor
 *
 * Allows sharing content from other apps directly into JournalMate
 * Works as a share target on iOS and Android
 */

import { Share, ShareResult } from '@capacitor/share';
import { registerPlugin } from '@capacitor/core';
import { isNative, isIOS, isAndroid, getPlatform } from './platform';
import { apiUrl } from './api';

// Define the SharePlugin interface for our custom Android plugin
interface SharePluginInterface {
  getPendingShare(): Promise<{ hasData: boolean; data: string | null }>;
}

// Register our custom SharePlugin (defined in MainActivity.java)
const SharePlugin = registerPlugin<SharePluginInterface>('SharePlugin');

// Import the share extension plugin for iOS
let ShareExtension: any = null;
let shareExtensionReady = false;
let shareExtensionPromise: Promise<void> | null = null;

// Initialize the share extension plugin asynchronously
function initShareExtensionPlugin(): Promise<void> {
  if (shareExtensionPromise) return shareExtensionPromise;
  
  shareExtensionPromise = (async () => {
    try {
      if (typeof window !== 'undefined' && (window as any).Capacitor) {
        const module = await import('capacitor-share-extension');
        ShareExtension = module.ShareExtension;
        shareExtensionReady = true;
        console.log('[SHARE] capacitor-share-extension loaded successfully');
      }
    } catch (e) {
      console.log('[SHARE] capacitor-share-extension not available:', e);
      shareExtensionReady = false;
    }
  })();
  
  return shareExtensionPromise;
}

// Start loading the plugin immediately on module load (for native only)
if (typeof window !== 'undefined' && (window as any).Capacitor) {
  initShareExtensionPlugin();
}

// Re-check for shares when the app becomes visible or resumes
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkIOSPendingShare();
    }
  });
}

// Listen for Capacitor App state changes (more reliable on native)
async function setupAppStateListeners() {
  try {
    if (typeof window !== 'undefined' && (window as any).Capacitor?.Plugins?.App) {
      const App = (window as any).Capacitor.Plugins.App;
      
      // Re-check on app resume (foreground)
      App.addListener('appStateChange', (state: { isActive: boolean }) => {
        if (state.isActive) {
          console.log('[SHARE] App became active, checking for pending shares...');
          checkIOSPendingShare();
        }
      });
      
      // Also check when app is opened via URL (share extension deep link)
      App.addListener('appUrlOpen', (data: { url: string }) => {
        if (data.url?.includes('share')) {
          console.log('[SHARE] App opened via share URL:', data.url);
          checkIOSPendingShare();
        }
      });
      
      console.log('[SHARE] App state listeners registered');
    }
  } catch (error) {
    console.log('[SHARE] Could not set up app state listeners:', error);
  }
}

// Setup app state listeners after a short delay to ensure Capacitor is ready
if (typeof window !== 'undefined' && (window as any).Capacitor) {
  setTimeout(setupAppStateListeners, 100);
}

export interface ShareData {
  title?: string;
  text?: string;
  url?: string;
  files?: string[]; // File URLs or base64 encoded data
}

export interface ShareOptions extends ShareData {
  dialogTitle?: string; // Android only
}

/**
 * Check if sharing is available on the platform
 */
export async function canShare(): Promise<boolean> {
  if (!isNative()) {
    // Web Share API
    return typeof navigator !== 'undefined' && 'share' in navigator;
  }
  
  return true; // Always available on native
}

/**
 * Share content to other apps
 */
export async function shareContent(options: ShareOptions): Promise<{ success: boolean; error?: string }> {
  try {
    if (!isNative() && !('share' in navigator)) {
      return { success: false, error: 'Sharing not supported in this browser' };
    }

    await Share.share({
      title: options.title,
      text: options.text,
      url: options.url,
      dialogTitle: options.dialogTitle || 'Share via',
      files: options.files,
    });

    console.log('[SHARE] Content shared successfully');
    return { success: true };
  } catch (error: any) {
    // User cancelled share
    if (error.message?.includes('cancel')) {
      console.log('[SHARE] Share cancelled by user');
      return { success: false, error: 'Cancelled' };
    }
    
    console.error('[SHARE] Failed to share:', error);
    return { success: false, error: error.message || 'Failed to share' };
  }
}

/**
 * Share text content
 */
export async function shareText(text: string, title?: string): Promise<{ success: boolean; error?: string }> {
  return await shareContent({ text, title });
}

/**
 * Share URL
 */
export async function shareUrl(url: string, title?: string): Promise<{ success: boolean; error?: string }> {
  return await shareContent({ url, title });
}

/**
 * Share files (images, documents, etc.)
 */
export async function shareFiles(files: string[], title?: string): Promise<{ success: boolean; error?: string }> {
  return await shareContent({ files, title });
}

/**
 * Share journal entry
 */
export async function shareJournalEntry(entry: {
  title: string;
  content: string;
  category?: string;
  date?: Date;
}): Promise<{ success: boolean; error?: string }> {
  const dateStr = entry.date ? entry.date.toLocaleDateString() : new Date().toLocaleDateString();
  const categoryStr = entry.category ? ` [${entry.category}]` : '';
  
  const shareText = `
${entry.title}${categoryStr}
${dateStr}

${entry.content}

---
Shared from JournalMate
`.trim();

  return await shareContent({
    title: entry.title,
    text: shareText,
  });
}

/**
 * Share activity plan
 */
export async function shareActivity(activity: {
  title: string;
  description?: string;
  tasks?: Array<{ title: string; completed?: boolean }>;
  url?: string;
}): Promise<{ success: boolean; error?: string }> {
  let shareText = `${activity.title}\n\n`;
  
  if (activity.description) {
    shareText += `${activity.description}\n\n`;
  }
  
  if (activity.tasks && activity.tasks.length > 0) {
    shareText += 'Tasks:\n';
    activity.tasks.forEach((task, index) => {
      const checkbox = task.completed ? '✅' : '☐';
      shareText += `${checkbox} ${task.title}\n`;
    });
    shareText += '\n';
  }
  
  shareText += '---\nShared from JournalMate';
  
  if (activity.url) {
    shareText += `\n${activity.url}`;
  }

  return await shareContent({
    title: activity.title,
    text: shareText,
    url: activity.url,
  });
}

/**
 * Handle incoming shared content (when app is opened via share sheet from another app)
 * 
 * SETUP REQUIRED:
 * 
 * Android (AndroidManifest.xml):
 * Add to <activity> tag:
 * ```xml
 * <intent-filter>
 *   <action android:name="android.intent.action.SEND" />
 *   <category android:name="android.intent.category.DEFAULT" />
 *   <data android:mimeType="text/plain" />
 * </intent-filter>
 * <intent-filter>
 *   <action android:name="android.intent.action.SEND" />
 *   <category android:name="android.intent.category.DEFAULT" />
 *   <data android:mimeType="image/*" />
 * </intent-filter>
 * <intent-filter>
 *   <action android:name="android.intent.action.SEND_MULTIPLE" />
 *   <category android:name="android.intent.category.DEFAULT" />
 *   <data android:mimeType="image/*" />
 * </intent-filter>
 * ```
 * 
 * iOS (Info.plist):
 * Add to the dictionary:
 * ```xml
 * <key>CFBundleDocumentTypes</key>
 * <array>
 *   <dict>
 *     <key>CFBundleTypeName</key>
 *     <string>Text</string>
 *     <key>LSHandlerRank</key>
 *     <string>Alternate</string>
 *     <key>LSItemContentTypes</key>
 *     <array>
 *       <string>public.text</string>
 *       <string>public.url</string>
 *     </array>
 *   </dict>
 * </array>
 * ```
 */
export interface IncomingShareData {
  type: 'text' | 'url' | 'file';
  title?: string;
  text?: string;
  url?: string;
  files?: string[];
}

// Store incoming share data temporarily
let pendingShareData: IncomingShareData | null = null;

/**
 * Initialize incoming share listener
 * Call this in App.tsx on mount
 * 
 * **iOS Setup Required**: See IOS_SHARE_EXTENSION_GUIDE.md for complete setup
 * **Android Setup Required**: See comments above for AndroidManifest.xml configuration
 */
export function initIncomingShareListener(): void {
  if (!isNative()) {
    console.log('[SHARE] Incoming share only available on native platforms');
    return;
  }

  // iOS: Check for pending shares from Share Extension
  // Requires Share Extension implementation (see IOS_SHARE_EXTENSION_GUIDE.md)
  if (isIOS()) {
    checkIOSPendingShare();
    
    // Listen for app URL opens from Share Extension
    if ((window as any).Capacitor?.Plugins?.App) {
      (window as any).Capacitor.Plugins.App.addListener('appUrlOpen', (event: any) => {
        if (event.url?.includes('share/incoming')) {
          checkIOSPendingShare();
        }
      });
    }
  }

  // Android: Check for cold start share data using our registered SharePlugin
  if (isAndroid()) {
    console.log('[SHARE ANDROID] Checking for cold start share data...');
    SharePlugin.getPendingShare()
      .then((result) => {
        console.log('[SHARE ANDROID] getPendingShare result:', result);
        if (result.hasData && result.data) {
          try {
            const shareData = typeof result.data === 'string' ? JSON.parse(result.data) : result.data;
            console.log('[SHARE ANDROID] Retrieved cold start share:', shareData);
            setPendingShareData(shareData);
          } catch (error) {
            console.error('[SHARE ANDROID] Failed to parse cold start share:', error);
          }
        } else {
          console.log('[SHARE ANDROID] No pending share data found');
        }
      })
      .catch((error: any) => {
        console.error('[SHARE ANDROID] Failed to get pending share:', error);
      });
  }

  // Android: Listen for 'incomingShare' events from MainActivity (hot start)
  // MainActivity dispatches CustomEvent with share data in event.detail (already parsed JSON object)
  window.addEventListener('incomingShare', (event: any) => {
    console.log('[SHARE ANDROID] incomingShare event received');
    console.log('[SHARE ANDROID] event.detail:', event.detail);
    try {
      const shareData = event.detail;
      if (shareData && (shareData.text || shareData.files || shareData.url || shareData.type)) {
        console.log('[SHARE ANDROID] Valid hot start share received:', shareData);
        setPendingShareData(shareData);
      } else {
        console.log('[SHARE ANDROID] Invalid or empty share data:', shareData);
      }
    } catch (error) {
      console.error('[SHARE ANDROID] Failed to process hot start share:', error);
    }
  });

  console.log('[SHARE] Incoming share listener initialized');
}

// Track if we've already processed a share to avoid duplicates
let shareProcessed = false;
let checkInProgress = false;

/**
 * Check for pending iOS shares from Share Extension
 * Uses capacitor-share-extension plugin for iOS
 * Implements exponential backoff with jitter for reliability
 */
async function checkIOSPendingShare(retryCount = 0): Promise<void> {
  if (!isIOS()) return;
  if (shareProcessed || checkInProgress) return;
  
  const MAX_RETRIES = 6;
  const BASE_DELAY_MS = 250;
  const MAX_DELAY_MS = 4000;
  
  checkInProgress = true;
  
  try {
    // Wait for the plugin to be loaded if it's still initializing
    if (!shareExtensionReady && shareExtensionPromise) {
      console.log('[SHARE iOS] Waiting for plugin to be ready...');
      await shareExtensionPromise;
    }
    
    // Try capacitor-share-extension plugin first
    if (ShareExtension && shareExtensionReady) {
      console.log('[SHARE iOS] Checking for pending share intent...');
      const result = await ShareExtension.checkSendIntentReceived();
      
      if (result && result.payload && result.payload.length > 0) {
        const items = result.payload;
        console.log('[SHARE iOS] Received share items:', items);
        shareProcessed = true;
        
        // Process the first item (or could combine multiple)
        const firstItem = items[0];
        
        if (firstItem.url) {
          setPendingShareData({
            type: 'url',
            url: firstItem.url,
            title: firstItem.title,
          });
        } else if (firstItem.text) {
          // Check if text contains a URL
          const urlMatch = firstItem.text.match(/https?:\/\/[^\s]+/);
          if (urlMatch) {
            setPendingShareData({
              type: 'url',
              url: urlMatch[0],
              text: firstItem.text,
              title: firstItem.title,
            });
          } else {
            setPendingShareData({
              type: 'text',
              text: firstItem.text,
              title: firstItem.title,
            });
          }
        } else if (firstItem.webPath) {
          setPendingShareData({
            type: 'file',
            files: items.map((i: any) => i.webPath).filter(Boolean),
            title: firstItem.title,
          });
        }
        
        // Clear the share data after processing
        await ShareExtension.finish();
      } else {
        console.log('[SHARE iOS] No pending share intent found');
      }
    } else if ((window as any).Capacitor?.Plugins?.AppGroupPlugin) {
      // Fallback to AppGroupPlugin for older implementations
      console.log('[SHARE iOS] Using AppGroupPlugin fallback...');
      const result = await (window as any).Capacitor.Plugins.AppGroupPlugin.getSharedData();
      
      if (result?.data) {
        shareProcessed = true;
        setPendingShareData(result.data);
      }
    } else if (retryCount < MAX_RETRIES) {
      // Plugin not ready yet, retry with exponential backoff + jitter
      const delay = Math.min(BASE_DELAY_MS * Math.pow(2, retryCount), MAX_DELAY_MS);
      const jitter = Math.random() * 100; // Add random jitter up to 100ms
      console.log(`[SHARE iOS] Plugin not ready, retrying in ${Math.round(delay + jitter)}ms (${retryCount + 1}/${MAX_RETRIES})...`);
      checkInProgress = false;
      await new Promise(resolve => setTimeout(resolve, delay + jitter));
      return checkIOSPendingShare(retryCount + 1);
    } else {
      console.log('[SHARE iOS] No share extension plugin available after retries');
    }
  } catch (error) {
    console.error('[SHARE iOS] Failed to check pending share:', error);
    
    // Retry on error with exponential backoff
    if (retryCount < MAX_RETRIES) {
      const delay = Math.min(BASE_DELAY_MS * Math.pow(2, retryCount), MAX_DELAY_MS);
      const jitter = Math.random() * 100;
      console.log(`[SHARE iOS] Retrying after error in ${Math.round(delay + jitter)}ms (${retryCount + 1}/${MAX_RETRIES})...`);
      checkInProgress = false;
      await new Promise(resolve => setTimeout(resolve, delay + jitter));
      return checkIOSPendingShare(retryCount + 1);
    }
  } finally {
    checkInProgress = false;
  }
}

/**
 * Reset share state (call when share has been fully processed by the app)
 */
export function resetShareState(): void {
  shareProcessed = false;
  checkInProgress = false;
}

/**
 * Handle incoming Android intent
 */
function handleIncomingIntent(intent: any): void {
  const action = intent.action;
  
  if (action === 'android.intent.action.SEND') {
    const type = intent.type;
    
    if (type === 'text/plain') {
      // Text share
      const text = intent.extras?.['android.intent.extra.TEXT'] || '';
      const subject = intent.extras?.['android.intent.extra.SUBJECT'] || '';
      
      setPendingShareData({
        type: 'text',
        text,
        title: subject,
      });
    } else if (type?.startsWith('image/')) {
      // Image share
      const imageUri = intent.extras?.['android.intent.extra.STREAM'];
      
      if (imageUri) {
        setPendingShareData({
          type: 'file',
          files: [imageUri],
        });
      }
    }
  } else if (action === 'android.intent.action.SEND_MULTIPLE') {
    // Multiple files share
    const imageUris = intent.extras?.['android.intent.extra.STREAM'];
    
    if (imageUris && Array.isArray(imageUris)) {
      setPendingShareData({
        type: 'file',
        files: imageUris,
      });
    }
  }
}

/**
 * Persist share data to the server immediately so it survives app backgrounding.
 * Fire-and-forget — failure is non-fatal (share still works via volatile path).
 */
async function persistPendingShare(data: IncomingShareData): Promise<string | null> {
  try {
    const shareUrl = data.url || (data.text && /^https?:\/\//i.test(data.text.trim()) ? data.text.trim() : null);
    const shareText = !shareUrl ? (data.text || null) : null;

    // Detect platform from URL
    let platform: string | null = null;
    if (shareUrl) {
      const lower = shareUrl.toLowerCase();
      if (lower.includes('instagram.com')) platform = 'instagram';
      else if (lower.includes('tiktok.com')) platform = 'tiktok';
      else if (lower.includes('youtube.com') || lower.includes('youtu.be')) platform = 'youtube';
    }

    const sourcePlatform = getPlatform() === 'web' ? null : getPlatform();

    const response = await fetch(apiUrl('/api/shares/pending'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        shareUrl,
        shareText,
        shareType: data.type || (shareUrl ? 'url' : 'text'),
        platform,
        sourcePlatform,
      }),
    });

    if (response.ok) {
      const result = await response.json();
      console.log('[SHARE] Persisted pending share to server:', result.id);
      return result.id;
    } else {
      console.warn('[SHARE] Failed to persist pending share:', response.status);
      return null;
    }
  } catch (error) {
    console.warn('[SHARE] Could not persist pending share:', error);
    return null;
  }
}

/**
 * Set pending share data (called from native layer or intent handler)
 */
export function setPendingShareData(data: IncomingShareData): void {
  pendingShareData = data;
  console.log('[SHARE] Received incoming share:', data);

  // Persist to server immediately (fire-and-forget)
  // This ensures the share survives app backgrounding
  persistPendingShare(data).then((pendingShareId) => {
    if (pendingShareId) {
      (data as any)._pendingShareId = pendingShareId;
    }
  });

  // Dispatch custom event so app can react to incoming share
  window.dispatchEvent(new CustomEvent('incoming-share', { detail: data }));
}

/**
 * Get and clear pending share data
 */
export function consumePendingShareData(): IncomingShareData | null {
  const data = pendingShareData;
  pendingShareData = null;
  return data;
}

/**
 * Check if there's pending share data
 */
export function hasPendingShareData(): boolean {
  return pendingShareData !== null;
}

/**
 * Listen for incoming shares (React hook friendly)
 * Usage:
 * ```typescript
 * useEffect(() => {
 *   const handler = (event: CustomEvent<IncomingShareData>) => {
 *     const shareData = event.detail;
 *     // Navigate to journal entry with pre-filled content
 *   };
 *   window.addEventListener('incoming-share', handler as any);
 *   return () => window.removeEventListener('incoming-share', handler as any);
 * }, []);
 * ```
 */
export function onIncomingShare(callback: (data: IncomingShareData) => void): () => void {
  const handler = (event: CustomEvent<IncomingShareData>) => {
    callback(event.detail);
  };
  
  window.addEventListener('incoming-share', handler as any);
  
  return () => {
    window.removeEventListener('incoming-share', handler as any);
  };
}

/**
 * Check the server for any pending shares that were not completed.
 * Called on app resume to recover from backgrounding.
 */
export async function checkServerPendingShares(): Promise<(IncomingShareData & { _pendingShareId?: string; _isRecovered?: boolean })[]> {
  try {
    const response = await fetch(apiUrl('/api/shares/pending'), {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) return [];

    const { shares } = await response.json();
    if (!shares || shares.length === 0) return [];

    console.log(`[SHARE] Found ${shares.length} orphaned pending share(s) on server`);

    return shares.map((share: any) => ({
      type: share.shareType as 'url' | 'text' | 'file',
      url: share.shareUrl || undefined,
      text: share.shareText || undefined,
      _pendingShareId: share.id,
      _isRecovered: true,
    }));
  } catch (error) {
    console.warn('[SHARE] Could not check server pending shares:', error);
    return [];
  }
}

/**
 * Update a pending share's status on the server.
 */
export async function updatePendingShareStatus(
  shareId: string,
  status: 'processing' | 'completed' | 'failed',
  details?: { activityId?: string; errorMessage?: string }
): Promise<void> {
  try {
    await fetch(apiUrl(`/api/shares/pending/${shareId}`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status, ...details }),
    });
    console.log(`[SHARE] Updated pending share ${shareId} to ${status}`);
  } catch (error) {
    console.warn(`[SHARE] Could not update pending share ${shareId}:`, error);
  }
}

/**
 * Quick share to common platforms
 */
export async function shareToSocial(
  content: string,
  platform?: 'twitter' | 'facebook' | 'whatsapp' | 'email' | 'sms'
): Promise<{ success: boolean; error?: string }> {
  // On native, we can use platform-specific share targets
  // For now, use generic share which will show all available options
  return await shareText(content);
}

export default {
  canShare,
  shareContent,
  shareText,
  shareUrl,
  shareFiles,
  shareJournalEntry,
  shareActivity,
  setPendingShareData,
  consumePendingShareData,
  hasPendingShareData,
  shareToSocial,
  resetShareState,
  checkServerPendingShares,
  updatePendingShareStatus,
};
