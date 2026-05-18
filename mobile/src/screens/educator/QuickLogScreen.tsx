import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput,
  ScrollView, ActivityIndicator, Alert, Image, Modal,
  FlatList, Pressable, Animated, Dimensions, Keyboard,
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

const ANALYZE_MUTATION = gql`
  mutation AnalyzeQuickLog($classId: ID, $transcript: String, $photoKeys: [String!]) {
    analyzeQuickLog(classId: $classId, transcript: $transcript, photoKeys: $photoKeys) {
      transcript
      suggestions { kidId kidName avatarUrl content photoKeys }
      photoResults { photoKey photoUrl detectedKidIds sceneDescription }
      eligibleKids { id firstName lastName avatarUrl }
    }
  }
`;

const CONFIRM_MUTATION = gql`
  mutation ConfirmQuickLog($updates: [QuickLogUpdateInput!]!) {
    confirmQuickLog(updates: $updates) { id }
  }
`;

// ─── Helpers ───────────────────────────────────────────────────────────────

function getLangCode(): string {
  const lang = i18n.language;
  if (lang === 'zh') return 'zh-CN';
  if (lang === 'fr') return 'fr-FR';
  return 'en-US';
}

// ─── Waveform ──────────────────────────────────────────────────────────────

const BAR_MAX = [0.35, 0.65, 0.95, 1.0, 0.95, 0.65, 0.35];
const BAR_DUR = [320, 260, 200, 240, 210, 280, 340];

function WaveformBars({ active }: { active: boolean }) {
  const anims = useRef(BAR_MAX.map(() => new Animated.Value(0.1))).current;
  const loopsRef = useRef<ReturnType<typeof Animated.loop>[]>([]);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (active) {
      loopsRef.current = anims.map((anim, i) =>
        Animated.loop(
          Animated.sequence([
            Animated.timing(anim, { toValue: BAR_MAX[i], duration: BAR_DUR[i], useNativeDriver: true }),
            Animated.timing(anim, { toValue: 0.1, duration: BAR_DUR[i], useNativeDriver: true }),
          ])
        )
      );
      loopsRef.current.forEach((loop, i) => {
        timersRef.current.push(setTimeout(() => loop.start(), i * 65));
      });
    } else {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
      loopsRef.current.forEach(l => l.stop());
      loopsRef.current = [];
      anims.forEach(a => a.setValue(0.1));
    }
    return () => {
      timersRef.current.forEach(clearTimeout);
      loopsRef.current.forEach(l => l.stop());
    };
  }, [active]);

  return (
    <View style={wave.row}>
      {anims.map((anim, i) => (
        <Animated.View key={i} style={[wave.bar, { transform: [{ scaleY: anim }] }]} />
      ))}
    </View>
  );
}

const wave = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', height: 36, gap: 5 },
  bar: { width: 4, height: 36, borderRadius: 2, backgroundColor: '#ef4444' },
});

// ─── Types ─────────────────────────────────────────────────────────────────

interface PhotoItem { localUri: string; key: string | null; uploading: boolean }
interface PhotoAssignment { photoKey: string; photoUrl: string; sceneDescription: string; assignedKidIds: string[] }
interface KidUpdate { kidId: string; kidName: string; avatarUrl: string | null; content: string; photoKeys: string[] }
interface EligibleKid { id: string; firstName: string; lastName: string; avatarUrl: string | null }

// ─── Kid Picker Modal ──────────────────────────────────────────────────────

