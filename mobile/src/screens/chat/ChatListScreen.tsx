import React from 'react';
import {
  View, Text, FlatList, StyleSheet, Image, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { gql, useQuery } from '@apollo/client';
import { Colors, Spacing, Radius, Shadow } from '../../theme';

const MY_KID_THREADS = gql`
  query MyKidThreads {
    myKidThreads {
      id
      name
      avatarUrl
      lastMessage
      lastMessageAt
      lastSenderName
    }
  }
`;

function timeAgo(iso: string | null): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function ChatListScreen({ navigation }: any) {
  const { data, loading } = useQuery(MY_KID_THREADS, {
    fetchPolicy: 'cache-and-network',
  });

  const threads = data?.myKidThreads ?? [];

  if (loading && threads.length === 0) {
    return (
      <View style={s.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (threads.length === 0) {
    return (
      <View style={s.empty}>
        <Text style={s.emptyTitle}>No children yet</Text>
        <Text style={s.emptySub}>Children in your classes will appear here.</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={s.list}
      data={threads}
      keyExtractor={(item: any) => item.id}
      ItemSeparatorComponent={() => <View style={s.sep} />}
      renderItem={({ item }: any) => (
        <TouchableOpacity
          style={s.row}
          onPress={() => navigation.navigate('KidChat', { kidId: item.id, kidName: item.name })}
          activeOpacity={0.7}
        >
          {item.avatarUrl
            ? <Image source={{ uri: item.avatarUrl }} style={s.avatar} />
            : <View style={[s.avatar, s.avatarFallback]}>
                <Text style={s.avatarTxt}>{item.name?.[0] ?? '?'}</Text>
              </View>}
          <View style={s.rowBody}>
            <View style={s.rowTop}>
              <Text style={s.name}>{item.name}</Text>
              {item.lastMessageAt && (
                <Text style={s.time}>{timeAgo(item.lastMessageAt)}</Text>
              )}
            </View>
            {item.lastMessage ? (
              <Text style={s.preview} numberOfLines={1}>
                {item.lastSenderName ? `${item.lastSenderName}: ` : ''}{item.lastMessage}
              </Text>
            ) : (
              <Text style={s.noMsg}>No messages yet</Text>
            )}
          </View>
        </TouchableOpacity>
      )}
    />
  );
}

const s = StyleSheet.create({
  list: { flex: 1, backgroundColor: Colors.bg },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg, padding: Spacing.lg },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
  emptySub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },

  sep: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.border, marginLeft: 76 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: 12,
    backgroundColor: Colors.card,
    gap: Spacing.sm,
  },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarFallback: { backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { fontSize: 18, fontWeight: '700', color: Colors.primary },
  rowBody: { flex: 1 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  name: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  time: { fontSize: 12, color: Colors.textSecondary },
  preview: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  noMsg: { fontSize: 13, color: Colors.border, marginTop: 2, fontStyle: 'italic' },
});
