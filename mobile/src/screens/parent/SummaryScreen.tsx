import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { gql, useQuery } from '@apollo/client';
import { Colors, Spacing, Radius, Shadow } from '../../theme';

const DAILY_SUMMARY_QUERY = gql`
  query DailySummary($kidId: ID!, $date: Date!) {
    kid(id: $kidId) {
      id
      firstName
      dailySummary(date: $date) {
        id
        content
        aiGeneratedContent
        timestamp
      }
    }
  }
`;

function toDateString(d: Date): string {
  return d.toISOString().split('T')[0];
}

export default function SummaryScreen({ route }: any) {
  const { kidId, kidName } = route.params;
  const [date, setDate] = useState(new Date());

  const dateStr = toDateString(date);
  const { data, loading } = useQuery(DAILY_SUMMARY_QUERY, {
    variables: { kidId, date: dateStr },
    fetchPolicy: 'cache-and-network',
  });

  const kid = data?.kid;
  const summary = kid?.dailySummary;
  const displayContent = summary?.aiGeneratedContent || summary?.content;

  const goToPrev = () => {
    const d = new Date(date);
    d.setDate(d.getDate() - 1);
    setDate(d);
  };

  const goToNext = () => {
    const d = new Date(date);
    d.setDate(d.getDate() + 1);
    if (d <= new Date()) setDate(d);
  };

  const isToday = toDateString(date) === toDateString(new Date());

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Date navigator */}
      <View style={styles.dateNav}>
        <TouchableOpacity onPress={goToPrev} style={styles.dateArrow}>
          <Text style={styles.dateArrowText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.dateLabelWrap}>
          <Text style={styles.dateLabel}>
            {isToday ? 'Today' : date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
          <Text style={styles.dateSub}>{date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })}</Text>
        </View>
        <TouchableOpacity onPress={goToNext} style={[styles.dateArrow, isToday && styles.dateArrowDisabled]} disabled={isToday}>
          <Text style={[styles.dateArrowText, isToday && styles.dateArrowTextDisabled]}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Summary card */}
      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
      ) : !displayContent ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyText}>No activities logged for {kidName} on this day.</Text>
          <Text style={styles.emptySubtext}>A summary will be generated automatically once educators log activities.</Text>
        </View>
      ) : (
        <>
          <View style={styles.aiHeader}>
            <Text style={styles.aiHeaderIcon}>✨</Text>
            <View>
              <Text style={styles.aiHeaderTitle}>AI Daily Summary</Text>
              <Text style={styles.aiHeaderSub}>Generated for {kidName}</Text>
            </View>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryText}>{displayContent}</Text>
          </View>

          {summary?.timestamp && (
            <Text style={styles.generatedAt}>
              Generated at {new Date(summary.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.lg, paddingBottom: 40 },
  dateNav: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.lg,
    ...Shadow.small,
  },
  dateArrow: { padding: Spacing.sm },
  dateArrowDisabled: { opacity: 0.3 },
  dateArrowText: { fontSize: 28, color: Colors.primary, fontWeight: '300' },
  dateArrowTextDisabled: { color: Colors.textSecondary },
  dateLabelWrap: { flex: 1, alignItems: 'center' },
  dateLabel: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  dateSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  aiHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginBottom: Spacing.md,
  },
  aiHeaderIcon: { fontSize: 36 },
  aiHeaderTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  aiHeaderSub: { fontSize: 13, color: Colors.textSecondary },
  summaryCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderLeftWidth: 4, borderLeftColor: Colors.primary,
    ...Shadow.medium,
  },
  summaryText: {
    fontSize: 15, color: Colors.textPrimary,
    lineHeight: 26,
  },
  generatedAt: {
    fontSize: 12, color: Colors.textSecondary,
    textAlign: 'center', marginTop: Spacing.md,
  },
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 40 },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.md },
  emptyText: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary, textAlign: 'center' },
  emptySubtext: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 20 },
});
