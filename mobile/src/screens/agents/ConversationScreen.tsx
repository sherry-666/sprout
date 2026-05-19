import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, Image, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { gql, useQuery, useMutation, useSubscription } from '@apollo/client';
import { Colors, Spacing, Radius, Shadow } from '../../theme';

const CONVERSATION_QUERY = gql`
  query Conversation($id: ID!) {
    conversation(id: $id) {
      id
      status
      agentType
      title
      messages {
        id
        role
        kind
        content
        payloadJson
        createdAt
      }
    }
  }
`;

const MESSAGE_ADDED_SUBSCRIPTION = gql`
  subscription MessageAdded($conversationId: ID!) {
    messageAdded(conversationId: $conversationId) {
      id
      conversationId
      role
      kind
      content
      payloadJson
      createdAt
    }
  }
`;

const UPDATE_DRAFT = gql`
  mutation UpdateDraftMessage($messageId: ID!, $content: String!) {
    updateDraftMessage(messageId: $messageId, content: $content) {
      id
      content
    }
  }
`;

const REMOVE_DRAFT = gql`
  mutation RemoveDraftMessage($messageId: ID!) {
    removeDraftMessage(messageId: $messageId)
  }
`;

const SEND_DRAFTS = gql`
  mutation SendConversationDrafts($conversationId: ID!) {
    sendConversationDrafts(conversationId: $conversationId) {
      id
      status
    }
  }
`;

const SEND_CHAT_MESSAGE = gql`
  mutation SendChatMessage($conversationId: ID!, $content: String!) {
    sendChatMessage(conversationId: $conversationId, content: $content) {
      id
      conversationId
      role
      kind
      content
      payloadJson
      createdAt
    }
  }
`;

interface Message {
  id: string;
  role: string;
  kind: string;
  content: string;
  payloadJson: string;
  createdAt: string;
}

interface DraftPayload {
  kid_id: string;
  kid_name: string;
  avatar_url: string | null;
  photo_keys: string[];
  photo_urls: string[];
}

