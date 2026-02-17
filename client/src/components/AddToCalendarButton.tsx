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
import { Calendar, Loader2, Edit3, MapPin, Link2, CalendarPlus, Smartphone, Download } from 'lucide-react';
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
import { downloadOrShareICS, type ICSEvent } from '@/lib/icsGenerator';

// Calendar method types
type CalendarMethod = 'google' | 'device' | 'ics';

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
  taskId?: string;
  activityId?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showLabel?: boolean;
  onEventCreated?: (eventId: string) => void;
}

// Helper to get emoji for task/activity category
const getCategoryEmoji = (category?: string): string => {
  if (!category) return '📅';
  const emojiMap: Record<string, string> = {
    fitness: '💪',
    health: '🏥',
    wellness: '🧘',
    work: '💼',
    business: '💼',
    social: '👥',
    friends: '👥',
    study: '📚',
    education: '📚',
    learning: '📚',
    travel: '✈️',
    vacation: '🏖️',
    food: '🍽️',
    dining: '🍽️',
    restaurant: '🍽️',
    entertainment: '🎬',
    movie: '🎬',
    music: '🎵',
    shopping: '🛍️',
    personal: '📝',
    finance: '💰',
    home: '🏠',
    family: '👨‍👩‍👧‍👦',
    sports: '⚽',
    outdoor: '🌲',
    creative: '🎨',
    art: '🎨',
    tech: '💻',
    coding: '💻',
    meeting: '📊',
    appointment: '📆',
    medical: '🏥',
    beauty: '💅',
    relaxation: '😌',
    rest: '😴',
  };
  return emojiMap[category.toLowerCase()] || '📅';
};

