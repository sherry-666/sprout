import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput,
  ScrollView, ActivityIndicator, Alert, Image, Keyboard, Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import * as ImagePicker from 'expo-image-picker';
import { gql, useQuery, useMutation } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import { Colors, Spacing, Radius, Shadow } from '../../theme';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── GraphQL ───────────────────────────────────────────────────────────────

const MY_CLASSES_QUERY = gql`
  query QuickLogClasses {
    me { classes { id name } }
  }
`;

const PRESIGN_PHOTO_MUTATION = gql`
  mutation PresignQuickLogPhoto($contentType: String!) {
    presignQuickLogPhoto(contentType: $contentType) { uploadUrl objectKey }
  }
`;

const CREATE_QL_CONVERSATION = gql`
  mutation CreateQuickLogConversation($classId: ID, $transcript: String, $photoKeys: [String!]) {
    createQuickLogConversation(classId: $classId, transcript: $transcript, photoKeys: $photoKeys) {
      id
    }
  }
`;

// ─── Helpers ───────────────────────────────────────────────────────────────

function getLangCode(): string {
  const lang = i18n.language;
  if (lang === 'zh') return 'zh-CN';
  if (lang === 'fr') return 'fr-FR';
  return 'en-US';
}

interface PhotoItem { localUri: string; key: string | null; uploading: boolean }

// ─── Screen ────────────────────────────────────────────────────────────────

