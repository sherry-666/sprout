import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { gql, useQuery } from '@apollo/client';
import { useTranslation } from 'react-i18next';
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

// Hue-based color palette matching the design system (proto-shared.jsx ClassGlyph)
function nameToHue(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h * 31 + s.charCodeAt(i)) >>> 0);
  return h % 360;
}

function glyphColors(hue: number) {
  return {
    bg: `hsl(${hue}, 55%, 87%)`,
    ink: `hsl(${hue}, 60%, 30%)`,
  };
}

// ── HomeScreen ─────────────────────────────────────────────────────────────

function greetingKey(): string {
  const h = new Date().getHours();
  if (h < 12) return 'home.greetingMorning';
  if (h < 17) return 'home.greetingAfternoon';
  return 'home.greetingEvening';
}

export default function ClassesScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
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
            {t(greetingKey())}{firstName ? `, ${firstName}` : ''}
          </Text>
        </View>

        <View style={s.quickLogCard}>
          <View style={s.qlRow}>
            <View style={s.qlMicCircle}>
              <Text style={{ fontSize: 18, color: Colors.white }}>🎙</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={s.qlTitle}>Quick Log</Text>
                <View style={s.aiBadge}>
                  <Text style={s.aiBadgeTxt}>✦ AI</Text>
                </View>
              </View>
              <Text style={s.qlSub}>{t('home.quickLogSub')}</Text>
            </View>
            <TouchableOpacity style={s.qlStartBtn} onPress={() => openSheet()} activeOpacity={0.85}>
              <Text style={s.qlStartBtnTxt}>{t('home.start')}</Text>
            </TouchableOpacity>
          </View>

          {/* Active job nudge */}
          {!!activeConversationId && (
            <TouchableOpacity style={s.qlNudge} onPress={openActiveConversation} activeOpacity={0.8}>
              <View style={s.nudgeDots}>
                {[0, 1, 2].map(i => (
                  <View key={i} style={[s.nudgeDot, { opacity: 0.7 }]} />
                ))}
              </View>
              <Text style={s.qlNudgeTxt}>{t('home.openChat')}</Text>
              <Text style={{ color: Colors.primary, fontSize: 16 }}>›</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Today's Schedule */}
        {/* TODO: Build calendar import feature — support importing from Google Calendar,
            Apple Calendar, and other calendar apps so educators can see their schedule here. */}
        <View style={s.sectionRow}>
          <Text style={s.sectionEyebrow}>{t('home.todaySchedule').toUpperCase()}</Text>
        </View>
        <View style={s.scheduleCard}>
          <Text style={s.schedulePlaceholder}>
            {t('home.calendarSoon')}{'\n'}{t('home.calendarImport')}
          </Text>
        </View>

        {/* My Classes */}
        <View style={[s.sectionRow, { marginTop: 22 }]}>
          <Text style={s.sectionEyebrow}>{t('home.myClasses').toUpperCase()} · {classes.length}</Text>
        </View>

        {loading && classes.length === 0 ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} />
        ) : classes.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyTxt}>{t('classes.noClasses')}</Text>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            {classes.map(cls => {
              const hue = nameToHue(cls.name);
              const { bg, ink } = glyphColors(hue);
              const kidCount = cls.kids?.length ?? 0;
              return (
                <TouchableOpacity
                  key={cls.id}
                  style={s.classRow}
                  onPress={() =>
                    navigation.navigate('Roster', { classId: cls.id, className: cls.name })
                  }
                  activeOpacity={0.8}
                >
                  <View style={[s.classGlyph, { backgroundColor: bg }]}>
                    <Text style={[s.classGlyphTxt, { color: ink }]}>
                      {cls.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.className}>{cls.name}</Text>
                  </View>
                  <View style={s.kidCountPill}>
                    <Text style={s.kidCountNum}>
                      {t('classes.kids', { count: kidCount })}
                    </Text>
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
  root: { flex: 1, backgroundColor: '#f6f4ec' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },

  // Header
  header: { paddingTop: 16, paddingBottom: 4 },
  eyebrow: {
    fontSize: 11, fontWeight: '600', letterSpacing: 1.2,
    textTransform: 'uppercase', color: 'rgba(60,60,67,0.55)',
  },
  title: {
    fontSize: 30, fontWeight: '600', letterSpacing: -0.6,
    color: '#1d2a22', marginTop: 4,
  },

  quickLogCard: {
    backgroundColor: 'rgba(61,130,88,0.09)',
    borderRadius: 16, padding: 16,
    marginTop: 20,
    borderWidth: 1, borderColor: 'rgba(61,130,88,0.15)',
  },
  qlRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  qlMicCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  qlTitle: { fontSize: 15, fontWeight: '600', color: '#1d2a22' },
  qlSub: { fontSize: 12, color: 'rgba(60,60,67,0.6)', marginTop: 2 },
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
  nudgeDots: { flexDirection: 'row', gap: 3, alignItems: 'center' },
  nudgeDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.primary },
  qlNudgeTxt: { flex: 1, fontSize: 12, color: Colors.primary, fontWeight: '600' },

  // AI Badge
  aiBadge: {
    backgroundColor: 'rgba(61,130,88,0.12)',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
  },
  aiBadgeTxt: { fontSize: 10, fontWeight: '600', color: Colors.primary, letterSpacing: 0.3 },

  // Section headers
  sectionRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 8, marginTop: 22 },
  sectionEyebrow: {
    fontSize: 11, fontWeight: '600', letterSpacing: 1.2,
    textTransform: 'uppercase', color: 'rgba(60,60,67,0.55)',
  },

  // Schedule card (placeholder)
  scheduleCard: {
    backgroundColor: Colors.card,
    borderRadius: 16, padding: 28,
    alignItems: 'center',
    shadowColor: '#1a2820',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 2,
  },
  schedulePlaceholder: {
    fontSize: 13, color: 'rgba(60,60,67,0.55)',
    textAlign: 'center', lineHeight: 20,
  },

  // Class rows
  classRow: {
    backgroundColor: Colors.card,
    borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    shadowColor: '#1a2820',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 2,
  },
  classGlyph: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  classGlyphTxt: { fontSize: 18, fontWeight: '700', letterSpacing: -0.4 },
  className: { fontSize: 15, fontWeight: '600', color: '#1d2a22' },
  kidCountPill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f6f4ec',
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4,
  },
  kidCountNum: { fontSize: 12, fontWeight: '600', color: Colors.primary },
  kidCountLabel: { fontSize: 12, color: 'rgba(60,60,67,0.55)' },
  chevron: { fontSize: 18, color: 'rgba(60,60,67,0.4)' },

  empty: { alignItems: 'center', paddingVertical: 32 },
  emptyTxt: { fontSize: 14, color: 'rgba(60,60,67,0.55)' },
});
