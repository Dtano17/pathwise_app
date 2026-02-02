/**
 * Clipboard utilities that work on both web and native platforms
 * Uses browser Clipboard API which works in WebView environments
 */

/**
 * Read text from clipboard
 */
export async function readClipboard(): Promise<string | null> {
  if (!('clipboard' in navigator)) {
    console.warn('[CLIPBOARD] Browser clipboard API not available');
    return null;
  }

  try {
    const text = await navigator.clipboard.readText();
    console.log('[CLIPBOARD] Read result:', text?.substring(0, 50));
    return text || null;
  } catch (error) {
    console.error('[CLIPBOARD] Read failed:', error);
    return null;
  }
}

/**
 * Write text to clipboard
 */
export async function writeClipboard(text: string): Promise<boolean> {
  if (!('clipboard' in navigator)) {
    console.warn('[CLIPBOARD] Browser clipboard API not available');
    return false;
  }

  try {
    await navigator.clipboard.writeText(text);
    console.log('[CLIPBOARD] Write success');
    return true;
  } catch (error) {
    console.error('[CLIPBOARD] Write failed:', error);
    return false;
  }
}

export default {
  read: readClipboard,
  write: writeClipboard,
};
