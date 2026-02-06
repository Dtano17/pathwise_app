import { useState, useRef, useEffect, memo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { CheckCircle, Clock, Calendar, CalendarPlus, X, Pause, Undo, Archive, ThumbsUp, ThumbsDown, Loader2, Edit3, MapPin, Link2, Smartphone, Download } from 'lucide-react';
import Confetti from 'react-confetti';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { isNative } from '@/lib/platform';
import { addTaskToCalendar, getCalendars, requestCalendarPermission } from '@/lib/calendar';
import { downloadOrShareICS, type ICSEvent } from '@/lib/icsGenerator';
import { hapticsSuccess, hapticsLight, hapticsCelebrate } from '@/lib/haptics';

interface DeviceCalendar {
  id: string;
  title: string;
  color?: string;
  isPrimary?: boolean;
  isReadOnly?: boolean;
  source?: 'google' | 'native';
}

// Calendar method types
type CalendarMethod = 'google' | 'device' | 'ics';

interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  category: string;
  completed?: boolean;
}

interface TaskCardProps {
  task: Task;
  onComplete: (taskId: string) => void;
  onSkip: (taskId: string) => void;
  onSnooze: (taskId: string, hours: number) => void;
  onArchive?: (taskId: string) => void;
  onUncomplete?: (taskId: string) => void;
  onEdit?: (task: Task) => void;
  showConfetti?: boolean;
}

// Interface for editable calendar event details
interface CalendarEventEdit {
  title: string;
  description: string;
  location: string;
  startDate: Date;
  endDate: Date;
}

