import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface LocationData {
  latitude: number;
  longitude: number;
  city?: string;
}

type LocationErrorType = 'denied' | 'unavailable' | 'timeout' | 'insecure' | 'unsupported' | 'unknown';

interface LocationState {
  status: 'idle' | 'requesting' | 'granted' | 'denied' | 'error';
  location: LocationData | null;
  error: string | null;
  errorType: LocationErrorType | null;
}

export function useDeviceLocation() {
  const { toast } = useToast();
  const [state, setState] = useState<LocationState>({
    status: 'idle',
    location: null,
    error: null,
    errorType: null,
  });

  const requestLocation = useCallback(async (): Promise<LocationData | null> => {
    // Reset error state before attempting - allows recovery from previous errors
    setState(prev => ({ ...prev, status: 'requesting', error: null, errorType: null }));

    try {
      // Check if we're on a mobile platform with Capacitor
      const isMobile = typeof window !== 'undefined' && 
        (window as any).Capacitor?.isNativePlatform?.();

      // For web browsers, check if we're in a secure context first
      if (!isMobile && typeof window !== 'undefined' && !window.isSecureContext) {
        // Some browsers still allow location on localhost even without HTTPS
        // We'll try anyway but warn the user if it fails
        console.log('[Location] Not in secure context, attempting anyway...');
      }

      if (isMobile) {
        // Use Capacitor Geolocation
        const { Geolocation } = await import('@capacitor/geolocation');
        
        // First check permissions
        const permStatus = await Geolocation.checkPermissions();
        
        // Handle various permission states (granted, denied, prompt, prompt-with-rationale, limited)
        if (permStatus.location !== 'granted') {
          // Request permission for any state that's not already granted
          const requestResult = await Geolocation.requestPermissions();
          
          // Handle permission results
          if (requestResult.location === 'denied') {
            setState({ status: 'denied', location: null, error: 'Location permission denied', errorType: 'denied' });
            toast({
              title: 'Location Access Denied',
              description: 'Please enable location access in your device settings to use this feature.',
              variant: 'destructive',
            });
            return null;
          }
          
          // For prompt/prompt-with-rationale, the user dismissed without choosing
          // We should still try to get the position - iOS may show the prompt again
          // or the user may have granted 'while using' which allows getCurrentPosition
          if (requestResult.location === 'prompt' || requestResult.location === 'prompt-with-rationale') {
            console.log('[Location] Permission in prompt state, attempting to get position anyway...');
            // Continue to getCurrentPosition - it may work or prompt again
          }
        }

        // Get current position
        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000,
        });

        const locationData: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        // Reverse geocode to get city name
        const city = await reverseGeocode(locationData.latitude, locationData.longitude);
        locationData.city = city;

        setState({ status: 'granted', location: locationData, error: null, errorType: null });
        return locationData;
      } else {
        // Use browser Geolocation API
        if (!navigator.geolocation) {
          setState({ status: 'error', location: null, error: 'Geolocation not supported', errorType: 'unsupported' });
          toast({
            title: 'Not Supported',
            description: 'Location services are not available in this browser.',
            variant: 'destructive',
          });
          return null;
        }

        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000,
          });
        });

        const locationData: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        // Reverse geocode to get city name
        const city = await reverseGeocode(locationData.latitude, locationData.longitude);
        locationData.city = city;

        setState({ status: 'granted', location: locationData, error: null, errorType: null });
        return locationData;
      }
    } catch (error: any) {
      console.error('Location error:', error);
      
      let errorMessage = 'Failed to get location';
      let status: LocationState['status'] = 'error';
      let errorType: LocationErrorType = 'unknown';
      
      // Handle SecurityError for insecure origins (non-HTTPS in browser)
      if (error.name === 'SecurityError' || 
          error.message?.includes('secure origin') || 
          error.message?.includes('insecure') ||
          error.message?.includes('Only secure origins')) {
        errorType = 'insecure';
        errorMessage = 'Secure connection required';
        toast({
          title: 'Secure Connection Required',
          description: 'Location access requires HTTPS. Please use the app or a secure connection.',
          variant: 'destructive',
        });
      } else if (error.code === 1 || error.message?.includes('denied')) {
        status = 'denied';
        errorType = 'denied';
        errorMessage = 'Location permission denied';
        toast({
          title: 'Location Access Denied',
          description: 'Please enable location access in your browser or device settings, then try again.',
          variant: 'destructive',
        });
      } else if (error.code === 2) {
        errorType = 'unavailable';
        errorMessage = 'Location unavailable';
        toast({
          title: 'Location Unavailable',
          description: 'Unable to determine your location. Please check your settings and try again.',
          variant: 'destructive',
        });
      } else if (error.code === 3) {
        errorType = 'timeout';
        errorMessage = 'Location request timed out';
        toast({
          title: 'Request Timed Out',
          description: 'Location request took too long. Please try again.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Location Error',
          description: 'An unexpected error occurred. Please try again.',
          variant: 'destructive',
        });
      }

      setState({ status, location: null, error: errorMessage, errorType });
      return null;
    }
  }, [toast]);

  const clearLocation = useCallback(() => {
    setState({ status: 'idle', location: null, error: null, errorType: null });
  }, []);

  // Reset error state (useful when conditions change like switching to HTTPS)
  const resetError = useCallback(() => {
    setState(prev => ({ ...prev, status: 'idle', error: null, errorType: null }));
  }, []);

  // Check if current context is secure (useful for conditional UI)
  const isSecureContext = typeof window !== 'undefined' && window.isSecureContext;

  return {
    ...state,
    requestLocation,
    clearLocation,
    resetError,
    isSecureContext,
    isRequesting: state.status === 'requesting',
    isGranted: state.status === 'granted',
    isDenied: state.status === 'denied',
    isInsecure: state.errorType === 'insecure',
  };
}

// Helper function to reverse geocode coordinates to city name
async function reverseGeocode(lat: number, lng: number): Promise<string | undefined> {
  try {
    // Use OpenStreetMap Nominatim for reverse geocoding (free, no API key required)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`,
      {
        headers: {
          'User-Agent': 'JournalMate/1.0',
        },
      }
    );

    if (!response.ok) {
      console.warn('Reverse geocoding failed:', response.status);
      return undefined;
    }

    const data = await response.json();
    
    // Extract city name from response
    const city = data.address?.city || 
                 data.address?.town || 
                 data.address?.village || 
                 data.address?.municipality ||
                 data.address?.county;
    
    const state = data.address?.state;
    const country = data.address?.country;

    if (city && state) {
      return `${city}, ${state}`;
    } else if (city && country) {
      return `${city}, ${country}`;
    } else if (city) {
      return city;
    }
    
    return undefined;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return undefined;
  }
}
