import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { Colors, Radius, Shadow } from '../../theme';
import { MY_CALENDAR_EVENTS } from '../../lib/calendar/oauth';
import { loadAppleEvents, LocalCalendarEvent } from '../../lib/calendar/apple';

interface ServerEvent {
  id: string;
  provider: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location?: string;
}

interface MergedEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  location?: string;
  provider: string;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function providerDot(provider: string): string {
  if (provider === 'google') return '#4285F4';
  if (provider === 'microsoft') return '#0078D4';
  return '#3d8258'; // apple → sprout green
}

interface Props {
  hasIntegrations: boolean;
}

export default function TodayScheduleCard({ hasIntegrations }: Props) {
  const { t } = useTranslation();
  const [appleEvents, setAppleEvents] = useState<LocalCalendarEvent[]>([]);

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  const { data, loading } = useQuery(MY_CALENDAR_EVENTS, {
    variables: { fromDt: startOfDay.toISOString(), toDt: endOfDay.toISOString() },
    skip: !hasIntegrations,
    fetchPolicy: 'cache-and-network',
  });

  useEffect(() => {
    loadAppleEvents(startOfDay, endOfDay)
      .then(evs => setAppleEvents(evs))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const serverEvents: MergedEvent[] = (data?.myCalendarEvents ?? []).map((ev: ServerEvent) => ({
    id: ev.id,
    title: ev.title,
    start: new Date(ev.start),
    end: new Date(ev.end),
    allDay: ev.allDay,
    location: ev.location,
    provider: ev.provider,
  }));

  const allEvents: MergedEvent[] = [
    ...serverEvents,
    ...appleEvents.map(ev => ({
      id: ev.id,
      title: ev.title,
      start: ev.start,
      end: ev.end,
      allDay: ev.allDay,
      location: ev.location,
      provider: 'apple',
    })),
  ].sort((a, b) => a.start.getTime() - b.start.getTime());

  if (loading && allEvents.length === 0) {
    return (
      <View style={s.card}>
        <ActivityIndicator size="small" color={Colors.primary} />
      </View>
    );
  }

  if (allEvents.length === 0) {
    return (
      <View style={s.card}>
        <Text style={s.empty}>{t('calendar.empty')}</Text>
      </View>
    );
  }

  return (
    <View style={s.card}>
      {allEvents.map((ev, idx) => (
        <View key={ev.id} style={[s.row, idx < allEvents.length - 1 && s.rowBorder]}>
          <View style={[s.dot, { backgroundColor: providerDot(ev.provider) }]} />
          <View style={{ flex: 1 }}>
            <Text style={s.title} numberOfLines={1}>{ev.title}</Text>
            {ev.location ? <Text style={s.sub} numberOfLines={1}>{ev.location}</Text> : null}
          </View>
          <Text style={s.time}>
            {ev.allDay ? t('calendar.allDay') : formatTime(ev.start)}
          </Text>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    paddingVertical: 4,
    ...Shadow.small,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 10,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.07)',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  sub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  time: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontVariant: ['tabular-nums'],
    minWidth: 50,
    textAlign: 'right',
  },
  empty: {
    fontSize: 13,
    color: Colors.textSecondary,
    paddingHorizontal: 14,
    paddingVertical: 16,
    textAlign: 'center',
  },
});
