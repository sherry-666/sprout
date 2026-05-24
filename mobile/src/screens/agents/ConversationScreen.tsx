import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, Keyboard, Platform, Switch,
  PanResponder, Animated, Modal, FlatList,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { gql, useQuery, useMutation, useSubscription } from '@apollo/client';
import { Colors, Spacing, Radius, Shadow } from '../../theme';
import { useQuickLog } from '../../contexts/QuickLogContext';

// ── GraphQL ────────────────────────────────────────────────────────────────

const CONVERSATION_QUERY = gql`
  query ConversationDetail($id: ID!) {
    conversation(id: $id) {
      id
      status
      agentType
      title
      allPhotoKeys
      allPhotoUrls
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

const MESSAGE_ADDED = gql`
  subscription MessageAdded($conversationId: ID!) {
    messageAdded(conversationId: $conversationId) {
      id conversationId role kind content payloadJson createdAt
    }
  }
`;

const SEND_CHAT_MESSAGE = gql`
  mutation SendChatMsg($conversationId: ID!, $content: String!) {
    sendChatMessage(conversationId: $conversationId, content: $content) {
      id conversationId role kind content payloadJson createdAt
    }
  }
`;

// Photo classification mutations
const ASSIGN_PHOTO = gql`
  mutation AssignPhoto($messageId: ID!, $photoKey: String!) {
    assignDraftPhoto(messageId: $messageId, photoKey: $photoKey) { id payloadJson }
  }
`;
const REMOVE_PHOTO = gql`
  mutation RemovePhoto($messageId: ID!, $photoKey: String!) {
    removeDraftPhoto(messageId: $messageId, photoKey: $photoKey) { id payloadJson }
  }
`;
const TOGGLE_DRAFT_ENABLED = gql`
  mutation ToggleEnabled($messageId: ID!, $enabled: Boolean!) {
    toggleDraftEnabled(messageId: $messageId, enabled: $enabled) { id payloadJson }
  }
`;
const CREATE_KID_DRAFT = gql`
  mutation CreateKidDraftConvo($conversationId: ID!, $kidId: ID!) {
    createKidDraft(conversationId: $conversationId, kidId: $kidId) {
      id role kind content payloadJson createdAt
    }
  }
`;
const CONFIRM_PHOTO_REVIEW = gql`
  mutation ConfirmPhotos($conversationId: ID!) {
    confirmPhotoReview(conversationId: $conversationId) { id status }
  }
`;
const KIDS_FOR_CONVERSATION = gql`
  query KidsForConvo($conversationId: ID!) {
    kidsForConversation(conversationId: $conversationId) { id name avatarUrl }
  }
`;
const UPDATE_DRAFT = gql`
  mutation UpdateDraft($messageId: ID!, $content: String!) {
    updateDraftMessage(messageId: $messageId, content: $content) { id content }
  }
`;
const SEND_DRAFTS = gql`
  mutation SendDrafts($conversationId: ID!) {
    sendConversationDrafts(conversationId: $conversationId) { id status }
  }
