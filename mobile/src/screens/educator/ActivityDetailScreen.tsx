import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Dimensions, ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { gql, useQuery } from '@apollo/client';
import { Colors, Radius, Spacing } from '../../theme';

const UPDATE_BY_ID_QUERY = gql`
  query ActivityById($id: ID!) {
    update(id: $id) {
      id
      type
      content
      aiGeneratedContent
      mediaUrls
      timestamp
      kid { id firstName lastName }
      educator { profile { firstName lastName } }
    }
  }
`;

const { width: SCREEN_W } = Dimensions.get('window');

// Share buttons are UI-only; platform SDK integration is TODO
const SHARE_OPTIONS = [
  { id: 'facebook',  label: 'Facebook',   color: '#1877F2', bg: '#E7F0FD', icon: 'f' },
  { id: 'twitter',   label: 'X (Twitter)', color: '#000000', bg: '#F0F0F0', icon: 'X' },
  { id: 'whatsapp',  label: 'WhatsApp',   color: '#25D366', bg: '#E6FAF0', icon: '✓' },
  { id: 'wechat',    label: 'WeChat',     color: '#09B83E', bg: '#E8FAE8', icon: '◎' },
];

const TYPE_META: Record<string, { emoji: string; label: string; color: string }> = {
  meal:          { emoji: '🍎', label: 'Meal',     color: '#10b981' },
  nap:           { emoji: '💤', label: 'Nap',      color: '#6366f1' },
  activity:      { emoji: '🎨', label: 'Activity', color: '#f59e0b' },
  photo:         { emoji: '📷', label: 'Photo',    color: '#ec4899' },
  daily_summary: { emoji: '✨', label: 'Summary',  color: Colors.primary },
};

function formatDateTime(ts: string): string {
  const d = new Date(ts);
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${date} at ${time}`;
}

export default function ActivityDetailScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  // Two entry modes: pass a full `update` object (from kid feed) OR pass
  // `updateId` (from chat activity card) and we fetch by id.
  const passedUpdate = route.params?.update;
  const updateId = route.params?.updateId ?? passedUpdate?.id;
  const passedKidName: string | undefined = route.params?.kidName;

  const { data, loading } = useQuery(UPDATE_BY_ID_QUERY, {
    variables: { id: updateId },
    skip: !!passedUpdate || !updateId,
    fetchPolicy: 'cache-and-network',
  });

  const update = passedUpdate ?? data?.update;

  if (!update) {
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <View style={s.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            style={s.backBtn}
          >
            <Text style={s.backBtnTxt}>‹</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>Activity</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          {loading
            ? <ActivityIndicator color={Colors.primary} />
            : <Text style={{ color: Colors.textSecondary }}>Activity not found.</Text>}
        </View>
      </View>
    );
  }

  const kidName = passedKidName ?? update.kid?.firstName;
  const displayContent = update.aiGeneratedContent || update.content;
  const isAI = !!update.aiGeneratedContent && update.aiGeneratedContent !== update.content;
  const meta = TYPE_META[update.type] ?? TYPE_META.activity;
  const educator = update.educator?.profile;
  const mediaUrls: string[] = update.mediaUrls ?? [];

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          style={s.backBtn}
        >
          <Text style={s.backBtnTxt}>‹</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>
          {kidName ? `${kidName}'s Update` : 'Activity'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        {/* Photos — horizontally paginated */}
        {mediaUrls.length > 0 && (
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={s.photoScroll}
          >
            {mediaUrls.map((url, i) => (
              <Image
                key={i}
                source={{ uri: url }}
                style={{ width: SCREEN_W, height: 280 }}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
            ))}
          </ScrollView>
        )}

        <View style={s.content}>
          {/* Type + AI badge */}
          <View style={s.metaRow}>
            <View style={[s.typeBadge, { backgroundColor: meta.color + '20' }]}>
              <Text style={s.typeBadgeEmoji}>{meta.emoji}</Text>
              <Text style={[s.typeBadgeLabel, { color: meta.color }]}>{meta.label}</Text>
            </View>
            {isAI && (
              <View style={s.aiChip}>
                <Text style={s.aiChipTxt}>✨ AI enhanced</Text>
              </View>
            )}
          </View>

          <Text style={s.timestamp}>{formatDateTime(update.timestamp)}</Text>
          {educator && (
            <Text style={s.educator}>
              👩‍🏫 {educator.firstName} {educator.lastName}
            </Text>
          )}

          <Text style={s.updateText}>{displayContent}</Text>

          {/* Share *(TODO: wire platform SDKs)* */}
          <Text style={s.shareLabel}>SHARE</Text>
          <View style={s.shareGrid}>
            {SHARE_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.id}
                style={[s.shareBtn, { backgroundColor: opt.bg }]}
                activeOpacity={0.75}
                onPress={() => { /* TODO: platform-specific share */ }}
              >
                <Text style={[s.shareBtnIcon, { color: opt.color }]}>{opt.icon}</Text>
                <Text style={[s.shareBtnLabel, { color: opt.color }]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: Colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  backBtn: { padding: 4 },
  backBtnTxt: { fontSize: 28, color: Colors.primary, lineHeight: 28 },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '600', color: Colors.textPrimary },

  photoScroll: { backgroundColor: '#111' },
  body: { paddingBottom: 48 },
  content: { padding: Spacing.md },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  typeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4,
  },
  typeBadgeEmoji: { fontSize: 14 },
  typeBadgeLabel: { fontSize: 12, fontWeight: '700' },
  aiChip: {
    backgroundColor: 'rgba(79,70,229,0.08)',
    borderRadius: Radius.full,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  aiChipTxt: { fontSize: 11, color: Colors.primary, fontWeight: '500' },
  timestamp: { fontSize: 12, color: Colors.textSecondary, marginBottom: 2 },
  educator: { fontSize: 12, color: Colors.textSecondary, marginBottom: 16 },
  updateText: {
    fontSize: 16, color: Colors.textPrimary, lineHeight: 26, marginBottom: 28,
  },

  shareLabel: {
    fontSize: 11, fontWeight: '700', letterSpacing: 1.1,
    color: Colors.textSecondary, textTransform: 'uppercase', marginBottom: 12,
  },
  shareGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: Radius.md, paddingHorizontal: 16, paddingVertical: 12,
    minWidth: '44%', flex: 1,
  },
  shareBtnIcon: { fontSize: 15, fontWeight: '700', width: 18, textAlign: 'center' },
  shareBtnLabel: { fontSize: 13, fontWeight: '600' },
});
