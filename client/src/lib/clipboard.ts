/**
 * Clipboard utilities that work on both web and native platforms
 * Uses Capacitor Clipboard plugin on native, browser API on web
 */

import { isNative } from './platform';

/**
 * Read text from clipboard
 * Works on both native (Capacitor) and web (browser API)
 */
export async function readClipboard(): Promise<string | null> {
  if (isNative()) {
    try {
      const { Clipboard } = await import('@capacitor/clipboard');
      const result = await Clipboard.read();
      console.log('[CLIPBOARD] Native read result:', result.type, result.value?.substring(0, 50));
      return result.value || null;
    } catch (error) {
      console.error('[CLIPBOARD] Native read failed:', error);
      // Fall back to browser API
      return readClipboardBrowser();
    }
  }
  return readClipboardBrowser();
}

/**
 * Read clipboard using browser API (fallback)
 */
async function readClipboardBrowser(): Promise<string | null> {
  if (!('clipboard' in navigator)) {
    console.warn('[CLIPBOARD] Browser clipboard API not available');
    return null;
  }

  try {
    const text = await navigator.clipboard.readText();
    console.log('[CLIPBOARD] Browser read result:', text?.substring(0, 50));
    return text || null;
  } catch (error) {
    console.error('[CLIPBOARD] Browser read failed:', error);
    return null;
  }
}

/**
 * Write text to clipboard
 * Works on both native (Capacitor) and web (browser API)
 */
export async function writeClipboard(text: string): Promise<boolean> {
  if (isNative()) {
    try {
      const { Clipboard } = await import('@capacitor/clipboard');
      await Clipboard.write({ string: text });
      console.log('[CLIPBOARD] Native write success');
      return true;
    } catch (error) {
      console.error('[CLIPBOARD] Native write failed:', error);
      // Fall back to browser API
      return writeClipboardBrowser(text);
    }
  }
  return writeClipboardBrowser(text);
}

/**
 * Write clipboard using browser API (fallback)
 */
async function writeClipboardBrowser(text: string): Promise<boolean> {
  if (!('clipboard' in navigator)) {
    console.warn('[CLIPBOARD] Browser clipboard API not available');
    return false;
  }

  try {
    await navigator.clipboard.writeText(text);
    console.log('[CLIPBOARD] Browser write success');
    return true;
  } catch (error) {
    console.error('[CLIPBOARD] Browser write failed:', error);
    return false;
  }
}

export default {
  read: readClipboard,
  write: writeClipboard,
};
