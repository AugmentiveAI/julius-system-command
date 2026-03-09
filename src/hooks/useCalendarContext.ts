import { useState, useEffect, useCallback } from 'react';
import { CalendarEvent, CalendarContext } from '@/types/activity';
import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'systemCalendarEvents';

function generateId(): string {
  return `cal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatTimeUntil(dateString: string): string {
  const target = new Date(dateString);
  const now = new Date();
  const diff = (target.getTime() - now.getTime()) / 60000;
  if (diff < 0) return 'now';
  if (diff < 60) return `${Math.round(diff)} min`;
  if (diff < 1440) return `${Math.round(diff / 60)} hours`;
  return `${Math.round(diff / 1440)} days`;
}

function calculateFreeBlocks(events: CalendarEvent[]): { start: string; end: string; duration: number }[] {
  const sorted = [...events].sort((a, b) => a.start.localeCompare(b.start));
  const blocks: { start: string; end: string; duration: number }[] = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const currentEnd = new Date(sorted[i].end);
    const nextStart = new Date(sorted[i + 1].start);
    const gap = (nextStart.getTime() - currentEnd.getTime()) / 60000;
    if (gap >= 30) {
      blocks.push({ start: currentEnd.toISOString(), end: nextStart.toISOString(), duration: gap });
    }
  }

  return blocks;
}

export function useCalendarContext() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [context, setContext] = useState<CalendarContext | null>(null);

  const calculateContext = useCallback((eventList: CalendarEvent[]) => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const todayEvents = eventList
      .filter(e => e.start.startsWith(today))
      .sort((a, b) => a.start.localeCompare(b.start));

    const upcomingEvents = eventList
      .filter(e => new Date(e.start) > now)
      .sort((a, b) => a.start.localeCompare(b.start))
      .slice(0, 10);

    const currentEvent = todayEvents.find(e => {
      const start = new Date(e.start);
      const end = new Date(e.end);
      return now >= start && now <= end;
    }) || null;

    const nextEvent = upcomingEvents[0] || null;
    const freeTimeBlocks = calculateFreeBlocks(todayEvents);

    setContext({ todayEvents, upcomingEvents, currentEvent, nextEvent, freeTimeBlocks });
  }, []);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      setEvents(stored);
      calculateContext(stored);
    } catch { /* ignore */ }
  }, [calculateContext]);

  const addEvent = useCallback((event: Omit<CalendarEvent, 'id'>): CalendarEvent => {
    const newEvent: CalendarEvent = { ...event, id: generateId() };
    const updated = [...events, newEvent];
    setEvents(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    calculateContext(updated);
    return newEvent;
  }, [events, calculateContext]);

  const removeEvent = useCallback((id: string) => {
    const updated = events.filter(e => e.id !== id);
    setEvents(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    calculateContext(updated);
  }, [events, calculateContext]);

  const addEventFromText = useCallback(async (text: string): Promise<CalendarEvent | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;

      const response = await supabase.functions.invoke('parse-voice-input', {
        body: { text, mode: 'calendar' },
      });

      if (response.error || !response.data) return null;
      const parsed = response.data;
      if (!parsed.title || !parsed.start) return null;

      return addEvent({
        title: parsed.title,
        start: parsed.start,
        end: parsed.end || new Date(new Date(parsed.start).getTime() + 60 * 60000).toISOString(),
        type: parsed.type || 'other',
        attendees: parsed.attendees,
      });
    } catch {
      return null;
    }
  }, [addEvent]);

  const getJarvisContext = useCallback((): string => {
    if (!context) return 'No calendar data available.';

    let contextString = '';
    if (context.currentEvent) {
      contextString += `Currently: ${context.currentEvent.title}. `;
    }
    if (context.nextEvent) {
      const until = formatTimeUntil(context.nextEvent.start);
      contextString += `Next: ${context.nextEvent.title} in ${until}. `;
    }
    if (context.freeTimeBlocks.length > 0) {
      const longestBlock = context.freeTimeBlocks.reduce((a, b) => a.duration > b.duration ? a : b);
      contextString += `Longest free block: ${longestBlock.duration} minutes. `;
    }
    return contextString || 'Calendar is clear.';
  }, [context]);

  return {
    events,
    context,
    addEvent,
    removeEvent,
    addEventFromText,
    getJarvisContext,
    todayEvents: context?.todayEvents || [],
    currentEvent: context?.currentEvent || null,
    nextEvent: context?.nextEvent || null,
  };
}
