/**
 * Add to Calendar Button Component
 *
 * Allows users to add activities to their device calendar
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, Loader2 } from 'lucide-react';
import { hapticsLight, hapticsSuccess, isNative } from '@/lib/mobile';
import { useToast } from '@/hooks/use-toast';

interface CalendarEvent {
  title: string;
  description?: string;
  location?: string;
  startDate: Date;
  endDate: Date;
  allDay?: boolean;
}

interface AddToCalendarButtonProps {
  event: CalendarEvent;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showLabel?: boolean;
}

export function AddToCalendarButton({
  event,
  variant = 'outline',
  size = 'default',
  showLabel = true,
}: AddToCalendarButtonProps) {
  const [isAdding, setIsAdding] = useState(false);
  const { toast } = useToast();

  const handleAddToCalendar = async () => {
    setIsAdding(true);
    hapticsLight();

    try {
      if (isNative()) {
        // Use Capacitor Calendar plugin
        const { CapacitorCalendar } = await import('@ebarooni/capacitor-calendar');

        // Request permission
        const permission = await CapacitorCalendar.requestAllPermissions();

        if (permission.every((p) => p.result === 'granted')) {
          // Create calendar event
          const result = await CapacitorCalendar.createEvent({
            title: event.title,
            notes: event.description,
            location: event.location,
            startDate: event.startDate.getTime(),
            endDate: event.endDate.getTime(),
            isAllDay: event.allDay,
          });

          if (result) {
            hapticsSuccess();
            toast({
              title: 'Added to calendar!',
              description: 'Event has been added to your calendar',
            });
          }
        } else {
          toast({
            title: 'Calendar permission required',
            description: 'Please grant calendar access to add events',
            variant: 'destructive',
          });
        }
      } else {
        // Web: Generate .ics file or Google Calendar link
        const googleCalendarUrl = createGoogleCalendarUrl(event);
        window.open(googleCalendarUrl, '_blank');

        toast({
          title: 'Opening calendar...',
          description: 'Event will be added to your calendar',
        });
      }
    } catch (error) {
      console.error('Failed to add to calendar:', error);
      toast({
        title: 'Failed to add event',
        description: 'Could not add event to calendar. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleAddToCalendar}
      disabled={isAdding}
    >
      {isAdding ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Calendar className="w-4 h-4" />
      )}
      {showLabel && size !== 'icon' && (
        <span className="ml-2">{isAdding ? 'Adding...' : 'Add to Calendar'}</span>
      )}
    </Button>
  );
}

/**
 * Create Google Calendar URL for web fallback
 */
function createGoogleCalendarUrl(event: CalendarEvent): string {
  const formatDate = (date: Date) => {
    return date.toISOString().replace(/-|:|\.\d\d\d/g, '');
  };

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatDate(event.startDate)}/${formatDate(event.endDate)}`,
  });

  if (event.description) {
    params.append('details', event.description);
  }

  if (event.location) {
    params.append('location', event.location);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
