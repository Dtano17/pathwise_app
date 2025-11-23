/**
 * Voice-to-Text Input for Capacitor
 *
 * Enables speech recognition for journal entries and activity planning
 * Uses native speech recognition on iOS and Android
 */

import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { isNative } from './platform';

export interface VoiceInputOptions {
  language?: string; // 'en-US', 'es-ES', etc.
  maxResults?: number;
  prompt?: string;
  partialResults?: boolean;
  popup?: boolean; // Android only
}

export interface VoiceInputResult {
  success: boolean;
  text?: string;
  error?: string;
  matches?: string[];
}

/**
 * Check if speech recognition is available
 */
export async function isVoiceInputAvailable(): Promise<boolean> {
  if (!isNative()) {
    // Check Web Speech API
    return typeof window !== 'undefined' && 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  }
  
  try {
    const result = await SpeechRecognition.available();
    return result.available;
  } catch (error) {
    console.error('[VOICE] Failed to check availability:', error);
    return false;
  }
}

/**
 * Request speech recognition permissions
 */
export async function requestVoicePermission(): Promise<boolean> {
  if (!isNative()) {
    // Web Speech API doesn't need explicit permission request
    // Permission is requested on first use
    return true;
  }
  
  try {
    const result = await SpeechRecognition.requestPermissions();
    return result.speechRecognition === 'granted';
  } catch (error) {
    console.error('[VOICE] Failed to request permission:', error);
    return false;
  }
}

/**
 * Check speech recognition permissions
 */
export async function checkVoicePermission(): Promise<boolean> {
  if (!isNative()) {
    return true; // Web handles this internally
  }
  
  try {
    const result = await SpeechRecognition.checkPermissions();
    return result.speechRecognition === 'granted';
  } catch (error) {
    console.error('[VOICE] Failed to check permission:', error);
    return false;
  }
}

/**
 * Start listening for speech input
 */
export async function startVoiceInput(options: VoiceInputOptions = {}): Promise<VoiceInputResult> {
  if (!isNative()) {
    return startWebVoiceInput(options);
  }
  
  try {
    // Check permission
    let hasPermission = await checkVoicePermission();
    if (!hasPermission) {
      hasPermission = await requestVoicePermission();
      if (!hasPermission) {
        return { success: false, error: 'Permission denied' };
      }
    }

    // Start listening
    await SpeechRecognition.start({
      language: options.language || 'en-US',
      maxResults: options.maxResults || 5,
      prompt: options.prompt || 'Speak now...',
      partialResults: options.partialResults ?? false,
      popup: options.popup ?? true,
    });

    // Wait for results (this is handled via event listeners in production)
    // For now, return a placeholder
    console.log('[VOICE] Speech recognition started');
    return { success: true };
  } catch (error: any) {
    console.error('[VOICE] Failed to start voice input:', error);
    return { success: false, error: error.message || 'Failed to start voice input' };
  }
}

/**
 * Stop listening for speech input
 */
export async function stopVoiceInput(): Promise<void> {
  if (!isNative()) {
    stopWebVoiceInput();
    return;
  }
  
  try {
    await SpeechRecognition.stop();
    console.log('[VOICE] Speech recognition stopped');
  } catch (error) {
    console.error('[VOICE] Failed to stop voice input:', error);
  }
}

/**
 * Listen for speech input with callback
 */
export async function listenForVoiceInput(
  options: VoiceInputOptions,
  onResult: (text: string, isFinal: boolean) => void,
  onError?: (error: string) => void
): Promise<{ stop: () => void }> {
  if (!isNative()) {
    return listenWebVoiceInput(options, onResult, onError);
  }

  try {
    // Check permission
    let hasPermission = await checkVoicePermission();
    if (!hasPermission) {
      hasPermission = await requestVoicePermission();
      if (!hasPermission) {
        onError?.('Permission denied');
        return { stop: () => {} };
      }
    }

    // Add event listeners
    SpeechRecognition.addListener('partialResults', (data: any) => {
      if (data.matches && data.matches.length > 0) {
        onResult(data.matches[0], false);
      }
    });

    SpeechRecognition.addListener('finalResults', (data: any) => {
      if (data.matches && data.matches.length > 0) {
        onResult(data.matches[0], true);
      }
    });

    // Start recognition
    await SpeechRecognition.start({
      language: options.language || 'en-US',
      maxResults: options.maxResults || 5,
      prompt: options.prompt || 'Speak now...',
      partialResults: options.partialResults ?? true,
      popup: options.popup ?? true,
    });

    console.log('[VOICE] Started listening with callbacks');

    return {
      stop: async () => {
        await SpeechRecognition.stop();
        SpeechRecognition.removeAllListeners();
      },
    };
  } catch (error: any) {
    console.error('[VOICE] Failed to listen:', error);
    onError?.(error.message || 'Failed to start voice input');
    return { stop: () => {} };
  }
}

// Web Speech API fallback
let webRecognition: any = null;

function startWebVoiceInput(options: VoiceInputOptions): Promise<VoiceInputResult> {
  return new Promise((resolve) => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      resolve({ success: false, error: 'Speech recognition not supported in this browser' });
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    webRecognition = new SpeechRecognition();
    
    webRecognition.lang = options.language || 'en-US';
    webRecognition.interimResults = options.partialResults ?? false;
    webRecognition.maxAlternatives = options.maxResults || 1;

    webRecognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      const confidence = event.results[0][0].confidence;
      
      console.log('[VOICE WEB] Recognized:', transcript, 'confidence:', confidence);
      resolve({ success: true, text: transcript });
    };

    webRecognition.onerror = (event: any) => {
      console.error('[VOICE WEB] Error:', event.error);
      resolve({ success: false, error: event.error });
    };

    webRecognition.start();
  });
}

function stopWebVoiceInput(): void {
  if (webRecognition) {
    webRecognition.stop();
    webRecognition = null;
  }
}

function listenWebVoiceInput(
  options: VoiceInputOptions,
  onResult: (text: string, isFinal: boolean) => void,
  onError?: (error: string) => void
): { stop: () => void } {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    onError?.('Speech recognition not supported in this browser');
    return { stop: () => {} };
  }

  const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
  webRecognition = new SpeechRecognition();
  
  webRecognition.lang = options.language || 'en-US';
  webRecognition.interimResults = true;
  webRecognition.continuous = true;
  webRecognition.maxAlternatives = options.maxResults || 1;

  webRecognition.onresult = (event: any) => {
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      const isFinal = event.results[i].isFinal;
      onResult(transcript, isFinal);
    }
  };

  webRecognition.onerror = (event: any) => {
    console.error('[VOICE WEB] Error:', event.error);
    onError?.(event.error);
  };

  webRecognition.start();

  return {
    stop: () => stopWebVoiceInput(),
  };
}

/**
 * Get supported languages for speech recognition
 */
export async function getSupportedLanguages(): Promise<string[]> {
  // Common supported languages
  return [
    'en-US', 'en-GB', 'en-AU', 'en-CA', 'en-IN',
    'es-ES', 'es-MX', 'fr-FR', 'de-DE', 'it-IT',
    'pt-BR', 'pt-PT', 'ru-RU', 'ja-JP', 'ko-KR',
    'zh-CN', 'zh-TW', 'ar-SA', 'hi-IN'
  ];
}

export default {
  isVoiceInputAvailable,
  requestVoicePermission,
  checkVoicePermission,
  startVoiceInput,
  stopVoiceInput,
  listenForVoiceInput,
  getSupportedLanguages,
};
