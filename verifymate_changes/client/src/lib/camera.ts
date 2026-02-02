/**
 * Native Camera Integration for Capacitor
 *
 * Provides camera and photo gallery access for journal entries,
 * profile pictures, and activity photos
 */

import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { isNative } from './platform';
import { getCurrentLocationWithAddress, type LocationWithAddress } from './geolocation';
import { hapticsLight, hapticsSuccess } from './haptics';

export interface CameraOptions {
  quality?: number; // 0-100
  allowEditing?: boolean;
  source?: 'camera' | 'gallery' | 'prompt'; // prompt = ask user
  width?: number;
  height?: number;
  saveToGallery?: boolean;
}

export interface CapturedPhoto {
  dataUrl: string;
  format: string;
  webPath?: string;
  exif?: any;
}

export interface GeotaggedPhoto extends CapturedPhoto {
  location?: LocationWithAddress;
  capturedAt: string; // ISO timestamp
}

/**
 * Take a photo or select from gallery
 */
export async function capturePhoto(options: CameraOptions = {}): Promise<CapturedPhoto | null> {
  if (!isNative()) {
    // Fall back to web file input for non-native platforms
    return await capturePhotoWeb(options);
  }

  try {
    // Request camera permissions
    const permissions = await Camera.requestPermissions();
    if (permissions.camera !== 'granted' && permissions.photos !== 'granted') {
      console.warn('Camera permissions not granted');
      return null;
    }

    // Determine source
    let source: CameraSource;
    if (options.source === 'camera') {
      source = CameraSource.Camera;
    } else if (options.source === 'gallery') {
      source = CameraSource.Photos;
    } else {
      source = CameraSource.Prompt; // Ask user to choose
    }

    const photo: Photo = await Camera.getPhoto({
      quality: options.quality || 90,
      allowEditing: options.allowEditing !== false,
      resultType: CameraResultType.DataUrl,
      source: source,
      width: options.width,
      height: options.height,
      saveToGallery: options.saveToGallery || false,
      correctOrientation: true, // Fix rotation issues
    });

    return {
      dataUrl: photo.dataUrl!,
      format: photo.format,
      webPath: photo.webPath,
      exif: photo.exif,
    };
  } catch (error: any) {
    if (error.message !== 'User cancelled photos app') {
      console.error('Failed to capture photo:', error);
    }
    return null;
  }
}

/**
 * Take a photo specifically (force camera)
 */
export async function takePhoto(options: Omit<CameraOptions, 'source'> = {}): Promise<CapturedPhoto | null> {
  return capturePhoto({ ...options, source: 'camera' });
}

/**
 * Select photo from gallery
 */
export async function selectFromGallery(options: Omit<CameraOptions, 'source'> = {}): Promise<CapturedPhoto | null> {
  return capturePhoto({ ...options, source: 'gallery' });
}

/**
 * Select multiple photos from gallery
 */
export async function selectMultiplePhotos(options: CameraOptions = {}): Promise<CapturedPhoto[]> {
  if (!isNative()) {
    return await selectMultiplePhotosWeb(options);
  }

  try {
    // Note: Capacitor Camera plugin doesn't support multiple selection natively
    // For now, return single photo in array. For true multi-select, consider:
    // - @capacitor-community/media plugin
    // - Custom native implementation
    const photo = await selectFromGallery(options);
    return photo ? [photo] : [];
  } catch (error) {
    console.error('Failed to select photos:', error);
    return [];
  }
}

/**
 * Web fallback: Use file input for photo capture
 */
async function capturePhotoWeb(options: CameraOptions): Promise<CapturedPhoto | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    if (options.source === 'camera') {
      input.capture = 'environment'; // Use rear camera
    }

    input.onchange = async (e: any) => {
      const file = e.target?.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }

      try {
        const dataUrl = await fileToDataUrl(file);
        resolve({
          dataUrl,
          format: file.type.split('/')[1] || 'jpeg',
        });
      } catch (error) {
        console.error('Failed to read file:', error);
        resolve(null);
      }
    };

    input.oncancel = () => resolve(null);
    input.click();
  });
}

/**
 * Web fallback: Select multiple photos
 */
