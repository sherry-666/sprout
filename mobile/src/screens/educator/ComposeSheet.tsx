import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, ActivityIndicator, Image, Alert, Keyboard, Platform,
  Animated,
} from 'react-native';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import * as ImagePicker from 'expo-image-picker';
import { gql, useQuery, useMutation } from '@apollo/client';
import i18n from '../../i18n';
import { Colors, Spacing, Radius, Shadow } from '../../theme';

// ── GraphQL ────────────────────────────────────────────────────────────────

const MY_CLASSES_QUERY = gql`
  query ComposeSheetClasses {
    me { classes { id name kids { id } } }
  }
`;

const PRESIGN_PHOTO = gql`
  mutation PresignComposePhoto($contentType: String!) {
    presignQuickLogPhoto(contentType: $contentType) { uploadUrl objectKey }
  }
`;

const CREATE_CONVERSATION = gql`
  mutation CreateComposeConversation($classId: ID, $transcript: String, $photoKeys: [String!]) {
    createQuickLogConversation(classId: $classId, transcript: $transcript, photoKeys: $photoKeys) { id }
  }
`;

// ── Helpers ────────────────────────────────────────────────────────────────

function getLangCode(): string {
  const lang = i18n.language;
  if (lang === 'zh') return 'zh-CN';
  if (lang === 'fr') return 'fr-FR';
  return 'en-US';
}

interface PhotoItem {
  localUri: string;
  key: string | null;
  uploading: boolean;
}

// ── Props ──────────────────────────────────────────────────────────────────

export interface ComposeSheetProps {
  visible: boolean;
  initialClassId?: string | null;
  onClose: () => void;
  onSent: (conversationId: string) => void;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function ComposeSheet({ visible, initialClassId, onClose, onSent }: ComposeSheetProps) {
  const { data } = useQuery(MY_CLASSES_QUERY, { fetchPolicy: 'cache-and-network', skip: !visible });
  const [presignPhoto] = useMutation(PRESIGN_PHOTO);
  const [createConversation, { loading: creating }] = useMutation(CREATE_CONVERSATION);

  const classes: Array<{ id: string; name: string; kids: Array<{ id: string }> }> = data?.me?.classes ?? [];

  const [selectedClassId, setSelectedClassId] = useState<string | null>(initialClassId ?? null);

  useEffect(() => {
    if (visible) {
      setSelectedClassId(initialClassId ?? null);
      setNote('');
      setPhotos([]);
      setRecordSeconds(0);
      setWavePhase(0);
      if (isRecordingRef.current) {
        isRecordingRef.current = false;
        setIsRecording(false);
        ExpoSpeechRecognitionModule.stop();
      }
    }
  }, [visible, initialClassId]);

  // ── Voice state ────────────────────────────────────────────────────────
  const isRecordingRef = useRef(false);
  const [isRecording, setIsRecording] = useState(false);
  const [note, setNote] = useState('');
  const preRecordNoteRef = useRef('');
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [wavePhase, setWavePhase] = useState(0);
  const pulseAnim = useRef(new Animated.Value(0)).current;

  // ── Photos ─────────────────────────────────────────────────────────────
  const [photos, setPhotos] = useState<PhotoItem[]>([]);

  // Timer & wave
  useEffect(() => {
    if (!isRecording) { setRecordSeconds(0); return; }
    const t = setInterval(() => setRecordSeconds(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [isRecording]);

  useEffect(() => {
    if (!isRecording) return;
    const t = setInterval(() => setWavePhase(p => p + 0.12), 100);
    return () => clearInterval(t);
  }, [isRecording]);

  // Pulse ring animation
  useEffect(() => {
    if (!isRecording) { pulseAnim.setValue(0); return; }
    const loop = Animated.loop(
      Animated.timing(pulseAnim, { toValue: 1, duration: 1600, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [isRecording]);

  const pulseScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.8] });
  const pulseOpacity = pulseAnim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.5, 0.1, 0] });

  // ── Speech events ──────────────────────────────────────────────────────
  useSpeechRecognitionEvent('result', event => {
    const text = event.results[0]?.transcript ?? '';
    if (text) {
      const prefix = preRecordNoteRef.current ? preRecordNoteRef.current + ' ' : '';
      setNote(prefix + text);
    }
  });

  useSpeechRecognitionEvent('end', () => {
    isRecordingRef.current = false;
    setIsRecording(false);
  });

  useSpeechRecognitionEvent('error', event => {
    isRecordingRef.current = false;
    setIsRecording(false);
    if (event.error !== 'no-speech' && event.error !== 'aborted') {
      setNote(prev => prev || 'Transcription failed — type your note instead.');
    }
  });

  const startRecording = async () => {
    Keyboard.dismiss();
    const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!granted) {
      Alert.alert('Microphone access needed', 'Allow microphone access in Settings to record a note.');
      return;
    }
    preRecordNoteRef.current = note.trim();
    isRecordingRef.current = true;
    setIsRecording(true);
    ExpoSpeechRecognitionModule.start({ lang: getLangCode(), interimResults: true, continuous: true });
  };

  const stopRecording = () => {
    isRecordingRef.current = false;
    setIsRecording(false);
    ExpoSpeechRecognitionModule.stop();
  };

  const handleClose = () => {
    if (isRecordingRef.current) stopRecording();
    onClose();
  };

  // ── Photos ─────────────────────────────────────────────────────────────
  const pickPhotos = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Photo access needed', 'Allow photo library access in Settings.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as any,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.length) return;

