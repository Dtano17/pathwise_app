/**
 * App Shortcuts Manager for Android
 *
 * Provides dynamic app shortcuts (long-press quick actions) for quick access to features
 * Only works on Android 7.1+ (API level 25+)
 */

import { isNative, isAndroid } from './platform';

// Define interface for our custom NativeAppShortcuts plugin
interface NativeAppShortcutsPlugin {
  isSupported(): Promise<{ supported: boolean }>;
  setShortcuts(options: { shortcuts: ShortcutConfig[] }): Promise<{ success: boolean; count: number }>;
  addShortcut(options: ShortcutConfig): Promise<{ success: boolean }>;
  removeShortcut(options: { id: string }): Promise<{ success: boolean }>;
  getShortcuts(): Promise<{ shortcuts: ShortcutInfo[] }>;
  setupDefaultShortcuts(): Promise<{ success: boolean; count: number; reason?: string }>;
}

export interface ShortcutConfig {
  id: string;
  shortLabel: string;
  longLabel?: string;
  action: string;
  icon?: string;
}

export interface ShortcutInfo {
  id: string;
  shortLabel: string;
  longLabel?: string;
}

/**
 * Get the custom NativeAppShortcuts plugin from the Capacitor bridge
 */
function getNativeShortcutsPlugin(): NativeAppShortcutsPlugin | null {
  try {
    const capacitor = (window as any).Capacitor;
    if (capacitor?.Plugins?.NativeAppShortcuts) {
      return capacitor.Plugins.NativeAppShortcuts as NativeAppShortcutsPlugin;
    }
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Get plugin with retry logic for when Capacitor bridge hasn't fully initialized
 * This is needed when loading from remote URLs where bridge initialization is async
 */
async function getNativeShortcutsPluginWithRetry(maxRetries: number = 5): Promise<NativeAppShortcutsPlugin | null> {
  // Try immediately first
  let plugin = getNativeShortcutsPlugin();
  if (plugin) {
    console.log('[SHORTCUTS] Plugin found immediately');
    return plugin;
  }

  // Retry with delays
  for (let i = 0; i < maxRetries; i++) {
    await new Promise(resolve => setTimeout(resolve, 300));
    plugin = getNativeShortcutsPlugin();
    if (plugin) {
      console.log(`[SHORTCUTS] Plugin found after ${i + 1} retries`);
      return plugin;
    }
  }

  console.log('[SHORTCUTS] Plugin not found after retries');
  return null;
}

/**
 * Check if app shortcuts are supported on this device
 * Uses retry logic because Capacitor bridge may not be ready on component mount
 */
export async function isShortcutsSupported(): Promise<boolean> {
  if (!isNative() || !isAndroid()) {
    return false;
  }

  try {
    // Use retry version since this is often called on mount before bridge is ready
    const plugin = await getNativeShortcutsPluginWithRetry();
    if (plugin) {
      const result = await plugin.isSupported();
      console.log('[SHORTCUTS] isSupported result:', result);
      return result.supported;
    }
    return false;
  } catch (error) {
    console.error('[SHORTCUTS] Failed to check support:', error);
    return false;
  }
}

/**
 * Setup default JournalMate shortcuts
 * Creates: Quick Journal, Add Task, View Today, View Activities
 */
export async function setupDefaultShortcuts(): Promise<boolean> {
  if (!isNative() || !isAndroid()) {
    console.log('[SHORTCUTS] Not available on this platform');
    return false;
  }

  try {
    const plugin = getNativeShortcutsPlugin();
    if (plugin) {
      const result = await plugin.setupDefaultShortcuts();
      console.log('[SHORTCUTS] Default shortcuts setup:', result);
      return result.success;
    }
    return false;
  } catch (error) {
    console.error('[SHORTCUTS] Failed to setup default shortcuts:', error);
    return false;
  }
}

/**
 * Set custom shortcuts (replaces existing dynamic shortcuts)
 */
export async function setShortcuts(shortcuts: ShortcutConfig[]): Promise<boolean> {
  if (!isNative() || !isAndroid()) {
    return false;
  }

  try {
    const plugin = getNativeShortcutsPlugin();
    if (plugin) {
      const result = await plugin.setShortcuts({ shortcuts });
      console.log('[SHORTCUTS] Set shortcuts:', result);
      return result.success;
    }
    return false;
  } catch (error) {
    console.error('[SHORTCUTS] Failed to set shortcuts:', error);
    return false;
  }
}

/**
 * Add a single shortcut (or update if exists)
 */
export async function addShortcut(shortcut: ShortcutConfig): Promise<boolean> {
  if (!isNative() || !isAndroid()) {
    return false;
  }

  try {
    const plugin = getNativeShortcutsPlugin();
    if (plugin) {
      const result = await plugin.addShortcut(shortcut);
      console.log('[SHORTCUTS] Added shortcut:', shortcut.id);
      return result.success;
    }
    return false;
  } catch (error) {
    console.error('[SHORTCUTS] Failed to add shortcut:', error);
    return false;
  }
}

/**
 * Remove a shortcut by ID
 */
export async function removeShortcut(id: string): Promise<boolean> {
  if (!isNative() || !isAndroid()) {
    return false;
  }

  try {
    const plugin = getNativeShortcutsPlugin();
    if (plugin) {
      const result = await plugin.removeShortcut({ id });
      console.log('[SHORTCUTS] Removed shortcut:', id);
      return result.success;
    }
    return false;
  } catch (error) {
    console.error('[SHORTCUTS] Failed to remove shortcut:', error);
    return false;
  }
}

/**
 * Get all current dynamic shortcuts
 */
export async function getShortcuts(): Promise<ShortcutInfo[]> {
  if (!isNative() || !isAndroid()) {
    return [];
  }

  try {
    const plugin = getNativeShortcutsPlugin();
    if (plugin) {
      const result = await plugin.getShortcuts();
      return result.shortcuts || [];
    }
    return [];
  } catch (error) {
    console.error('[SHORTCUTS] Failed to get shortcuts:', error);
    return [];
  }
}

/**
 * Predefined shortcut actions (must match MainActivity.java handling)
 */
export const ShortcutActions = {
  QUICK_JOURNAL: 'QUICK_JOURNAL',
  ADD_TASK: 'ADD_TASK',
  VIEW_TODAY: 'VIEW_TODAY',
  VIEW_ACTIVITIES: 'VIEW_ACTIVITIES',
} as const;

export default {
  isShortcutsSupported,
  setupDefaultShortcuts,
  setShortcuts,
  addShortcut,
  removeShortcut,
  getShortcuts,
  ShortcutActions,
};