function KidPickerModal({ visible, kids, excludeIds, onSelect, onClose, t }: {
  visible: boolean; kids: EligibleKid[]; excludeIds: string[];
  onSelect: (kid: EligibleKid) => void; onClose: () => void; t: any;
}) {
  const available = kids.filter(k => !excludeIds.includes(k.id));
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose}>
        <Pressable style={s.sheet} onPress={e => e.stopPropagation()}>
          <View style={s.sheetHandle} />
          <Text style={s.sheetTitle}>{t('quickLog.addKidTitle')}</Text>
          {available.length === 0
            ? <Text style={s.sheetEmpty}>{t('quickLog.allTagged')}</Text>
            : (
              <FlatList
                data={available}
                keyExtractor={k => k.id}
                renderItem={({ item }) => (
                  <TouchableOpacity style={s.kidRow} onPress={() => { onSelect(item); onClose(); }}>
                    {item.avatarUrl
                      ? <Image source={{ uri: item.avatarUrl }} style={s.rowAvatar} />
                      : <View style={[s.rowAvatar, s.fallback]}><Text style={s.fallbackTxt}>{item.firstName[0]}</Text></View>}
                    <Text style={s.kidRowName}>{item.firstName} {item.lastName}</Text>
                  </TouchableOpacity>
                )}
              />
            )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Screen ────────────────────────────────────────────────────────────────

export default function QuickLogScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { data, loading: classesLoading } = useQuery(MY_CLASSES_QUERY, { fetchPolicy: 'cache-and-network' });
  const [presignPhoto] = useMutation(PRESIGN_PHOTO_MUTATION);
  const [analyzeQL] = useMutation(ANALYZE_MUTATION);
  const [confirmQL] = useMutation(CONFIRM_MUTATION);

  const classes: { id: string; name: string }[] = data?.me?.classes ?? [];

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ tabBarStyle: { display: 'none' } });
      return () => navigation.getParent()?.setOptions({ tabBarStyle: undefined });
    }, [navigation])
  );

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  // Pager
  const pagerRef = useRef<ScrollView>(null);
  const [pagerPage, setPagerPage] = useState(0);

  // Voice
  const isRecordingRef = useRef(false);
  const [isRecording, setIsRecording] = useState(false);
  const [note, setNote] = useState('');
  const noteInputRef = useRef<TextInput>(null);

  // Photos
  const [photos, setPhotos] = useState<PhotoItem[]>([]);

  // Analysis
  const [analyzing, setAnalyzing] = useState(false);
  const [eligibleKids, setEligibleKids] = useState<EligibleKid[]>([]);
  const [transcript, setTranscript] = useState('');
  const [photoAssignments, setPhotoAssignments] = useState<PhotoAssignment[]>([]);
  const [kidUpdates, setKidUpdates] = useState<KidUpdate[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerPhotoKey, setPickerPhotoKey] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  // ── Speech recognition events ─────────────────────────────────────────────

  useSpeechRecognitionEvent('result', event => {
    const text = event.results[0]?.transcript ?? '';
    if (text) setNote(text);
  });

  useSpeechRecognitionEvent('end', () => {
    isRecordingRef.current = false;
    setIsRecording(false);
  });

  useSpeechRecognitionEvent('error', event => {
    isRecordingRef.current = false;
    setIsRecording(false);
    // 'no-speech' is normal if user releases quickly; other errors are real failures
    if (event.error !== 'no-speech' && event.error !== 'aborted') {
      setNote(prev => prev || t('quickLog.transcribeFailed'));
    }
  });

  // ── Pager ─────────────────────────────────────────────────────────────────

  const scrollToPage = (page: number) => {
    pagerRef.current?.scrollTo({ x: page * SCREEN_W, animated: true });
    setPagerPage(page);
  };

  // ── Audio ─────────────────────────────────────────────────────────────────

  const startRecording = async () => {
    Keyboard.dismiss();
    const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!granted) {
      Alert.alert(t('quickLog.micAccess'), t('quickLog.micAccessBody'));
      return;
    }
    setNote('');
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

  // ── Next ──────────────────────────────────────────────────────────────────

  const handleNext = async () => {
    const uploadedKeys = photos.filter(p => p.key).map(p => p.key as string);
    if (!note.trim() && uploadedKeys.length === 0) {
      Alert.alert(t('quickLog.nothingTitle'), t('quickLog.nothingBody'));
      return;
    }
    setAnalyzing(true);
    try {
      const { data: ad } = await analyzeQL({
        variables: {
          classId: selectedClassId ?? undefined,
          transcript: note.trim() || undefined,
          photoKeys: uploadedKeys.length > 0 ? uploadedKeys : undefined,
        },
      });
      const r = ad.analyzeQuickLog;
      setTranscript(r.transcript ?? '');
      setEligibleKids(r.eligibleKids ?? []);
      setPhotoAssignments((r.photoResults ?? []).map((pr: any) => ({
        photoKey: pr.photoKey, photoUrl: pr.photoUrl,
        sceneDescription: pr.sceneDescription,
        assignedKidIds: [...pr.detectedKidIds],
      })));
      setKidUpdates((r.suggestions ?? []).map((s: any) => ({
        kidId: s.kidId, kidName: s.kidName,
        avatarUrl: s.avatarUrl ?? null, content: s.content, photoKeys: s.photoKeys,
      })));
      setStep(r.photoResults?.length > 0 ? 2 : 3);
    } catch (e: any) {
      Alert.alert(t('quickLog.failedTitle'), e.message ?? '');
    } finally {
      setAnalyzing(false);
    }
  };

  // ── Step 2 ────────────────────────────────────────────────────────────────

  const getKidName = (id: string) => {
    const k = eligibleKids.find(k => k.id === id);
    return k ? `${k.firstName} ${k.lastName}` : id;
  };

  const removeKidFromPhoto = (photoKey: string, kidId: string) =>
    setPhotoAssignments(prev => prev.map(pa =>
      pa.photoKey === photoKey ? { ...pa, assignedKidIds: pa.assignedKidIds.filter(id => id !== kidId) } : pa));

  const addKidToPhoto = (photoKey: string, kid: EligibleKid) => {
    setPhotoAssignments(prev => prev.map(pa =>
      pa.photoKey === photoKey ? { ...pa, assignedKidIds: [...pa.assignedKidIds, kid.id] } : pa));
    setKidUpdates(prev => prev.find(u => u.kidId === kid.id) ? prev : [
      ...prev, { kidId: kid.id, kidName: `${kid.firstName} ${kid.lastName}`, avatarUrl: kid.avatarUrl, content: '', photoKeys: [photoKey] },
    ]);
  };

  const proceedToStep3 = () => {
    const kidPhotoMap: Record<string, string[]> = {};
    for (const pa of photoAssignments) {
      for (const kidId of pa.assignedKidIds) {
        kidPhotoMap[kidId] = [...(kidPhotoMap[kidId] ?? []), pa.photoKey];
      }
    }
    setKidUpdates(prev => prev.map(u => ({ ...u, photoKeys: kidPhotoMap[u.kidId] ?? u.photoKeys })));
    setStep(3);
  };

  // ── Confirm ───────────────────────────────────────────────────────────────

  const handleConfirm = async () => {
    const valid = kidUpdates.filter(u => u.content.trim());
    if (!valid.length) { Alert.alert(t('quickLog.noUpdateTitle'), t('quickLog.noUpdateBody')); return; }
    setConfirming(true);
    try {
      await confirmQL({
        variables: { updates: valid.map(u => ({ kidId: u.kidId, content: u.content.trim(), photoKeys: u.photoKeys })) },
      });
      Alert.alert(
        t('quickLog.sentTitle'),
        t('quickLog.sentBody', { count: valid.length }),
        [{ text: t('quickLog.done'), onPress: reset }],
      );
    } catch (e: any) {
      Alert.alert(t('quickLog.sendFailTitle'), e.message ?? '');
    } finally {
      setConfirming(false);
    }
  };

  const reset = () => {
    setStep(1); setSelectedClassId(null); setNote('');
    setPhotos([]); setTranscript(''); setEligibleKids([]);
    setPhotoAssignments([]); setKidUpdates([]);
    setPagerPage(0);
    pagerRef.current?.scrollTo({ x: 0, animated: false });
  };

  const uploadingAny = photos.some(p => p.uploading);
  const busy = analyzing || uploadingAny;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={s.root}>

      {/* ── Step 1 ── */}
      {step === 1 && (
        <>
          <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" style={s.scrollArea}>

            {/* Class chips */}
            <Text style={s.label}>{t('quickLog.classLabel')}</Text>
            {classesLoading && classes.length === 0
              ? <ActivityIndicator color={Colors.primary} style={{ marginBottom: Spacing.md }} />
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

            {/* Horizontal voice / photo pager */}
            <ScrollView
              ref={pagerRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              scrollEventThrottle={16}
              nestedScrollEnabled
              onMomentumScrollEnd={e => setPagerPage(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W))}
              style={s.pager}
            >
              {/* ── Page 0: Voice ── */}
              <View style={s.page}>
                <Pressable
                  style={[s.pageCard, isRecording && s.pageCardRec]}
                  onPress={() => noteInputRef.current?.focus()}
                  onLongPress={startRecording}
                  onPressOut={() => { if (isRecordingRef.current) stopRecording(); }}
                  delayLongPress={350}
                  android_ripple={undefined}
                >
                  {/* Note — updates in real-time as speech is recognised */}
                  <View style={s.noteArea}>
                    <TextInput
                      ref={noteInputRef}
                      style={s.cardNote}
                      value={note}
                      onChangeText={setNote}
                      multiline
                      placeholder={t('quickLog.notePlaceholder')}
                      placeholderTextColor={Colors.textSecondary}
                      textAlignVertical="top"
                      editable={!isRecording}
                      scrollEnabled={false}
                    />
                  </View>

                  {/* Bottom strip */}
                  <View style={[s.cardBottom, isRecording && s.cardBottomRec]}>
                    {isRecording ? (
                      <>
                        <WaveformBars active />
                        <Text style={s.recLabel}>{t('quickLog.recordingRelease')}</Text>
                      </>
                    ) : (
                      <Text style={s.holdLabel}>{t('quickLog.holdToRecord')}</Text>
                    )}
                  </View>

                  {/* Swipe hint */}
                  <TouchableOpacity style={s.swipeHintRight} onPress={() => scrollToPage(1)} activeOpacity={0.6}>
                    <Text style={s.swipeHintTxt}>{t('quickLog.swipeForPhotos')}</Text>
                  </TouchableOpacity>
                </Pressable>
              </View>

              {/* ── Page 1: Photos ── */}
              <View style={s.page}>
                <View style={s.pageCard}>
                  <TouchableOpacity style={s.swipeHintLeft} onPress={() => scrollToPage(0)} activeOpacity={0.6}>
                    <Text style={s.swipeHintTxt}>{t('quickLog.swipeForVoice')}</Text>
                  </TouchableOpacity>
                  <View style={s.photoPageContent}>
                    {photos.length > 0 && (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled style={{ marginBottom: Spacing.sm }}>
                        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
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
                                    <Text style={{ color: Colors.white, fontSize: 11, fontWeight: '700' }}>✕</Text>
                                  </TouchableOpacity>
                                )}
                            </View>
                          ))}
                        </View>
                      </ScrollView>
                    )}
                    {photos.length < 10 && (
                      <TouchableOpacity style={s.addPhotoBtn} onPress={pickPhotos}>
                        <Text style={s.addPhotoBtnTxt}>
                          📷  {photos.length === 0 ? t('quickLog.addPhotos') : t('quickLog.addMore')}
                        </Text>
                      </TouchableOpacity>
                    )}
                    {photos.length === 0 && (
                      <Text style={s.photosEmpty}>{t('quickLog.noPhotos')}</Text>
                    )}
                  </View>
                </View>
              </View>
            </ScrollView>

            {/* Page dots */}
            <View style={s.dots}>
              <View style={[s.dot, pagerPage === 0 && s.dotActive]} />
              <View style={[s.dot, pagerPage === 1 && s.dotActive]} />
            </View>

          </ScrollView>

          <View style={s.footer}>
            <TouchableOpacity
              style={[s.nextBtn, busy && s.btnOff]}
              onPress={handleNext}
              disabled={busy}
              activeOpacity={0.85}
            >
              {analyzing
                ? <ActivityIndicator color={Colors.white} />
                : <Text style={s.nextBtnTxt}>{t('quickLog.next')}</Text>}
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* ── Step 2: Photo Review ── */}
      {step === 2 && (
        <>
          <ScrollView contentContainerStyle={s.content} style={s.scrollArea}>
            <Text style={s.pageTitle}>{t('quickLog.photoReview')}</Text>
            <Text style={s.pageHint}>{t('quickLog.photoReviewHint')}</Text>

            {photoAssignments.map(pa => (
              <View key={pa.photoKey} style={s.photoCard}>
                <Image source={{ uri: pa.photoUrl }} style={s.photoCardImg} resizeMode="cover" />
                {!!pa.sceneDescription && <Text style={s.sceneDesc}>{pa.sceneDescription}</Text>}
                <View style={s.tagRow}>
                  {pa.assignedKidIds.map(kidId => (
                    <TouchableOpacity key={kidId} style={s.kidTag} onPress={() => removeKidFromPhoto(pa.photoKey, kidId)}>
                      <Text style={s.kidTagTxt}>{getKidName(kidId)}  ✕</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity style={s.addKidBtn} onPress={() => { setPickerPhotoKey(pa.photoKey); setPickerOpen(true); }}>
                    <Text style={s.addKidBtnTxt}>＋</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={s.footer}>
            <TouchableOpacity style={s.nextBtn} onPress={proceedToStep3} activeOpacity={0.85}>
              <Text style={s.nextBtnTxt}>{t('quickLog.next')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.backBtn} onPress={() => setStep(1)}>
              <Text style={s.backBtnTxt}>{t('quickLog.back')}</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* ── Step 3: Review & Confirm ── */}
      {step === 3 && (
        <>
          <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" style={s.scrollArea}>
            <Text style={s.pageTitle}>{t('quickLog.reviewTitle')}</Text>
            <Text style={s.pageHint}>{t('quickLog.reviewHint')}</Text>

            {!!transcript && (
              <View style={s.transcriptBox}>
                <Text style={s.transcriptLbl}>{t('quickLog.transcriptLabel')}</Text>
                <Text style={s.transcriptTxt}>{transcript}</Text>
              </View>
            )}

            {kidUpdates.length === 0
              ? (
                <View style={s.emptyCard}>
                  <Text style={s.emptyTitle}>{t('quickLog.noKids')}</Text>
                  <Text style={s.emptyHint}>{t('quickLog.noKidsHint')}</Text>
                </View>
              )
              : kidUpdates.map((u, idx) => (
                <View key={u.kidId} style={s.updateCard}>
                  <View style={s.updateHeader}>
                    {u.avatarUrl
                      ? <Image source={{ uri: u.avatarUrl }} style={s.updateAvatar} />
                      : <View style={[s.updateAvatar, s.fallback]}><Text style={s.fallbackTxt}>{u.kidName[0]}</Text></View>}
                    <Text style={s.updateName}>{u.kidName}</Text>
                    {u.photoKeys.length > 0 && (
                      <View style={s.photoBadge}><Text style={s.photoBadgeTxt}>📷 {u.photoKeys.length}</Text></View>
                    )}
                  </View>
                  <TextInput
                    style={s.updateInput}
                    value={u.content}
                    onChangeText={text => setKidUpdates(prev => prev.map((x, i) => i === idx ? { ...x, content: text } : x))}
                    multiline
                    placeholder={t('quickLog.writePlaceholder')}
                    placeholderTextColor={Colors.textSecondary}
                    textAlignVertical="top"
                  />
                </View>
              ))}
          </ScrollView>

          <View style={s.footer}>
            <TouchableOpacity
              style={[s.nextBtn, (confirming || !kidUpdates.some(u => u.content.trim())) && s.btnOff]}
              onPress={handleConfirm}
              disabled={confirming || !kidUpdates.some(u => u.content.trim())}
              activeOpacity={0.85}
            >
              {confirming ? <ActivityIndicator color={Colors.white} /> : <Text style={s.nextBtnTxt}>{t('quickLog.sendUpdates')}</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={s.backBtn} onPress={() => setStep(photoAssignments.length > 0 ? 2 : 1)}>
              <Text style={s.backBtnTxt}>{t('quickLog.back')}</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      <KidPickerModal
        visible={pickerOpen}
        kids={eligibleKids}
        excludeIds={photoAssignments.find(pa => pa.photoKey === pickerPhotoKey)?.assignedKidIds ?? []}
        onSelect={kid => pickerPhotoKey && addKidToPhoto(pickerPhotoKey, kid)}
        onClose={() => { setPickerOpen(false); setPickerPhotoKey(null); }}
        t={t}
      />
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  scrollArea: { flex: 1 },
  content: { padding: Spacing.md, paddingTop: Spacing.sm, paddingBottom: Spacing.lg },

  label: {
    fontSize: 11, fontWeight: '700', color: Colors.textSecondary,
    letterSpacing: 0.7, marginBottom: Spacing.sm, marginTop: Spacing.sm,
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

  // Pager
  pager: { height: 260, marginTop: Spacing.sm, marginHorizontal: -Spacing.md, width: SCREEN_W },
  page: { width: SCREEN_W, height: 260, paddingHorizontal: Spacing.md },
  pageCard: {
    flex: 1, backgroundColor: Colors.card,
    borderRadius: Radius.md, overflow: 'hidden', ...Shadow.small,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  pageCardRec: { borderColor: '#ef4444' },

  // Voice card internals
  noteArea: { flex: 1, padding: Spacing.md },
  cardNote: { flex: 1, fontSize: 15, color: Colors.textPrimary, textAlignVertical: 'top' },
  cardBottom: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    gap: 4,
  },
  cardBottomRec: { borderTopColor: '#ef4444', backgroundColor: '#fff5f5' },
  holdLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500', textAlign: 'center' },
  recLabel: { fontSize: 12, color: '#ef4444', fontWeight: '600' },

  // Swipe hints
  swipeHintRight: { position: 'absolute', right: 12, top: 10 },
  swipeHintLeft: { position: 'absolute', left: 12, top: 10 },
  swipeHintTxt: { fontSize: 11, color: Colors.primary, fontWeight: '600', opacity: 0.7 },

  // Photos page
  photoPageContent: { flex: 1, padding: Spacing.md, justifyContent: 'center' },
  photosEmpty: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.md },
  thumb: { width: 80, height: 80, borderRadius: Radius.sm, overflow: 'hidden' },
  thumbImg: { width: 80, height: 80 },
  thumbOver: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  thumbX: { position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  addPhotoBtn: { height: 44, borderRadius: Radius.sm, borderWidth: 1.5, borderColor: Colors.primary, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  addPhotoBtnTxt: { fontSize: 14, fontWeight: '600', color: Colors.primary },

  // Page dots
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: Spacing.sm },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.border },
  dotActive: { width: 18, backgroundColor: Colors.primary },

  // Fixed footer
  footer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: 28,
    backgroundColor: Colors.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },

  nextBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.sm,
    paddingVertical: 15, alignItems: 'center', ...Shadow.small,
  },
  nextBtnTxt: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  btnOff: { opacity: 0.45 },

  backBtn: { alignItems: 'center', marginTop: Spacing.sm, paddingVertical: 6 },
  backBtnTxt: { color: Colors.textSecondary, fontSize: 14, fontWeight: '600' },

  pageTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  pageHint: { fontSize: 13, color: Colors.textSecondary, marginBottom: Spacing.lg },

  // Photo review
  photoCard: { backgroundColor: Colors.card, borderRadius: Radius.md, overflow: 'hidden', marginBottom: Spacing.md, ...Shadow.small },
  photoCardImg: { width: '100%', height: 200 },
  sceneDesc: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18, paddingHorizontal: Spacing.md, paddingTop: 10 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, padding: Spacing.md },
  kidTag: { paddingHorizontal: 10, paddingVertical: 5, backgroundColor: Colors.primaryLight, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.primary },
  kidTagTxt: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  addKidBtn: { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, borderColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  addKidBtnTxt: { fontSize: 18, color: Colors.primary, lineHeight: 22 },

  // Update review
  transcriptBox: { backgroundColor: Colors.card, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.md, borderLeftWidth: 3, borderLeftColor: Colors.primary },
  transcriptLbl: { fontSize: 10, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 0.6, marginBottom: 4 },
  transcriptTxt: { fontSize: 13, color: Colors.textPrimary, lineHeight: 20 },
  emptyCard: { backgroundColor: Colors.card, borderRadius: Radius.md, padding: Spacing.lg, alignItems: 'center', ...Shadow.small, marginVertical: Spacing.lg },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  emptyHint: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', marginTop: 6 },
  updateCard: { backgroundColor: Colors.card, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.md, ...Shadow.small },
  updateHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  updateAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: Spacing.sm },
  updateName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, flex: 1 },
  photoBadge: { backgroundColor: Colors.primaryLight, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  photoBadgeTxt: { fontSize: 12, fontWeight: '600', color: Colors.primary },
  updateInput: { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, padding: Spacing.sm, fontSize: 14, color: Colors.textPrimary, minHeight: 90, backgroundColor: Colors.bg },

  // Shared
  fallback: { backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  fallbackTxt: { fontSize: 14, fontWeight: '700', color: Colors.primary },

  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: Spacing.sm, paddingBottom: 40, maxHeight: '60%' },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: Spacing.md },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  sheetEmpty: { fontSize: 14, color: Colors.textSecondary, paddingHorizontal: Spacing.lg },
  kidRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  rowAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: Spacing.md },
  kidRowName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
});
