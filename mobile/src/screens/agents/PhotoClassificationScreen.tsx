import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Image, TouchableOpacity,
  PanResponder, Animated, Alert, ActivityIndicator, Switch,
  Modal, FlatList,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { gql, useQuery, useMutation } from '@apollo/client';
import { Colors, Spacing, Radius, Shadow } from '../../theme';

const REVIEW_QUERY = gql`
  query PhotoClassification($id: ID!) {
    conversation(id: $id) {
      id
      status
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

const ASSIGN_PHOTO = gql`
  mutation AssignDraftPhotoPC($messageId: ID!, $photoKey: String!) {
    assignDraftPhoto(messageId: $messageId, photoKey: $photoKey) {
      id
      payloadJson
    }
  }
`;

const REMOVE_PHOTO = gql`
  mutation RemoveDraftPhoto($messageId: ID!, $photoKey: String!) {
    removeDraftPhoto(messageId: $messageId, photoKey: $photoKey) {
      id
      payloadJson
    }
  }
`;

const TOGGLE_ENABLED = gql`
  mutation ToggleDraftEnabledPC($messageId: ID!, $enabled: Boolean!) {
    toggleDraftEnabled(messageId: $messageId, enabled: $enabled) {
      id
      payloadJson
    }
  }
`;

const KIDS_FOR_CONVERSATION = gql`
  query KidsForConversationPC($conversationId: ID!) {
    kidsForConversation(conversationId: $conversationId) {
      id
      name
      avatarUrl
    }
  }
`;

const CREATE_KID_DRAFT = gql`
  mutation CreateKidDraftPC($conversationId: ID!, $kidId: ID!) {
    createKidDraft(conversationId: $conversationId, kidId: $kidId) {
      id
      role
      kind
      content
      payloadJson
      createdAt
    }
  }
`;

const CONFIRM_PHOTO_REVIEW = gql`
  mutation ConfirmPhotoReview($conversationId: ID!) {
    confirmPhotoReview(conversationId: $conversationId) {
      id
      status
    }
  }
