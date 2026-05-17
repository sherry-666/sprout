import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  RefreshControl, TouchableOpacity,
} from 'react-native';
import { gql, useQuery } from '@apollo/client';
import { Colors, Spacing, Radius, Shadow } from '../../theme';

const KID_UPDATES_QUERY = gql`
  query KidUpdates($kidId: ID!, $first: Int, $after: String) {
    kid(id: $kidId) {
      id
      firstName
      lastName
      updates(first: $first, after: $after) {
        edges {
          cursor
          node {
            id
            type
            content
            aiGeneratedContent
            mediaUrls
            timestamp
            educator { profile { firstName lastName } }
          }
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
`;

const TYPE_META: Record<string, { emoji: string; label: string; color: string }> = {
  meal:          { emoji: '🍎', label: 'Meal',     color: '#10b981' },
  nap:           { emoji: '💤', label: 'Nap',      color: '#6366f1' },
  activity:      { emoji: '🎨', label: 'Activity', color: '#f59e0b' },
  photo:         { emoji: '📷', label: 'Photo',    color: '#ec4899' },
  daily_summary: { emoji: '✨', label: 'Summary',  color: Colors.primary },
};

function formatTime(ts: string) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(ts: string) {
  const d = new Date(ts);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  if (isToday) return 'Today';
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function KidDetailScreen({ route, navigation }: any) {
  const { kidId, kidName } = route.params;
  const [loadingMore, setLoadingMore] = useState(false);

  const { data, loading, refetch, fetchMore } = useQuery(KID_UPDATES_QUERY, {
    variables: { kidId, first: 20 },
    fetchPolicy: 'cache-and-network',
  });

  const kid = data?.kid;
  const edges = kid?.updates?.edges ?? [];
  const pageInfo = kid?.updates?.pageInfo;
  const updates = edges.map((e: any) => e.node);

  const handleLoadMore = useCallback(async () => {
    if (!pageInfo?.hasNextPage || loadingMore) return;
    setLoadingMore(true);
    await fetchMore({
      variables: { kidId, first: 20, after: pageInfo.endCursor },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) return prev;
        return {
          kid: {
            ...fetchMoreResult.kid,
            updates: {
              ...fetchMoreResult.kid.updates,
              edges: [
                ...(prev.kid?.updates?.edges ?? []),
                ...fetchMoreResult.kid.updates.edges,
              ],
            },
          },
        };
      },
    });
    setLoadingMore(false);
  }, [pageInfo, loadingMore, kidId]);

  return (
    <View style={styles.container}>
      {/* Summary button */}
      <TouchableOpacity
        style={styles.summaryBanner}
        onPress={() => navigation.navigate('Summary', { kidId, kidName })}
        activeOpacity={0.85}
      >
        <Text style={styles.summaryBannerText}>✨ View Today's AI Summary</Text>
        <Text style={styles.summaryBannerArrow}>›</Text>
      </TouchableOpacity>

      {loading && updates.length === 0 ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={Colors.primary} />
      ) : updates.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyText}>No updates yet today.</Text>
          <Text style={styles.emptySubtext}>Updates will appear here as educators log activities.</Text>
        </View>
      ) : (
        <FlatList
          data={updates}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={Colors.primary} />}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={Colors.primary} style={{ margin: 16 }} /> : null}
          renderItem={({ item }: any) => {
            const meta = TYPE_META[item.type] ?? TYPE_META.activity;
            const displayContent = item.aiGeneratedContent || item.content;
            const educator = item.educator?.profile;
            return (
              <View style={styles.updateCard}>
                <View style={styles.updateHeader}>
                  <View style={[styles.typeBadge, { backgroundColor: meta.color + '20' }]}>
                    <Text style={styles.typeEmoji}>{meta.emoji}</Text>
                    <Text style={[styles.typeLabel, { color: meta.color }]}>{meta.label}</Text>
                  </View>
                  <Text style={styles.timestamp}>{formatDate(item.timestamp)} · {formatTime(item.timestamp)}</Text>
                </View>
                <Text style={styles.updateContent}>{displayContent}</Text>
                {educator && (
                  <Text style={styles.educatorName}>
                    👩‍🏫 {educator.firstName} {educator.lastName}
                  </Text>
                )}
                {item.aiGeneratedContent && item.aiGeneratedContent !== item.content && (
                  <View style={styles.aiTag}>
                    <Text style={styles.aiTagText}>✨ AI enhanced</Text>
                  </View>
                )}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  summaryBanner: {
    backgroundColor: Colors.primary,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: 12,
    justifyContent: 'space-between',
  },
  summaryBannerText: { color: Colors.white, fontSize: 14, fontWeight: '600' },
  summaryBannerArrow: { color: Colors.white, fontSize: 22 },
  list: { padding: Spacing.md, paddingBottom: 40 },
  updateCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadow.small,
  },
  updateHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  typeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: Radius.full,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  typeEmoji: { fontSize: 14 },
  typeLabel: { fontSize: 12, fontWeight: '700' },
  timestamp: { fontSize: 12, color: Colors.textSecondary },
  updateContent: { fontSize: 15, color: Colors.textPrimary, lineHeight: 22 },
  educatorName: { fontSize: 12, color: Colors.textSecondary, marginTop: 8 },
  aiTag: {
    marginTop: 6, alignSelf: 'flex-start',
    backgroundColor: 'rgba(79,70,229,0.08)',
    borderRadius: Radius.full,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  aiTagText: { fontSize: 11, color: Colors.primary, fontWeight: '500' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.md },
  emptyText: { fontSize: 17, fontWeight: '600', color: Colors.textPrimary, textAlign: 'center' },
  emptySubtext: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: 6, lineHeight: 20 },
});
