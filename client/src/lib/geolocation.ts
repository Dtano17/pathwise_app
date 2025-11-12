/**
 * Geolocation Manager for Capacitor
 *
 * Provides GPS location services for location-based activities,
 * check-ins, and location tagging
 */

import { Geolocation, type Position, type PositionOptions } from '@capacitor/geolocation';
import { isNative } from './platform';

export interface LocationCoords {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number | null;
  altitudeAccuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
}

export interface LocationWithAddress extends LocationCoords {
  address?: string;
  city?: string;
  country?: string;
}

/**
 * Request location permissions
 */
export async function requestLocationPermission(): Promise<boolean> {
  if (!isNative()) {
    // Web uses browser permission on first getCurrentPosition call
    return true;
  }

  try {
    const permission = await Geolocation.requestPermissions();
    return permission.location === 'granted' || permission.coarseLocation === 'granted';
  } catch (error) {
    console.error('Failed to request location permission:', error);
    return false;
  }
}

/**
 * Check location permission status
 */
export async function checkLocationPermission(): Promise<boolean> {
  if (!isNative()) {
    // Check if geolocation API is available
    return 'geolocation' in navigator;
  }

  try {
    const permission = await Geolocation.checkPermissions();
    return permission.location === 'granted' || permission.coarseLocation === 'granted';
  } catch (error) {
    console.error('Failed to check location permission:', error);
    return false;
  }
}

/**
 * Get current location
 */
export async function getCurrentLocation(
  options: PositionOptions = {}
): Promise<LocationCoords | null> {
  try {
    // Check permission first
    const hasPermission = await checkLocationPermission();
    if (!hasPermission) {
      const granted = await requestLocationPermission();
      if (!granted) {
        console.warn('Location permission not granted');
        return null;
      }
    }

    const position: Position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: options.enableHighAccuracy !== false,
      timeout: options.timeout || 10000,
      maximumAge: options.maximumAge || 0,
    });

    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      altitude: position.coords.altitude,
      altitudeAccuracy: position.coords.altitudeAccuracy,
      heading: position.coords.heading,
      speed: position.coords.speed,
    };
  } catch (error) {
    console.error('Failed to get current location:', error);
    return null;
  }
}

/**
 * Watch location changes (for tracking)
 */
export async function watchLocation(
  callback: (location: LocationCoords) => void,
  options: PositionOptions = {}
): Promise<string | null> {
  try {
    const hasPermission = await checkLocationPermission();
    if (!hasPermission) {
      const granted = await requestLocationPermission();
      if (!granted) {
        return null;
      }
    }

    const watchId = await Geolocation.watchPosition(
      {
        enableHighAccuracy: options.enableHighAccuracy !== false,
        timeout: options.timeout || 10000,
        maximumAge: options.maximumAge || 1000,
      },
      (position: Position | null, err?: any) => {
        if (err) {
          console.error('Location watch error:', err);
          return;
        }

        if (position) {
          callback({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            altitudeAccuracy: position.coords.altitudeAccuracy,
            heading: position.coords.heading,
            speed: position.coords.speed,
          });
        }
      }
    );

    return watchId;
  } catch (error) {
    console.error('Failed to watch location:', error);
    return null;
  }
}

/**
 * Stop watching location
 */
export async function clearLocationWatch(watchId: string): Promise<void> {
  try {
    await Geolocation.clearWatch({ id: watchId });
  } catch (error) {
    console.error('Failed to clear location watch:', error);
  }
}

/**
 * Calculate distance between two coordinates (in meters)
 * Uses Haversine formula
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Format distance for display
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  } else {
    return `${(meters / 1000).toFixed(1)}km`;
  }
}

/**
 * Reverse geocode: Get address from coordinates
 * Uses OpenStreetMap Nominatim API (free, no API key needed)
 */
export async function getAddressFromCoordinates(
  latitude: number,
  longitude: number
): Promise<LocationWithAddress | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'JournalMate/1.0',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Geocoding failed');
    }

    const data = await response.json();

    return {
      latitude,
      longitude,
      address: data.display_name,
      city: data.address?.city || data.address?.town || data.address?.village,
      country: data.address?.country,
    };
  } catch (error) {
    console.error('Failed to reverse geocode:', error);
    return {
      latitude,
      longitude,
    };
  }
}

/**
 * Get current location with address
 */
export async function getCurrentLocationWithAddress(): Promise<LocationWithAddress | null> {
  const location = await getCurrentLocation();
  if (!location) {
    return null;
  }

  return await getAddressFromCoordinates(location.latitude, location.longitude);
}

/**
 * Check if user is near a location (within radius in meters)
 */
export async function isNearLocation(
  targetLat: number,
  targetLon: number,
  radiusMeters: number
): Promise<boolean> {
  const currentLocation = await getCurrentLocation();
  if (!currentLocation) {
    return false;
  }

  const distance = calculateDistance(
    currentLocation.latitude,
    currentLocation.longitude,
    targetLat,
    targetLon
  );

  return distance <= radiusMeters;
}

/**
 * Generate Google Maps link
 */
export function generateMapsLink(latitude: number, longitude: number, label?: string): string {
  const coords = `${latitude},${longitude}`;
  const query = label ? `${label}+${coords}` : coords;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/**
 * Open location in maps app
 */
export function openInMaps(latitude: number, longitude: number, label?: string): void {
  const url = generateMapsLink(latitude, longitude, label);
  window.open(url, '_blank');
}

export default {
  requestLocationPermission,
  checkLocationPermission,
  getCurrentLocation,
  watchLocation,
  clearLocationWatch,
  calculateDistance,
  formatDistance,
  getAddressFromCoordinates,
  getCurrentLocationWithAddress,
  isNearLocation,
  generateMapsLink,
  openInMaps,
};