export default function ConversationScreen({ route, navigation }: any) {
  const conversationId: string = route.params.conversationId;
  const [isTerminal, setIsTerminal] = useState(false);

  // Hide tab bar so keyboard avoidance works correctly (no tab bar offset)
  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ tabBarStyle: { display: 'none' } });
      return () => navigation.getParent()?.setOptions({ tabBarStyle: undefined });
    }, [navigation])
  );
  const [inputText, setInputText] = useState('');
  const inputRef = useRef<TextInput>(null);

  const { data, loading } = useQuery(CONVERSATION_QUERY, {
    variables: { id: conversationId },
    fetchPolicy: 'cache-and-network',
    pollInterval: isTerminal ? 0 : 3000,
  });

  const [updateDraft] = useMutation(UPDATE_DRAFT);
  const [removeDraft] = useMutation(REMOVE_DRAFT);
  const [sendDrafts, { loading: sending }] = useMutation(SEND_DRAFTS);
  const [sendChatMessage, { loading: sendingChat }] = useMutation(SEND_CHAT_MESSAGE);

  // Append new messages from the subscription
  const [streamed, setStreamed] = useState<Message[]>([]);
  useSubscription(MESSAGE_ADDED_SUBSCRIPTION, {
    variables: { conversationId },
    onData: ({ data: subData }) => {
      const m = subData?.data?.messageAdded;
      if (m) setStreamed(prev => prev.some(x => x.id === m.id) ? prev : [...prev, m]);
    },
  });

  // Merge initial query messages with streamed (de-duped)
  const initialMessages: Message[] = data?.conversation?.messages ?? [];
  const mergedById = new Map<string, Message>();
  initialMessages.forEach(m => mergedById.set(m.id, m));
  streamed.forEach(m => mergedById.set(m.id, m));
  const messages = [...mergedById.values()].sort((a, b) =>
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const status = data?.conversation?.status ?? 'pending';
  const agentType = data?.conversation?.agentType ?? 'chat';

  useEffect(() => {
    if (status === 'sent' || status === 'failed') setIsTerminal(true);
  }, [status]);

  const drafts = messages.filter(m => m.kind === 'draft_card');
  const canSend = status === 'awaiting_review' && drafts.length > 0;
  const showInput = status !== 'sent';

  // Once the worker is done, collapse progress messages
  const isProcessing = status === 'pending' || status === 'processing';
  const lastProgress = isProcessing
    ? [...messages].reverse().find(m => m.kind === 'progress')
    : null;
  const visibleMessages = messages.filter(m => m.kind !== 'progress');

  const scrollRef = useRef<ScrollView>(null);

  const handleSendDrafts = async () => {
    try {
      await sendDrafts({ variables: { conversationId } });
      Alert.alert('Sent', `Sent ${drafts.length} update${drafts.length === 1 ? '' : 's'} to parents.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (e: any) {
      Alert.alert('Failed to send', e.message ?? 'Please try again');
    }
  };

  const handleSendChat = async () => {
    const text = inputText.trim();
    if (!text) return;
    setInputText('');
    try {
      const { data: d } = await sendChatMessage({ variables: { conversationId, content: text } });
      const msg = d?.sendChatMessage;
      if (msg) setStreamed(prev => prev.some(x => x.id === msg.id) ? prev : [...prev, msg]);
    } catch (e: any) {
      Alert.alert('Failed to send', e.message ?? 'Please try again');
      setInputText(text); // restore on error
    }
  };

  if (loading && messages.length === 0) {
    return (
      <View style={s.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        ref={scrollRef}
        style={s.scroll}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {visibleMessages.map(m => (
          <MessageRow
            key={m.id}
            message={m}
            onUpdate={(content) => updateDraft({ variables: { messageId: m.id, content } })}
            onRemove={() => removeDraft({ variables: { messageId: m.id } }).then(() =>
              setStreamed(prev => prev.filter(x => x.id !== m.id)))}
          />
        ))}
        {isProcessing && (
          <View style={s.typingRow}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={s.typingTxt}>{lastProgress?.content ?? 'Agent is working…'}</Text>
          </View>
        )}
      </ScrollView>

      {canSend && (
        <View style={s.footer}>
          <TouchableOpacity
            style={[s.sendBtn, sending && s.sendBtnOff]}
            onPress={handleSendDrafts}
            disabled={sending}
            activeOpacity={0.85}
          >
            {sending
              ? <ActivityIndicator color={Colors.white} />
              : <Text style={s.sendBtnTxt}>📤  Send {drafts.length} update{drafts.length === 1 ? '' : 's'} to parents</Text>}
          </TouchableOpacity>
        </View>
      )}

      {showInput && (
        <View style={s.inputBar}>
          <TextInput
            ref={inputRef}
            style={s.chatInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Message AI…"
            placeholderTextColor={Colors.textSecondary}
            multiline
            maxLength={2000}
            returnKeyType="default"
          />
          <TouchableOpacity
            style={[s.chatSendBtn, (!inputText.trim() || sendingChat) && s.chatSendBtnOff]}
            onPress={handleSendChat}
            disabled={!inputText.trim() || sendingChat}
            activeOpacity={0.75}
          >
            {sendingChat
              ? <ActivityIndicator size="small" color={Colors.white} />
              : <Text style={s.chatSendIcon}>↑</Text>}
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

// ─── Message rendering ─────────────────────────────────────────────────────

function MessageRow({ message, onUpdate, onRemove }: {
  message: Message;
  onUpdate: (content: string) => Promise<any>;
  onRemove: () => Promise<any>;
}) {
  if (message.role === 'user' && message.kind === 'text') {
    return (
      <View style={s.userBubbleRow}>
        <View style={s.userBubble}>
          <Text style={s.userBubbleTxt}>{message.content}</Text>
        </View>
      </View>
    );
  }
  if (message.kind === 'text') {
    return (
      <View style={s.agentBubble}>
        <Text style={s.agentBubbleTxt}>{message.content}</Text>
      </View>
    );
  }
  if (message.kind === 'progress') {
    return (
      <View style={s.progressRow}>
        <ActivityIndicator size="small" color={Colors.primary} />
        <Text style={s.progressTxt}>{message.content}</Text>
      </View>
    );
  }
  if (message.kind === 'action') {
    return (
      <View style={s.actionRow}>
        <Text style={s.actionTxt}>✅  {message.content}</Text>
      </View>
    );
  }
  if (message.kind === 'draft_card') {
    let payload: Partial<DraftPayload> = {};
    try { payload = JSON.parse(message.payloadJson || '{}'); } catch {}
    return <DraftCard message={message} payload={payload} onUpdate={onUpdate} onRemove={onRemove} />;
  }
  return null;
}

function DraftCard({ message, payload, onUpdate, onRemove }: {
  message: Message;
  payload: Partial<DraftPayload>;
  onUpdate: (content: string) => Promise<any>;
  onRemove: () => Promise<any>;
}) {
  const [text, setText] = useState(message.content);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!dirty) setText(message.content);
  }, [message.content]);

  const handleBlur = () => {
    if (dirty && text !== message.content) {
      onUpdate(text);
      setDirty(false);
    }
  };

  return (
    <View style={s.draftCard}>
      <View style={s.draftHead}>
        {payload.avatar_url
          ? <Image source={{ uri: payload.avatar_url }} style={s.avatar} />
          : <View style={[s.avatar, s.avatarFallback]}>
              <Text style={s.avatarFallbackTxt}>{payload.kid_name?.[0] ?? '?'}</Text>
            </View>}
        <Text style={s.draftName}>{payload.kid_name}</Text>
        <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <Text style={s.removeBtn}>Remove</Text>
        </TouchableOpacity>
      </View>
      <TextInput
        style={s.draftInput}
        value={text}
        onChangeText={(v) => { setText(v); setDirty(true); }}
        onBlur={handleBlur}
        multiline
        textAlignVertical="top"
      />
      {(payload.photo_urls && payload.photo_urls.length > 0) && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.photoStrip}>
          {payload.photo_urls.map((url, i) => (
            !!url && <Image key={i} source={{ uri: url }} style={s.draftPhoto} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg },
  scroll: { flex: 1 },
  content: { padding: Spacing.md, paddingBottom: 100, gap: Spacing.sm },

  // Agent (left) bubble
  agentBubble: {
    backgroundColor: Colors.card, borderRadius: Radius.md,
    padding: Spacing.md, alignSelf: 'flex-start', maxWidth: '85%',
    ...Shadow.small,
  },
  agentBubbleTxt: { fontSize: 14, color: Colors.textPrimary, lineHeight: 20 },

  // User (right) bubble
  userBubbleRow: { alignItems: 'flex-end' },
  userBubble: {
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    padding: Spacing.md, maxWidth: '85%',
    ...Shadow.small,
  },
  userBubbleTxt: { fontSize: 14, color: Colors.white, lineHeight: 20 },

  progressRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: Spacing.md, paddingVertical: 4,
  },
  progressTxt: { fontSize: 13, color: Colors.textSecondary, fontStyle: 'italic' },

  actionRow: { paddingHorizontal: Spacing.md, paddingVertical: 6 },
  actionTxt: { fontSize: 13, color: Colors.success, fontWeight: '600' },

  typingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  typingTxt: { fontSize: 13, color: Colors.textSecondary, fontStyle: 'italic' },

  draftCard: {
    backgroundColor: Colors.card, borderRadius: Radius.md,
    padding: Spacing.md, ...Shadow.small,
    borderLeftWidth: 3, borderLeftColor: Colors.primary,
  },
  draftHead: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm, gap: Spacing.sm },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarFallback: { backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  avatarFallbackTxt: { color: Colors.primary, fontWeight: '700' },
  draftName: { flex: 1, fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  removeBtn: { fontSize: 12, color: Colors.danger, fontWeight: '600' },
  draftInput: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm,
    padding: Spacing.sm, fontSize: 14, color: Colors.textPrimary,
    minHeight: 70, backgroundColor: Colors.bg,
  },
  photoStrip: { marginTop: Spacing.sm },
  draftPhoto: { width: 72, height: 72, borderRadius: Radius.sm, marginRight: 8 },

  footer: {
    paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: 8,
    backgroundColor: Colors.bg,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border,
  },
  sendBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.sm,
    paddingVertical: 15, alignItems: 'center', ...Shadow.small,
  },
  sendBtnOff: { opacity: 0.5 },
  sendBtnTxt: { color: Colors.white, fontSize: 15, fontWeight: '700' },

  // Chat input bar
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    paddingBottom: 24,
    backgroundColor: Colors.bg,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border,
    gap: Spacing.sm,
  },
  chatInput: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontSize: 15, color: Colors.textPrimary,
    maxHeight: 110,
  },
  chatSendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    ...Shadow.small,
  },
  chatSendBtnOff: { opacity: 0.4 },
  chatSendIcon: { color: Colors.white, fontSize: 20, fontWeight: '700', lineHeight: 22 },
});