const TaskCard = memo(function TaskCard({ task, onComplete, onSkip, onSnooze, onArchive, onUncomplete, onEdit, showConfetti = false }: TaskCardProps) {
  const [isCompleted, setIsCompleted] = useState(task.completed || false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [pendingAction, setPendingAction] = useState<'complete' | 'skip' | 'snooze' | 'archive' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAddingToCalendar, setIsAddingToCalendar] = useState(false);
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

  const { toast, dismiss } = useToast();
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentToastIdRef = useRef<string | null>(null);

  // Sync local completed state with prop when it changes (e.g., from server refresh)
  useEffect(() => {
    setIsCompleted(task.completed || false);
  }, [task.completed]);

  // TEMPORARILY DISABLED: Fetch task feedback (causing N+1 query performance issues)
  // const { data: feedbackData } = useQuery<{ userFeedback: { feedbackType: 'like' | 'dislike' } | null; stats: { likes: number; dislikes: number } }>({
  //   queryKey: ['/api/tasks', task.id, 'feedback'],
  //   staleTime: 30000,
  // });

  // TEMPORARILY DISABLED: Task feedback mutation
  // const feedbackMutation = useMutation({
  //   mutationFn: async (feedbackType: 'like' | 'dislike') => {
  //     const response = await apiRequest('POST', `/api/tasks/${task.id}/feedback`, { feedbackType });
  //     return await response.json();
  //   },
  //   onSuccess: () => {
  //     queryClient.invalidateQueries({ queryKey: ['/api/tasks', task.id, 'feedback'] });
  //   }
  // });

  // Enhanced haptic feedback that respects user preferences
  const triggerHapticFeedback = async (type: 'light' | 'success' | 'celebrate' = 'success') => {
    try {
      // Check if completion haptic is enabled
      const response = await fetch('/api/mobile/preferences');
      if (response.ok) {
        const prefs = await response.json();
        if (!prefs.enableHaptics || !prefs.enableCompletionHaptic) {
          return; // User disabled haptics
        }
      }

      // Trigger the appropriate haptic
      switch (type) {
        case 'light':
          await hapticsLight();
          break;
        case 'success':
          await hapticsSuccess();
          break;
        case 'celebrate':
          await hapticsCelebrate();
          break;
      }
    } catch (error) {
      // Fallback to web vibration API
      if ('vibrate' in navigator && navigator.vibrate) {
        switch (type) {
          case 'light':
            navigator.vibrate(50);
            break;
          case 'success':
            navigator.vibrate(100);
            break;
          case 'celebrate':
            navigator.vibrate([100, 50, 100, 50, 100]);
            break;
        }
      }
    }
  };

  const clearPendingAction = () => {
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
      undoTimeoutRef.current = null;
    }
    if (currentToastIdRef.current) {
      dismiss(currentToastIdRef.current);
      currentToastIdRef.current = null;
    }
    setPendingAction(null);
  };

  const handleComplete = () => {
    if (isProcessing) return;

    setIsProcessing(true);
    clearPendingAction();
    setPendingAction('complete');
    triggerHapticFeedback('celebrate'); // Celebration haptic on task completion

    // Show celebration immediately
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 3000);

    // Show undo toast
    const { id } = toast({
      title: "Task Completed! 🎉",
      description: "Great job finishing this task!",
      action: (
        <ToastAction altText="Undo completion" onClick={undoAction}>
          <Undo className="w-4 h-4" />
          Undo
        </ToastAction>
      ),
    });
    currentToastIdRef.current = id;

    // Execute action after delay
    undoTimeoutRef.current = setTimeout(() => {
      onComplete(task.id);
      clearPendingAction();
      setIsProcessing(false);
    }, 1000);
  };

  const handleSkip = () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    clearPendingAction();
    setPendingAction('skip');
    triggerHapticFeedback('light');

    // Show undo toast
    const { id } = toast({
      title: "Task Skipped",
      description: "This task has been skipped for now.",
      action: (
        <ToastAction altText="Undo skip" onClick={undoAction}>
          <Undo className="w-4 h-4" />
          Undo
        </ToastAction>
      ),
    });
    currentToastIdRef.current = id;

    // Execute action after delay
    undoTimeoutRef.current = setTimeout(() => {
      onSkip(task.id);
      clearPendingAction();
      setIsProcessing(false);
    }, 1000);
  };

  const handleSnooze = () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    clearPendingAction();
    setPendingAction('snooze');
    triggerHapticFeedback('medium');

    // Show undo toast
    const { id } = toast({
      title: "Task Snoozed",
      description: "This task will remind you again in 2 hours.",
      action: (
        <ToastAction altText="Undo snooze" onClick={undoAction}>
          <Undo className="w-4 h-4" />
          Undo
        </ToastAction>
      ),
    });
    currentToastIdRef.current = id;

    // Execute action after delay
    undoTimeoutRef.current = setTimeout(() => {
      onSnooze(task.id, 2);
      clearPendingAction();
      setIsProcessing(false);
    }, 1000);
  };

  const handleArchive = () => {
    if (isProcessing || !onArchive) return;
    
    setIsProcessing(true);
    clearPendingAction();
    setPendingAction('archive');
    triggerHapticFeedback('light');

    // Show undo toast
    const { id } = toast({
      title: "Task Archived",
      description: "This task has been archived.",
      action: (
        <ToastAction altText="Undo archive" onClick={undoAction}>
          <Undo className="w-4 h-4" />
          Undo
        </ToastAction>
      ),
    });
    currentToastIdRef.current = id;

    // Execute action after delay
    undoTimeoutRef.current = setTimeout(() => {
      onArchive(task.id);
      clearPendingAction();
      setIsProcessing(false);
    }, 1000);
  };

  const undoAction = () => {
    clearPendingAction();
    setIsProcessing(false);
    setShowCelebration(false);
  };

  const handleUncomplete = () => {
    if (isProcessing || !onUncomplete) return;

    setIsProcessing(true);
    triggerHapticFeedback('medium');

    // Show confirmation toast
    toast({
      title: "Task marked incomplete",
      description: "You can complete this task again when ready.",
    });

    // Call the uncomplete handler
    onUncomplete(task.id);
    setIsCompleted(false);
    setIsProcessing(false);
  };

  // Show method picker dialog first (like AddToCalendarButton)
  const handleAddToCalendar = async () => {
    if (isAddingToCalendar) return;
    triggerHapticFeedback('light');
    setShowMethodPicker(true);
  };

  // Handle method selection from picker
  const handleMethodSelect = async (method: CalendarMethod) => {
    setShowMethodPicker(false);
    setSelectedMethod(method);
    setIsAddingToCalendar(true);
    triggerHapticFeedback('light');

    try {
      if (method === 'ics') {
        // ICS Download/Share - universal fallback
        await handleICSExport();
        return;
      }

      if (method === 'google') {
        await handleGoogleCalendarMethod();
        return;
      }

      if (method === 'device') {
        await handleDeviceCalendarMethod();
        return;
      }
    } catch (error: any) {
      console.error('[TASK CARD] Calendar error:', error);
      toast({
        title: 'Calendar Error',
        description: error.message || 'Failed to access calendar',
        variant: 'destructive',
      });
    } finally {
      setIsAddingToCalendar(false);
    }
  };

  // Handle Google Calendar API method
  const handleGoogleCalendarMethod = async () => {
    try {
      console.log('[TASK CARD] Checking Google Calendar access...');
      const statusResponse = await apiRequest('GET', '/api/calendar/status');
      const statusData = await statusResponse.json();
      console.log('[TASK CARD] Google Calendar status:', statusData);

      if (statusData.hasAccess) {
        const listResponse = await apiRequest('GET', '/api/calendar/list');
        const listData = await listResponse.json();

        if (listData.calendars && listData.calendars.length > 0) {
          console.log('[TASK CARD] Found Google calendars:', listData.calendars.length);

          const googleCalendars: DeviceCalendar[] = listData.calendars.map((cal: any) => ({
            id: cal.id,
            title: cal.name || cal.id,
            color: cal.backgroundColor || '#4285F4',
            isPrimary: cal.isPrimary || false,
            isReadOnly: cal.accessRole === 'reader',
            source: 'google' as const
          }));

          setAvailableCalendars(googleCalendars);
          setShowCalendarPicker(true);
          setIsAddingToCalendar(false);
          return;
        }
      }

      toast({
        title: 'Google Calendar Not Connected',
        description: 'Please sign in with Google in Settings, or try Device Calendar or Download option',
        variant: 'destructive',
      });
    } catch (apiError: any) {
      console.log('[TASK CARD] Google Calendar API not available:', apiError.message);
      toast({
        title: 'Google Calendar Not Available',
        description: 'Try Device Calendar or Download option instead',
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
      console.log('[TASK CARD] Trying native calendar...');
      const permission = await requestCalendarPermission();

      if (!permission.granted) {
        toast({
          title: 'Permission Required',
          description: 'Please grant calendar access in your device settings',
          variant: 'destructive'
        });
        return;
      }

      const calendars = await getCalendars();
      console.log('[TASK CARD] Found native calendars:', calendars.length);

      if (calendars.length > 0) {
        const nativeCalendars: DeviceCalendar[] = calendars.map((cal: any) => ({
          id: cal.id,
          title: cal.title || cal.id,
          color: cal.color || '#6366f1',
          isPrimary: cal.isPrimary || false,
          isReadOnly: cal.isReadOnly || false,
          source: 'native' as const
        }));

        setAvailableCalendars(nativeCalendars);
        setShowCalendarPicker(true);
        setIsAddingToCalendar(false);
        return;
      }

      toast({
        title: 'No Device Calendars Found',
        description: 'Please add a calendar account to your device, or try Download option',
        variant: 'destructive',
      });
    } catch (error: any) {
      console.log('[TASK CARD] Native calendar error:', error.message);
      toast({
        title: 'Device Calendar Error',
        description: 'Could not access device calendar. Try Download option instead.',
        variant: 'destructive',
      });
    }
  };

  // Handle ICS file download/share - universal fallback that always works
  const handleICSExport = async () => {
    try {
      const dueDate = task.dueDate
        ? new Date(task.dueDate)
        : (() => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(9, 0, 0, 0);
            return tomorrow;
          })();

      const startDate = new Date(dueDate.getTime() - 30 * 60 * 1000); // 30 min before
      const endDate = dueDate;

      // Build description with deep link
      const descParts: string[] = [];
      if (task.description) descParts.push(task.description);
      descParts.push(`Category: ${task.category}`);
      descParts.push(`Priority: ${task.priority}`);
      descParts.push(`📱 Open in JournalMate: https://journalmate.ai/app?task=${task.id}`);

      const icsEvent: ICSEvent = {
        id: task.id,
        title: `📝 ${task.title}`,
        description: descParts.join('\n'),
        startDate,
        endDate,
        category: task.category,
      };

      const filename = `journalmate-${task.title.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '_')}`;
      const success = await downloadOrShareICS([icsEvent], filename);

      if (success) {
        triggerHapticFeedback('success');
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
      console.error('[TASK CARD] ICS export error:', error);
      toast({
        title: 'Export Error',
        description: 'Could not export calendar file',
        variant: 'destructive',
      });
    }
  };

  // Helper to extract URLs from text
  const extractUrls = (text: string): string[] => {
    const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/gi;
    return text.match(urlRegex) || [];
  };

  // Helper to extract location from description (looks for patterns like "Location: X" or addresses)
  const extractLocation = (text: string): string | undefined => {
    // Look for explicit location patterns
    const locationMatch = text.match(/(?:location|address|at|venue):\s*([^\n]+)/i);
    if (locationMatch) return locationMatch[1].trim();

    // Look for Google Maps links and extract place name
    const mapsMatch = text.match(/maps\.google\.com[^\s]*|google\.com\/maps[^\s]*/i);
    if (mapsMatch) return undefined; // Let the URL be in description, not location field

    return undefined;
  };

  // Build rich description for calendar event
  const buildCalendarDescription = (): string => {
    const parts: string[] = [];

    // Add task description
    if (task.description) {
      parts.push(task.description);
    }

    // Add category and priority info
    parts.push(`\n---\nCategory: ${task.category}`);
    parts.push(`Priority: ${task.priority}`);

    // Extract and list URLs for easy access
    const urls = extractUrls(task.description || '');
    if (urls.length > 0) {
      parts.push(`\n📎 Links:`);
      urls.forEach(url => parts.push(`• ${url}`));
    }

    // Add app attribution
    parts.push(`\n---\nAdded from JournalMate`);

    return parts.join('\n');
  };

  // Handle calendar selection from picker - shows edit dialog before creating
  const handleCalendarSelect = async (calendarId: string) => {
    setShowCalendarPicker(false);
    triggerHapticFeedback('light');

    // Calculate dates from task
    const dueDate = task.dueDate
      ? new Date(task.dueDate)
      : (() => {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(9, 0, 0, 0);
          return tomorrow;
        })();
    const startDate = new Date(dueDate.getTime() - 30 * 60 * 1000); // 30 min before

    // Prepare event edit state
    setEventEdit({
      title: task.title,
      description: task.description || '',
      location: extractLocation(task.description || '') || '',
      startDate,
      endDate: dueDate,
    });

    // Store selected calendar for later
    setPendingCalendarId(calendarId);

    // Show edit dialog
    setShowEventEditor(true);
  };

  // Handle saving event after editing
  const handleSaveToCalendar = async () => {
    if (!pendingCalendarId) return;

    setShowEventEditor(false);
    setIsAddingToCalendar(true);
    triggerHapticFeedback('light');

    try {
      const selectedCalendar = availableCalendars.find(c => c.id === pendingCalendarId);

      // Build rich description with user edits
      const parts: string[] = [];
      if (eventEdit.description) {
        parts.push(eventEdit.description);
      }
      parts.push(`\n---\nCategory: ${task.category}`);
      parts.push(`Priority: ${task.priority}`);
      const urls = extractUrls(eventEdit.description || '');
      if (urls.length > 0) {
        parts.push(`\n📎 Links:`);
        urls.forEach(url => parts.push(`• ${url}`));
      }
      parts.push(`\n---\nAdded from JournalMate`);
      const richDescription = parts.join('\n');

      if (selectedCalendar?.source === 'google') {
        // Use Google Calendar API (same as Settings.tsx)
        console.log('[TASK CARD] Creating event via Google Calendar API...');
        const response = await apiRequest('POST', '/api/calendar/event', {
          calendarId: pendingCalendarId,
          summary: `📝 ${eventEdit.title}`,
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
              { method: 'popup', minutes: 30 },    // 30 min before
              { method: 'popup', minutes: 1440 },  // 1 day before
            ],
          },
        });
        const data = await response.json();

        if (!data.error && (data.success || data.eventId)) {
          triggerHapticFeedback('success');
          toast({
            title: 'Added to Calendar',
            description: `Event added to "${selectedCalendar.title}" with reminders`,
          });
          console.log('[TASK CARD] Event created:', data.eventId);

          // Save calendar event ID to task for sync tracking
          if (data.eventId) {
            try {
              await apiRequest('PATCH', `/api/tasks/${task.id}`, {
                googleCalendarEventId: data.eventId,
              });
              console.log('[TASK CARD] Saved calendar event ID to task');
            } catch (saveError) {
              console.error('[TASK CARD] Failed to save calendar event ID:', saveError);
            }
          }
        } else {
          toast({
            title: 'Calendar Error',
            description: data.error || 'Failed to add event',
            variant: 'destructive',
          });
        }
      } else {
        // Use native calendar
        console.log('[TASK CARD] Creating event via native calendar...');
        const result = await addTaskToCalendar(
          eventEdit.title,
          eventEdit.endDate,
          richDescription,
          30
        );

        if (result.success) {
          triggerHapticFeedback('success');
          toast({
            title: 'Added to Calendar',
            description: `Event added to "${selectedCalendar?.title || 'calendar'}"`,
          });
        } else {
          toast({
            title: 'Calendar Error',
            description: result.error || 'Failed to add event',
            variant: 'destructive',
          });
        }
      }
    } catch (error: any) {
      console.error('[TASK CARD] Calendar save error:', error);
      toast({
        title: 'Calendar Error',
        description: error.message || 'Failed to add event',
        variant: 'destructive',
      });
    } finally {
      setIsAddingToCalendar(false);
      setPendingCalendarId(null);
    }
  };

  // Format date for datetime-local input
  const formatDateTimeLocal = (date: Date): string => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getCategoryColor = (category: string | null | undefined) => {
    const categoryKey = (category ?? 'general').toLowerCase();
    switch (categoryKey) {
      case 'work': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'personal': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'health': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200';
      case 'finance': return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className="w-full max-w-md mx-auto relative" data-testid={`task-container-${task.id}`}>
      {/* Celebration Confetti */}
      {showCelebration && showConfetti && (
        <div className="absolute inset-0 z-50 pointer-events-none">
          <Confetti
            width={300}
            height={200}
            recycle={false}
            numberOfPieces={50}
            gravity={0.3}
          />
        </div>
      )}

      <Card className={`relative p-6 mb-4 transition-all duration-300 hover-elevate ${
        pendingAction === 'complete' ? 'ring-2 ring-green-500 border-green-200' :
        pendingAction === 'skip' ? 'ring-2 ring-red-500 border-red-200' :
        pendingAction === 'snooze' ? 'ring-2 ring-yellow-500 border-yellow-200' :
        pendingAction === 'archive' ? 'ring-2 ring-blue-500 border-blue-200' : ''
      }`} data-testid={`task-card-${task.id}`}>

        {/* Top-right buttons */}
        <div className="absolute top-2 right-2 flex items-center gap-1">
          {/* Edit button */}
          {onEdit && !isCompleted && (
            <Button
              onClick={() => onEdit(task)}
              disabled={isProcessing}
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              data-testid={`button-edit-${task.id}`}
            >
              <Edit3 className="w-4 h-4" />
            </Button>
          )}
          {/* Undo button for completed tasks */}
          {isCompleted && onUncomplete && (
            <Button
              onClick={handleUncomplete}
              disabled={isProcessing}
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              data-testid={`button-uncomplete-${task.id}`}
            >
              <Undo className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base sm:text-lg text-foreground mb-2 break-words" data-testid={`task-title-${task.id}`}>
              {task.title}
            </h3>
            <p className="text-sm text-muted-foreground mb-3 break-words whitespace-pre-wrap" data-testid={`task-description-${task.id}`}>
              {task.description}
            </p>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          {isCompleted && (
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 flex items-center gap-1" data-testid={`task-status-completed-${task.id}`}>
              <CheckCircle className="w-3 h-3" />
              Completed
            </Badge>
          )}
          <Badge className={getPriorityColor(task.priority)} data-testid={`task-priority-${task.id}`}>
            {task.priority}
          </Badge>
          <Badge className={getCategoryColor(task.category)} data-testid={`task-category-${task.id}`}>
            {task.category}
          </Badge>
          {task.dueDate && (
            <Badge variant="outline" className="flex items-center gap-1" data-testid={`task-due-date-${task.id}`}>
              <Calendar className="w-3 h-3" />
              {(() => {
                const date = new Date(task.dueDate);
                const dateStr = date.toLocaleDateString();
                // Show time if not midnight (indicating time was extracted)
                const hours = date.getHours();
                const minutes = date.getMinutes();
                if (hours !== 0 || minutes !== 0) {
                  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  return `${dateStr} at ${timeStr}`;
                }
                return dateStr;
              })()}
            </Badge>
          )}
        </div>

        {/* TEMPORARILY DISABLED: Feedback Buttons - YouTube Style (causing N+1 query performance issues) */}
        {/* <div className="flex items-center justify-center gap-4 mb-4 border-t pt-4">
          <button
            onClick={() => feedbackMutation.mutate('like')}
            disabled={feedbackMutation.isPending}
            className="flex items-center gap-2 px-3 py-2 rounded-full transition-all duration-200 hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid={`button-like-${task.id}`}
          >
            <ThumbsUp 
              className={`w-5 h-5 transition-all duration-200 ${
                feedbackData?.userFeedback?.feedbackType === 'like' 
                  ? 'fill-foreground stroke-foreground' 
                  : 'fill-none stroke-foreground'
              }`}
              strokeWidth={1.5}
            />
            <span className="text-xs font-medium text-foreground">
              {feedbackData?.stats?.likes || ''}
            </span>
          </button>
          <div className="w-px h-6 bg-border" />
          <button
            onClick={() => feedbackMutation.mutate('dislike')}
            disabled={feedbackMutation.isPending}
            className="flex items-center gap-2 px-3 py-2 rounded-full transition-all duration-200 hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid={`button-dislike-${task.id}`}
          >
            <ThumbsDown 
              className={`w-5 h-5 transition-all duration-200 ${
                feedbackData?.userFeedback?.feedbackType === 'dislike' 
                  ? 'fill-foreground stroke-foreground' 
                  : 'fill-none stroke-foreground'
              }`}
              strokeWidth={1.5}
            />
            <span className="text-xs font-medium text-foreground">
              {feedbackData?.stats?.dislikes || ''}
            </span>
          </button>
        </div> */}

        {/* Action Buttons */}
        {!isCompleted && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
            <Button
              onClick={handleComplete}
              disabled={isProcessing}
              size="default"
              className="w-full min-h-[44px] bg-green-600 hover:bg-green-700 text-white"
              data-testid={`button-complete-${task.id}`}
            >
              <CheckCircle className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="truncate">Complete</span>
            </Button>

            <Button
              onClick={handleSnooze}
              disabled={isProcessing}
              variant="outline"
              size="default"
              className="w-full min-h-[44px]"
              data-testid={`button-snooze-${task.id}`}
            >
              <Pause className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="truncate">Snooze</span>
            </Button>

            {/* Calendar button - always show (Google Calendar API works on web, native calendar on mobile) */}
            <Button
              onClick={handleAddToCalendar}
              disabled={isProcessing || isAddingToCalendar}
              variant="outline"
              size="default"
              className="w-full min-h-[44px]"
              data-testid={`button-calendar-${task.id}`}
            >
              {isAddingToCalendar ? (
                <Loader2 className="w-4 h-4 mr-2 flex-shrink-0 animate-spin" />
              ) : (
                <CalendarPlus className="w-4 h-4 mr-2 flex-shrink-0" />
              )}
              <span className="truncate">Calendar</span>
            </Button>

            {onArchive && (
              <Button
                onClick={handleArchive}
                disabled={isProcessing}
                variant="outline"
                size="default"
                className="w-full min-h-[44px]"
                data-testid={`button-archive-${task.id}`}
              >
                <Archive className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="truncate">Archive</span>
              </Button>
            )}

            <Button
              onClick={handleSkip}
              disabled={isProcessing}
              variant="outline"
              size="default"
              className={`w-full min-h-[44px] text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950 ${onArchive ? '' : 'sm:col-start-2'}`}
              data-testid={`button-skip-${task.id}`}
            >
              <X className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="truncate">Skip</span>
            </Button>
          </div>
        )}

        {isCompleted && (
          <div className="mt-4 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-medium">
              <CheckCircle className="w-5 h-5" />
              <span>Great job! Task completed.</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {onArchive && (
                <Button
                  onClick={handleArchive}
                  disabled={isProcessing}
                  variant="outline"
                  size="sm"
                  className="flex-1 sm:flex-none"
                  data-testid={`button-archive-completed-${task.id}`}
                >
                  <Archive className="w-4 h-4 mr-2 flex-shrink-0" />
                  Archive
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Processing indicator */}
        {isProcessing && (
          <div className="mt-3 text-center text-sm text-muted-foreground">
            Processing... (Click undo to cancel)
          </div>
        )}
      </Card>

      {/* Method Picker Dialog - Choose Google, Device, or ICS */}
      <Dialog open={showMethodPicker} onOpenChange={setShowMethodPicker}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Add to Calendar
            </DialogTitle>
            <DialogDescription>
              Choose how to add "{task.title}" to your calendar
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

      {/* Calendar Picker Dialog - same pattern as Settings.tsx */}
      <Dialog open={showCalendarPicker} onOpenChange={setShowCalendarPicker}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Add to Calendar
            </DialogTitle>
            <DialogDescription>
              Choose which calendar to add "{task.title}" to
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {availableCalendars.map((calendar) => (
              <Button
                key={calendar.id}
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => handleCalendarSelect(calendar.id)}
                disabled={calendar.isReadOnly || isAddingToCalendar}
              >
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: calendar.color || '#6366f1' }}
                />
                <span className="truncate flex-1 text-left">{calendar.title}</span>
                {calendar.isPrimary && (
                  <Badge variant="secondary" className="text-xs">Primary</Badge>
                )}
                {calendar.isReadOnly && (
                  <Badge variant="outline" className="text-xs">Read-only</Badge>
                )}
              </Button>
            ))}
          </div>
          <Button
            variant="ghost"
            className="w-full mt-2"
            onClick={() => {
              setShowCalendarPicker(false);
            }}
          >
            Cancel
          </Button>
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
                    // If end is before new start, adjust end
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
              disabled={!eventEdit.title.trim() || isAddingToCalendar}
            >
              {isAddingToCalendar ? (
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
    </div>
  );
});

export default TaskCard;