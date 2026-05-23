import React, { useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { gql, useQuery, useMutation } from '@apollo/client';
import { Colors, Spacing, Radius, Shadow } from '../../theme';
import { useQuickLog } from '../../contexts/QuickLogContext';

// ── GraphQL ────────────────────────────────────────────────────────────────

const MY_CONVERSATIONS = gql`
  query MyConversationsAI {
    myConversations(limit: 50) {
      id
      agentType
      status
      title
      updatedAt
    }
  }
`;

const DELETE_CONVERSATION = gql`
  mutation DeleteConversationAI($conversationId: ID!) {
    deleteConversation(conversationId: $conversationId)
  }
`;

// ── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'Yesterday';
  return `${d}d ago`;
}

function phaseLabel(status: string): string {
  const map: Record<string, string> = {
    pending: 'Scanning photos…',
    processing: 'Scanning photos…',
    awaiting_photo_review: 'Review photo matching',
    awaiting_review: 'Drafts ready · review',
    sent: 'Sent',
    failed: 'Failed',
  };
  return map[status] ?? 'Working…';
}

function isActiveStatus(status: string): boolean {
  return status === 'pending' || status === 'processing' ||
    status === 'awaiting_photo_review' || status === 'awaiting_review';
}

// Deterministic palette for class glyphs
const CLASS_PALETTES = [
  { bg: '#fef3c7', ink: '#92400e' },
  { bg: '#dcfce7', ink: '#166534' },
  { bg: '#dbeafe', ink: '#1e40af' },
  { bg: '#fce7f3', ink: '#9d174d' },
  { bg: '#f3e8ff', ink: '#6b21a8' },
  { bg: '#ffedd5', ink: '#c2410c' },
  { bg: '#e0f2fe', ink: '#075985' },
  { bg: '#fdf4ff', ink: '#86198f' },
];

function titlePalette(title: string) {
  let h = 0;
  for (let i = 0; i < title.length; i++) h = ((h * 31 + title.charCodeAt(i)) >>> 0);
  return CLASS_PALETTES[h % CLASS_PALETTES.length];
}

// ── Screen ─────────────────────────────────────────────────────────────────

export default function AgentsListScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { activeConversationId } = useQuickLog();
  const { data, loading, refetch } = useQuery(MY_CONVERSATIONS, {
    fetchPolicy: 'cache-and-network',
    pollInterval: 5000,
  });
  const [deleteConversation] = useMutation(DELETE_CONVERSATION, {
    refetchQueries: [{ query: MY_CONVERSATIONS }],
  });

  const conversations: any[] = data?.myConversations ?? [];

  // Split into active (pinned) and history
  const active = conversations.find(
    c => c.id === activeConversationId && isActiveStatus(c.status),
  );
  const history = conversations.filter(
    c => !active || c.id !== active.id,
  );

  const openConversation = (id: string) => {
    navigation.navigate('Conversation', { conversationId: id });
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.eyebrow}>CONVERSATIONS</Text>
        <Text style={s.title}>AI</Text>
      </View>

      <FlatList
        data={history}
        keyExtractor={c => c.id}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading && !data} onRefresh={refetch} tintColor={Colors.primary} />
        }
        ListHeaderComponent={
          <>
            {/* In-progress card */}
            {active && (
              <View style={s.inProgressSection}>
                <Text style={s.sectionEyebrow}>IN PROGRESS</Text>
                <TouchableOpacity
                  onPress={() => openConversation(active.id)}
                  activeOpacity={0.85}
                >
                  <View style={s.activeCard}>
                    <View style={s.activeCardTop}>
                      <View style={s.sparkleAvatar}>
                        <Text style={{ fontSize: 16, color: Colors.white }}>✨</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={s.activeTitle}>Today's Quick Log</Text>
                          <View style={s.aiBadge}>
                            <Text style={s.aiBadgeTxt}>✨ AI</Text>
                          </View>
                        </View>
                        <Text style={s.activeSub}>{active.title ?? 'Quick Log'}</Text>
                      </View>
                      {isActiveStatus(active.status) && (
                        <WorkingDots color={Colors.primary} />
                      )}
                    </View>
                    <View style={s.activeStatus}>
                      <Text style={s.activeStatusTxt}>{phaseLabel(active.status)}</Text>
                      <Text style={{ color: Colors.primary, fontSize: 16 }}>›</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* History heading */}
            {history.length > 0 && (
              <Text style={[s.sectionEyebrow, { marginBottom: 8 }]}>EARLIER</Text>
            )}
          </>
        }
        ListEmptyComponent={
          !active ? (
            <View style={s.emptyState}>
              <Text style={s.emptyIcon}>✨</Text>
              <Text style={s.emptyTxt}>
                No conversations yet.{'\n'}Start a Quick Log from Home to begin.
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const p = titlePalette(item.title ?? item.id);
          return (
            <HistoryRow
              item={item}
              palette={p}
              onPress={() => openConversation(item.id)}
              onDelete={() => deleteConversation({ variables: { conversationId: item.id } })}
            />
          );
        }}
      />
    </View>
  );
}

