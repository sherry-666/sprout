import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, Keyboard, Platform,
} from 'react-native';
import { gql, useQuery, useMutation, useSubscription } from '@apollo/client';
import { useIsFocused } from '@react-navigation/native';
import { Colors, Spacing, Radius, Shadow } from '../../theme';

const MESSAGES_QUERY = gql`
  query KidChatMessages($kidId: ID!, $limit: Int) {
    kidChatMessages(kidId: $kidId, limit: $limit) {
      id
      kidId
      senderId
      senderName
      senderRole
      content
      createdAt
    }
  }
`;

const SEND_MESSAGE = gql`
  mutation SendKidChat($kidId: ID!, $content: String!) {
    sendKidChat(kidId: $kidId, content: $content) {
      id
      kidId
      senderId
      senderName
      senderRole
      content
      createdAt
    }
  }
`;

const MESSAGE_ADDED = gql`
  subscription KidChatMessageAdded($kidId: ID!) {
    kidChatMessageAdded(kidId: $kidId) {
      id
      kidId
      senderId
      senderName
      senderRole
      content
      createdAt
    }
  }
`;

interface ChatMsg {
  id: string;
  kidId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  content: string;
  createdAt: string;
}

export default function KidChatScreen({ route }: any) {
  const { kidId } = route.params;
  const isFocused = useIsFocused();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [inputText, setInputText] = useState('');
  const inputTextRef = useRef('');
  const inputRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const show = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hide = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const s1 = Keyboard.addListener(show, e => setKeyboardHeight(e.endCoordinates.height));
    const s2 = Keyboard.addListener(hide, () => setKeyboardHeight(0));
    return () => { s1.remove(); s2.remove(); };
  }, []);

  useEffect(() => {
    if (keyboardHeight > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    }
  }, [keyboardHeight]);

  const { data } = useQuery(MESSAGES_QUERY, {
    variables: { kidId, limit: 100 },
    fetchPolicy: 'cache-and-network',
  });

  const [streamed, setStreamed] = useState<ChatMsg[]>([]);

  useSubscription(MESSAGE_ADDED, {
    variables: { kidId },
    onData: ({ data: sub }) => {
      const m = sub?.data?.kidChatMessageAdded;
      if (m) setStreamed(prev => prev.some(x => x.id === m.id) ? prev : [...prev, m]);
    },
  });

  const initial: ChatMsg[] = data?.kidChatMessages ?? [];
  const merged = new Map<string, ChatMsg>();
  initial.forEach(m => merged.set(m.id, m));
  streamed.forEach(m => merged.set(m.id, m));
  const messages = [...merged.values()].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const [sendMessage, { loading: sending }] = useMutation(SEND_MESSAGE);

  const handleSend = () => {
    setTimeout(async () => {
      const text = inputTextRef.current.trim();
      if (!text) return;
      setInputText('');
      inputTextRef.current = '';
      try {
        const { data: d } = await sendMessage({ variables: { kidId, content: text } });
        const msg = d?.sendKidChat;
        if (msg) setStreamed(prev => prev.some(x => x.id === msg.id) ? prev : [...prev, msg]);
      } catch (e: any) {
        Alert.alert('Failed to send', e.message ?? 'Please try again');
        setInputText(text);
        inputTextRef.current = text;
      }
    }, 0);
  };

  return (
    <View style={[s.root, { paddingBottom: keyboardHeight }]}>
      <ScrollView
        ref={scrollRef}
        style={s.scroll}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.length === 0 && (
          <Text style={s.emptyHint}>Send the first message to start the conversation.</Text>
        )}
        {messages.map(m => <MessageRow key={m.id} message={m} />)}
      </ScrollView>

      <View style={[s.inputBar, keyboardHeight > 0 && s.inputBarKbOpen]}>
        <TextInput
          ref={inputRef}
          style={s.input}
          value={inputText}
          onChangeText={v => { setInputText(v); inputTextRef.current = v; }}
          placeholder="Message…"
          placeholderTextColor={Colors.textSecondary}
          multiline
          maxLength={2000}
          returnKeyType="default"
        />
        <TouchableOpacity
          style={[s.sendBtn, (!inputText.trim() || sending) && s.sendBtnOff]}
          onPress={handleSend}
          disabled={!inputText.trim() || sending}
          activeOpacity={0.75}
        >
          {sending
            ? <ActivityIndicator size="small" color={Colors.white} />
            : <Text style={s.sendIcon}>↑</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function MessageRow({ message }: { message: ChatMsg }) {
  // Heuristic: messages sent by someone whose role is educator show on right
  // The mobile viewer is always an educator in this navigator; for parent app it'd be inverted
  const isOwn = message.senderRole === 'educator';

  if (isOwn) {
    return (
      <View style={s.ownRow}>
        <View style={s.ownBubble}>
          <Text style={s.ownTxt}>{message.content}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.otherRow}>
      <Text style={s.senderName}>{message.senderName}</Text>
      <View style={s.otherBubble}>
        <Text style={s.otherTxt}>{message.content}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flex: 1 },
  content: { padding: Spacing.md, paddingBottom: 8, gap: Spacing.sm },
  emptyHint: { textAlign: 'center', color: Colors.textSecondary, fontSize: 13, marginTop: 40 },

  ownRow: { alignItems: 'flex-end' },
  ownBubble: {
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    padding: Spacing.md, maxWidth: '80%', ...Shadow.small,
  },
  ownTxt: { fontSize: 14, color: Colors.white, lineHeight: 20 },

  otherRow: { alignItems: 'flex-start' },
  senderName: { fontSize: 11, color: Colors.textSecondary, marginBottom: 2, marginLeft: 4 },
  otherBubble: {
    backgroundColor: Colors.card, borderRadius: Radius.md,
    padding: Spacing.md, maxWidth: '80%', ...Shadow.small,
  },
  otherTxt: { fontSize: 14, color: Colors.textPrimary, lineHeight: 20 },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, paddingBottom: 24,
    backgroundColor: Colors.bg,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border,
    gap: Spacing.sm,
  },
  inputBarKbOpen: { paddingBottom: 16, marginBottom: 8 },
  input: {
    flex: 1, backgroundColor: Colors.card,
    borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    fontSize: 15, color: Colors.textPrimary, maxHeight: 110,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center', ...Shadow.small,
  },
  sendBtnOff: { opacity: 0.4 },
  sendIcon: { color: Colors.white, fontSize: 20, fontWeight: '700', lineHeight: 22 },
});
