/**
 * Biometric Authentication Manager for Capacitor
 *
 * Provides Face ID/Touch ID/Fingerprint authentication for secure app access
 * Works on both iOS (Face ID/Touch ID) and Android (Fingerprint/Face Unlock)
 */

import { NativeBiometric, BiometryType, BiometricOptions } from '@capgo/capacitor-native-biometric';
import { isNative } from './platform';

export interface BiometricCapabilities {
  isAvailable: boolean;
  biometryType?: 'FACE_ID' | 'TOUCH_ID' | 'FINGERPRINT' | 'FACE_AUTHENTICATION' | 'IRIS_AUTHENTICATION' | 'MULTIPLE';
  strongBiometryIsAvailable: boolean;
}

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
}

/**
 * Check if biometric authentication is available on this device
 */
export async function checkBiometricAvailability(): Promise<BiometricCapabilities> {
  if (!isNative()) {
    return {
      isAvailable: false,
      strongBiometryIsAvailable: false,
    };
  }

  try {
    const result = await NativeBiometric.isAvailable();
    
    return {
      isAvailable: result.isAvailable,
      biometryType: result.biometryType as any,
      strongBiometryIsAvailable: result.isAvailable,
    };
  } catch (error) {
    console.error('Failed to check biometric availability:', error);
    return {
      isAvailable: false,
      strongBiometryIsAvailable: false,
    };
  }
}

/**
 * Authenticate user with biometrics (Face ID/Touch ID/Fingerprint)
 */
export async function authenticateWithBiometric(options: {
  reason?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  negativeButtonText?: string;
  maxAttempts?: number;
  useFallback?: boolean;
  fallbackTitle?: string;
} = {}): Promise<BiometricAuthResult> {
  if (!isNative()) {
    console.warn('Biometric authentication only available on native platforms');
    return { success: false, error: 'Not available on web' };
  }

  try {
    const capabilities = await checkBiometricAvailability();
    
    if (!capabilities.isAvailable) {
      return { 
        success: false, 
        error: 'Biometric authentication not available on this device' 
      };
    }

    const authOptions: BiometricOptions = {
      reason: options.reason || 'Authenticate to access JournalMate',
      title: options.title || 'Biometric Authentication',
      subtitle: options.subtitle,
      description: options.description,
      negativeButtonText: options.negativeButtonText || 'Cancel',
      maxAttempts: options.maxAttempts,
      useFallback: options.useFallback ?? false,
      fallbackTitle: options.fallbackTitle || 'Use Passcode',
    };

    await NativeBiometric.verifyIdentity(authOptions);
    
    console.log('[BIOMETRIC] Authentication successful');
    return { success: true };
  } catch (error: any) {
    console.error('[BIOMETRIC] Authentication failed:', error);
    
    // Handle specific error codes
    if (error.code === 'USER_CANCEL' || error.message?.includes('cancel')) {
      return { success: false, error: 'Authentication cancelled by user' };
    } else if (error.code === 'AUTHENTICATION_FAILED' || error.message?.includes('failed')) {
      return { success: false, error: 'Authentication failed' };
    } else if (error.code === 'BIOMETRIC_LOCKED_OUT') {
      return { success: false, error: 'Too many failed attempts. Please try again later.' };
    }
    
    return { success: false, error: error.message || 'Authentication failed' };
  }
}

/**
 * Set credentials to secure storage (encrypted with biometric protection)
 * Useful for storing sensitive data that requires biometric auth to access
 */
export async function setSecureCredentials(username: string, password: string): Promise<boolean> {
  if (!isNative()) {
    console.warn('Secure storage only available on native platforms');
    return false;
  }

  try {
    await NativeBiometric.setCredentials({
      username,
      password,
      server: 'journalmate.ai',
    });
    console.log('[BIOMETRIC] Credentials securely stored');
    return true;
  } catch (error) {
    console.error('[BIOMETRIC] Failed to store credentials:', error);
    return false;
  }
}

/**
 * Get credentials from secure storage (requires biometric auth)
 */
export async function getSecureCredentials(): Promise<{ username: string; password: string } | null> {
  if (!isNative()) {
    console.warn('Secure storage only available on native platforms');
    return null;
  }

  try {
    const credentials = await NativeBiometric.getCredentials({
      server: 'journalmate.ai',
    });
    
    if (credentials.username && credentials.password) {
      return {
        username: credentials.username,
        password: credentials.password,
      };
    }
    
    return null;
  } catch (error) {
    console.error('[BIOMETRIC] Failed to retrieve credentials:', error);
    return null;
  }
}

/**
 * Delete stored credentials from secure storage
 */
export async function deleteSecureCredentials(): Promise<boolean> {
  if (!isNative()) {
    return false;
  }

  try {
    await NativeBiometric.deleteCredentials({
      server: 'journalmate.ai',
    });
    console.log('[BIOMETRIC] Credentials deleted from secure storage');
    return true;
  } catch (error) {
    console.error('[BIOMETRIC] Failed to delete credentials:', error);
    return false;
  }
}

/**
 * Get human-readable biometry type name
 */
export function getBiometryTypeName(type?: string): string {
  switch (type) {
    case 'FACE_ID':
      return 'Face ID';
    case 'TOUCH_ID':
      return 'Touch ID';
    case 'FINGERPRINT':
      return 'Fingerprint';
    case 'FACE_AUTHENTICATION':
      return 'Face Unlock';
    case 'IRIS_AUTHENTICATION':
      return 'Iris Scanner';
    case 'MULTIPLE':
      return 'Biometric Authentication';
    default:
      return 'Biometric Authentication';
  }
}

/**
 * Quick helper to enable biometric login
 * Combines authentication check + credential storage
 */
export async function enableBiometricLogin(username: string, password: string): Promise<BiometricAuthResult> {
  // First verify user can authenticate
  const authResult = await authenticateWithBiometric({
    reason: 'Verify your identity to enable biometric login',
    title: 'Enable Biometric Login',
  });
  
  if (!authResult.success) {
    return authResult;
  }
  
  // Store credentials securely
  const stored = await setSecureCredentials(username, password);
  
  if (!stored) {
    return { success: false, error: 'Failed to store credentials securely' };
  }
  
  return { success: true };
}

/**
 * Quick helper to login with biometrics
 * Retrieves stored credentials after successful authentication
 */
export async function loginWithBiometric(): Promise<
  { success: true; username: string; password: string } | 
  { success: false; error: string }
> {
  // Authenticate first
  const authResult = await authenticateWithBiometric({
    reason: 'Authenticate to sign in to JournalMate',
    title: 'Sign In',
  });
  
  if (!authResult.success) {
    return { success: false, error: authResult.error || 'Authentication failed' };
  }
  
  // Retrieve stored credentials
  const credentials = await getSecureCredentials();
  
  if (!credentials) {
    return { success: false, error: 'No stored credentials found' };
  }
  
  return {
    success: true,
    username: credentials.username,
    password: credentials.password,
  };
}

export default {
  checkBiometricAvailability,
  authenticateWithBiometric,
  setSecureCredentials,
  getSecureCredentials,
  deleteSecureCredentials,
  getBiometryTypeName,
  enableBiometricLogin,
  loginWithBiometric,
};
