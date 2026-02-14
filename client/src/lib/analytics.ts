/**
 * Lightweight feature usage analytics
 *
 * Usage:
 *   import { trackEvent } from '@/lib/analytics';
 *   trackEvent('quick_plan_started', 'planning');
 *   trackEvent('task_completed', 'tasks', { taskId: '123' });
 *
 * Event categories: planning, tasks, journal, social, discover, settings, reports, navigation
 */

type EventCategory = 'planning' | 'tasks' | 'journal' | 'social' | 'discover' | 'settings' | 'reports' | 'navigation';

interface QueuedEvent {
  eventName: string;
  eventCategory: EventCategory;
  metadata?: Record<string, any>;
}

let eventQueue: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const FLUSH_INTERVAL = 5000;
const MAX_QUEUE_SIZE = 20;

// Deduplication: track recent events to avoid double-logging rapid actions
const recentEvents = new Map<string, number>();
const DEDUP_WINDOW_MS = 2000;

function flushEvents() {
  if (eventQueue.length === 0) return;

  const eventsToSend = [...eventQueue];
  eventQueue = [];

  if (eventsToSend.length === 1) {
    fetch('/api/analytics/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventsToSend[0]),
      credentials: 'include',
    }).catch(() => {});
  } else {
    fetch('/api/analytics/events/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: eventsToSend }),
      credentials: 'include',
    }).catch(() => {});
  }
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushEvents();
  }, FLUSH_INTERVAL);
}

export function trackEvent(
  eventName: string,
  eventCategory: EventCategory,
  metadata?: Record<string, any>
) {
  const dedupKey = `${eventName}:${JSON.stringify(metadata || {})}`;
  const now = Date.now();
  const lastTime = recentEvents.get(dedupKey);
  if (lastTime && now - lastTime < DEDUP_WINDOW_MS) {
    return;
  }
  recentEvents.set(dedupKey, now);

  // Clean old dedup entries periodically
  if (recentEvents.size > 100) {
    for (const [key, time] of recentEvents) {
      if (now - time > DEDUP_WINDOW_MS * 5) {
        recentEvents.delete(key);
      }
    }
  }

  eventQueue.push({ eventName, eventCategory, metadata });

  if (eventQueue.length >= MAX_QUEUE_SIZE) {
    flushEvents();
  } else {
    scheduleFlush();
  }
}

// Flush on page unload or visibility change
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', flushEvents);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushEvents();
    }
  });
}
