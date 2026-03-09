export interface Activity {
  id: string;
  timestamp: string;
  type: 'task_completed' | 'task_created' | 'time_logged' | 'note' | 'meeting' | 'break' | 'energy_log';
  content: string;
  metadata: {
    category?: string;
    duration?: number;
    energy?: 'high' | 'medium' | 'low';
    people?: string[];
    source?: 'voice' | 'quick_entry' | 'quest' | 'calendar' | 'manual';
    linkedQuestId?: string;
    sentiment?: 'positive' | 'neutral' | 'negative';
  };
}

export interface DailyActivitySummary {
  date: string;
  activities: Activity[];
  stats: {
    totalActivities: number;
    totalMinutesLogged: number;
    minutesByCategory: Record<string, number>;
    dominantEnergy: 'high' | 'medium' | 'low';
    productivityScore: number;
  };
}

export interface ParsedVoiceInput {
  type: 'task_done' | 'task_create' | 'note' | 'log_time' | 'log_energy' | 'unknown';
  content: string;
  extracted: {
    task?: string;
    duration?: number;
    category?: string;
    energy?: 'high' | 'medium' | 'low';
    people?: string[];
    deadline?: string;
    sentiment?: 'positive' | 'neutral' | 'negative';
  };
  confidence: number;
}

export interface QuickEntryData {
  raw: string;
  parsed: {
    type: 'task' | 'done' | 'note' | 'time' | 'idea';
    content: string;
    category?: string;
    duration?: number;
    priority?: 'high' | 'medium' | 'low';
  };
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  type: 'meeting' | 'focus' | 'personal' | 'deadline' | 'other';
  attendees?: string[];
  isAllDay?: boolean;
}

export interface CalendarContext {
  todayEvents: CalendarEvent[];
  upcomingEvents: CalendarEvent[];
  currentEvent: CalendarEvent | null;
  nextEvent: CalendarEvent | null;
  freeTimeBlocks: { start: string; end: string; duration: number }[];
}
