import { useState, useEffect } from 'react'
import { NativeBiometric, BiometryType } from '@capgo/capacitor-native-biometric'
import { Capacitor } from '@capacitor/core'
import { useToast } from '@/hooks/use-toast'

interface BiometricStatus {
  isAvailable: boolean
  biometryType: BiometryType | null
  hasCredentials: boolean
}

export function useBiometricAuth() {
  const [status, setStatus] = useState<BiometricStatus>({
    isAvailable: false,
    biometryType: null,
    hasCredentials: false
  })
  const [isProcessing, setIsProcessing] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    // Only check biometric availability on native platforms
    if (!Capacitor.isNativePlatform()) {
      return
    }

    const checkBiometricAvailability = async () => {
      try {
        // Check if biometric authentication is available
        const result = await NativeBiometric.isAvailable()

        // Check if credentials are stored
        const credentials = await NativeBiometric.getCredentials({
          server: 'journalmate.ai'
        }).catch(() => null)

        setStatus({
          isAvailable: result.isAvailable,
          biometryType: result.biometryType || null,
          hasCredentials: !!credentials
        })

        console.log('[Biometric] Availability check:', {
          isAvailable: result.isAvailable,
          biometryType: result.biometryType,
          hasCredentials: !!credentials
        })
      } catch (error) {
        console.error('[Biometric] Error checking availability:', error)
        setStatus({
          isAvailable: false,
          biometryType: null,
          hasCredentials: false
        })
      }
    }

    checkBiometricAvailability()
  }, [])

  /**
   * Save credentials for biometric authentication
   */
  const saveCredentials = async (username: string, password: string): Promise<boolean> => {
    if (!Capacitor.isNativePlatform() || !status.isAvailable) {
      console.warn('[Biometric] Not available, cannot save credentials')
      return false
    }

    try {
      setIsProcessing(true)

      await NativeBiometric.setCredentials({
        username,
        password,
        server: 'journalmate.ai'
      })

      setStatus(prev => ({ ...prev, hasCredentials: true }))

      console.log('[Biometric] Credentials saved successfully')
      return true
    } catch (error: any) {
      console.error('[Biometric] Error saving credentials:', error)
      toast({
        title: "Biometric Setup Failed",
        description: error.message || "Could not save credentials for biometric authentication",
        variant: "destructive"
      })
      return false
    } finally {
      setIsProcessing(false)
    }
  }

  /**
   * Authenticate using biometric and retrieve stored credentials
   */
  const authenticate = async (): Promise<{ username: string; password: string } | null> => {
    if (!Capacitor.isNativePlatform() || !status.isAvailable) {
      console.warn('[Biometric] Not available')
      return null
    }

    if (!status.hasCredentials) {
      toast({
        title: "No Saved Credentials",
        description: "Please sign in with email and password first",
        variant: "destructive"
      })
      return null
    }

    try {
      setIsProcessing(true)

      // First verify biometric
      const biometryTypeText =
        status.biometryType === BiometryType.FACE_ID ? 'Face ID' :
        status.biometryType === BiometryType.TOUCH_ID ? 'Touch ID' :
        status.biometryType === BiometryType.FINGERPRINT ? 'Fingerprint' :
        'Biometric'

      await NativeBiometric.verifyIdentity({
        reason: `Sign in to JournalMate using ${biometryTypeText}`,
        title: 'Biometric Authentication',
        subtitle: 'Verify your identity',
        description: `Use ${biometryTypeText} to sign in securely`
      })

      // If biometric verification succeeds, get stored credentials
      const credentials = await NativeBiometric.getCredentials({
        server: 'journalmate.ai'
      })

      console.log('[Biometric] Authentication successful')
      return {
        username: credentials.username,
        password: credentials.password
      }
    } catch (error: any) {
      console.error('[Biometric] Authentication error:', error)

      // User cancelled or authentication failed
      if (error.code === 10) {
        // User cancelled
        console.log('[Biometric] User cancelled authentication')
      } else {
        toast({
          title: "Biometric Authentication Failed",
          description: "Please try again or use email and password",
          variant: "destructive"
        })
      }
      return null
    } finally {
      setIsProcessing(false)
    }
  }

  /**
   * Delete stored credentials (used during sign out)
   */
  const deleteCredentials = async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) {
      return true
    }

    try {
      await NativeBiometric.deleteCredentials({
        server: 'journalmate.ai'
      })

      setStatus(prev => ({ ...prev, hasCredentials: false }))
      console.log('[Biometric] Credentials deleted')
      return true
    } catch (error) {
      console.error('[Biometric] Error deleting credentials:', error)
      return false
    }
  }

  /**
   * Get user-friendly biometry type name
   */
  const getBiometryTypeName = (): string => {
    switch (status.biometryType) {
      case BiometryType.FACE_ID:
        return 'Face ID'
      case BiometryType.TOUCH_ID:
        return 'Touch ID'
      case BiometryType.FINGERPRINT:
        return 'Fingerprint'
      case BiometryType.FACE_AUTHENTICATION:
        return 'Face Authentication'
      case BiometryType.IRIS_AUTHENTICATION:
        return 'Iris Authentication'
      default:
        return 'Biometric'
    }
  }

  return {
    isAvailable: status.isAvailable,
    biometryType: status.biometryType,
    biometryTypeName: getBiometryTypeName(),
    hasCredentials: status.hasCredentials,
    isProcessing,
    saveCredentials,
    authenticate,
    deleteCredentials
  }
}
