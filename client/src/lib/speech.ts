/**
 * Speech Recognition Manager for Android
 *
 * Provides speech-to-text functionality using native Android SpeechRecognizer
 * Supports partial results for real-time transcription
 */

import { isNative, isAndroid } from './platform';

// Define interface for our custom NativeSpeech plugin
interface NativeSpeechPlugin {
  isAvailable(): Promise<{ available: boolean; reason?: string }>;
  checkPermission(): Promise<{ granted: boolean }>;
  requestPermission(): Promise<{ granted: boolean }>;
  startListening(options?: {
    language?: string;
    partialResults?: boolean;
    maxResults?: number;
  }): Promise<SpeechResult>;
  stopListening(): Promise<void>;
  cancel(): Promise<void>;
}

export interface SpeechResult {
  success: boolean;
  transcript?: string;
  partialTranscript?: string;
  confidence?: number;
  error?: string;
  errorCode?: number;
  cancelled?: boolean;
}

export interface SpeechCapabilities {
  isAvailable: boolean;
  hasPermission: boolean;
  reason?: string;
}

/**
 * Get the custom NativeSpeech plugin from the Capacitor bridge
 */
function getNativeSpeechPlugin(): NativeSpeechPlugin | null {
  try {
    const capacitor = (window as any).Capacitor;
    if (capacitor?.Plugins?.NativeSpeech) {
      return capacitor.Plugins.NativeSpeech as NativeSpeechPlugin;
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
async function getNativeSpeechPluginWithRetry(maxRetries: number = 5): Promise<NativeSpeechPlugin | null> {
  // Try immediately first
  let plugin = getNativeSpeechPlugin();
  if (plugin) {
    console.log('[SPEECH] Plugin found immediately');
    return plugin;
  }

  // Retry with delays
  for (let i = 0; i < maxRetries; i++) {
    await new Promise(resolve => setTimeout(resolve, 300));
    plugin = getNativeSpeechPlugin();
    if (plugin) {
      console.log(`[SPEECH] Plugin found after ${i + 1} retries`);
      return plugin;
    }
  }

  console.log('[SPEECH] Plugin not found after retries');
  return null;
}

/**
 * Check if speech recognition is available
 * Uses retry logic because Capacitor bridge may not be ready on component mount
 */
export async function checkSpeechAvailability(): Promise<SpeechCapabilities> {
  // Check web speech API first (works on all platforms)
  if (!isNative()) {
    const webSpeechAvailable = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    return {
      isAvailable: webSpeechAvailable,
      hasPermission: webSpeechAvailable, // Web handles permission on-demand
      reason: webSpeechAvailable ? undefined : 'Web Speech API not supported',
    };
  }

  // Check Android native plugin
  if (isAndroid()) {
    try {
      // Use retry version since this is often called on mount before bridge is ready
      const plugin = await getNativeSpeechPluginWithRetry();
      if (plugin) {
        const [availability, permission] = await Promise.all([
          plugin.isAvailable(),
          plugin.checkPermission(),
        ]);

        console.log('[SPEECH] Availability check result:', { availability, permission });
        return {
          isAvailable: availability.available,
          hasPermission: permission.granted,
          reason: availability.reason,
        };
      }
    } catch (error) {
      console.error('[SPEECH] Failed to check availability:', error);
    }
  }

  return {
    isAvailable: false,
    hasPermission: false,
    reason: 'Speech recognition not available on this platform',
  };
}

/**
 * Request microphone permission for speech recognition
 */
export async function requestSpeechPermission(): Promise<boolean> {
  if (!isNative()) {
    // Web handles permission when starting recognition
    return true;
  }

  if (isAndroid()) {
    try {
      const plugin = getNativeSpeechPlugin();
      if (plugin) {
        const result = await plugin.requestPermission();
        console.log('[SPEECH] Permission request result:', result);
        return result.granted;
      }
    } catch (error) {
      console.error('[SPEECH] Failed to request permission:', error);
    }
  }

  return false;
}

/**
 * Start speech recognition
 * Returns when recognition is complete or an error occurs
 */
export async function startSpeechRecognition(options: {
  language?: string;
  partialResults?: boolean;
  maxResults?: number;
  onPartialResult?: (text: string) => void;
} = {}): Promise<SpeechResult> {
  const { language = 'en-US', partialResults = true, maxResults = 5 } = options;

  // Try Android native plugin first
  if (isNative() && isAndroid()) {
    const plugin = getNativeSpeechPlugin();
    if (plugin) {
      try {
        console.log('[SPEECH] Starting Android native recognition');
        const result = await plugin.startListening({
          language,
          partialResults,
          maxResults,
        });

        return result;
      } catch (error: any) {
        console.error('[SPEECH] Android recognition error:', error);
        return {
          success: false,
          error: error.message || 'Speech recognition failed',
        };
      }
    }
  }

  // Fall back to Web Speech API
  return startWebSpeechRecognition(options);
}

/**
 * Stop speech recognition (if in progress)
 */
export async function stopSpeechRecognition(): Promise<void> {
  if (isNative() && isAndroid()) {
    const plugin = getNativeSpeechPlugin();
    if (plugin) {
      try {
        await plugin.stopListening();
        console.log('[SPEECH] Stopped Android recognition');
        return;
      } catch (error) {
        console.error('[SPEECH] Failed to stop:', error);
      }
    }
  }

  // Stop web recognition if running
  stopWebSpeechRecognition();
}

/**
 * Cancel speech recognition without getting results
 */
export async function cancelSpeechRecognition(): Promise<void> {
  if (isNative() && isAndroid()) {
    const plugin = getNativeSpeechPlugin();
    if (plugin) {
      try {
        await plugin.cancel();
        console.log('[SPEECH] Cancelled Android recognition');
        return;
      } catch (error) {
        console.error('[SPEECH] Failed to cancel:', error);
      }
    }
  }

  // Cancel web recognition if running
  cancelWebSpeechRecognition();
}

// ============================================
// Web Speech API fallback implementation
// ============================================

let webRecognition: any = null;

function startWebSpeechRecognition(options: {
  language?: string;
  partialResults?: boolean;
  onPartialResult?: (text: string) => void;
}): Promise<SpeechResult> {
  return new Promise((resolve) => {
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;

    if (!SpeechRecognition) {
      resolve({
        success: false,
        error: 'Web Speech API not supported',
      });
      return;
    }

    webRecognition = new SpeechRecognition();
    webRecognition.continuous = false;
    webRecognition.interimResults = options.partialResults !== false;
    webRecognition.lang = options.language || 'en-US';

    let finalTranscript = '';

    webRecognition.onresult = (event: any) => {
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
          if (options.onPartialResult) {
            options.onPartialResult(interimTranscript);
          }
        }
      }
    };

    webRecognition.onend = () => {
      console.log('[SPEECH] Web recognition ended');
      resolve({
        success: finalTranscript.length > 0,
        transcript: finalTranscript,
      });
      webRecognition = null;
    };

    webRecognition.onerror = (event: any) => {
      console.error('[SPEECH] Web recognition error:', event.error);

      if (event.error === 'aborted') {
        resolve({
          success: false,
          cancelled: true,
          error: 'Recognition cancelled',
        });
      } else if (event.error === 'no-speech') {
        resolve({
          success: false,
          error: 'No speech detected',
        });
      } else {
        resolve({
          success: false,
          error: `Recognition error: ${event.error}`,
        });
      }
      webRecognition = null;
    };

    try {
      webRecognition.start();
      console.log('[SPEECH] Web recognition started');
    } catch (error: any) {
      resolve({
        success: false,
        error: error.message || 'Failed to start recognition',
      });
      webRecognition = null;
    }
  });
}

function stopWebSpeechRecognition(): void {
  if (webRecognition) {
    try {
      webRecognition.stop();
    } catch (error) {
      console.error('[SPEECH] Failed to stop web recognition:', error);
    }
  }
}

function cancelWebSpeechRecognition(): void {
  if (webRecognition) {
    try {
      webRecognition.abort();
    } catch (error) {
      console.error('[SPEECH] Failed to cancel web recognition:', error);
    }
    webRecognition = null;
  }
}

export default {
  checkSpeechAvailability,
  requestSpeechPermission,
  startSpeechRecognition,
  stopSpeechRecognition,
  cancelSpeechRecognition,
};
