import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { gql, useQuery } from '@apollo/client';
import { Colors } from '../../theme';

const MY_KID_THREADS = gql`
  query MyKidThreads {
    myKidThreads {
      id
      name
      avatarUrl
      lastMessage
      lastMessageAt
      lastSenderName
      parentNames
      className
      unreadCount
    }
  }
`;

// ── Helpers ────────────────────────────────────────────────────────────────

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

function formatTime(iso: string | null): string {
  if (!iso) return '';
  const now = new Date();
  const then = new Date(iso);
  const diffMs = now.getTime() - then.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) {
    return then.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) {
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][then.getDay()];
  }
  return `${then.getMonth() + 1}/${then.getDate()}`;
}

// ── Parent avatar stack ────────────────────────────────────────────────────

function ParentAvatarStack({ parentNames, size = 19, borderColor = '#f6f4ec' }: {
  parentNames: string[];
  size?: number;
  borderColor?: string;
}) {
  return (
    <View style={{ flexDirection: 'row' }}>
      {parentNames.slice(0, 3).map((name, i) => {
        const hue = nameToHue(name);
        const { bg, ink } = glyphColors(hue);
        return (
          <View
            key={i}
            style={{
              width: size, height: size, borderRadius: size / 2,
              backgroundColor: bg,
              borderWidth: 1.5, borderColor,
              alignItems: 'center', justifyContent: 'center',
              marginLeft: i > 0 ? -(size / 3) : 0,
              zIndex: 10 - i,
            }}
          >
            <Text style={{ color: ink, fontSize: size * 0.42, fontWeight: '700' }}>
              {name[0]?.toUpperCase()}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ── Kid avatar with stacked parent mini-avatars ────────────────────────────

function KidAvatarGroup({ kidName, parentNames }: { kidName: string; parentNames: string[] }) {
  const hue = nameToHue(kidName);
  const { bg, ink } = glyphColors(hue);
  const initials = kidName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <View style={s.avatarGroup}>
      <View style={[s.kidAvatar, { backgroundColor: bg }]}>
        <Text style={[s.kidAvatarTxt, { color: ink }]}>{initials}</Text>
      </View>
      {parentNames.length > 0 && (
        <View style={s.parentStack}>
          <ParentAvatarStack parentNames={parentNames} size={19} />
        </View>
      )}
    </View>
  );
}

// ── Thread row ─────────────────────────────────────────────────────────────

function ThreadRow({ item, onPress }: { item: any; onPress: () => void }) {
  const hasUnread = (item.unreadCount ?? 0) > 0;
  const parentCount = item.parentNames?.length ?? 0;

  return (
    <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={0.7}>
      <KidAvatarGroup kidName={item.name} parentNames={item.parentNames ?? []} />
      <View style={s.rowBody}>
        <View style={s.rowTop}>
          <Text style={s.kidName} numberOfLines={1}>
            {item.name}
            <Text style={s.parentCount}> · {parentCount} parent{parentCount === 1 ? '' : 's'}</Text>
          </Text>
          <Text style={[s.time, hasUnread && s.timeUnread]}>
            {formatTime(item.lastMessageAt)}
          </Text>
        </View>
        <View style={s.rowBottom}>
          {item.lastMessage ? (
            <Text style={[s.preview, hasUnread && s.previewBold]} numberOfLines={1}>
              {item.lastSenderName ? `${item.lastSenderName.split(' ')[0]}: ` : ''}
              {item.lastMessage}
            </Text>
          ) : (
            <Text style={s.noMsg}>No messages yet</Text>
          )}
          {hasUnread && (
            <View style={s.badge}>
              <Text style={s.badgeTxt}>{item.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Screen ─────────────────────────────────────────────────────────────────

export default function ChatListScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const { data, loading, refetch } = useQuery(MY_KID_THREADS, {
    fetchPolicy: 'cache-and-network',
    pollInterval: 10000,
  });

  const threads: any[] = data?.myKidThreads ?? [];
  const filtered = search
    ? threads.filter(t =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        (t.lastMessage ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (t.parentNames ?? []).some((n: string) => n.toLowerCase().includes(search.toLowerCase())),
      )
    : threads;

  const totalUnread = threads.reduce((sum, t) => sum + (t.unreadCount ?? 0), 0);

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        {totalUnread > 0 && (
          <Text style={s.eyebrow}>{totalUnread} NEW</Text>
        )}
        <Text style={s.title}>Chat</Text>
      </View>

      {/* Search bar */}
      <View style={s.searchWrap}>
        <View style={s.searchBar}>
          <Text style={s.searchIcon}>⌕</Text>
          <TextInput
            style={s.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search kids, parents, messages"
            placeholderTextColor="rgba(60,60,67,0.40)"
          />
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item: any) => item.id}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading && !data}
            onRefresh={refetch}
            tintColor={Colors.primary}
          />
        }
        ItemSeparatorComponent={() => <View style={s.sep} />}
        ListEmptyComponent={
          !loading ? (
            <View style={s.empty}>
              <Text style={s.emptyTxt}>
                No children yet{'\n'}Kids in your classes will appear here.
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }: any) => (
          <ThreadRow
            item={item}
            onPress={() =>
              navigation.navigate('KidChat', {
                kidId: item.id,
                kidName: item.name,
                parentNames: item.parentNames ?? [],
                className: item.className ?? '',
              })
            }
          />
        )}
      />
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f6f4ec' },

  // Header
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 },
  eyebrow: {
    fontSize: 11, fontWeight: '600', letterSpacing: 1.2,
    textTransform: 'uppercase', color: Colors.primary,
    marginBottom: 2,
  },
  title: {
    fontSize: 30, fontWeight: '600', letterSpacing: -0.6,
    color: '#1d2a22', marginTop: 2, marginBottom: 12,
  },

  // Search
  searchWrap: { paddingHorizontal: 16, paddingBottom: 12 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(60,60,67,0.08)',
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9,
  },
  searchIcon: { fontSize: 16, color: 'rgba(60,60,67,0.4)' },
  searchInput: { flex: 1, fontSize: 15, color: '#1d2a22', padding: 0 },

  // Thread row
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(60,60,67,0.1)', marginLeft: 80 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: '#f6f4ec', gap: 12,
  },

  // Kid avatar group
  avatarGroup: { width: 54, height: 58 },
  kidAvatar: {
    width: 50, height: 50, borderRadius: 25,
    alignItems: 'center', justifyContent: 'center',
  },
  kidAvatarTxt: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  parentStack: { position: 'absolute', bottom: 0, left: 4 },

  // Row content
  rowBody: { flex: 1, minWidth: 0 },
  rowTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'baseline', marginBottom: 3,
  },
  kidName: { fontSize: 15, fontWeight: '600', color: '#1d2a22', flex: 1, marginRight: 8 },
  parentCount: { fontSize: 13, fontWeight: '400', color: 'rgba(60,60,67,0.55)' },
  time: { fontSize: 12, color: 'rgba(60,60,67,0.5)', flexShrink: 0 },
  timeUnread: { color: Colors.primary, fontWeight: '600' },

  rowBottom: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  preview: { flex: 1, fontSize: 13, color: 'rgba(60,60,67,0.6)' },
  previewBold: { color: '#1d2a22', fontWeight: '500' },
  noMsg: { fontSize: 13, color: 'rgba(60,60,67,0.35)', fontStyle: 'italic' },

  // Unread badge
  badge: {
    minWidth: 20, height: 20, borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeTxt: { color: '#fff', fontSize: 11, fontWeight: '700' },

  // Empty
  empty: { paddingTop: 60, alignItems: 'center', paddingHorizontal: 32 },
  emptyTxt: {
    fontSize: 14, color: 'rgba(60,60,67,0.55)',
    textAlign: 'center', lineHeight: 22,
  },
});
