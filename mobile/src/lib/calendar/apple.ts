/**
 * Apple Calendar helpers via expo-calendar (EventKit on iOS).
 * Events are read on-device — nothing is sent to the server.
 */
import * as Calendar from 'expo-calendar';

export interface LocalCalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  location?: string;
  provider: 'apple';
}

export async function requestCalendarPermission(): Promise<'granted' | 'denied'> {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  return status === 'granted' ? 'granted' : 'denied';
}

export async function loadAppleEvents(from: Date, to: Date): Promise<LocalCalendarEvent[]> {
  const { status } = await Calendar.getCalendarPermissionsAsync();
  if (status !== 'granted') return [];

  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const calendarIds = calendars.map(c => c.id);

  if (calendarIds.length === 0) return [];

  const raw = await Calendar.getEventsAsync(calendarIds, from, to);

  return raw.map(ev => ({
    id: ev.id,
    title: ev.title ?? '(No title)',
    start: new Date(ev.startDate),
    end: new Date(ev.endDate),
    allDay: ev.allDay ?? false,
    location: ev.location ?? undefined,
    provider: 'apple' as const,
  }));
}