export default function QuickLogScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { data, loading: classesLoading } = useQuery(MY_CLASSES_QUERY, { fetchPolicy: 'cache-and-network' });
  const [presignPhoto] = useMutation(PRESIGN_PHOTO_MUTATION);
  const [createConversation, { loading: creating }] = useMutation(CREATE_QL_CONVERSATION);

  const classes: { id: string; name: string }[] = data?.me?.classes ?? [];

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ tabBarStyle: { display: 'none' } });
      return () => navigation.getParent()?.setOptions({ tabBarStyle: undefined });
    }, [navigation])
  );

  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  // Voice
  const isRecordingRef = useRef(false);
  const [isRecording, setIsRecording] = useState(false);
  const [note, setNote] = useState('');
  const preRecordNoteRef = useRef('');
  const noteInputRef = useRef<TextInput>(null);

  // Photos
  const [photos, setPhotos] = useState<PhotoItem[]>([]);

  // ── Speech recognition events ─────────────────────────────────────────────

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
      setNote(prev => prev || t('quickLog.transcribeFailed'));
    }
  });

  // ── Audio ─────────────────────────────────────────────────────────────────

  const startRecording = async () => {
    Keyboard.dismiss();
    const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!granted) {
      Alert.alert(t('quickLog.micAccess'), t('quickLog.micAccessBody'));
      return;
    }
    preRecordNoteRef.current = note.trim();
    isRecordingRef.current = true;
    setIsRecording(true);
    ExpoSpeechRecognitionModule.start({
      lang: getLangCode(),
      interimResults: true,
      continuous: true,
    });
  };

  const stopRecording = () => {
    isRecordingRef.current = false;
    setIsRecording(false);
    ExpoSpeechRecognitionModule.stop();
  };

  const toggleRecording = () => {
    if (isRecordingRef.current) stopRecording();
    else startRecording();
  };

  // ── Photos ────────────────────────────────────────────────────────────────

  const pickPhotos = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('quickLog.photoAccess'), t('quickLog.photoAccessBody'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as any,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.length) return;

    const slots = Math.min(result.assets.length, 10 - photos.length);
    const newItems: PhotoItem[] = result.assets.slice(0, slots).map(a => ({ localUri: a.uri, key: null, uploading: true }));
    setPhotos(prev => [...prev, ...newItems]);

    for (const item of newItems) {
      try {
        const { data: pd } = await presignPhoto({ variables: { contentType: 'image/jpeg' } });
        const { uploadUrl, objectKey } = pd.presignQuickLogPhoto;
        const blob = await fetch(item.localUri).then(r => r.blob());
        const res = await fetch(uploadUrl, { method: 'PUT', body: blob, headers: { 'Content-Type': 'image/jpeg' } });
        if (!res.ok) throw new Error();
        setPhotos(prev => prev.map(p => p.localUri === item.localUri ? { ...p, key: objectKey, uploading: false } : p));
      } catch {
        setPhotos(prev => prev.map(p => p.localUri === item.localUri ? { ...p, uploading: false } : p));
      }
    }
  };

  // ── Send → create conversation → navigate to Agents ───────────────────────

  const reset = () => {
    setNote('');
    setPhotos([]);
    setSelectedClassId(null);
  };

  const handleSend = async () => {
    const uploadedKeys = photos.filter(p => p.key).map(p => p.key as string);
    if (!note.trim() && uploadedKeys.length === 0) {
      Alert.alert(t('quickLog.nothingTitle'), t('quickLog.nothingBody'));
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
      reset();
      // Pop QuickLog off the ClassesStack so back-from-Conversation lands on ClassesList
      navigation.goBack();
      // navigation.getParent() is the Tab navigator — jump to the Agents tab
      // and push the Conversation screen in its stack.
      navigation.getParent()?.navigate('Agents', {
        screen: 'Conversation',
        params: { conversationId: convoId },
      });
    } catch (e: any) {
      Alert.alert(t('quickLog.failedTitle'), e.message ?? '');
    }
  };

  const uploadingAny = photos.some(p => p.uploading);
  const busy = creating || uploadingAny;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={s.root}>
      <View style={s.classSection}>
        <Text style={s.label}>{t('quickLog.classLabel')}</Text>
        {classesLoading && classes.length === 0
          ? <ActivityIndicator color={Colors.primary} />
          : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
              <TouchableOpacity
                style={[s.chip, !selectedClassId && s.chipOn]}
                onPress={() => setSelectedClassId(null)}
              >
                <Text style={[s.chipTxt, !selectedClassId && s.chipTxtOn]}>{t('quickLog.allKids')}</Text>
              </TouchableOpacity>
              {classes.map(cls => (
                <TouchableOpacity
                  key={cls.id}
                  style={[s.chip, selectedClassId === cls.id && s.chipOn]}
                  onPress={() => setSelectedClassId(selectedClassId === cls.id ? null : cls.id)}
                >
                  <Text style={[s.chipTxt, selectedClassId === cls.id && s.chipTxtOn]}>{cls.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
      </View>

      <View style={s.cardWrapper}>
        <View style={[s.inputCard, isRecording && s.inputCardRec]}>
          <ScrollView
            style={s.cardScroll}
            contentContainerStyle={s.cardScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <TextInput
              ref={noteInputRef}
              style={s.noteInput}
              value={note}
              onChangeText={setNote}
              multiline
              placeholder={t('quickLog.notePlaceholder')}
              placeholderTextColor={Colors.textSecondary}
              textAlignVertical="top"
              editable={!isRecording}
              scrollEnabled={false}
            />

            {photos.length > 0 && (
              <View style={s.photoGrid}>
                {photos.map(p => (
                  <View key={p.localUri} style={s.thumb}>
                    <Image source={{ uri: p.localUri }} style={s.thumbImg} />
                    {p.uploading
                      ? <View style={s.thumbOver}><ActivityIndicator color={Colors.white} size="small" /></View>
                      : (
                        <TouchableOpacity
                          style={s.thumbX}
                          onPress={() => setPhotos(prev => prev.filter(x => x.localUri !== p.localUri))}
                        >
                          <Text style={s.thumbXTxt}>✕</Text>
                        </TouchableOpacity>
                      )}
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          <View style={s.cardBar}>
            {photos.length < 10 && (
              <TouchableOpacity style={s.addPhotoBtn} onPress={pickPhotos}>
                <Text style={s.addPhotoBtnTxt}>
                  📷  {photos.length === 0 ? t('quickLog.addPhotos') : t('quickLog.addMore')}
                </Text>
              </TouchableOpacity>
            )}
            <View style={{ flex: 1 }} />
            <TouchableOpacity
              style={[s.micBtn, isRecording && s.micBtnRec]}
              onPress={toggleRecording}
              activeOpacity={0.8}
            >
              <Text style={s.micIcon}>{isRecording ? '⏹' : '🎙'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={s.footer}>
        <TouchableOpacity
          style={[s.sendBtn, busy && s.btnOff]}
          onPress={handleSend}
          disabled={busy}
          activeOpacity={0.85}
        >
          {creating
            ? <ActivityIndicator color={Colors.white} />
            : <Text style={s.sendBtnTxt}>🤖  Send to Agent</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const THUMB_SIZE = (SCREEN_W - Spacing.md * 2 - Spacing.md * 2 - Spacing.sm * 2) / 3;

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },

  classSection: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  label: {
    fontSize: 11, fontWeight: '700', color: Colors.textSecondary,
    letterSpacing: 0.7, marginBottom: Spacing.sm,
  },
  chipRow: { gap: Spacing.sm, paddingBottom: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.md, paddingVertical: 8,
    borderRadius: Radius.full, borderWidth: 1.5,
    borderColor: Colors.border, backgroundColor: Colors.card, ...Shadow.small,
  },
  chipOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  chipTxt: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  chipTxtOn: { color: Colors.primary },

  cardWrapper: { flex: 1, padding: Spacing.md, paddingTop: Spacing.sm },
  inputCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    ...Shadow.small,
    overflow: 'hidden',
  },
  inputCardRec: { borderColor: '#ef4444' },
  cardScroll: { flex: 1 },
  cardScrollContent: { padding: Spacing.md, paddingBottom: Spacing.sm },
  noteInput: {
    fontSize: 15, color: Colors.textPrimary,
    minHeight: 80, textAlignVertical: 'top',
  },

  photoGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: Spacing.sm, marginTop: Spacing.sm,
  },
  thumb: { width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: Radius.sm, overflow: 'hidden' },
  thumbImg: { width: '100%', height: '100%' },
  thumbOver: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  thumbX: {
    position: 'absolute', top: 4, right: 4,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center',
  },
  thumbXTxt: { color: Colors.white, fontSize: 11, fontWeight: '700' },

  cardBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border,
  },
  addPhotoBtn: { paddingHorizontal: Spacing.sm, paddingVertical: 6 },
  addPhotoBtnTxt: { fontSize: 14, fontWeight: '600', color: Colors.primary },

  micBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1.5, borderColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    ...Shadow.small,
  },
  micBtnRec: { backgroundColor: '#fee2e2', borderColor: '#ef4444' },
  micIcon: { fontSize: 20 },

  footer: {
    paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: 28,
    backgroundColor: Colors.bg,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border,
  },
  sendBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.sm,
    paddingVertical: 15, alignItems: 'center', ...Shadow.small,
  },
  sendBtnTxt: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  btnOff: { opacity: 0.45 },
});