export function AddToCalendarButton({
  event,
  taskId,
  activityId,
  variant = 'outline',
  size = 'default',
  showLabel = true,
  onEventCreated,
}: AddToCalendarButtonProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [showMethodPicker, setShowMethodPicker] = useState(false);
  const [showCalendarPicker, setShowCalendarPicker] = useState(false);
  const [showEventEditor, setShowEventEditor] = useState(false);
  const [availableCalendars, setAvailableCalendars] = useState<DeviceCalendar[]>([]);
  const [pendingCalendarId, setPendingCalendarId] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<CalendarMethod | null>(null);
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

  // Build rich description for calendar event with deep link
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

    // Add JournalMate deep link
    if (taskId) {
      const taskUrl = `https://journalmate.ai/app?task=${taskId}`;
      parts.push(`\n📱 Open in JournalMate: ${taskUrl}`);
    } else if (activityId) {
      const activityUrl = `https://journalmate.ai/app?activity=${activityId}`;
      parts.push(`\n📱 Open in JournalMate: ${activityUrl}`);
    }

    parts.push(`\n---\nAdded from JournalMate`);

    return parts.join('\n');
  };

  // Show method picker dialog
  const handleAddToCalendar = async () => {
    if (isAdding) return;
    hapticsLight();
    setShowMethodPicker(true);
  };

  // Handle method selection
  const handleMethodSelect = async (method: CalendarMethod) => {
    setShowMethodPicker(false);
    setSelectedMethod(method);
    setIsAdding(true);
    hapticsLight();

    try {
      if (method === 'ics') {
        // ICS Download/Share - universal fallback
        await handleICSExport();
        return;
      }

      if (method === 'google') {
        // Google Calendar API
        await handleGoogleCalendarMethod();
        return;
      }

      if (method === 'device') {
        // Native device calendar
        await handleDeviceCalendarMethod();
        return;
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

  // Handle Google Calendar API method
  const handleGoogleCalendarMethod = async () => {
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

      // Google not available - show web fallback
      if (!isNative()) {
        console.log('[ADD_CALENDAR] Opening Google Calendar URL...');
        const googleCalendarUrl = createGoogleCalendarUrl(event);
        window.open(googleCalendarUrl, '_blank');
        toast({
          title: 'Opening Google Calendar...',
          description: 'Event will be added to your calendar',
        });
      } else {
        toast({
          title: 'Google Calendar Not Connected',
          description: 'Please sign in with Google in Settings, or try Device Calendar option',
          variant: 'destructive',
        });
      }
    } catch (apiError: any) {
      console.log('[ADD_CALENDAR] Google Calendar API not available:', apiError.message);
      toast({
        title: 'Google Calendar Not Connected',
        description: 'Please sign in with Google in Settings, or try Device Calendar option',
        variant: 'destructive',
      });
    }
  };

  // Handle native device calendar method
  const handleDeviceCalendarMethod = async () => {
    if (!isNative()) {
      toast({
        title: 'Device Calendar Not Available',
        description: 'This feature is only available on mobile devices. Try Download option instead.',
        variant: 'destructive',
      });
      return;
    }

    try {
      console.log('[ADD_CALENDAR] Trying native calendar...');
      const permResult = await requestCalendarPermission();
      console.log('[ADD_CALENDAR] Permission result:', JSON.stringify(permResult));

      if (!permResult.granted && !permResult.readOnly) {
        // Permission not granted
        if (permResult.denied) {
          toast({
            title: 'Calendar Permission Denied',
            description: 'Please enable calendar access in Settings > Apps > JournalMate > Permissions',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Calendar Permission Required',
            description: 'Please allow calendar access when prompted, or enable it in device settings',
            variant: 'destructive',
          });
        }
        return;
      }

      // Permission granted — get calendars
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

      // Permission granted but no calendars found
      toast({
        title: 'No Calendars Found',
        description: 'Please add a calendar account (e.g. Google) in your device settings',
        variant: 'destructive',
      });
    } catch (nativeError: any) {
      console.log('[ADD_CALENDAR] Native calendar error:', nativeError.message);
      toast({
        title: 'Device Calendar Error',
        description: 'Could not access device calendar. Try Download option instead.',
        variant: 'destructive',
      });
    }
  };

  // Handle ICS file download/share
  const handleICSExport = async () => {
    try {
      const emoji = getCategoryEmoji(event.category);
      const titleWithEmoji = event.title.startsWith(emoji) ? event.title : `${emoji} ${event.title}`;

      // Build description with deep link
      const descParts: string[] = [];
      if (event.description) descParts.push(event.description);
      if (event.category) descParts.push(`Category: ${event.category}`);
      if (event.priority) descParts.push(`Priority: ${event.priority}`);

      // Add JournalMate deep link
      if (taskId) {
        descParts.push(`Open in JournalMate: https://journalmate.ai/app?task=${taskId}`);
      } else if (activityId) {
        descParts.push(`Open in JournalMate: https://journalmate.ai/app?activity=${activityId}`);
      }

      const icsEvent: ICSEvent = {
        id: taskId || activityId || `event-${Date.now()}`,
        title: titleWithEmoji,
        description: descParts.join('\n'),
        startDate: event.startDate,
        endDate: event.endDate,
        location: event.location,
        category: event.category,
      };

      const filename = `journalmate-${event.title.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '_')}`;
      const success = await downloadOrShareICS([icsEvent], filename);

      if (success) {
        hapticsSuccess();
        toast({
          title: isNative() ? 'Calendar File Ready' : 'Downloaded Calendar File',
          description: isNative()
            ? 'Select your calendar app to import the event'
            : 'Open the .ics file to add to your calendar',
        });
      } else {
        toast({
          title: 'Export Failed',
          description: 'Could not create calendar file. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('[ADD_CALENDAR] ICS export error:', error);
      toast({
        title: 'Export Error',
        description: 'Could not export calendar file',
        variant: 'destructive',
      });
    }
  };

  const handleCalendarSelect = async (calendarId: string) => {
    setShowCalendarPicker(false);
    hapticsLight();

    // Prepare event edit state with current event data
    // Add category emoji to title for better visual identification in calendar
    const emoji = getCategoryEmoji(event.category);
    const titleWithEmoji = event.title.startsWith(emoji) ? event.title : `${emoji} ${event.title}`;

    setEventEdit({
      title: titleWithEmoji,
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
          <span className="ml-2">{isAdding ? 'Adding...' : 'Calendar'}</span>
        )}
      </Button>

      {/* Method Picker Dialog - Choose Google, Device, or ICS */}
      <Dialog open={showMethodPicker} onOpenChange={setShowMethodPicker}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Add to Calendar
            </DialogTitle>
            <DialogDescription>
              Choose how to add this event
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <button
              onClick={() => handleMethodSelect('google')}
              className="w-full p-3 rounded-lg border text-left flex items-center gap-3 hover:bg-accent hover:border-primary transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <div className="font-medium">Google Calendar</div>
                <div className="text-xs text-muted-foreground">Sync directly with your Google account</div>
              </div>
            </button>

            <button
              onClick={() => handleMethodSelect('device')}
              className="w-full p-3 rounded-lg border text-left flex items-center gap-3 hover:bg-accent hover:border-primary transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <Smartphone className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <div className="font-medium">Device Calendar</div>
                <div className="text-xs text-muted-foreground">Samsung Calendar, iOS Calendar, etc.</div>
              </div>
            </button>

            <button
              onClick={() => handleMethodSelect('ics')}
              className="w-full p-3 rounded-lg border text-left flex items-center gap-3 hover:bg-accent hover:border-primary transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                <Download className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1">
                <div className="font-medium">Download Calendar File</div>
                <div className="text-xs text-muted-foreground">Universal .ics format - works with any app</div>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Calendar Picker Dialog - for selecting specific calendar */}
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

/**
 * Interface for activity calendar sync
 */
interface ActivityTask {
  id: string;
  title: string;
  description?: string;
  category?: string;
  priority?: string;
  dueDate: Date;
  timeEstimate?: string;
}

interface AddActivityToCalendarButtonProps {
  activity: {
    id: string;
    title: string;
    description?: string;
    category?: string;
  };
  tasks?: ActivityTask[];  // Made optional - will fetch on-demand if not provided
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showLabel?: boolean;
  className?: string;
  onEventsCreated?: (eventIds: string[]) => void;
}

/**
 * Helper to calculate end date from start date and time estimate
 */
function calculateEndDate(startDate: Date, timeEstimate?: string): Date {
  const endDate = new Date(startDate);

  if (!timeEstimate) {
    // Default to 1 hour
    endDate.setHours(endDate.getHours() + 1);
    return endDate;
  }

  // Parse time estimate like "30 min", "1 hour", "2 hours", "1.5 hours"
  const hourMatch = timeEstimate.match(/(\d+(?:\.\d+)?)\s*h/i);
  const minMatch = timeEstimate.match(/(\d+)\s*m/i);

  if (hourMatch) {
    const hours = parseFloat(hourMatch[1]);
    endDate.setMinutes(endDate.getMinutes() + Math.round(hours * 60));
  } else if (minMatch) {
    const minutes = parseInt(minMatch[1], 10);
    endDate.setMinutes(endDate.getMinutes() + minutes);
  } else {
    // Default to 1 hour
    endDate.setHours(endDate.getHours() + 1);
  }

  return endDate;
}

/**
 * Add Activity to Calendar Button Component
 *
 * Creates separate calendar events for each task in an activity
 * Supports Google Calendar, Device Calendar, and ICS download
 */
export function AddActivityToCalendarButton({
  activity,
  tasks: propTasks,
  variant = 'outline',
  size = 'default',
  showLabel = true,
  className,
  onEventsCreated,
}: AddActivityToCalendarButtonProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [showMethodPicker, setShowMethodPicker] = useState(false);
  const [showCalendarPicker, setShowCalendarPicker] = useState(false);
  const [availableCalendars, setAvailableCalendars] = useState<DeviceCalendar[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [internalTasks, setInternalTasks] = useState<ActivityTask[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<CalendarMethod | null>(null);
  const { toast } = useToast();

  // Use provided tasks or internally fetched tasks
  const effectiveTasks = propTasks || internalTasks;
  const tasksWithDates = effectiveTasks.filter(t => t.dueDate);

  // Fetch tasks on-demand if not provided
  const fetchTasksIfNeeded = async (): Promise<ActivityTask[]> => {
    if (propTasks && propTasks.length > 0) {
      return propTasks;
    }

    setIsLoadingTasks(true);
    try {
      const response = await fetch(`/api/activities/${activity.id}/tasks`);
      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }
      const data = await response.json();
      // Convert dates from strings to Date objects
      const tasksWithDates = (data || []).map((task: any) => ({
        ...task,
        dueDate: task.dueDate ? new Date(task.dueDate) : null,
      }));
      setInternalTasks(tasksWithDates);
      return tasksWithDates;
    } catch (error) {
      console.error('[ACTIVITY_CALENDAR] Error fetching tasks:', error);
      toast({
        title: 'Error Loading Tasks',
        description: 'Could not load activity tasks. Please try again.',
        variant: 'destructive',
      });
      return [];
    } finally {
      setIsLoadingTasks(false);
    }
  };

  // Show method picker dialog
  const handleAddToCalendar = async () => {
    if (isAdding || isLoadingTasks) return;
    hapticsLight();
    setShowMethodPicker(true);
  };

  // Handle method selection
  const handleMethodSelect = async (method: CalendarMethod) => {
    setShowMethodPicker(false);
    setSelectedMethod(method);
    setIsAdding(true);
    hapticsLight();

    try {
      // Fetch tasks if needed
      const tasks = await fetchTasksIfNeeded();
      const validTasks = tasks.filter(t => t.dueDate);

      if (validTasks.length === 0) {
        toast({
          title: 'No Tasks to Add',
          description: 'This activity has no tasks with dates to add to calendar.',
          variant: 'destructive',
        });
        setIsAdding(false);
        return;
      }

      if (method === 'ics') {
        await handleICSExport(validTasks);
        return;
      }

      if (method === 'google') {
        await handleGoogleCalendarMethod(validTasks);
        return;
      }

      if (method === 'device') {
        await handleDeviceCalendarMethod(validTasks);
        return;
      }
    } catch (error) {
      console.error('[ACTIVITY_CALENDAR] Error:', error);
      toast({
        title: 'Calendar Error',
        description: 'Could not access calendar. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsAdding(false);
    }
  };

  // Handle Google Calendar API method
  const handleGoogleCalendarMethod = async (tasks: ActivityTask[]) => {
    try {
      const statusResponse = await apiRequest('GET', '/api/calendar/status');
      const statusData = await statusResponse.json();

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

      toast({
        title: 'Google Calendar Not Connected',
        description: 'Please sign in with Google in Settings, or try Device Calendar option',
        variant: 'destructive',
      });
    } catch (error) {
      toast({
        title: 'Google Calendar Not Available',
        description: 'Try Device Calendar or Download option instead',
        variant: 'destructive',
      });
    }
  };

  // Handle native device calendar method
  const handleDeviceCalendarMethod = async (tasks: ActivityTask[]) => {
    if (!isNative()) {
      toast({
        title: 'Device Calendar Not Available',
        description: 'This feature is only available on mobile devices. Try Download option instead.',
        variant: 'destructive',
      });
      return;
    }

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

      toast({
        title: 'Calendar Permission Required',
        description: 'Please allow calendar access in your device settings',
        variant: 'destructive',
      });
    } catch (error) {
      toast({
        title: 'Device Calendar Error',
        description: 'Could not access device calendar. Try Download option instead.',
        variant: 'destructive',
      });
    }
  };

  // Handle ICS file download/share for all tasks
  const handleICSExport = async (tasks: ActivityTask[]) => {
    try {
      const { generateActivityICS, downloadOrShareICS } = await import('@/lib/icsGenerator');

      // Convert tasks to the format expected by generateActivityICS
      const tasksForICS = tasks.map(task => ({
        id: task.id,
        title: `${getCategoryEmoji(task.category || activity.category)} ${task.title}`,
        description: task.description,
        dueDate: new Date(task.dueDate),
        timeEstimate: task.timeEstimate,
        category: task.category || activity.category,
      }));

      const icsContent = generateActivityICS(
        {
          id: activity.id,
          title: activity.title,
          description: activity.description,
          category: activity.category,
        },
        tasksForICS
      );

      // Parse the ICS content into events for download
      const events: ICSEvent[] = tasksForICS.map(task => ({
        id: task.id,
        title: task.title,
        description: `${task.description || ''}\n📋 Activity: ${activity.title}\n📱 Open in JournalMate: https://journalmate.ai/app?task=${task.id}`,
        startDate: task.dueDate,
        endDate: calculateEndDate(task.dueDate, task.timeEstimate),
        category: task.category,
      }));

      const filename = `journalmate-${activity.title.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '_')}`;
      const success = await downloadOrShareICS(events, filename);

      if (success) {
        hapticsSuccess();
        toast({
          title: isNative() ? 'Calendar File Ready' : 'Downloaded Calendar File',
          description: `${tasks.length} events for "${activity.title}"`,
        });
      } else {
        toast({
          title: 'Export Failed',
          description: 'Could not create calendar file. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('[ACTIVITY_CALENDAR] ICS export error:', error);
      toast({
        title: 'Export Error',
        description: 'Could not export calendar file',
        variant: 'destructive',
      });
    }
  };

  const handleCalendarSelect = async (calendarId: string) => {
    setShowCalendarPicker(false);
    setIsAdding(true);

    const tasks = await fetchTasksIfNeeded();
    const validTasks = tasks.filter(t => t.dueDate);

    setProgress({ current: 0, total: validTasks.length });
    hapticsLight();

    const selectedCalendar = availableCalendars.find(c => c.id === calendarId);
    const createdEventIds: string[] = [];

    try {
      for (let i = 0; i < validTasks.length; i++) {
        const task = validTasks[i];
        setProgress({ current: i + 1, total: validTasks.length });

        const emoji = getCategoryEmoji(task.category || activity.category);
        const title = `${emoji} ${task.title}`;
        const startDate = new Date(task.dueDate);
        const endDate = calculateEndDate(startDate, task.timeEstimate);

        const descParts: string[] = [];
        if (task.description) descParts.push(task.description);
        descParts.push(`\n📋 Activity: ${activity.title}`);
        if (task.category) descParts.push(`Category: ${task.category}`);
        if (task.priority) descParts.push(`Priority: ${task.priority}`);
        if (task.timeEstimate) descParts.push(`Duration: ${task.timeEstimate}`);
        descParts.push(`\n📱 Open in JournalMate: https://journalmate.ai/app?task=${task.id}`);
        descParts.push(`\n---\nAdded from JournalMate`);
        const description = descParts.join('\n');

        if (selectedCalendar?.source === 'google') {
          const response = await apiRequest('POST', '/api/calendar/event', {
            calendarId,
            summary: title,
            description,
            start: {
              dateTime: startDate.toISOString(),
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            },
            end: {
              dateTime: endDate.toISOString(),
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            },
            reminders: {
              useDefault: false,
              overrides: [{ method: 'popup', minutes: 30 }],
            },
          });

          const data = await response.json();
          if (data.eventId) {
            createdEventIds.push(data.eventId);
          }
        } else {
          try {
            const { CapacitorCalendar } = await import('@ebarooni/capacitor-calendar');
            const result = await CapacitorCalendar.createEvent({
              calendarId,
              title,
              notes: description,
              startDate: startDate.getTime(),
              endDate: endDate.getTime(),
              isAllDay: false,
            } as any);
            if (result) {
              createdEventIds.push(result.toString());
            }
          } catch (nativeError) {
            console.error('[ACTIVITY_CALENDAR] Native calendar error:', nativeError);
          }
        }
      }

      hapticsSuccess();
      toast({
        title: 'Added to Calendar',
        description: `${createdEventIds.length} events added for "${activity.title}"`,
      });

      if (onEventsCreated && createdEventIds.length > 0) {
        onEventsCreated(createdEventIds);
      }
    } catch (error) {
      console.error('[ACTIVITY_CALENDAR] Error adding events:', error);
      toast({
        title: 'Calendar Error',
        description: `Added ${createdEventIds.length}/${validTasks.length} events. Some may have failed.`,
        variant: 'destructive',
      });
    } finally {
      setIsAdding(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleAddToCalendar}
        disabled={isAdding || isLoadingTasks}
        className={className}
        title="Add all tasks to calendar"
      >
        {isAdding ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {showLabel && size !== 'icon' && progress.total > 0 && (
              <span className="ml-2">Adding {progress.current}/{progress.total}...</span>
            )}
          </>
        ) : isLoadingTasks ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {showLabel && size !== 'icon' && <span className="ml-2">Loading...</span>}
          </>
        ) : (
          <>
            <CalendarPlus className="w-4 h-4" />
            {showLabel && size !== 'icon' && (
              <span className="ml-2">
                {tasksWithDates.length > 0 ? `Schedule (${tasksWithDates.length})` : 'Schedule'}
              </span>
            )}
          </>
        )}
      </Button>

      {/* Method Picker Dialog - Choose Google, Device, or ICS */}
      <Dialog open={showMethodPicker} onOpenChange={setShowMethodPicker}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Add Activity to Calendar
            </DialogTitle>
            <DialogDescription>
              Schedule all tasks from "{activity.title}"
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <button
              onClick={() => handleMethodSelect('google')}
              className="w-full p-3 rounded-lg border text-left flex items-center gap-3 hover:bg-accent hover:border-primary transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <div className="font-medium">Google Calendar</div>
                <div className="text-xs text-muted-foreground">Sync directly with your Google account</div>
              </div>
            </button>

            <button
              onClick={() => handleMethodSelect('device')}
              className="w-full p-3 rounded-lg border text-left flex items-center gap-3 hover:bg-accent hover:border-primary transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <Smartphone className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <div className="font-medium">Device Calendar</div>
                <div className="text-xs text-muted-foreground">Samsung Calendar, iOS Calendar, etc.</div>
              </div>
            </button>

            <button
              onClick={() => handleMethodSelect('ics')}
              className="w-full p-3 rounded-lg border text-left flex items-center gap-3 hover:bg-accent hover:border-primary transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                <Download className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1">
                <div className="font-medium">Download Calendar File</div>
                <div className="text-xs text-muted-foreground">Universal .ics format - works with any app</div>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Calendar Picker Dialog - for selecting specific calendar */}
      <Dialog open={showCalendarPicker} onOpenChange={setShowCalendarPicker}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Select Calendar
            </DialogTitle>
            <DialogDescription>
              Add tasks from "{activity.title}" to calendar
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
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
