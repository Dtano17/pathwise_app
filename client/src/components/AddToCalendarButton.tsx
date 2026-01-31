/**
 * Add to Calendar Button Component
 *
 * Allows users to add activities to their device calendar
 * Shows a calendar picker dialog, then an edit dialog before saving
 * Uses Google Calendar API first, then falls back to native
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar, Loader2, Edit3, MapPin, Link2, CalendarPlus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { hapticsLight, hapticsSuccess, isNative } from '@/lib/mobile';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { getCalendars, requestCalendarPermission } from '@/lib/calendar';

interface CalendarEvent {
  title: string;
  description?: string;
  location?: string;
  startDate: Date;
  endDate: Date;
  allDay?: boolean;
  category?: string;
  priority?: string;
}

interface DeviceCalendar {
  id: string;
  title: string;
  color?: string;
  isPrimary?: boolean;
  isReadOnly?: boolean;
  source?: 'google' | 'native';
}

interface CalendarEventEdit {
  title: string;
  description: string;
  location: string;
  startDate: Date;
  endDate: Date;
}

interface AddToCalendarButtonProps {
  event: CalendarEvent;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showLabel?: boolean;
  onEventCreated?: (eventId: string) => void;
}

export function AddToCalendarButton({
  event,
  variant = 'outline',
  size = 'default',
  showLabel = true,
  onEventCreated,
}: AddToCalendarButtonProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [showCalendarPicker, setShowCalendarPicker] = useState(false);
  const [showEventEditor, setShowEventEditor] = useState(false);
  const [availableCalendars, setAvailableCalendars] = useState<DeviceCalendar[]>([]);
  const [pendingCalendarId, setPendingCalendarId] = useState<string | null>(null);
  const [eventEdit, setEventEdit] = useState<CalendarEventEdit>({
    title: '',
    description: '',
    location: '',
    startDate: new Date(),
    endDate: new Date(),
  });
  const { toast } = useToast();

  // Helper to extract URLs from text
  const extractUrls = (text: string): string[] => {
    const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/gi;
    return text.match(urlRegex) || [];
  };

  // Helper to extract location from description
  const extractLocation = (text: string): string | undefined => {
    const locationMatch = text.match(/(?:location|address|at|venue):\s*([^\n]+)/i);
    if (locationMatch) return locationMatch[1].trim();
    return undefined;
  };

  // Format date for datetime-local input
  const formatDateTimeLocal = (date: Date): string => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  // Build rich description for calendar event
  const buildCalendarDescription = (desc: string): string => {
    const parts: string[] = [];

    if (desc) {
      parts.push(desc);
    }

    const metadata: string[] = [];
    if (event.category) metadata.push(`Category: ${event.category}`);
    if (event.priority) metadata.push(`Priority: ${event.priority}`);

    if (metadata.length > 0) {
      parts.push(`\n---`);
      parts.push(metadata.join(' | '));
    }

    const urls = extractUrls(desc || '');
    if (urls.length > 0) {
      parts.push(`\n📎 Links:`);
      urls.forEach(url => parts.push(`• ${url}`));
    }

    parts.push(`\n---\nAdded from JournalMate`);

    return parts.join('\n');
  };

  const handleAddToCalendar = async () => {
    if (isAdding) return;
    setIsAdding(true);
    hapticsLight();

    try {
      // Try Google Calendar API first
      try {
        console.log('[ADD_CALENDAR] Checking Google Calendar access...');
        const statusResponse = await apiRequest('GET', '/api/calendar/status');
        const statusData = await statusResponse.json();
        console.log('[ADD_CALENDAR] Google Calendar status:', statusData);

        if (statusData.hasAccess) {
          const listResponse = await apiRequest('GET', '/api/calendar/list');
          const listData = await listResponse.json();

          if (listData.calendars && listData.calendars.length > 0) {
            const googleCalendars: DeviceCalendar[] = listData.calendars.map((cal: any) => ({
              id: cal.id,
              title: cal.name || cal.id,
              color: cal.backgroundColor || '#4285F4',
              isPrimary: cal.isPrimary || false,
              isReadOnly: false,
              source: 'google' as const,
            }));

            setAvailableCalendars(googleCalendars);
            setShowCalendarPicker(true);
            setIsAdding(false);
            return;
          }
        }
      } catch (apiError: any) {
        console.log('[ADD_CALENDAR] Google Calendar API not available:', apiError.message);
      }

      // Fall back to native Capacitor calendar if on mobile
      if (isNative()) {
        console.log('[ADD_CALENDAR] Trying native calendar...');
        try {
          const hasPermission = await requestCalendarPermission();
          if (hasPermission) {
            const nativeCalendars = await getCalendars();
            if (nativeCalendars && nativeCalendars.length > 0) {
              const formattedCalendars: DeviceCalendar[] = nativeCalendars.map((cal: any) => ({
                id: cal.id,
                title: cal.title || cal.name || 'Calendar',
                color: cal.color || '#34A853',
                isPrimary: cal.isPrimary || false,
                isReadOnly: cal.isReadOnly || false,
                source: 'native' as const,
              }));

              setAvailableCalendars(formattedCalendars);
              setShowCalendarPicker(true);
              setIsAdding(false);
              return;
            }
          }
        } catch (nativeError: any) {
          console.log('[ADD_CALENDAR] Native calendar error:', nativeError.message);
        }
      }

      // No calendars available - show web fallback or error
      if (!isNative()) {
        console.log('[ADD_CALENDAR] Opening Google Calendar URL...');
        const googleCalendarUrl = createGoogleCalendarUrl(event);
        window.open(googleCalendarUrl, '_blank');
        toast({
          title: 'Opening calendar...',
          description: 'Event will be added to your calendar',
        });
      } else {
        toast({
          title: 'Calendar Access Required',
          description: 'Please sign in with Google in Settings to access calendar features',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('[ADD_CALENDAR] Error:', error);
      toast({
        title: 'Calendar Error',
        description: 'Could not access calendar. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleCalendarSelect = async (calendarId: string) => {
    setShowCalendarPicker(false);
    hapticsLight();

    // Prepare event edit state with current event data
    setEventEdit({
      title: event.title,
      description: event.description || '',
      location: event.location || extractLocation(event.description || '') || '',
      startDate: event.startDate,
      endDate: event.endDate,
    });

    // Store selected calendar for later
    setPendingCalendarId(calendarId);

    // Show edit dialog
    setShowEventEditor(true);
  };

  const handleSaveToCalendar = async () => {
    if (!pendingCalendarId) return;

    setShowEventEditor(false);
    setIsAdding(true);
    hapticsLight();

    try {
      const selectedCalendar = availableCalendars.find(c => c.id === pendingCalendarId);
      const richDescription = buildCalendarDescription(eventEdit.description);

      if (selectedCalendar?.source === 'google') {
        const response = await apiRequest('POST', '/api/calendar/event', {
          calendarId: pendingCalendarId,
          summary: eventEdit.title,
          description: richDescription,
          location: eventEdit.location || undefined,
          start: {
            dateTime: eventEdit.startDate.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
          end: {
            dateTime: eventEdit.endDate.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'popup', minutes: 30 },
              { method: 'popup', minutes: 1440 },
            ],
          },
        });

        const data = await response.json();
        console.log('[ADD_CALENDAR] Google Calendar response:', data);

        if (!data.error && (data.success || data.eventId)) {
          hapticsSuccess();
          toast({
            title: 'Added to Calendar',
            description: `Event added to "${selectedCalendar.title}"`,
          });

          if (onEventCreated && data.eventId) {
            onEventCreated(data.eventId);
          }
        } else {
          toast({
            title: 'Calendar Error',
            description: data.error || 'Could not add event',
            variant: 'destructive',
          });
        }
      } else {
        // Use native Capacitor calendar
        try {
          const { CapacitorCalendar } = await import('@ebarooni/capacitor-calendar');

          const result = await CapacitorCalendar.createEvent({
            calendarId: pendingCalendarId,
            title: eventEdit.title,
            notes: richDescription,
            location: eventEdit.location || undefined,
            startDate: eventEdit.startDate.getTime(),
            endDate: eventEdit.endDate.getTime(),
            isAllDay: event.allDay,
          });

          console.log('[ADD_CALENDAR] Native event result:', result);

          if (result) {
            hapticsSuccess();
            toast({
              title: 'Added to Calendar',
              description: `Event added to "${selectedCalendar?.title || 'Calendar'}"`,
            });

            if (onEventCreated && typeof result === 'object' && 'id' in result) {
              onEventCreated(String(result.id));
            }
          }
        } catch (nativeError: any) {
          console.error('[ADD_CALENDAR] Native error:', nativeError);
          toast({
            title: 'Calendar Error',
            description: nativeError.message || 'Could not add event',
            variant: 'destructive',
          });
        }
      }
    } catch (error: any) {
      console.error('[ADD_CALENDAR] Error adding event:', error);
      toast({
        title: 'Calendar Error',
        description: error.message || 'Could not add event. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsAdding(false);
      setPendingCalendarId(null);
    }
  };

  return (
    <>
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

      {/* Calendar Picker Dialog */}
      <Dialog open={showCalendarPicker} onOpenChange={setShowCalendarPicker}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Select Calendar
            </DialogTitle>
            <DialogDescription>
              Choose a calendar to add "{event.title}"
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {availableCalendars.map((cal) => (
              <button
                key={cal.id}
                onClick={() => handleCalendarSelect(cal.id)}
                disabled={cal.isReadOnly}
                className={`w-full p-3 rounded-lg border text-left flex items-center gap-3 transition-colors
                  ${cal.isReadOnly
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-accent hover:border-primary cursor-pointer'
                  }`}
              >
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: cal.color || '#4285F4' }}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{cal.title}</div>
                  {cal.source && (
                    <div className="text-xs text-muted-foreground">
                      {cal.source === 'google' ? 'Google Calendar' : 'Device Calendar'}
                    </div>
                  )}
                </div>
                {cal.isPrimary && (
                  <Badge variant="secondary" className="flex-shrink-0">Primary</Badge>
                )}
                {cal.isReadOnly && (
                  <Badge variant="outline" className="flex-shrink-0">Read-only</Badge>
                )}
              </button>
            ))}
          </div>

          {availableCalendars.length === 0 && (
            <div className="text-center py-4 text-muted-foreground">
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No calendars available</p>
              <p className="text-sm">Please sign in with Google in Settings</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Event Editor Dialog - edit before saving to calendar */}
      <Dialog open={showEventEditor} onOpenChange={setShowEventEditor}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="w-5 h-5" />
              Edit Event Details
            </DialogTitle>
            <DialogDescription>
              Review and edit before adding to calendar
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="event-title">Title</Label>
              <Input
                id="event-title"
                value={eventEdit.title}
                onChange={(e) => setEventEdit({ ...eventEdit, title: e.target.value })}
                placeholder="Event title"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="event-description">Description</Label>
              <Textarea
                id="event-description"
                value={eventEdit.description}
                onChange={(e) => setEventEdit({ ...eventEdit, description: e.target.value })}
                placeholder="Event description, notes, links..."
                rows={3}
              />
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="event-location" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Location
              </Label>
              <Input
                id="event-location"
                value={eventEdit.location}
                onChange={(e) => setEventEdit({ ...eventEdit, location: e.target.value })}
                placeholder="Address or location name"
              />
            </div>

            {/* Date/Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="event-start">Start</Label>
                <Input
                  id="event-start"
                  type="datetime-local"
                  value={formatDateTimeLocal(eventEdit.startDate)}
                  onChange={(e) => {
                    const newStart = new Date(e.target.value);
                    let newEnd = eventEdit.endDate;
                    if (newEnd <= newStart) {
                      newEnd = new Date(newStart.getTime() + 30 * 60 * 1000);
                    }
                    setEventEdit({ ...eventEdit, startDate: newStart, endDate: newEnd });
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-end">End</Label>
                <Input
                  id="event-end"
                  type="datetime-local"
                  value={formatDateTimeLocal(eventEdit.endDate)}
                  onChange={(e) => setEventEdit({ ...eventEdit, endDate: new Date(e.target.value) })}
                />
              </div>
            </div>

            {/* URLs extracted from description */}
            {extractUrls(eventEdit.description).length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-muted-foreground">
                  <Link2 className="w-4 h-4" />
                  Links found in description
                </Label>
                <div className="text-sm text-muted-foreground bg-muted/50 rounded-md p-2 space-y-1">
                  {extractUrls(eventEdit.description).map((url, i) => (
                    <div key={i} className="truncate">• {url}</div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowEventEditor(false);
                setPendingCalendarId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveToCalendar}
              disabled={!eventEdit.title.trim() || isAdding}
            >
              {isAdding ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CalendarPlus className="w-4 h-4 mr-2" />
                  Add to Calendar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
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
