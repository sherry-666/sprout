import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, Keyboard, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { gql, useQuery, useMutation, useSubscription } from '@apollo/client';
import { useIsFocused } from '@react-navigation/native';
import { Colors } from '../../theme';

// ── GraphQL ────────────────────────────────────────────────────────────────

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
      id kidId senderId senderName senderRole content createdAt
    }
  }
`;

const MARK_READ = gql`
  mutation MarkChatRead($kidId: ID!) {
    markChatRead(kidId: $kidId)
  }
`;

const MESSAGE_ADDED = gql`
  subscription KidChatMessageAdded($kidId: ID!) {
    kidChatMessageAdded(kidId: $kidId) {
      id kidId senderId senderName senderRole content createdAt
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
  return { bg: `hsl(${hue}, 55%, 87%)`, ink: `hsl(${hue}, 60%, 30%)` };
}

function dayLabel(iso: string): string {
  const now = new Date();
  const then = new Date(iso);
  const diffDays = Math.floor((now.getTime() - then.getTime()) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return then.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
}

function msgTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

// ── Types ──────────────────────────────────────────────────────────────────

interface ChatMsg {
  id: string;
  kidId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  content: string;
  createdAt: string;
}

// ── Sub-components ─────────────────────────────────────────────────────────

function ParentAvatarStack({ parentNames, size = 16 }: { parentNames: string[]; size?: number }) {
  return (
    <View style={{ flexDirection: 'row' }}>
      {parentNames.slice(0, 3).map((name, i) => {
        const hue = nameToHue(name);
        const { bg, ink } = glyphColors(hue);
        return (
          <View key={i} style={{
            width: size, height: size, borderRadius: size / 2,
            backgroundColor: bg,
            borderWidth: 1.5, borderColor: Colors.white,
            alignItems: 'center', justifyContent: 'center',
            marginLeft: i > 0 ? -(size / 3) : 0,
            zIndex: 10 - i,
          }}>
            <Text style={{ color: ink, fontSize: size * 0.42, fontWeight: '700' }}>
              {name[0]?.toUpperCase()}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function DateSeparator({ label }: { label: string }) {
  return (
    <View style={ds.wrap}>
      <View style={ds.line} />
      <Text style={ds.label}>{label}</Text>
      <View style={ds.line} />
    </View>
  );
}

const ds = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 12, paddingHorizontal: 16 },
  line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(60,60,67,0.15)' },
  label: { fontSize: 12, color: 'rgba(60,60,67,0.55)', fontWeight: '500' },
});

function SenderAvatar({ name, size = 28 }: { name: string; size?: number }) {
  const hue = nameToHue(name);
  const { bg, ink } = glyphColors(hue);
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: bg,
      alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <Text style={{ color: ink, fontSize: size * 0.42, fontWeight: '700' }}>
        {name[0]?.toUpperCase()}
      </Text>
    </View>
  );
}

function MessageRow({ message, isOwn }: { message: ChatMsg; isOwn: boolean }) {
  const firstName = message.senderName.split(' ')[0];

  if (isOwn) {
    return (
      <View style={ms.ownRow}>
        <View style={ms.ownBubble}>
          <Text style={ms.ownTxt}>{message.content}</Text>
        </View>
        <Text style={ms.ownTime}>{msgTime(message.createdAt)}</Text>
      </View>
    );
  }

  return (
    <View style={ms.otherRow}>
      <SenderAvatar name={message.senderName} size={28} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={ms.senderLabel}>
          {firstName} · Parent
        </Text>
        <View style={ms.otherBubble}>
          <Text style={ms.otherTxt}>{message.content}</Text>
        </View>
        <Text style={ms.otherTime}>{msgTime(message.createdAt)}</Text>
      </View>
    </View>
  );
}

const ms = StyleSheet.create({
  ownRow: { alignItems: 'flex-end', marginBottom: 4 },
  ownBubble: {
    backgroundColor: Colors.primary, borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingHorizontal: 14, paddingVertical: 10,
    maxWidth: '78%',
  },
  ownTxt: { fontSize: 15, color: Colors.white, lineHeight: 21 },
  ownTime: { fontSize: 11, color: 'rgba(60,60,67,0.5)', marginTop: 3, marginRight: 4 },

  otherRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 4 },
  senderLabel: { fontSize: 11, color: 'rgba(60,60,67,0.55)', marginBottom: 3, fontWeight: '500' },
  otherBubble: {
    backgroundColor: Colors.white, borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14, paddingVertical: 10,
    maxWidth: '100%',
    shadowColor: '#1a2820',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1,
  },
  otherTxt: { fontSize: 15, color: '#1d2a22', lineHeight: 21 },
  otherTime: { fontSize: 11, color: 'rgba(60,60,67,0.5)', marginTop: 3, marginLeft: 4 },
});

// ── Screen ─────────────────────────────────────────────────────────────────

export default function KidChatScreen({ route, navigation }: any) {
  const { kidId, kidName, parentNames = [], className = '' } = route.params;
  const insets = useSafeAreaInsets();
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
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  const [sendMessage, { loading: sending }] = useMutation(SEND_MESSAGE);
  const [markRead] = useMutation(MARK_READ);

  // Mark read on focus
  useEffect(() => {
    if (isFocused) {
      markRead({ variables: { kidId } }).catch(() => {});
    }
  }, [isFocused, kidId]);

  const handleSend = useCallback(async () => {
    const text = inputTextRef.current.trim();
    if (!text || sending) return;
    setInputText('');
    inputTextRef.current = '';
    try {
      const { data: d } = await sendMessage({ variables: { kidId, content: text } });
      const msg = d?.sendKidChat;
      if (msg) setStreamed(prev => prev.some(x => x.id === msg.id) ? prev : [...prev, msg]);
      scrollRef.current?.scrollToEnd({ animated: true });
    } catch (e: any) {
      Alert.alert('Failed to send', e.message ?? 'Please try again');
      setInputText(text);
      inputTextRef.current = text;
    }
  }, [kidId, sending]);

  // Kid avatar
  const kidHue = nameToHue(kidName);
  const { bg: kidBg, ink: kidInk } = glyphColors(kidHue);
  const kidInitials = kidName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  // Parent names for placeholder
  const parentFirst = parentNames.slice(0, 3).join(' & ');
  const placeholder = parentFirst ? `Message ${parentFirst}…` : 'Message…';

  return (
    <View style={[s.root]}>
      {/* Custom header */}
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={s.backBtn}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
        >
          <Text style={s.backBtnTxt}>‹</Text>
        </TouchableOpacity>

        <View style={s.headerCenter}>
          {/* Kid avatar */}
          <View style={[s.headerKidAvatar, { backgroundColor: kidBg }]}>
            <Text style={[s.headerKidAvatarTxt, { color: kidInk }]}>{kidInitials}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.headerName} numberOfLines={1}>{kidName}</Text>
            <View style={s.headerSub}>
              <ParentAvatarStack parentNames={parentNames} size={14} />
              <Text style={s.headerSubTxt} numberOfLines={1}>
                {parentFirst}{className ? ` · ${className}` : ''}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={s.infoBtn}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
        >
          <Text style={s.infoBtnTxt}>ⓘ</Text>
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={s.scroll}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      >
        {messages.length === 0 && (
          <Text style={s.emptyHint}>
            Send the first message to start the conversation.
          </Text>
        )}
        {messages.map((m, i) => {
          const label = dayLabel(m.createdAt);
          const prevLabel = i > 0 ? dayLabel(messages[i - 1].createdAt) : null;
          const showSep = label !== prevLabel;
          const isOwn = m.senderRole === 'educator';
          return (
            <React.Fragment key={m.id}>
              {showSep && <DateSeparator label={label} />}
              <MessageRow message={m} isOwn={isOwn} />
            </React.Fragment>
          );
        })}
        {/* Bottom padding so last message isn't hidden behind input */}
        <View style={{ height: 8 }} />
      </ScrollView>

      {/* Input bar */}
      <View style={[s.inputBar, { paddingBottom: Math.max(insets.bottom, 16) + (keyboardHeight > 0 ? 8 : 0) }]}>
        <TouchableOpacity style={s.plusBtn} activeOpacity={0.7}>
          <Text style={s.plusBtnTxt}>+</Text>
        </TouchableOpacity>
        <TextInput
          ref={inputRef}
          style={s.input}
          value={inputText}
          onChangeText={v => { setInputText(v); inputTextRef.current = v; }}
          placeholder={placeholder}
          placeholderTextColor="rgba(60,60,67,0.40)"
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

// ── Styles ─────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f6f4ec' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: '#f6f4ec',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(60,60,67,0.12)',
    gap: 10,
  },
  backBtn: { padding: 4 },
  backBtnTxt: { fontSize: 26, color: Colors.primary, lineHeight: 30 },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerKidAvatar: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  headerKidAvatarTxt: { fontSize: 14, fontWeight: '700' },
  headerName: { fontSize: 16, fontWeight: '600', color: '#1d2a22' },
  headerSub: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  headerSubTxt: { fontSize: 12, color: 'rgba(60,60,67,0.6)', flex: 1 },
  infoBtn: { padding: 4 },
  infoBtnTxt: { fontSize: 18, color: 'rgba(60,60,67,0.5)' },

  // Messages
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  emptyHint: { textAlign: 'center', color: 'rgba(60,60,67,0.5)', fontSize: 13, marginTop: 48 },

  // Input bar
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 16, paddingTop: 10,
    backgroundColor: '#f6f4ec',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(60,60,67,0.12)',
    gap: 8,
  },
  plusBtn: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 1.5, borderColor: 'rgba(60,60,67,0.25)',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  plusBtnTxt: { fontSize: 20, color: 'rgba(60,60,67,0.55)', lineHeight: 22 },
  input: {
    flex: 1, backgroundColor: Colors.white,
    borderRadius: 20, borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(60,60,67,0.15)',
    paddingHorizontal: 16, paddingVertical: 8,
    fontSize: 15, color: '#1d2a22', maxHeight: 110,
    lineHeight: 21,
  },
  sendBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  sendBtnOff: { opacity: 0.35 },
  sendIcon: { color: Colors.white, fontSize: 18, fontWeight: '700', lineHeight: 20 },
});
