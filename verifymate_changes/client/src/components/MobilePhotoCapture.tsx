/**
 * Mobile Photo Capture Component
 *
 * Handles photo capture with native camera or gallery selection
 * Falls back to file input on web browsers
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Image as ImageIcon, X } from 'lucide-react';
import { isNative, takePhoto, selectFromGallery, compressPhoto, hapticsLight } from '@/lib/mobile';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface MobilePhotoCaptureProps {
  onPhotoCapture: (dataUrl: string) => void;
  onPhotoRemove?: () => void;
  currentPhoto?: string;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

export function MobilePhotoCapture({
  onPhotoCapture,
  onPhotoRemove,
  currentPhoto,
  maxWidth = 1920,
  maxHeight = 1080,
  quality = 0.8,
}: MobilePhotoCaptureProps) {
  const [isCapturing, setIsCapturing] = useState(false);

  const handleTakePhoto = async () => {
    setIsCapturing(true);
    hapticsLight();

    try {
      const photo = await takePhoto({
        quality: 90,
        allowEditing: true,
      });

      if (photo) {
        // Compress photo for optimal upload size
        const compressed = await compressPhoto(photo.dataUrl, {
          maxWidth,
          maxHeight,
          quality,
        });

        onPhotoCapture(compressed);
      }
    } catch (error) {
      console.error('Failed to capture photo:', error);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleSelectFromGallery = async () => {
    setIsCapturing(true);
    hapticsLight();

    try {
      const photo = await selectFromGallery({
        quality: 90,
        allowEditing: true,
      });

      if (photo) {
        const compressed = await compressPhoto(photo.dataUrl, {
          maxWidth,
          maxHeight,
          quality,
        });

        onPhotoCapture(compressed);
      }
    } catch (error) {
      console.error('Failed to select photo:', error);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleWebFileInput = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = async (e: any) => {
      const file = e.target?.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        if (event.target?.result) {
          const dataUrl = event.target.result as string;

          // Compress even on web
          const compressed = await compressPhoto(dataUrl, {
            maxWidth,
            maxHeight,
            quality,
          });

          onPhotoCapture(compressed);
        }
      };
      reader.readAsDataURL(file);
    };

    input.click();
  };

  const handleRemovePhoto = () => {
    hapticsLight();
    onPhotoRemove?.();
  };

  if (currentPhoto) {
    return (
      <div className="relative rounded-lg overflow-hidden border border-border">
        <img
          src={currentPhoto}
          alt="Journal entry"
          className="w-full h-auto object-cover max-h-96"
        />
        {onPhotoRemove && (
          <Button
            size="icon"
            variant="destructive"
            className="absolute top-2 right-2"
            onClick={handleRemovePhoto}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
    );
  }

  if (isNative()) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="w-full"
            disabled={isCapturing}
          >
            <Camera className="w-4 h-4 mr-2" />
            {isCapturing ? 'Capturing...' : 'Add Photo'}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="w-56">
          <DropdownMenuItem onClick={handleTakePhoto}>
            <Camera className="w-4 h-4 mr-2" />
            Take Photo
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleSelectFromGallery}>
            <ImageIcon className="w-4 h-4 mr-2" />
            Choose from Gallery
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Web fallback
  return (
    <Button
      variant="outline"
      className="w-full"
      onClick={handleWebFileInput}
      disabled={isCapturing}
    >
      <ImageIcon className="w-4 h-4 mr-2" />
      {isCapturing ? 'Loading...' : 'Add Photo'}
    </Button>
  );
}