    const slots = Math.min(result.assets.length, 10 - photos.length);
    const newItems: PhotoItem[] = result.assets.slice(0, slots).map(a => ({
      localUri: a.uri, key: null, uploading: true,
    }));
    setPhotos(prev => [...prev, ...newItems]);

    for (const item of newItems) {
      try {
        const { data: pd } = await presignPhoto({ variables: { contentType: 'image/jpeg' } });
        const { uploadUrl, objectKey } = pd.presignQuickLogPhoto;
        const blob = await fetch(item.localUri).then(r => r.blob());
        const res = await fetch(uploadUrl, { method: 'PUT', body: blob, headers: { 'Content-Type': 'image/jpeg' } });
        if (!res.ok) throw new Error('Upload failed');
        setPhotos(prev => prev.map(p => p.localUri === item.localUri ? { ...p, key: objectKey, uploading: false } : p));
      } catch {
        setPhotos(prev => prev.map(p => p.localUri === item.localUri ? { ...p, uploading: false } : p));
      }
    }
  };

  // ── Send ───────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (isRecordingRef.current) stopRecording();
    const uploadedKeys = photos.filter(p => p.key).map(p => p.key as string);
    if (!note.trim() && uploadedKeys.length === 0) {
      Alert.alert('Nothing to send', 'Record a voice note or add photos first.');
      return;
    }
    try {
      const { data: cd } = await createConversation({
        variables: {
          classId: selectedClassId ?? undefined,
          transcript: note.trim() || undefined,
          photoKeys: uploadedKeys.length > 0 ? uploadedKeys : undefined,
        },
      });
      const convoId = cd?.createQuickLogConversation?.id;
      if (!convoId) throw new Error('No conversation returned');
      onSent(convoId);
    } catch (e: any) {
      Alert.alert('Failed to start', e.message ?? 'Please try again');
    }
  };

  const selectedClass = selectedClassId ? classes.find(c => c.id === selectedClassId) : null;
  const uploadingAny = photos.some(p => p.uploading);
  const busy = creating || uploadingAny;

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={s.root}>
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={handleClose} />
        <View style={s.sheet}>
          {/* Grabber */}
          <View style={s.grabber} />

          {/* Header */}
          <View style={s.header}>
            <Text style={s.title}>Quick Log</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
              <Text style={s.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Subtitle */}
          <View style={s.subRow}>
            <View style={s.aiBadge}><Text style={s.aiBadgeTxt}>✨ AI</Text></View>
            <Text style={s.sub}>Speak, snap, send. We'll write to families.</Text>
          </View>

          {/* Recording control */}
          <View style={s.recCard}>
            <View>
              <Animated.View
                style={[s.pulseRing, { transform: [{ scale: pulseScale }], opacity: pulseOpacity }]}
              />
              <TouchableOpacity
                style={s.micBtn}
                onPress={() => (isRecordingRef.current ? stopRecording() : startRecording())}
                activeOpacity={0.85}
              >
                <Text style={s.micIcon}>{isRecording ? '⏸' : '🎙'}</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.recLabel, { color: isRecording ? Colors.primary : Colors.textSecondary }]}>
                {isRecording ? 'Recording…' : (note ? 'Paused' : 'Tap to record')}
              </Text>
              <View style={s.waveRow}>
                {Array.from({ length: 24 }).map((_, i) => {
                  const h = isRecording
                    ? 6 + Math.abs(Math.sin(i * 0.7 + wavePhase)) * 18
                    : 4 + Math.abs(Math.sin(i * 0.7)) * 6;
                  return (
                    <View
                      key={i}
                      style={{
                        width: 3,
                        height: Math.round(h),
                        borderRadius: 2,
                        backgroundColor: Colors.primary,
                        opacity: isRecording ? 0.7 : 0.22,
                        marginHorizontal: 1,
                      }}
                    />
                  );
                })}
              </View>
            </View>
            <Text style={s.timer}>
              {`${Math.floor(recordSeconds / 60)}:${String(recordSeconds % 60).padStart(2, '0')}`}
            </Text>
          </View>

          {/* Photo strip */}
          <View style={s.photoSection}>
            <View style={s.photoHeader}>
              <Text style={s.photoLabel}>
                Photos{photos.length > 0 ? ` · ${photos.length}` : ''}
              </Text>
              {photos.length < 10 && (
                <TouchableOpacity onPress={pickPhotos}>
                  <Text style={s.addPhotoLink}>+ Add</Text>
                </TouchableOpacity>
              )}
            </View>
            {photos.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginTop: 8 }}
                contentContainerStyle={{ gap: 8 }}
              >
                {photos.map(p => (
                  <View key={p.localUri} style={s.thumb}>
                    <Image source={{ uri: p.localUri }} style={s.thumbImg} />
                    {p.uploading ? (
                      <View style={s.thumbOver}>
                        <ActivityIndicator color={Colors.white} size="small" />
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={s.thumbX}
                        onPress={() => setPhotos(prev => prev.filter(x => x.localUri !== p.localUri))}
                      >
                        <Text style={s.thumbXTxt}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Scope pill */}
          <View style={s.scopePill}>
            <Text style={s.scopeIcon}>🏫</Text>
            <Text style={s.scopeText}>
              {selectedClass
                ? `${selectedClass.name} · ${selectedClass.kids.length} kids`
                : 'All classes'}
            </Text>
            <Text style={s.scopeChevron}>›</Text>
          </View>

          {/* Class selector chips */}
          {classes.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={s.chips}
              contentContainerStyle={{ gap: 8 }}
            >
              <TouchableOpacity
                style={[s.chip, !selectedClassId && s.chipOn]}
                onPress={() => setSelectedClassId(null)}
              >
                <Text style={[s.chipTxt, !selectedClassId && s.chipTxtOn]}>All</Text>
              </TouchableOpacity>
              {classes.map(cls => (
                <TouchableOpacity
                  key={cls.id}
                  style={[s.chip, selectedClassId === cls.id && s.chipOn]}
                  onPress={() => setSelectedClassId(selectedClassId === cls.id ? null : cls.id)}
                >
                  <Text style={[s.chipTxt, selectedClassId === cls.id && s.chipTxtOn]}>
                    {cls.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Send CTA */}
          <TouchableOpacity
            style={[s.sendBtn, busy && s.sendBtnOff]}
            onPress={handleSend}
            disabled={busy}
            activeOpacity={0.85}
          >
            {creating
              ? <ActivityIndicator color={Colors.white} />
              : <Text style={s.sendBtnTxt}>📤  Send to AI</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.40)' },
  sheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 16,
  },
  grabber: {
    width: 36, height: 5, borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.15)',
    alignSelf: 'center',
    marginTop: 10, marginBottom: 14,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 6,
  },
  title: { fontSize: 20, fontWeight: '600', color: Colors.textPrimary },
  closeBtn: { fontSize: 18, color: Colors.textSecondary, paddingHorizontal: 4 },

  subRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 18 },
  aiBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 999,
  },
  aiBadgeTxt: { fontSize: 10, fontWeight: '600', color: Colors.primary },
  sub: { fontSize: 13, color: Colors.textSecondary, flex: 1 },

  // Recording
  recCard: {
    backgroundColor: Colors.bg,
    borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    marginBottom: 14,
  },
  pulseRing: {
    position: 'absolute',
    width: 52, height: 52, borderRadius: 26,
    borderWidth: 2, borderColor: Colors.primary,
    top: 0, left: 0,
  },
  micBtn: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  micIcon: { fontSize: 22 },
  recLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  waveRow: { flexDirection: 'row', alignItems: 'center', height: 28 },
  timer: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13, color: Colors.textPrimary,
    minWidth: 36, textAlign: 'right',
  },

  // Photos
  photoSection: { marginBottom: 14 },
  photoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  photoLabel: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  addPhotoLink: { fontSize: 13, fontWeight: '500', color: Colors.primary },
  thumb: { width: 64, height: 64, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  thumbImg: { width: '100%', height: '100%' },
  thumbOver: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  thumbX: {
    position: 'absolute', top: 2, right: 2,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center',
  },
  thumbXTxt: { color: Colors.white, fontSize: 10, fontWeight: '700', lineHeight: 14 },

  // Scope
  scopePill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.bg,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    marginBottom: 8,
  },
  scopeIcon: { fontSize: 14 },
  scopeText: { flex: 1, fontSize: 13, fontWeight: '500', color: Colors.textPrimary },
  scopeChevron: { fontSize: 18, color: Colors.textSecondary },

  // Class chips
  chips: { flexGrow: 0, marginBottom: 16 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: Radius.full, borderWidth: 1.5,
    borderColor: Colors.border, backgroundColor: Colors.card,
  },
  chipOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  chipTxt: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  chipTxtOn: { color: Colors.primary },

  // Send
  sendBtn: {
    backgroundColor: Colors.primary, borderRadius: 14,
    paddingVertical: 15, alignItems: 'center',
    ...Shadow.small,
  },
  sendBtnOff: { opacity: 0.45 },
  sendBtnTxt: { color: Colors.white, fontSize: 16, fontWeight: '600' },
});