`;

// ── Types ──────────────────────────────────────────────────────────────────

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
  enabled?: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtTime(iso: string): string {
  const d = new Date(iso);
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

function isActive(status: string): boolean {
  return status === 'pending' || status === 'processing';
}

function phaseLabel(status: string): string {
  const map: Record<string, string> = {
    pending: 'Scanning photos…',
    processing: 'Scanning photos…',
    awaiting_photo_review: 'Review photo matching',
    awaiting_review: 'Drafts ready · review',
    sent: 'Sent to families',
    failed: 'Failed',
  };
  return map[status] ?? 'Working…';
}

// ── WorkingDots ─────────────────────────────────────────────────────────────

function WorkingDots({ color }: { color: string }) {
  const dot0 = useRef(new Animated.Value(0.25)).current;
  const dot1 = useRef(new Animated.Value(0.25)).current;
  const dot2 = useRef(new Animated.Value(0.25)).current;
  useEffect(() => {
    const make = (dot: Animated.Value, delay: number) =>
      Animated.loop(Animated.sequence([
        Animated.delay(delay),
        Animated.timing(dot, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(dot, { toValue: 0.25, duration: 400, useNativeDriver: true }),
        Animated.delay(Math.max(0, 600 - delay)),
      ]));
    const a0 = make(dot0, 0); const a1 = make(dot1, 200); const a2 = make(dot2, 400);
    a0.start(); a1.start(); a2.start();
    return () => { a0.stop(); a1.stop(); a2.stop(); };
  }, []);
  return (
    <View style={{ flexDirection: 'row', gap: 3, alignItems: 'center' }}>
      {[dot0, dot1, dot2].map((dot, i) => (
        <Animated.View key={i} style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: color, opacity: dot }} />
      ))}
    </View>
  );
}

// ── Photo matching card ─────────────────────────────────────────────────────

function PhotoMatchingCard({
  conversationId,
  photos,
  drafts,
  readOnly,
  onDragStateChange,
}: {
  conversationId: string;
  photos: Array<{ key: string; url: string }>;
  drafts: Array<{ id: string; payload: DraftPayload }>;
  readOnly: boolean;
  onDragStateChange: (isDragging: boolean) => void;
}) {
  const [assignPhoto] = useMutation(ASSIGN_PHOTO, {
    update(cache, { data: d }) {
      const u = d?.assignDraftPhoto;
      if (!u) return;
      cache.modify({ id: cache.identify({ __typename: 'Message', id: u.id }), fields: { payloadJson: () => u.payloadJson } });
    },
  });
  const [removePhoto] = useMutation(REMOVE_PHOTO, {
    update(cache, { data: d }) {
      const u = d?.removeDraftPhoto;
      if (!u) return;
      cache.modify({ id: cache.identify({ __typename: 'Message', id: u.id }), fields: { payloadJson: () => u.payloadJson } });
    },
  });
  const [toggleEnabled] = useMutation(TOGGLE_DRAFT_ENABLED, {
    update(cache, { data: d }) {
      const u = d?.toggleDraftEnabled;
      if (!u) return;
      cache.modify({ id: cache.identify({ __typename: 'Message', id: u.id }), fields: { payloadJson: () => u.payloadJson } });
    },
  });
  const [createKidDraft] = useMutation(CREATE_KID_DRAFT, {
    update(cache, { data: d }) {
      const n = d?.createKidDraft;
      if (!n) return;
      cache.modify({
        id: cache.identify({ __typename: 'Conversation', id: conversationId }),
        fields: {
          messages(existing = []) {
            return [...existing, { __ref: cache.identify({ __typename: 'Message', id: n.id }) }];
          },
        },
      });
      cache.writeFragment({
        id: cache.identify({ __typename: 'Message', id: n.id }),
        fragment: gql`fragment NewMsgPM on Message { id role kind content payloadJson createdAt }`,
        data: n,
      });
    },
  });

  const [showAddKid, setShowAddKid] = useState(false);
  const { data: kidsData } = useQuery(KIDS_FOR_CONVERSATION, {
    variables: { conversationId },
    skip: !showAddKid,
    fetchPolicy: 'cache-first',
  });

  // Drag state
  const [draggingPhoto, setDraggingPhoto] = useState<{ key: string; url: string } | null>(null);
  const draggingRef = useRef<{ key: string; url: string } | null>(null);
  const dragX = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  const kidCardRefs = useRef<Record<string, View | null>>({});

  const handleDragStart = useCallback((key: string, url: string, px: number, py: number) => {
    const p = { key, url };
    draggingRef.current = p;
    setDraggingPhoto(p);
    dragX.setValue(px - 36);
    dragY.setValue(py - 36);
    onDragStateChange(true);
  }, [onDragStateChange]);

  const handleDragMove = useCallback((px: number, py: number) => {
    dragX.setValue(px - 36);
    dragY.setValue(py - 36);
  }, []);

  const handleDragEnd = useCallback((px: number, py: number) => {
    const photo = draggingRef.current;
    draggingRef.current = null;
    setDraggingPhoto(null);
    onDragStateChange(false);
    if (!photo) return;
    Object.entries(kidCardRefs.current).forEach(([msgId, ref]) => {
      ref?.measureInWindow((rx, ry, rw, rh) => {
        if (px >= rx && px <= rx + rw && py >= ry && py <= ry + rh) {
          assignPhoto({ variables: { messageId: msgId, photoKey: photo.key } });
        }
      });
    });
  }, [assignPhoto]);

  const existingKidIds = new Set(drafts.map(d => d.payload.kid_id));

  const enabledDrafts = drafts.filter(d => d.payload.enabled !== false);
  const allPhotoKeys = new Set(drafts.flatMap(d => d.payload.photo_keys ?? []));
  const unmatchedCount = photos.filter(p => !allPhotoKeys.has(p.key)).length;

  return (
    <View style={cs.card}>
      {/* Header */}
      <View style={cs.cardHeader}>
        <Text style={cs.cardEyebrow}>PHOTO MATCHING</Text>
        {unmatchedCount > 0 && !readOnly && (
          <View style={cs.unmatchedPill}>
            <Text style={cs.unmatchedTxt}>{unmatchedCount} unmatched</Text>
          </View>
        )}
      </View>

      {/* Photo carousel */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={cs.carousel}
        scrollEnabled={!draggingPhoto}
        contentContainerStyle={{ gap: 6, paddingHorizontal: 14 }}
      >
        {photos.map(p => {
          const assignedKids = drafts.filter(d => (d.payload.photo_keys ?? []).includes(p.key));
          const unmatched = assignedKids.length === 0;
          return (
            <DraggablePhotoTile
              key={p.key}
              photo={p}
              assignedCount={assignedKids.length}
              unmatched={unmatched}
              readOnly={readOnly}
              onDragStart={handleDragStart}
              onDragMove={handleDragMove}
              onDragEnd={handleDragEnd}
            />
          );
        })}
      </ScrollView>

      <Text style={cs.hint}>
        {readOnly ? 'Photos as matched' : 'Drag a photo onto a child below ↓'}
      </Text>

      {/* Kid drop zones */}
      <View style={{ gap: 8 }}>
        {drafts.map(draft => {
          const enabled = draft.payload.enabled !== false;
          const assignedPhotos = photos.filter(p => (draft.payload.photo_keys ?? []).includes(p.key));
          return (
            <View
              key={draft.id}
              ref={r => { kidCardRefs.current[draft.id] = r as View | null; }}
              style={[cs.dropZone, !enabled && cs.dropZoneSkipped]}
            >
              <View style={cs.kidAvatar}>
                {draft.payload.avatar_url
                  ? <Image source={{ uri: draft.payload.avatar_url }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" transition={0} />
                  : <Text style={cs.kidAvatarTxt}>{(draft.payload.kid_name ?? '?')[0]}</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={cs.kidName}>{draft.payload.kid_name}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                  {assignedPhotos.length === 0 && (
                    <Text style={cs.noPhotos}>No photos yet</Text>
                  )}
                  {assignedPhotos.map(p => (
                    <TouchableOpacity
                      key={p.key}
                      disabled={readOnly}
                      onPress={() => removePhoto({ variables: { messageId: draft.id, photoKey: p.key } })}
                    >
                      <Image source={{ uri: p.url }} style={cs.assignedThumb} contentFit="cover" cachePolicy="memory-disk" transition={0} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              {!readOnly && (
                <Switch
                  value={enabled}
                  onValueChange={val => { toggleEnabled({ variables: { messageId: draft.id, enabled: val } }); }}
                  trackColor={{ false: Colors.border, true: Colors.primary }}
                  thumbColor={Colors.white}
                  style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                />
              )}
            </View>
          );
        })}
      </View>

      {/* Add kid button */}
      {!readOnly && (
        <TouchableOpacity style={cs.addKidBtn} onPress={() => setShowAddKid(true)}>
          <Text style={cs.addKidBtnTxt}>+ Include another child</Text>
        </TouchableOpacity>
      )}

      {/* Add kid picker modal */}
      <Modal visible={showAddKid} transparent animationType="slide" onRequestClose={() => setShowAddKid(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <TouchableOpacity style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' } as any} onPress={() => setShowAddKid(false)} />
          <View style={cs.pickerSheet}>
            <Text style={cs.pickerTitle}>Add child</Text>
            {(() => {
              const available = (kidsData?.kidsForConversation ?? []).filter((k: any) => !existingKidIds.has(k.id));
              if (available.length === 0) {
                return <Text style={cs.pickerEmpty}>All children already included.</Text>;
              }
              return (
                <FlatList
                  data={available}
                  keyExtractor={(item: any) => item.id}
                  renderItem={({ item }: any) => (
                    <TouchableOpacity
                      style={cs.pickerRow}
                      onPress={() => {
                        setShowAddKid(false);
                        createKidDraft({ variables: { conversationId, kidId: item.id } })
                          .catch(e => Alert.alert('Error', e.message));
                      }}
                    >
                      {item.avatarUrl
                        ? <Image source={{ uri: item.avatarUrl }} style={cs.pickerAvatar} contentFit="cover" cachePolicy="memory-disk" transition={0} />
                        : <View style={[cs.pickerAvatar, cs.pickerAvatarFallback]}>
                            <Text style={cs.pickerAvatarTxt}>{item.name[0]}</Text>
                          </View>}
                      <Text style={cs.pickerName}>{item.name}</Text>
                    </TouchableOpacity>
                  )}
                />
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* Drag ghost overlay */}
      {draggingPhoto && (
        <Animated.View
          pointerEvents="none"
          style={[cs.dragGhost, { transform: [{ translateX: dragX }, { translateY: dragY }] }]}
        >
          <Image source={{ uri: draggingPhoto.url }} style={cs.dragGhostImg} contentFit="cover" cachePolicy="memory-disk" transition={0} />
        </Animated.View>
      )}
    </View>
  );
}

// ── DraggablePhotoTile ──────────────────────────────────────────────────────

function DraggablePhotoTile({
  photo, assignedCount, unmatched, readOnly,
  onDragStart, onDragMove, onDragEnd,
}: {
  photo: { key: string; url: string };
  assignedCount: number;
  unmatched: boolean;
  readOnly: boolean;
  onDragStart: (key: string, url: string, px: number, py: number) => void;
  onDragMove: (px: number, py: number) => void;
  onDragEnd: (px: number, py: number) => void;
}) {
  const startRef = useRef(onDragStart);
  const moveRef = useRef(onDragMove);
  const endRef = useRef(onDragEnd);
  useEffect(() => { startRef.current = onDragStart; });
  useEffect(() => { moveRef.current = onDragMove; });
  useEffect(() => { endRef.current = onDragEnd; });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !readOnly,
      onPanResponderGrant: evt =>
        startRef.current(photo.key, photo.url, evt.nativeEvent.pageX, evt.nativeEvent.pageY),
      onPanResponderMove: evt =>
        moveRef.current(evt.nativeEvent.pageX, evt.nativeEvent.pageY),
      onPanResponderRelease: evt =>
        endRef.current(evt.nativeEvent.pageX, evt.nativeEvent.pageY),
      onPanResponderTerminate: evt =>
        endRef.current(evt.nativeEvent.pageX, evt.nativeEvent.pageY),
    }),
  ).current;

  return (
    <View {...panResponder.panHandlers} style={cs.photoTile}>
      <Image source={{ uri: photo.url }} style={cs.photoTileImg} contentFit="cover" cachePolicy="memory-disk" transition={0} />
      {unmatched && !readOnly && (
        <View style={cs.unmatchedBadge}><Text style={{ color: Colors.white, fontSize: 10, fontWeight: '700' }}>!</Text></View>
      )}
      {assignedCount > 0 && (
        <View style={cs.assignedBadge}>
          <Text style={{ color: Colors.white, fontSize: 9, fontWeight: '700' }}>{assignedCount}</Text>
        </View>
      )}
    </View>
  );
}

// ── Drafts card ─────────────────────────────────────────────────────────────

function DraftsCard({
  conversationId,
  drafts,
  readOnly,
}: {
  conversationId: string;
  drafts: Array<{ id: string; content: string; payload: DraftPayload }>;
  readOnly: boolean;
}) {
  const [updateDraft] = useMutation(UPDATE_DRAFT);
  const [toggleEnabled] = useMutation(TOGGLE_DRAFT_ENABLED, {
    update(cache, { data: d }) {
      const u = d?.toggleDraftEnabled;
      if (!u) return;
      cache.modify({ id: cache.identify({ __typename: 'Message', id: u.id }), fields: { payloadJson: () => u.payloadJson } });
    },
  });
  const [createKidDraft] = useMutation(CREATE_KID_DRAFT, {
    update(cache, { data: d }) {
      const n = d?.createKidDraft;
      if (!n) return;
      cache.modify({
        id: cache.identify({ __typename: 'Conversation', id: conversationId }),
        fields: {
          messages(existing = []) {
            return [...existing, { __ref: cache.identify({ __typename: 'Message', id: n.id }) }];
          },
        },
      });
    },
  });
  const [showAddKid, setShowAddKid] = useState(false);
  const { data: kidsData } = useQuery(KIDS_FOR_CONVERSATION, {
    variables: { conversationId },
    skip: !showAddKid,
    fetchPolicy: 'cache-first',
  });
  const existingKidIds = new Set(drafts.map(d => d.payload.kid_id));

  return (
    <View style={dc.card}>
      <Text style={dc.eyebrow}>
        DRAFTS · {drafts.length} family update{drafts.length === 1 ? '' : 's'}
      </Text>
      <View style={{ gap: 12, marginTop: 10 }}>
        {drafts.map(draft => (
          <DraftBlock
            key={draft.id}
            draft={draft}
            readOnly={readOnly}
            onToggle={val => toggleEnabled({ variables: { messageId: draft.id, enabled: val } })}
            onUpdateText={content => updateDraft({ variables: { messageId: draft.id, content } })}
          />
        ))}
      </View>
      {!readOnly && (
        <TouchableOpacity style={dc.addKidBtn} onPress={() => setShowAddKid(true)}>
          <Text style={dc.addKidBtnTxt}>+ Add child</Text>
        </TouchableOpacity>
      )}

      <Modal visible={showAddKid} transparent animationType="slide" onRequestClose={() => setShowAddKid(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <TouchableOpacity style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' } as any} onPress={() => setShowAddKid(false)} />
          <View style={cs.pickerSheet}>
            <Text style={cs.pickerTitle}>Add child</Text>
            {(() => {
              const available = (kidsData?.kidsForConversation ?? []).filter((k: any) => !existingKidIds.has(k.id));
              if (available.length === 0) {
                return <Text style={cs.pickerEmpty}>All children already included.</Text>;
              }
              return (
                <FlatList
                  data={available}
                  keyExtractor={(item: any) => item.id}
                  renderItem={({ item }: any) => (
                    <TouchableOpacity
                      style={cs.pickerRow}
                      onPress={() => {
                        setShowAddKid(false);
                        createKidDraft({ variables: { conversationId, kidId: item.id } })
                          .catch((e: any) => Alert.alert('Error', e.message));
                      }}
                    >
                      {item.avatarUrl
                        ? <Image source={{ uri: item.avatarUrl }} style={cs.pickerAvatar} contentFit="cover" cachePolicy="memory-disk" transition={0} />
                        : <View style={[cs.pickerAvatar, cs.pickerAvatarFallback]}>
                            <Text style={cs.pickerAvatarTxt}>{item.name[0]}</Text>
                          </View>}
                      <Text style={cs.pickerName}>{item.name}</Text>
                    </TouchableOpacity>
                  )}
                />
              );
            })()}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function DraftBlock({
  draft, readOnly, onToggle, onUpdateText,
}: {
  draft: { id: string; content: string; payload: DraftPayload };
  readOnly: boolean;
  onToggle: (val: boolean) => void;
  onUpdateText: (content: string) => void;
}) {
  const enabled = draft.payload.enabled !== false;
  const [text, setText] = useState(draft.content);
  const textRef = useRef(draft.content);

  useEffect(() => { setText(draft.content); textRef.current = draft.content; }, [draft.content]);

  return (
    <View style={dc.block}>
      <View style={dc.blockHead}>
        <View style={dc.kidAvatar}>
          {draft.payload.avatar_url
            ? <Image source={{ uri: draft.payload.avatar_url }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" transition={0} />
            : <Text style={dc.kidAvatarTxt}>{(draft.payload.kid_name ?? '?')[0]}</Text>}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={dc.kidName}>{draft.payload.kid_name}</Text>
          <Text style={dc.kidMeta}>
            {draft.payload.photo_keys?.length ?? 0} photo{(draft.payload.photo_keys?.length ?? 0) === 1 ? '' : 's'}
          </Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={onToggle}
          trackColor={{ false: Colors.border, true: Colors.primary }}
          thumbColor={Colors.white}
          style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
        />
      </View>

      {enabled && (
        <>
          {(draft.payload.photo_urls ?? []).length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }} contentContainerStyle={{ gap: 6 }}>
              {draft.payload.photo_urls.map((url, i) =>
                !!url && <Image key={i} source={{ uri: url }} style={dc.photoThumb} contentFit="cover" cachePolicy="memory-disk" transition={0} />,
              )}
            </ScrollView>
          )}
          <TextInput
            style={dc.draftInput}
            value={text}
            onChangeText={v => { setText(v); textRef.current = v; }}
            onBlur={() => {
              const cur = textRef.current.trim();
              if (cur && cur !== draft.content) onUpdateText(cur);
            }}
            multiline
            textAlignVertical="top"
            placeholder="Update text…"
            placeholderTextColor={Colors.textSecondary}
            editable={!readOnly}
          />
          {!readOnly && (
            <View style={dc.chipRow}>
              {['Make warmer', 'Shorter', 'More detail'].map(label => (
                <TouchableOpacity key={label} style={dc.chip}>
                  <Text style={dc.chipTxt}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </>
      )}

      {!enabled && (
        <Text style={dc.skippedHint}>This update will not be sent</Text>
      )}
    </View>
  );
}

// ── Main ConversationScreen ─────────────────────────────────────────────────

export default function ConversationScreen({ route, navigation }: any) {
  const conversationId: string = route.params.conversationId;
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { setActiveConversationId } = useQuickLog();

  const [isTerminal, setIsTerminal] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ tabBarStyle: { display: 'none' } });
      return () => navigation.getParent()?.setOptions({ tabBarStyle: undefined });
    }, [navigation]),
  );

  useEffect(() => {
    const show = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hide = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const s1 = Keyboard.addListener(show, e => setKeyboardHeight(e.endCoordinates.height));
    const s2 = Keyboard.addListener(hide, () => setKeyboardHeight(0));
    return () => { s1.remove(); s2.remove(); };
  }, []);

  const [inputText, setInputText] = useState('');
  const inputRef = useRef<TextInput>(null);
  const inputTextRef = useRef('');
  const scrollRef = useRef<ScrollView>(null);

  const { data, loading } = useQuery(CONVERSATION_QUERY, {
    variables: { id: conversationId },
    fetchPolicy: 'cache-and-network',
    pollInterval: isTerminal || !isFocused ? 0 : 3000,
  });

  const [sendChatMessage, { loading: sendingChat }] = useMutation(SEND_CHAT_MESSAGE);
  const [confirmPhotoReview, { loading: confirming }] = useMutation(CONFIRM_PHOTO_REVIEW);
  const [sendDrafts, { loading: sending }] = useMutation(SEND_DRAFTS);

  const [streamed, setStreamed] = useState<Message[]>([]);
  useSubscription(MESSAGE_ADDED, {
    variables: { conversationId },
    onData: ({ data: sub }) => {
      const m = sub?.data?.messageAdded;
      if (m) setStreamed(prev => prev.some(x => x.id === m.id) ? prev : [...prev, m]);
    },
  });

  const initialMessages: Message[] = data?.conversation?.messages ?? [];
  const mergedById = new Map<string, Message>();
  initialMessages.forEach(m => mergedById.set(m.id, m));
  streamed.forEach(m => mergedById.set(m.id, m));
  const messages = [...mergedById.values()].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  const status = data?.conversation?.status ?? 'pending';
  const agentType = data?.conversation?.agentType ?? 'chat';
  const title = data?.conversation?.title ?? 'Conversation';
  const allPhotoKeys: string[] = data?.conversation?.allPhotoKeys ?? [];
  const allPhotoUrls: string[] = data?.conversation?.allPhotoUrls ?? [];
  const photos = allPhotoKeys.map((key: string, i: number) => ({ key, url: allPhotoUrls[i] ?? '' }));

  const draftMessages = messages.filter(m => m.kind === 'draft_card');
  const draftsForMatching: Array<{ id: string; payload: DraftPayload }> = draftMessages.map(m => {
    let payload: DraftPayload = { kid_id: '', kid_name: '', avatar_url: null, photo_keys: [], photo_urls: [], enabled: true };
    try { payload = { ...payload, ...JSON.parse(m.payloadJson || '{}') }; } catch {}
    return { id: m.id, payload };
  });
  const draftsForReview: Array<{ id: string; content: string; payload: DraftPayload }> = draftMessages.map(m => {
    let payload: DraftPayload = { kid_id: '', kid_name: '', avatar_url: null, photo_keys: [], photo_urls: [], enabled: true };
    try { payload = { ...payload, ...JSON.parse(m.payloadJson || '{}') }; } catch {}
    return { id: m.id, content: m.content, payload };
  });

  const isProcessing = isActive(status);
  const showPhotoCard = agentType === 'quick_log' && status === 'awaiting_photo_review';
  const showDraftCard = agentType === 'quick_log' && (status === 'awaiting_review' || status === 'sent');
  const showInput = agentType !== 'quick_log' && status !== 'sent';

  const enabledDraftCount = draftsForReview.filter(d => d.payload.enabled !== false).length;

  useEffect(() => {
    if (status === 'sent' || status === 'failed') {
      setIsTerminal(true);
      if (status === 'sent') setActiveConversationId(null);
    }
  }, [status]);

  useEffect(() => {
    if (keyboardHeight > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    }
  }, [keyboardHeight]);

  const handleSendChat = () => {
    setTimeout(async () => {
      const text = inputTextRef.current.trim();
      if (!text) return;
      setInputText(''); inputTextRef.current = '';
      try {
        const { data: d } = await sendChatMessage({ variables: { conversationId, content: text } });
        const msg = d?.sendChatMessage;
        if (msg) setStreamed(prev => prev.some(x => x.id === msg.id) ? prev : [...prev, msg]);
      } catch (e: any) {
        Alert.alert('Failed to send', e.message ?? 'Please try again');
        setInputText(text); inputTextRef.current = text;
      }
    }, 0);
  };

  const handleConfirmPhotos = async () => {
    try {
      await confirmPhotoReview({ variables: { conversationId } });
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Please try again');
    }
  };

  const handleSendDrafts = async () => {
    if (enabledDraftCount === 0) {
      Alert.alert('No updates selected', 'Enable at least one child\'s update to send.');
      return;
    }
    try {
      await sendDrafts({ variables: { conversationId } });
    } catch (e: any) {
      Alert.alert('Failed to send', e.message ?? 'Please try again');
    }
  };

  const lastProgress = isProcessing
    ? [...messages].reverse().find(m => m.kind === 'progress')
    : null;
  const visibleMessages = messages.filter(
    m => m.kind !== 'progress' && m.kind !== 'draft_card',
  );

  if (loading && messages.length === 0) {
    return (
      <View style={[s.loading, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={[s.root, { paddingBottom: keyboardHeight }]}>
      {/* Custom header */}
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          style={s.backBtn}
        >
          <Text style={s.backBtnTxt}>‹</Text>
        </TouchableOpacity>
        <View style={s.sparkleAvatar}>
          <Text style={{ fontSize: 14, color: Colors.white }}>✨</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle} numberOfLines={1}>
            {agentType === 'quick_log' ? 'Today\'s Quick Log' : title}
          </Text>
          <Text style={s.headerSub} numberOfLines={1}>
            {agentType === 'quick_log'
              ? `${photos.length} photos · ${draftsForMatching.length} kids`
              : phaseLabel(status)}
          </Text>
        </View>
      </View>

      {/* Chat body */}
      <ScrollView
        ref={scrollRef}
        style={s.scroll}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={scrollEnabled}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {/* Visible chat messages */}
        {visibleMessages.map(m => <MessageRow key={m.id} message={m} />)}

        {/* Working indicator */}
        {isProcessing && (
          <View style={s.thinkingRow}>
            <WorkingDots color={Colors.primary} />
            <Text style={s.thinkingTxt}>{lastProgress?.content ?? 'Working…'}</Text>
          </View>
        )}

        {/* Inline PhotoMatchingCard */}
        {photos.length > 0 && (showPhotoCard || showDraftCard) && (
          <PhotoMatchingCard
            conversationId={conversationId}
            photos={photos}
            drafts={draftsForMatching}
            readOnly={!showPhotoCard}
            onDragStateChange={setScrollEnabled.bind(null)}
          />
        )}

        {/* Inline DraftsCard */}
        {showDraftCard && draftsForReview.length > 0 && (
          <DraftsCard
            conversationId={conversationId}
            drafts={draftsForReview}
            readOnly={status === 'sent'}
          />
        )}

        {/* Sent confirmation */}
        {status === 'sent' && (
          <View style={s.sentRow}>
            <Text style={s.sentTxt}>✅  Sent to {enabledDraftCount} famil{enabledDraftCount === 1 ? 'y' : 'ies'}</Text>
            <Text style={s.sentSub}>Parents will see the update in their feed.</Text>
          </View>
        )}
      </ScrollView>

      {/* Sticky action bar */}
      <View style={[s.actionBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        {/* Chat input (non quick_log) */}
        {showInput && (
          <View style={s.inputRow}>
            <TextInput
              ref={inputRef}
              style={s.chatInput}
              value={inputText}
              onChangeText={v => { setInputText(v); inputTextRef.current = v; }}
              placeholder="Message AI…"
              placeholderTextColor={Colors.textSecondary}
              multiline
              maxLength={2000}
            />
            <TouchableOpacity
              style={[s.sendBtn, (!inputText.trim() || sendingChat) && s.sendBtnOff]}
              onPress={handleSendChat}
              disabled={!inputText.trim() || sendingChat}
            >
              {sendingChat
                ? <ActivityIndicator size="small" color={Colors.white} />
                : <Text style={s.sendBtnTxt}>↑</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* Confirm photo matching */}
        {showPhotoCard && (
          <TouchableOpacity
            style={[s.ctaBtn, (confirming || draftsForMatching.length === 0) && s.ctaBtnOff]}
            onPress={handleConfirmPhotos}
            disabled={confirming || draftsForMatching.length === 0}
          >
            {confirming
              ? <ActivityIndicator color={Colors.white} />
              : <Text style={s.ctaBtnTxt}>
                  Confirm matches · write {draftsForMatching.filter(d => d.payload.enabled !== false).length} updates
                </Text>}
          </TouchableOpacity>
        )}

        {/* Send drafts */}
        {status === 'awaiting_review' && (
          <TouchableOpacity
            style={[s.ctaBtn, (sending || enabledDraftCount === 0) && s.ctaBtnOff]}
            onPress={handleSendDrafts}
            disabled={sending || enabledDraftCount === 0}
          >
            {sending
              ? <ActivityIndicator color={Colors.white} />
              : <Text style={s.ctaBtnTxt}>
                  📤  Send to {enabledDraftCount} famil{enabledDraftCount === 1 ? 'y' : 'ies'}
                </Text>}
          </TouchableOpacity>
        )}

        {/* Working pill */}
        {isProcessing && (
          <View style={s.workingPill}>
            <WorkingDots color={Colors.primary} />
            <Text style={s.workingTxt}>{phaseLabel(status)}</Text>
          </View>
        )}

        {/* Sent — back to AI */}
        {status === 'sent' && (
          <TouchableOpacity style={s.secondaryBtn} onPress={() => navigation.goBack()}>
            <Text style={s.secondaryBtnTxt}>Back to AI</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ── MessageRow ──────────────────────────────────────────────────────────────

function MessageRow({ message }: { message: Message }) {
  if (message.role === 'user' && message.kind === 'text') {
    return (
      <View style={s.userBubbleRow}>
        <View style={s.userBubble}>
          <Text style={s.userBubbleTxt}>{message.content}</Text>
        </View>
        <Text style={s.msgTime}>{fmtTime(message.createdAt)}</Text>
      </View>
    );
  }
  if (message.kind === 'text') {
    return (
      <View style={s.aiBubbleRow}>
        <View style={s.aiAvatar}>
          <Text style={{ fontSize: 10, color: Colors.white }}>✨</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={s.aiBubble}>
            <Text style={s.aiBubbleTxt}>{message.content}</Text>
          </View>
          <Text style={[s.msgTime, { marginLeft: 6 }]}>{fmtTime(message.createdAt)}</Text>
        </View>
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

// ── Styles — conversation ───────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg },

  // Custom header
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingBottom: 12,
    backgroundColor: Colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border,
  },
  backBtn: { padding: 4 },
  backBtnTxt: { fontSize: 28, color: Colors.primary, lineHeight: 28 },
  sparkleAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  headerSub: { fontSize: 11, color: Colors.textSecondary, marginTop: 1 },

  // Scroll
  scroll: { flex: 1 },
  content: { padding: 12, paddingBottom: 20, gap: 12 },

  // Message bubbles
  userBubbleRow: { alignItems: 'flex-end' },
  userBubble: {
    maxWidth: '82%', padding: 12,
    backgroundColor: Colors.primary,
    borderRadius: 16, borderBottomRightRadius: 4,
  },
  userBubbleTxt: { fontSize: 14, color: Colors.white, lineHeight: 20 },
  msgTime: { fontSize: 10, color: Colors.textSecondary, marginTop: 4 },

  aiBubbleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  aiAvatar: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    flex: 0,
    marginTop: 2,
  },
  aiBubble: {
    backgroundColor: Colors.card,
    borderRadius: 16, borderTopLeftRadius: 4,
    padding: 12, maxWidth: '85%',
    ...Shadow.small,
  },
  aiBubbleTxt: { fontSize: 14, color: Colors.textPrimary, lineHeight: 20 },

  actionRow: { paddingHorizontal: 4 },
  actionTxt: { fontSize: 13, color: Colors.success, fontWeight: '600' },

  thinkingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 32,
  },
  thinkingTxt: { fontSize: 13, color: Colors.textSecondary, fontStyle: 'italic' },

  sentRow: { alignItems: 'center', paddingVertical: 20 },
  sentTxt: { fontSize: 16, fontWeight: '600', color: Colors.success },
  sentSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },

  // Action bar
  actionBar: {
    backgroundColor: Colors.card,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border,
    paddingHorizontal: 16, paddingTop: 10,
  },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 4 },
  chatInput: {
    flex: 1, backgroundColor: Colors.bg,
    borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    fontSize: 15, color: Colors.textPrimary, maxHeight: 110,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnOff: { opacity: 0.4 },
  sendBtnTxt: { color: Colors.white, fontSize: 20, fontWeight: '700', lineHeight: 22 },

  ctaBtn: {
    backgroundColor: Colors.primary, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center', marginBottom: 4,
  },
  ctaBtnOff: { opacity: 0.45 },
  ctaBtnTxt: { color: Colors.white, fontSize: 15, fontWeight: '600' },

  workingPill: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 13, borderRadius: 14,
    backgroundColor: Colors.primaryLight, marginBottom: 4,
  },
  workingTxt: { fontSize: 14, fontWeight: '500', color: Colors.primary },

  secondaryBtn: {
    borderRadius: 14, borderWidth: 1.5, borderColor: Colors.primary,
    paddingVertical: 13, alignItems: 'center', marginBottom: 4,
  },
  secondaryBtnTxt: { color: Colors.primary, fontSize: 15, fontWeight: '600' },
});

// ── Styles — photo matching card ────────────────────────────────────────────

const cs = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: Colors.border,
    ...Shadow.small,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardEyebrow: { fontSize: 11, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase', color: Colors.textSecondary },
  unmatchedPill: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8,
  },
  unmatchedTxt: { fontSize: 11, color: Colors.primary, fontWeight: '600' },
  carousel: { marginHorizontal: -14, marginBottom: 8 },
  hint: { fontSize: 11, color: Colors.textSecondary, marginBottom: 12 },

  photoTile: {
    width: 68, height: 68, borderRadius: 10, overflow: 'hidden', position: 'relative',
  },
  photoTileImg: { width: '100%', height: '100%' },
  unmatchedBadge: {
    position: 'absolute', top: 4, right: 4,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: Colors.danger,
    alignItems: 'center', justifyContent: 'center',
  },
  assignedBadge: {
    position: 'absolute', bottom: 4, right: 4,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },

  dropZone: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 10, borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed',
  },
  dropZoneSkipped: { opacity: 0.45 },
  kidAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  kidAvatarTxt: { color: Colors.primary, fontSize: 14, fontWeight: '700' },
  kidName: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  noPhotos: { fontSize: 11, color: Colors.textSecondary, fontStyle: 'italic' },
  assignedThumb: { width: 28, height: 28, borderRadius: 6 },

  addKidBtn: {
    marginTop: 10, paddingVertical: 10,
    borderWidth: 1.5, borderColor: Colors.primary, borderStyle: 'dashed',
    borderRadius: 12, alignItems: 'center',
  },
  addKidBtnTxt: { color: Colors.primary, fontSize: 13, fontWeight: '600' },

  pickerSheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 16, borderTopRightRadius: 16,
    paddingTop: Spacing.md, paddingBottom: 32, maxHeight: '60%',
  },
  pickerTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, paddingHorizontal: Spacing.md, marginBottom: Spacing.md },
  pickerEmpty: { color: Colors.textSecondary, textAlign: 'center', padding: Spacing.lg },
  pickerRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border,
  },
  pickerAvatar: { width: 36, height: 36, borderRadius: 18 },
  pickerAvatarFallback: { backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  pickerAvatarTxt: { color: Colors.primary, fontWeight: '700', fontSize: 15 },
  pickerName: { fontSize: 15, color: Colors.textPrimary, fontWeight: '500' },

  dragGhost: {
    position: 'absolute', zIndex: 999,
    borderRadius: 10, overflow: 'hidden',
    opacity: 0.85, ...Shadow.medium,
  },
  dragGhostImg: { width: 72, height: 72 },
});

// ── Styles — drafts card ────────────────────────────────────────────────────

const dc = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: Colors.border,
    ...Shadow.small,
  },
  eyebrow: {
    fontSize: 11, fontWeight: '600', letterSpacing: 1.2,
    textTransform: 'uppercase', color: Colors.textSecondary,
  },
  block: {
    backgroundColor: Colors.bg,
    borderRadius: 12, padding: 12,
  },
  blockHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  kidAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  kidAvatarTxt: { color: Colors.primary, fontSize: 14, fontWeight: '700' },
  kidName: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  kidMeta: { fontSize: 11, color: Colors.textSecondary, marginTop: 1 },
  photoThumb: { width: 44, height: 44, borderRadius: 8 },
  draftInput: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 13, color: Colors.textPrimary, lineHeight: 19,
    minHeight: 76, backgroundColor: Colors.card, textAlignVertical: 'top',
  },
  chipRow: { flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 999, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  chipTxt: { fontSize: 11, color: Colors.textPrimary, fontWeight: '500' },
  skippedHint: { fontSize: 13, color: Colors.textSecondary, fontStyle: 'italic', marginTop: 4 },
  addKidBtn: {
    marginTop: 12, paddingVertical: 10,
    borderWidth: 1.5, borderColor: Colors.primary, borderStyle: 'dashed',
    borderRadius: 12, alignItems: 'center',
  },
  addKidBtnTxt: { color: Colors.primary, fontSize: 13, fontWeight: '600' },
});
