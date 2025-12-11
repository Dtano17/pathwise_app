import { useCallback } from 'react'
import { Toast } from '@capacitor/toast'
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'
import { Capacitor } from '@capacitor/core'
import { useToast } from '@/hooks/use-toast'

interface NotificationOptions {
  title?: string
  message: string
  type?: 'success' | 'error' | 'warning' | 'info'
  duration?: 'short' | 'long'
  haptic?: boolean
}

export function useNativeNotifications() {
  const { toast } = useToast()

  /**
   * Show a native toast notification with optional haptic feedback
   */
  const showNotification = useCallback(async (options: NotificationOptions) => {
    const {
      title,
      message,
      type = 'info',
      duration = 'short',
      haptic = true
    } = options

    // Show haptic feedback if requested and on native platform
    if (haptic && Capacitor.isNativePlatform()) {
      try {
        switch (type) {
          case 'success':
            await Haptics.notification({ type: NotificationType.Success })
            break
          case 'error':
            await Haptics.notification({ type: NotificationType.Error })
            break
          case 'warning':
            await Haptics.notification({ type: NotificationType.Warning })
            break
          default:
            await Haptics.impact({ style: ImpactStyle.Light })
        }
      } catch (error) {
        console.warn('[Haptics] Failed to provide haptic feedback:', error)
      }
    }

    // Show native toast on native platforms, otherwise use shadcn toast
    if (Capacitor.isNativePlatform()) {
      try {
        await Toast.show({
          text: title ? `${title}: ${message}` : message,
          duration: duration === 'long' ? 'long' : 'short',
          position: 'bottom'
        })
      } catch (error) {
        console.error('[Toast] Failed to show native toast:', error)
        // Fallback to web toast
        showWebToast(title, message, type)
      }
    } else {
      showWebToast(title, message, type)
    }
  }, [toast])

  /**
   * Show web-based toast (shadcn ui)
   */
  const showWebToast = (title: string | undefined, message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    toast({
      title: title || (type === 'success' ? 'Success' : type === 'error' ? 'Error' : type === 'warning' ? 'Warning' : 'Info'),
      description: message,
      variant: type === 'error' ? 'destructive' : 'default'
    })
  }

  /**
   * Show success notification
   */
  const showSuccess = useCallback((message: string, title?: string) => {
    return showNotification({ title, message, type: 'success' })
  }, [showNotification])

  /**
   * Show error notification
   */
  const showError = useCallback((message: string, title?: string) => {
    return showNotification({ title, message, type: 'error', duration: 'long' })
  }, [showNotification])

  /**
   * Show warning notification
   */
  const showWarning = useCallback((message: string, title?: string) => {
    return showNotification({ title, message, type: 'warning' })
  }, [showNotification])

  /**
   * Show info notification
   */
  const showInfo = useCallback((message: string, title?: string) => {
    return showNotification({ title, message, type: 'info' })
  }, [showNotification])

  /**
   * Trigger haptic feedback without notification
   */
  const triggerHaptic = useCallback(async (style: 'light' | 'medium' | 'heavy' = 'medium') => {
    if (!Capacitor.isNativePlatform()) {
      return
    }

    try {
      const impactStyle =
        style === 'light' ? ImpactStyle.Light :
        style === 'heavy' ? ImpactStyle.Heavy :
        ImpactStyle.Medium

      await Haptics.impact({ style: impactStyle })
    } catch (error) {
      console.warn('[Haptics] Failed to trigger haptic feedback:', error)
    }
  }, [])

  /**
   * Trigger selection changed haptic (for UI interactions like buttons, toggles)
   */
  const triggerSelectionHaptic = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) {
      return
    }

    try {
      await Haptics.selectionChanged()
    } catch (error) {
      console.warn('[Haptics] Failed to trigger selection haptic:', error)
    }
  }, [])

  return {
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    triggerHaptic,
    triggerSelectionHaptic
  }
}
