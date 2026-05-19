import React, { useLayoutEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { gql, useQuery, useMutation } from '@apollo/client';
import { Colors, Spacing, Radius, Shadow } from '../../theme';

const MY_CONVERSATIONS = gql`
  query MyConversations {
    myConversations(limit: 50) {
      id
      agentType
      status
      title
      updatedAt
    }
  }
`;

const CREATE_CHAT = gql`
  mutation CreateChatConversation {
    createChatConversation { id }
  }
`;

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pending:          { label: 'Working…',  color: Colors.primary,       bg: Colors.primaryLight },
  processing:       { label: 'Working…',  color: Colors.primary,       bg: Colors.primaryLight },
  awaiting_review:  { label: 'Review',    color: Colors.warning,       bg: Colors.warningLight },
  sent:             { label: 'Sent',      color: Colors.success,       bg: Colors.successLight },
  failed:           { label: 'Failed',    color: Colors.danger,        bg: Colors.dangerLight },
};

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function AgentsListScreen({ navigation }: any) {
  const { data, loading, refetch } = useQuery(MY_CONVERSATIONS, {
    fetchPolicy: 'cache-and-network',
    pollInterval: 5000,
  });
  const [createChat, { loading: creating }] = useMutation(CREATE_CHAT);

  const conversations = data?.myConversations ?? [];

  const handleNewChat = async () => {
    try {
      const { data: d } = await createChat();
      const id = d?.createChatConversation?.id;
      if (id) navigation.navigate('Conversation', { conversationId: id });
    } catch {}
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          style={s.newBtn}
          onPress={handleNewChat}
          disabled={creating}
          activeOpacity={0.75}
        >
          {creating
            ? <ActivityIndicator size="small" color={Colors.primary} />
            : <Text style={s.newBtnTxt}>+ New Chat</Text>}
        </TouchableOpacity>
      ),
    });
  }, [navigation, creating]);

  return (
    <View style={s.root}>
      {loading && conversations.length === 0 ? (
        <ActivityIndicator style={{ marginTop: 60 }} size="large" color={Colors.primary} />
      ) : conversations.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyIcon}>🤖</Text>
          <Text style={s.emptyTitle}>No chats yet</Text>
          <Text style={s.emptyHint}>
            Tap "+ New Chat" to start a conversation with the AI assistant,
            or use Quick Log to draft parent updates.
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(c: any) => c.id}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={Colors.primary} />}
          renderItem={({ item }: any) => {
            const meta = STATUS_META[item.status];
            return (
              <TouchableOpacity
                style={s.card}
                onPress={() => navigation.navigate('Conversation', { conversationId: item.id })}
                activeOpacity={0.8}
              >
                <View style={s.cardHead}>
                  <Text style={s.cardTitle} numberOfLines={1}>{item.title || 'Chat'}</Text>
                  {meta && (
                    <View style={[s.badge, { backgroundColor: meta.bg }]}>
                      <Text style={[s.badgeTxt, { color: meta.color }]}>{meta.label}</Text>
                    </View>
                  )}
                </View>
                <Text style={s.cardMeta}>{timeAgo(item.updatedAt)}</Text>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  newBtn: { paddingHorizontal: Spacing.sm, paddingVertical: 6 },
  newBtnTxt: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  list: { padding: Spacing.md, paddingTop: Spacing.lg },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadow.small,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  cardTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, flex: 1 },
  cardMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 6 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  badgeTxt: { fontSize: 11, fontWeight: '700' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.md },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: Colors.textPrimary },
  emptyHint: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 20 },
});
