import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { gql, useQuery } from '@apollo/client';
import { Colors, Shadow } from '../../theme';
import { useQuickLog } from '../../contexts/QuickLogContext';
import ComposeSheet from './ComposeSheet';

// ── GraphQL ────────────────────────────────────────────────────────────────

const HOME_QUERY = gql`
  query HomeScreen {
    me {
      id
      profile { firstName }
      classes { id name kids { id } }
    }
  }
`;

// ── Helpers ────────────────────────────────────────────────────────────────

function todayLabel(): string {
  const d = new Date();
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[d.getDay()]} · ${d.getDate()} ${months[d.getMonth()]}`;
}

function greetingPrefix(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// Deterministic color palette derived from class name
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

function classPalette(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h * 31 + name.charCodeAt(i)) >>> 0);
  return CLASS_PALETTES[h % CLASS_PALETTES.length];
}

// ── Shared primitives ──────────────────────────────────────────────────────

function WorkingDots({ color }: { color: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 3, alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <View
          key={i}
          style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: color, opacity: 0.6 }}
        />
      ))}
    </View>
  );
}

// ── HomeScreen ─────────────────────────────────────────────────────────────

export default function ClassesScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { data, loading, refetch } = useQuery(HOME_QUERY, { fetchPolicy: 'cache-and-network' });
  const { activeConversationId, setActiveConversationId } = useQuickLog();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetClassId, setSheetClassId] = useState<string | null>(null);

  const me = data?.me;
  const firstName = me?.profile?.firstName ?? '';
  const classes: Array<{ id: string; name: string; kids: Array<{ id: string }> }> = me?.classes ?? [];

  const openSheet = (classId?: string | null) => {
    setSheetClassId(classId ?? null);
    setSheetOpen(true);
  };

  const handleSheetSent = (conversationId: string) => {
    setSheetOpen(false);
    setActiveConversationId(conversationId);
    navigation.getParent()?.navigate('Agents', {
      screen: 'Conversation',
      params: { conversationId },
    });
  };

  const openActiveConversation = () => {
    if (!activeConversationId) return;
    navigation.getParent()?.navigate('Agents', {
      screen: 'Conversation',
      params: { conversationId: activeConversationId },
    });
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refetch} tintColor={Colors.primary} />
        }
      >
        {/* Header */}
        <View style={s.header}>
          <Text style={s.eyebrow}>{todayLabel()}</Text>
          <Text style={s.title}>
            {greetingPrefix()}{firstName ? `, ${firstName}` : ''}
          </Text>
        </View>

        {/* Quick Log entry card */}
        <View style={s.quickLogCard}>
          <View style={s.qlRow}>
            <View style={s.qlMicCircle}>
              <Text style={{ fontSize: 18, color: Colors.white }}>🎙</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={s.qlTitle}>Quick Log</Text>
                <View style={s.aiBadge}>
                  <Text style={s.aiBadgeTxt}>✨ AI</Text>
                </View>
              </View>
              <Text style={s.qlSub}>Speak, snap, send to families</Text>
            </View>
            <TouchableOpacity style={s.qlStartBtn} onPress={() => openSheet()} activeOpacity={0.85}>
              <Text style={s.qlStartBtnTxt}>Start</Text>
            </TouchableOpacity>
          </View>

          {/* Active job nudge */}
          {!!activeConversationId && (
            <TouchableOpacity style={s.qlNudge} onPress={openActiveConversation} activeOpacity={0.8}>
              <WorkingDots color={Colors.primary} />
              <Text style={s.qlNudgeTxt}>Today's Quick Log — open chat</Text>
              <Text style={{ color: Colors.primary, fontSize: 18 }}>›</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Today's Schedule */}
        {/* TODO: Build calendar import feature — support importing from Google Calendar,
            Apple Calendar, and other calendar apps so educators can see their schedule here. */}
        <View style={s.sectionRow}>
          <Text style={s.sectionEyebrow}>TODAY'S SCHEDULE</Text>
        </View>
        <View style={s.scheduleCard}>
          <Text style={s.schedulePlaceholder}>
            Calendar coming soon{'\n'}Import from your calendar app
          </Text>
        </View>

        {/* My Classes */}
        <View style={[s.sectionRow, { marginTop: 22 }]}>
          <Text style={s.sectionEyebrow}>MY CLASSES · {classes.length}</Text>
        </View>

        {loading && classes.length === 0 ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} />
        ) : classes.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyTxt}>No classes yet</Text>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            {classes.map(cls => {
              const palette = classPalette(cls.name);
              return (
                <TouchableOpacity
                  key={cls.id}
                  style={s.classRow}
                  onPress={() =>
                    navigation.navigate('Roster', { classId: cls.id, className: cls.name })
                  }
                  activeOpacity={0.8}
                >
                  <View style={[s.classGlyph, { backgroundColor: palette.bg }]}>
                    <Text style={[s.classGlyphTxt, { color: palette.ink }]}>
                      {cls.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.className}>{cls.name}</Text>
                    {/* TODO: Add ageGroup field to class schema */}
                  </View>
                  <View style={s.kidCountPill}>
                    <Text style={s.kidCountNum}>{cls.kids?.length ?? 0}</Text>
                    <Text style={s.kidCountLabel}> kids</Text>
                  </View>
                  <Text style={s.chevron}>›</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      <ComposeSheet
        visible={sheetOpen}
        initialClassId={sheetClassId}
        onClose={() => setSheetOpen(false)}
        onSent={handleSheetSent}
      />
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f5f6f0' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },

  // Header
  header: { paddingTop: 16, paddingBottom: 4 },
  eyebrow: {
    fontSize: 11, fontWeight: '600', letterSpacing: 1.2,
    textTransform: 'uppercase', color: Colors.textSecondary,
  },
  title: {
    fontSize: 28, fontWeight: '600', letterSpacing: -0.5,
    color: Colors.textPrimary, marginTop: 4,
  },

  // Quick Log card
  quickLogCard: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 16, padding: 16,
    marginTop: 20,
    borderWidth: 1, borderColor: 'rgba(79,70,229,0.15)',
  },
  qlRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  qlMicCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  qlTitle: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  qlSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  qlStartBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
  },
  qlStartBtnTxt: { color: Colors.white, fontSize: 13, fontWeight: '600' },
  qlNudge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 12, padding: 10,
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderRadius: 10,
  },
  qlNudgeTxt: { flex: 1, fontSize: 12, color: Colors.primary, fontWeight: '600' },

  // AI Badge
  aiBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
  },
  aiBadgeTxt: { fontSize: 10, fontWeight: '600', color: Colors.primary },

  // Section headers
  sectionRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 8, marginTop: 22 },
  sectionEyebrow: {
    fontSize: 11, fontWeight: '600', letterSpacing: 1.2,
    textTransform: 'uppercase', color: Colors.textSecondary,
  },

  // Schedule card (placeholder)
  scheduleCard: {
    backgroundColor: Colors.card,
    borderRadius: 14, padding: 28,
    alignItems: 'center',
    ...Shadow.small,
  },
  schedulePlaceholder: {
    fontSize: 13, color: Colors.textSecondary,
    textAlign: 'center', lineHeight: 20,
  },

  // Class rows
  classRow: {
    backgroundColor: Colors.card,
    borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    ...Shadow.small,
  },
  classGlyph: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  classGlyphTxt: { fontSize: 18, fontWeight: '700' },
  className: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  kidCountPill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.bg,
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4,
  },
  kidCountNum: { fontSize: 12, fontWeight: '600', color: Colors.primary },
  kidCountLabel: { fontSize: 12, color: Colors.textSecondary },
  chevron: { fontSize: 18, color: Colors.textSecondary },

  empty: { alignItems: 'center', paddingVertical: 32 },
  emptyTxt: { fontSize: 14, color: Colors.textSecondary },
});
