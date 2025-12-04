/**
 * Share Sheet Integration for Capacitor
 *
 * Allows sharing content from other apps directly into JournalMate
 * Works as a share target on iOS and Android
 */

import { Share, ShareResult } from '@capacitor/share';
import { isNative, isIOS } from './platform';

// Import the share extension plugin for iOS
let ShareExtension: any = null;
try {
  // Dynamic import for native only
  if (typeof window !== 'undefined' && (window as any).Capacitor) {
    import('capacitor-share-extension').then(module => {
      ShareExtension = module.ShareExtension;
    }).catch(() => {
      console.log('[SHARE] capacitor-share-extension not available');
    });
  }
} catch (e) {
  // Not available on this platform
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

  // Android: Check for cold start share data
  if (!isIOS() && (window as any).Capacitor?.Plugins?.SharePlugin) {
    (window as any).Capacitor.Plugins.SharePlugin.getPendingShare()
      .then((result: any) => {
        if (result.hasData && result.data) {
          try {
            const shareData = typeof result.data === 'string' ? JSON.parse(result.data) : result.data;
            console.log('[SHARE ANDROID] Retrieved cold start share:', shareData);
            setPendingShareData(shareData);
          } catch (error) {
            console.error('[SHARE ANDROID] Failed to parse cold start share:', error);
          }
        }
      })
      .catch((error: any) => {
        console.error('[SHARE ANDROID] Failed to get pending share:', error);
      });
  }

  // Android: Listen for 'incomingShare' events from MainActivity (hot start)
  window.addEventListener('incomingShare', (event: any) => {
    try {
      // MainActivity sends JSON string via CustomEvent - must parse it
      const rawData = event.detail || event;
      const shareData = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
      console.log('[SHARE ANDROID] Received hot start share:', shareData);
      setPendingShareData(shareData);
    } catch (error) {
      console.error('[SHARE ANDROID] Failed to parse hot start share:', error);
    }
  });

  console.log('[SHARE] Incoming share listener initialized');
}

/**
 * Check for pending iOS shares from Share Extension
 * Uses capacitor-share-extension plugin for iOS
 */
async function checkIOSPendingShare(): Promise<void> {
  if (!isIOS()) return;
  
  try {
    // Try capacitor-share-extension plugin first
    if (ShareExtension) {
      const result = await ShareExtension.checkSendIntentReceived();
      
      if (result && result.payload && result.payload.length > 0) {
        const items = result.payload;
        console.log('[SHARE iOS] Received share items:', items);
        
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
      }
    } else if ((window as any).Capacitor?.Plugins?.AppGroupPlugin) {
      // Fallback to AppGroupPlugin for older implementations
      const result = await (window as any).Capacitor.Plugins.AppGroupPlugin.getSharedData();
      
      if (result?.data) {
        setPendingShareData(result.data);
      }
    } else {
      console.log('[SHARE] No iOS share extension plugin available');
    }
  } catch (error) {
    console.error('[SHARE] Failed to check iOS pending share:', error);
  }
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
 * Set pending share data (called from native layer or intent handler)
 */
export function setPendingShareData(data: IncomingShareData): void {
  pendingShareData = data;
  console.log('[SHARE] Received incoming share:', data);
  
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
};
