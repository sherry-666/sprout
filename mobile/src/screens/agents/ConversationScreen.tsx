import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, Image, Alert, Keyboard, Platform,
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
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


export default function ConversationScreen({ route, navigation }: any) {
  const conversationId: string = route.params.conversationId;
  const isFocused = useIsFocused();
  const [isTerminal, setIsTerminal] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Hide tab bar so the input bar can sit at the screen edge
  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ tabBarStyle: { display: 'none' } });
      return () => navigation.getParent()?.setOptions({ tabBarStyle: undefined });
    }, [navigation])
  );

  // Manual keyboard tracking — KeyboardAvoidingView is unreliable in nested navigators
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (e) =>
      setKeyboardHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);
  const [inputText, setInputText] = useState('');
  const inputRef = useRef<TextInput>(null);
  // Mirror to ref so handleSendChat always reads the latest value even if
  // Android IME hasn't committed the composing word to state yet
  const inputTextRef = useRef('');

  const { data, loading } = useQuery(CONVERSATION_QUERY, {
    variables: { id: conversationId },
    fetchPolicy: 'cache-and-network',
    pollInterval: isTerminal || !isFocused ? 0 : 3000,
  });

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

  const showInput = status !== 'sent';
  const showPhotoReviewCard = agentType === 'quick_log' && status === 'awaiting_photo_review';
  const showReviewCard = agentType === 'quick_log' && status === 'awaiting_review';

  // Once the worker is done, collapse progress messages; hide draft_cards (shown on review screen)
  const isProcessing = status === 'pending' || status === 'processing';
  const lastProgress = isProcessing
    ? [...messages].reverse().find(m => m.kind === 'progress')
    : null;
  const visibleMessages = messages.filter(m => m.kind !== 'progress' && m.kind !== 'draft_card');

  const scrollRef = useRef<ScrollView>(null);

  // When keyboard opens, scroll to bottom so the latest message stays in view
  useEffect(() => {
    if (keyboardHeight > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    }
  }, [keyboardHeight]);

  const handleSendChat = () => {
    // Defer one tick: Android IME queues an onChangeText (with the composing word committed)
    // when the TextInput is about to lose focus. setTimeout(0) lets that event process first
    // so inputTextRef.current always contains the full message.
    setTimeout(async () => {
      const text = inputTextRef.current.trim();
      if (!text) return;
      setInputText('');
      inputTextRef.current = '';
      try {
        const { data: d } = await sendChatMessage({ variables: { conversationId, content: text } });
        const msg = d?.sendChatMessage;
        if (msg) setStreamed(prev => prev.some(x => x.id === msg.id) ? prev : [...prev, msg]);
      } catch (e: any) {
        Alert.alert('Failed to send', e.message ?? 'Please try again');
        setInputText(text);
        inputTextRef.current = text;
      }
    }, 0);
  };

  if (loading && messages.length === 0) {
    return (
      <View style={s.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={[s.root, { paddingBottom: keyboardHeight }]}>
      <ScrollView
        ref={scrollRef}
        style={s.scroll}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {visibleMessages.map(m => (
          <MessageRow key={m.id} message={m} />
        ))}
        {showPhotoReviewCard && (
          <TouchableOpacity
            style={s.reviewCard}
            onPress={() => navigation.navigate('PhotoClassification', { conversationId })}
            activeOpacity={0.8}
          >
            <View style={s.reviewCardInner}>
              <Text style={s.reviewCardIcon}>📷</Text>
              <View style={s.reviewCardText}>
                <Text style={s.reviewCardTitle}>Review photo grouping</Text>
                <Text style={s.reviewCardSub}>Check which photos were matched to each child</Text>
              </View>
              <Text style={s.reviewCardChevron}>›</Text>
            </View>
          </TouchableOpacity>
        )}
        {showReviewCard && (
          <TouchableOpacity
            style={s.reviewCard}
            onPress={() => navigation.navigate('QuickLogReview', { conversationId })}
            activeOpacity={0.8}
          >
            <View style={s.reviewCardInner}>
              <Text style={s.reviewCardIcon}>📋</Text>
              <View style={s.reviewCardText}>
                <Text style={s.reviewCardTitle}>Drafts are ready — review & send</Text>
                <Text style={s.reviewCardSub}>Edit updates and assign photos before sending to parents</Text>
              </View>
              <Text style={s.reviewCardChevron}>›</Text>
            </View>
          </TouchableOpacity>
        )}
        {isProcessing && (
          <View style={s.typingRow}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={s.typingTxt}>{lastProgress?.content ?? 'Agent is working…'}</Text>
          </View>
        )}
      </ScrollView>

      {showInput && (
        <View style={[s.inputBar, keyboardHeight > 0 && s.inputBarKbOpen]}>
          <TextInput
            ref={inputRef}
            style={s.chatInput}
            value={inputText}
            onChangeText={(v) => { setInputText(v); inputTextRef.current = v; }}
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
    </View>
  );
}

// ─── Message rendering ─────────────────────────────────────────────────────

function MessageRow({ message }: { message: Message }) {
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
        <Markdown style={markdownStyles}>{message.content}</Markdown>
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
  return null;
}

const markdownStyles = {
  body: { fontSize: 14, color: Colors.textPrimary, lineHeight: 20 },
  paragraph: { marginTop: 0, marginBottom: 8 },
  bullet_list: { marginBottom: 8 },
  ordered_list: { marginBottom: 8 },
  list_item: { marginBottom: 2 },
  strong: { fontWeight: '700' as const },
  em: { fontStyle: 'italic' as const },
  code_inline: {
    backgroundColor: Colors.border, borderRadius: 3,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 13,
  },
  code_block: {
    backgroundColor: Colors.border, borderRadius: 6,
    padding: 8, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 12,
  },
  fence: {
    backgroundColor: Colors.border, borderRadius: 6,
    padding: 8, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 12,
  },
  heading1: { fontSize: 18, fontWeight: '700' as const, marginBottom: 6 },
  heading2: { fontSize: 16, fontWeight: '700' as const, marginBottom: 4 },
  heading3: { fontSize: 15, fontWeight: '600' as const, marginBottom: 4 },
};

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

  reviewCard: {
    backgroundColor: Colors.card, borderRadius: Radius.md,
    borderLeftWidth: 4, borderLeftColor: Colors.primary,
    ...Shadow.small,
  },
  reviewCardInner: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.sm },
  reviewCardIcon: { fontSize: 24 },
  reviewCardText: { flex: 1 },
  reviewCardTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  reviewCardSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  reviewCardChevron: { fontSize: 22, color: Colors.textSecondary, fontWeight: '300' },

  // Chat input bar
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    paddingBottom: 24,
    backgroundColor: Colors.bg,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border,
    gap: Spacing.sm,
  },
  inputBarKbOpen: { paddingBottom: 16, marginBottom: 8 },
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