// ── HistoryRow (swipeable) ─────────────────────────────────────────────────

function HistoryRow({
  item, palette, onPress, onDelete,
}: {
  item: any;
  palette: { bg: string; ink: string };
  onPress: () => void;
  onDelete: () => void;
}) {
  const swipeX = useRef(new Animated.Value(0)).current;
  const [swiped, setSwiped] = React.useState(false);

  return (
    <View style={s.historyWrap}>
      <TouchableOpacity style={s.historyRow} onPress={onPress} activeOpacity={0.8}>
        <View style={[s.historyGlyph, { backgroundColor: palette.bg }]}>
          <Text style={[s.historyGlyphTxt, { color: palette.ink }]}>
            {(item.title ?? 'Q').charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.historyTitle} numberOfLines={1}>{item.title ?? 'Quick Log'}</Text>
          <Text style={s.historySub}>{phaseLabel(item.status)}</Text>
        </View>
        <Text style={s.historyTime}>{timeAgo(item.updatedAt)}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── WorkingDots ─────────────────────────────────────────────────────────────

function WorkingDots({ color }: { color: string }) {
  const dot0 = useRef(new Animated.Value(0.25)).current;
  const dot1 = useRef(new Animated.Value(0.25)).current;
  const dot2 = useRef(new Animated.Value(0.25)).current;

  React.useEffect(() => {
    const make = (dot: Animated.Value, delay: number) =>
      Animated.loop(Animated.sequence([
        Animated.delay(delay),
        Animated.timing(dot, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(dot, { toValue: 0.25, duration: 400, useNativeDriver: true }),
        Animated.delay(Math.max(0, 600 - delay)),
      ]));
    const a0 = make(dot0, 0); const a1 = make(dot1, 200); const a2 = make(dot2, 400);
    a0.start(); a1.start(); a2.start();
    return () => { a0.stop(); a1.stop(); a2.stop(); };
  }, []);

  return (
    <View style={{ flexDirection: 'row', gap: 3, alignItems: 'center' }}>
      {[dot0, dot1, dot2].map((dot, i) => (
        <Animated.View
          key={i}
          style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: color, opacity: dot }}
        />
      ))}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f5f6f0' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 },
  eyebrow: {
    fontSize: 11, fontWeight: '600', letterSpacing: 1.2,
    textTransform: 'uppercase', color: Colors.textSecondary,
  },
  title: {
    fontSize: 30, fontWeight: '600', letterSpacing: -0.6,
    color: Colors.textPrimary, marginTop: 4, marginBottom: 16,
  },

  list: { paddingHorizontal: 20, paddingBottom: 40 },

  // Section
  sectionEyebrow: {
    fontSize: 11, fontWeight: '600', letterSpacing: 1.2,
    textTransform: 'uppercase', color: Colors.textSecondary,
    marginBottom: 8,
  },
  inProgressSection: { marginBottom: 22 },

  // Active card
  activeCard: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 16, padding: 16,
    borderWidth: 1.5, borderColor: 'rgba(79,70,229,0.2)',
  },
  activeCardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  sparkleAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  activeTitle: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  activeSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  activeStatus: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
  },
  activeStatusTxt: { fontSize: 13, fontWeight: '600', color: Colors.primary },

  // AI badge
  aiBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
  },
  aiBadgeTxt: { fontSize: 10, fontWeight: '600', color: Colors.primary },

  // History rows
  historyWrap: { marginBottom: 8 },
  historyRow: {
    backgroundColor: Colors.card,
    borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    ...Shadow.small,
  },
  historyGlyph: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  historyGlyphTxt: { fontSize: 15, fontWeight: '700' },
  historyTitle: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  historySub: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  historyTime: { fontSize: 11, color: Colors.textSecondary },

  // Empty state
  emptyState: { paddingVertical: 60, alignItems: 'center' },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTxt: {
    fontSize: 14, color: Colors.textSecondary,
    textAlign: 'center', lineHeight: 22,
  },
});
