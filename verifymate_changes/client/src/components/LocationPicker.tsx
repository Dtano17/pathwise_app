/**
 * Location Picker Component
 *
 * Allows users to tag activities with their current location
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MapPin, Loader2, ExternalLink, X } from 'lucide-react';
import {
  getCurrentLocationWithAddress,
  openInMaps,
  hapticsLight,
  hapticsSuccess,
} from '@/lib/mobile';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  country?: string;
}

interface LocationPickerProps {
  onLocationSelected: (location: LocationData) => void;
  onLocationRemoved?: () => void;
  currentLocation?: LocationData;
  variant?: 'button' | 'compact';
}

export function LocationPicker({
  onLocationSelected,
  onLocationRemoved,
  currentLocation,
  variant = 'button',
}: LocationPickerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handlePickLocation = async () => {
    setIsLoading(true);
    hapticsLight();

    try {
      const location = await getCurrentLocationWithAddress();

      if (location) {
        onLocationSelected(location);
        hapticsSuccess();
        toast({
          title: 'Location added!',
          description: location.address || 'Location tagged successfully',
        });
      } else {
        toast({
          title: 'Location unavailable',
          description: 'Could not get your current location. Please check permissions.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to get location:', error);
      toast({
        title: 'Location error',
        description: 'Failed to get location. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveLocation = () => {
    hapticsLight();
    onLocationRemoved?.();
  };

  const handleOpenInMaps = () => {
    if (currentLocation) {
      hapticsLight();
      openInMaps(
        currentLocation.latitude,
        currentLocation.longitude,
        currentLocation.address
      );
    }
  };

  if (currentLocation && variant === 'compact') {
    return (
      <Card className="p-3 bg-muted/50">
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {currentLocation.city || 'Location tagged'}
            </p>
            {currentLocation.address && (
              <p className="text-xs text-muted-foreground truncate">
                {currentLocation.address}
              </p>
            )}
          </div>
          <div className="flex gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={handleOpenInMaps}
            >
              <ExternalLink className="w-3 h-3" />
            </Button>
            {onLocationRemoved && (
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={handleRemoveLocation}
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
      </Card>
    );
  }

  if (currentLocation) {
    return (
      <Card className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <MapPin className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium">
                {currentLocation.city || 'Location'}
              </p>
              {currentLocation.address && (
                <p className="text-sm text-muted-foreground mt-1">
                  {currentLocation.address}
                </p>
              )}
              <Button
                variant="link"
                size="sm"
                className="px-0 mt-2"
                onClick={handleOpenInMaps}
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                Open in Maps
              </Button>
            </div>
          </div>
          {onLocationRemoved && (
            <Button
              size="icon"
              variant="ghost"
              onClick={handleRemoveLocation}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Button
      variant="outline"
      className="w-full"
      onClick={handlePickLocation}
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Getting location...
        </>
      ) : (
        <>
          <MapPin className="w-4 h-4 mr-2" />
          Tag Location
        </>
      )}
    </Button>
  );
}