async function selectMultiplePhotosWeb(options: CameraOptions): Promise<CapturedPhoto[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;

    input.onchange = async (e: any) => {
      const files = Array.from(e.target?.files || []) as File[];
      if (files.length === 0) {
        resolve([]);
        return;
      }

      try {
        const photos = await Promise.all(
          files.map(async (file) => {
            const dataUrl = await fileToDataUrl(file);
            return {
              dataUrl,
              format: file.type.split('/')[1] || 'jpeg',
            };
          })
        );
        resolve(photos);
      } catch (error) {
        console.error('Failed to read files:', error);
        resolve([]);
      }
    };

    input.oncancel = () => resolve([]);
    input.click();
  });
}

/**
 * Convert File to data URL
 */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Compress photo for upload (reduce file size)
 */
export async function compressPhoto(
  dataUrl: string,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
  } = {}
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;

      // Calculate new dimensions
      const maxWidth = options.maxWidth || 1920;
      const maxHeight = options.maxHeight || 1080;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Convert to JPEG with quality setting
      const quality = options.quality || 0.8;
      resolve(canvas.toDataURL('image/jpeg', quality));
    };

    img.onerror = reject;
    img.src = dataUrl;
  });
}

/**
 * Check if camera is available on device
 */
export async function isCameraAvailable(): Promise<boolean> {
  if (!isNative()) {
    // Check if mediaDevices API is available
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  try {
    const permissions = await Camera.checkPermissions();
    return permissions.camera === 'granted' || permissions.camera === 'prompt';
  } catch {
    return false;
  }
}

/**
 * Request camera permissions explicitly
 */
export async function requestCameraPermissions(): Promise<boolean> {
  if (!isNative()) {
    // For web, permissions are requested on first use
    return true;
  }

  try {
    const result = await Camera.requestPermissions();
    return result.camera === 'granted' || result.photos === 'granted';
  } catch (error) {
    console.error('Failed to request camera permissions:', error);
    return false;
  }
}

/**
 * Capture photo with automatic geotagging
 * Takes a photo and captures current GPS location simultaneously
 */
export async function capturePhotoWithLocation(
  options: CameraOptions = {}
): Promise<GeotaggedPhoto | null> {
  try {
    // Haptic feedback when starting
    if (isNative()) {
      await hapticsLight();
    }

    // Capture photo and location in parallel for speed
    const [photo, location] = await Promise.all([
      capturePhoto(options),
      getCurrentLocationWithAddress().catch((err) => {
        console.warn('[CAMERA] Failed to get location:', err);
        return null;
      }),
    ]);

    if (!photo) {
      return null;
    }

    // Success haptic
    if (isNative()) {
      await hapticsSuccess();
    }

    return {
      ...photo,
      location: location || undefined,
      capturedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[CAMERA] Failed to capture geotagged photo:', error);
    return null;
  }
}

/**
 * Take photo with camera and geotag it
 */
export async function takePhotoWithLocation(
  options: Omit<CameraOptions, 'source'> = {}
): Promise<GeotaggedPhoto | null> {
  return capturePhotoWithLocation({ ...options, source: 'camera' });
}

/**
 * Select from gallery with current location tag
 * Note: Location will be current position, not where photo was originally taken
 */
export async function selectFromGalleryWithLocation(
  options: Omit<CameraOptions, 'source'> = {}
): Promise<GeotaggedPhoto | null> {
  return capturePhotoWithLocation({ ...options, source: 'gallery' });
}

/**
 * Capture multiple photos with location
 * All photos get the same location (captured once at start)
 */
export async function captureMultiplePhotosWithLocation(
  options: CameraOptions = {}
): Promise<GeotaggedPhoto[]> {
  try {
    // Get location first
    const location = await getCurrentLocationWithAddress().catch((err) => {
      console.warn('[CAMERA] Failed to get location for batch:', err);
      return null;
    });

    const photos = await selectMultiplePhotos(options);
    const capturedAt = new Date().toISOString();

    return photos.map((photo) => ({
      ...photo,
      location: location || undefined,
      capturedAt,
    }));
  } catch (error) {
    console.error('[CAMERA] Failed to capture geotagged photos:', error);
    return [];
  }
}

export default {
  capturePhoto,
  takePhoto,
  selectFromGallery,
  selectMultiplePhotos,
  compressPhoto,
  isCameraAvailable,
  requestCameraPermissions,
  // Geotagged versions
  capturePhotoWithLocation,
  takePhotoWithLocation,
  selectFromGalleryWithLocation,
  captureMultiplePhotosWithLocation,
};