`;

interface DraftPayload {
  kid_id: string;
  kid_name: string;
  avatar_url: string | null;
  photo_keys: string[];
  photo_urls: string[];
  enabled?: boolean;
}

export default function PhotoClassificationScreen({ route, navigation }: any) {
  const { conversationId } = route.params;

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ tabBarStyle: { display: 'none' } });
      return () => navigation.getParent()?.setOptions({ tabBarStyle: undefined });
    }, [navigation])
  );

  const { data, loading } = useQuery(REVIEW_QUERY, {
    variables: { id: conversationId },
    fetchPolicy: 'cache-first',
  });

  const [assignPhoto] = useMutation(ASSIGN_PHOTO, {
    update(cache, { data: mutData }) {
      const updated = mutData?.assignDraftPhoto;
      if (!updated) return;
      cache.modify({
        id: cache.identify({ __typename: 'Message', id: updated.id }),
        fields: { payloadJson: () => updated.payloadJson },
      });
    },
  });

  const [removePhoto] = useMutation(REMOVE_PHOTO, {
    update(cache, { data: mutData }) {
      const updated = mutData?.removeDraftPhoto;
      if (!updated) return;
      cache.modify({
        id: cache.identify({ __typename: 'Message', id: updated.id }),
        fields: { payloadJson: () => updated.payloadJson },
      });
    },
  });

  const [toggleEnabled] = useMutation(TOGGLE_ENABLED, {
    update(cache, { data: mutData }) {
      const updated = mutData?.toggleDraftEnabled;
      if (!updated) return;
      cache.modify({
        id: cache.identify({ __typename: 'Message', id: updated.id }),
        fields: { payloadJson: () => updated.payloadJson },
      });
    },
  });

  const [createKidDraft] = useMutation(CREATE_KID_DRAFT, {
    update(cache, { data: mutData }) {
      const newMsg = mutData?.createKidDraft;
      if (!newMsg) return;
      cache.modify({
        id: cache.identify({ __typename: 'Conversation', id: conversationId }),
        fields: {
          messages(existing = []) {
            return [...existing, { __ref: cache.identify({ __typename: 'Message', id: newMsg.id }) }];
          },
        },
      });
      cache.writeFragment({
        id: cache.identify({ __typename: 'Message', id: newMsg.id }),
        fragment: gql`fragment NewMsgPC on Message { id role kind content payloadJson createdAt }`,
        data: newMsg,
      });
    },
  });

  const [confirmPhotoReview, { loading: confirming }] = useMutation(CONFIRM_PHOTO_REVIEW);
  const [showPicker, setShowPicker] = useState(false);

  const { data: kidsData } = useQuery(KIDS_FOR_CONVERSATION, {
    variables: { conversationId },
    skip: !showPicker,
    fetchPolicy: 'cache-first',
  });

  const convo = data?.conversation;
  const allPhotoKeys: string[] = convo?.allPhotoKeys ?? [];
  const allPhotoUrls: string[] = convo?.allPhotoUrls ?? [];
  const photos = allPhotoKeys.map((key: string, i: number) => ({ key, url: allPhotoUrls[i] ?? '' }));

  const drafts: Array<{ id: string; payload: DraftPayload }> =
    (convo?.messages ?? [])
      .filter((m: any) => m.kind === 'draft_card')
      .map((m: any) => {
        let payload: DraftPayload = { kid_id: '', kid_name: '', avatar_url: null, photo_keys: [], photo_urls: [] };
        try { payload = { ...payload, ...JSON.parse(m.payloadJson || '{}') }; } catch {}
        return { id: m.id, payload };
      });

  // ── Drag state ────────────────────────────────────────────────────────────
  const [draggingPhoto, setDraggingPhoto] = useState<{ key: string; url: string } | null>(null);
  const draggingRef = useRef<{ key: string; url: string } | null>(null);
  const dragX = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  const kidCardRefs = useRef<{ [msgId: string]: View | null }>({});

  const handleDragStart = useCallback((key: string, url: string, px: number, py: number) => {
    const photo = { key, url };
    draggingRef.current = photo;
    setDraggingPhoto(photo);
    dragX.setValue(px - 36);
    dragY.setValue(py - 36);
  }, []);

  const handleDragMove = useCallback((px: number, py: number) => {
    dragX.setValue(px - 36);
    dragY.setValue(py - 36);
  }, []);

  const handleDragEnd = useCallback((px: number, py: number) => {
    const photo = draggingRef.current;
    draggingRef.current = null;
    setDraggingPhoto(null);
    if (!photo) return;
    Object.entries(kidCardRefs.current).forEach(([msgId, ref]) => {
      ref?.measureInWindow((rx, ry, rw, rh) => {
        if (px >= rx && px <= rx + rw && py >= ry && py <= ry + rh) {
          assignPhoto({ variables: { messageId: msgId, photoKey: photo.key } });
        }
      });
    });
  }, [assignPhoto]);

  const handleConfirm = async () => {
    try {
      await confirmPhotoReview({ variables: { conversationId } });
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Please try again');
    }
  };

  if (loading && !convo) {
    return (
      <View style={s.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={s.screen}>
      {/* ── Photo strip ──────────────────────────────────────────────── */}
      {photos.length > 0 && (
        <View style={s.photoSection}>
          <Text style={s.photoHint}>Drag a photo onto a child's card to assign it</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.photoStripContent}
            scrollEnabled={!draggingPhoto}
          >
            {photos.map(p => (
              <DraggablePhoto
                key={p.key}
                photoKey={p.key}
                photoUrl={p.url}
                onDragStart={handleDragStart}
                onDragMove={handleDragMove}
                onDragEnd={handleDragEnd}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* ── Kid cards ────────────────────────────────────────────────── */}
      <ScrollView style={s.list} contentContainerStyle={s.listContent}>
        {drafts.map(draft => (
          <KidCard
            key={draft.id}
            draft={draft}
            refCallback={(r: View | null) => { kidCardRefs.current[draft.id] = r; }}
            onToggle={enabled => toggleEnabled({ variables: { messageId: draft.id, enabled } })}
            onRemovePhoto={photoKey => removePhoto({ variables: { messageId: draft.id, photoKey } })}
          />
        ))}
        {drafts.length === 0 && (
          <Text style={s.empty}>No children detected. Add children manually below.</Text>
        )}
        <TouchableOpacity style={s.addKidBtn} onPress={() => setShowPicker(true)} activeOpacity={0.75}>
          <Text style={s.addKidBtnTxt}>+ Add child</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ── Add child picker ─────────────────────────────────────────── */}
      <Modal visible={showPicker} transparent animationType="slide" onRequestClose={() => setShowPicker(false)}>
        <TouchableOpacity style={s.modalBackdrop} activeOpacity={1} onPress={() => setShowPicker(false)} />
        <View style={s.modalSheet}>
          <Text style={s.modalTitle}>Add child</Text>
          {(() => {
            const existing = new Set(drafts.map(d => d.payload.kid_id));
            const available = (kidsData?.kidsForConversation ?? []).filter((k: any) => !existing.has(k.id));
            if (available.length === 0) {
              return <Text style={s.modalEmpty}>All children already added.</Text>;
            }
            return (
              <FlatList
                data={available}
                keyExtractor={(item: any) => item.id}
                renderItem={({ item }: any) => (
                  <TouchableOpacity
                    style={s.modalRow}
                    onPress={() => {
                      setShowPicker(false);
                      createKidDraft({ variables: { conversationId, kidId: item.id } })
                        .catch(e => Alert.alert('Error', e.message));
                    }}
                    activeOpacity={0.7}
                  >
                    {item.avatarUrl
                      ? <Image source={{ uri: item.avatarUrl }} style={s.modalAvatar} />
                      : <View style={[s.modalAvatar, s.modalAvatarFallback]}>
                          <Text style={s.modalAvatarTxt}>{item.name[0]}</Text>
                        </View>}
                    <Text style={s.modalName}>{item.name}</Text>
                  </TouchableOpacity>
                )}
              />
            );
          })()}
        </View>
      </Modal>

      {/* ── Confirm footer ───────────────────────────────────────────── */}
      <View style={s.footer}>
        <TouchableOpacity
          style={[s.confirmBtn, confirming && s.confirmBtnOff]}
          onPress={handleConfirm}
          disabled={confirming}
          activeOpacity={0.85}
        >
          {confirming
            ? <ActivityIndicator color={Colors.white} />
            : <Text style={s.confirmBtnTxt}>✅  Confirm & Summarise</Text>}
        </TouchableOpacity>
      </View>

      {/* ── Drag overlay ─────────────────────────────────────────────── */}
      {draggingPhoto && (
        <Animated.View
          pointerEvents="none"
          style={[s.dragOverlay, { transform: [{ translateX: dragX }, { translateY: dragY }] }]}
        >
          <Image source={{ uri: draggingPhoto.url }} style={s.dragThumb} />
        </Animated.View>
      )}
    </View>
  );
}

// ── DraggablePhoto ────────────────────────────────────────────────────────

function DraggablePhoto({ photoKey, photoUrl, onDragStart, onDragMove, onDragEnd }: {
  photoKey: string; photoUrl: string;
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
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: evt => startRef.current(photoKey, photoUrl, evt.nativeEvent.pageX, evt.nativeEvent.pageY),
      onPanResponderMove: evt => moveRef.current(evt.nativeEvent.pageX, evt.nativeEvent.pageY),
      onPanResponderRelease: evt => endRef.current(evt.nativeEvent.pageX, evt.nativeEvent.pageY),
      onPanResponderTerminate: evt => endRef.current(evt.nativeEvent.pageX, evt.nativeEvent.pageY),
    })
  ).current;

  return (
    <View {...panResponder.panHandlers} style={s.photoItem}>
      <Image source={{ uri: photoUrl }} style={s.photoThumb} />
    </View>
  );
}

// ── KidCard ───────────────────────────────────────────────────────────────

function KidCard({ draft, refCallback, onToggle, onRemovePhoto }: {
  draft: { id: string; payload: DraftPayload };
  refCallback: (r: View | null) => void;
  onToggle: (enabled: boolean) => void;
  onRemovePhoto: (photoKey: string) => void;
}) {
  const { payload } = draft;
  const enabled = payload.enabled !== false;

  return (
    <View ref={refCallback} style={[s.kidCard, !enabled && s.kidCardDisabled]}>
      <View style={s.kidHead}>
        {payload.avatar_url
          ? <Image source={{ uri: payload.avatar_url }} style={s.avatar} />
          : <View style={[s.avatar, s.avatarFallback]}>
              <Text style={s.avatarFallbackTxt}>{payload.kid_name?.[0] ?? '?'}</Text>
            </View>}
        <Text style={s.kidName}>{payload.kid_name}</Text>
        <Switch
          value={enabled}
          onValueChange={onToggle}
          trackColor={{ false: Colors.border, true: Colors.primary }}
          thumbColor={Colors.white}
        />
      </View>

      {enabled && payload.photo_urls && payload.photo_urls.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.assignedStrip}>
          {payload.photo_urls.map((url, i) =>
            !!url && (
              <View key={i} style={s.assignedPhotoWrap}>
                <Image source={{ uri: url }} style={s.assignedPhoto} />
                <TouchableOpacity
                  style={s.removeBtn}
                  onPress={() => onRemovePhoto(payload.photo_keys[i])}
                  hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
                >
                  <Text style={s.removeBtnTxt}>×</Text>
                </TouchableOpacity>
              </View>
            )
          )}
        </ScrollView>
      )}

      {enabled && (!payload.photo_keys || payload.photo_keys.length === 0) && (
        <View style={s.dropZone}>
          <Text style={s.dropZoneTxt}>Drop a photo here</Text>
        </View>
      )}

      {!enabled && <Text style={s.disabledHint}>This child will be skipped</Text>}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg },

  photoSection: {
    backgroundColor: Colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border,
    paddingTop: Spacing.sm,
  },
  photoHint: { fontSize: 12, color: Colors.textSecondary, paddingHorizontal: Spacing.md, marginBottom: 8 },
  photoStripContent: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm, gap: 8 },
  photoItem: { borderRadius: Radius.sm, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent' },
  photoThumb: { width: 80, height: 80, borderRadius: Radius.sm },

  list: { flex: 1 },
  listContent: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: 24 },
  empty: { textAlign: 'center', color: Colors.textSecondary, marginTop: 40 },
  addKidBtn: {
    marginTop: Spacing.sm, paddingVertical: 12,
    borderWidth: 1.5, borderColor: Colors.primary, borderStyle: 'dashed',
    borderRadius: Radius.md, alignItems: 'center',
  },
  addKidBtnTxt: { color: Colors.primary, fontSize: 14, fontWeight: '600' },

  kidCard: {
    backgroundColor: Colors.card, borderRadius: Radius.md,
    padding: Spacing.md, ...Shadow.small,
    borderLeftWidth: 3, borderLeftColor: Colors.primary,
  },
  kidCardDisabled: { opacity: 0.5, borderLeftColor: Colors.border },
  kidHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarFallback: { backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  avatarFallbackTxt: { color: Colors.primary, fontWeight: '700' },
  kidName: { flex: 1, fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  disabledHint: { fontSize: 13, color: Colors.textSecondary, fontStyle: 'italic', marginTop: 4 },

  assignedStrip: { marginTop: Spacing.sm },
  assignedPhotoWrap: { position: 'relative', marginRight: 8 },
  assignedPhoto: { width: 64, height: 64, borderRadius: Radius.sm },
  removeBtn: {
    position: 'absolute', top: -6, right: -6,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: Colors.textPrimary,
    alignItems: 'center', justifyContent: 'center',
  },
  removeBtnTxt: { color: Colors.white, fontSize: 14, lineHeight: 18, fontWeight: '700' },

  dropZone: {
    marginTop: Spacing.sm, borderWidth: 1, borderColor: Colors.border,
    borderStyle: 'dashed', borderRadius: Radius.sm,
    paddingVertical: 12, alignItems: 'center',
  },
  dropZoneTxt: { fontSize: 12, color: Colors.textSecondary },

  footer: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, paddingBottom: 24,
    backgroundColor: Colors.bg,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border,
  },
  confirmBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.sm,
    paddingVertical: 15, alignItems: 'center', ...Shadow.small,
  },
  confirmBtnOff: { opacity: 0.4 },
  confirmBtnTxt: { color: Colors.white, fontSize: 15, fontWeight: '700' },

  dragOverlay: {
    position: 'absolute', zIndex: 999,
    borderRadius: Radius.sm, overflow: 'hidden',
    opacity: 0.85, ...Shadow.small,
  },
  dragThumb: { width: 72, height: 72, borderRadius: Radius.sm },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    backgroundColor: Colors.card, borderTopLeftRadius: 16, borderTopRightRadius: 16,
    paddingTop: Spacing.md, paddingBottom: 32, maxHeight: '60%',
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, paddingHorizontal: Spacing.md, marginBottom: Spacing.sm },
  modalEmpty: { color: Colors.textSecondary, textAlign: 'center', padding: Spacing.lg },
  modalRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border,
  },
  modalAvatar: { width: 36, height: 36, borderRadius: 18 },
  modalAvatarFallback: { backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  modalAvatarTxt: { color: Colors.primary, fontWeight: '700', fontSize: 15 },
  modalName: { fontSize: 15, color: Colors.textPrimary, fontWeight: '500' },
});
