import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput,
  ScrollView, ActivityIndicator, Alert, Image, Modal,
  FlatList, Pressable, Animated,
} from 'react-native';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { gql, useQuery, useMutation } from '@apollo/client';
import { Colors, Spacing, Radius, Shadow } from '../../theme';

// ─── GraphQL ───────────────────────────────────────────────────────────────

const MY_CLASSES_QUERY = gql`
  query QuickLogClasses {
    me { classes { id name } }
  }
`;

const TRANSCRIBE_MUTATION = gql`
  mutation TranscribeAudio($audioBase64: String!, $audioMimeType: String!) {
    transcribeAudio(audioBase64: $audioBase64, audioMimeType: $audioMimeType)
  }
`;

const PRESIGN_PHOTO_MUTATION = gql`
  mutation PresignQuickLogPhoto($contentType: String!) {
    presignQuickLogPhoto(contentType: $contentType) {
      uploadUrl
      objectKey
    }
  }
`;

const ANALYZE_QUICK_LOG_MUTATION = gql`
  mutation AnalyzeQuickLog(
    $classId: ID
    $transcript: String
    $photoKeys: [String!]
  ) {
    analyzeQuickLog(
      classId: $classId
      transcript: $transcript
      photoKeys: $photoKeys
    ) {
      transcript
      suggestions {
        kidId kidName avatarUrl content photoKeys
      }
      photoResults {
        photoKey photoUrl detectedKidIds sceneDescription
      }
      eligibleKids {
        id firstName lastName avatarUrl
      }
    }
  }
`;

const CONFIRM_QUICK_LOG_MUTATION = gql`
  mutation ConfirmQuickLog($updates: [QuickLogUpdateInput!]!) {
    confirmQuickLog(updates: $updates) { id }
  }
`;

// ─── Waveform animation ────────────────────────────────────────────────────

const BAR_MAX = [0.4, 0.7, 1.0, 0.85, 1.0, 0.65, 0.4];
const BAR_DUR = [320, 260, 200, 240, 210, 280, 340];

function WaveformBars({ active }: { active: boolean }) {
  const anims = useRef(BAR_MAX.map(() => new Animated.Value(0.12))).current;
  const loopsRef = useRef<ReturnType<typeof Animated.loop>[]>([]);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (active) {
      loopsRef.current = anims.map((anim, i) =>
        Animated.loop(
          Animated.sequence([
            Animated.timing(anim, { toValue: BAR_MAX[i], duration: BAR_DUR[i], useNativeDriver: true }),
            Animated.timing(anim, { toValue: 0.12, duration: BAR_DUR[i], useNativeDriver: true }),
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
      anims.forEach(a => a.setValue(0.12));
    }
    return () => {
      timersRef.current.forEach(clearTimeout);
      loopsRef.current.forEach(l => l.stop());
    };
  }, [active]);

  return (
    <View style={waveStyles.row}>
      {anims.map((anim, i) => (
        <Animated.View
          key={i}
          style={[waveStyles.bar, { transform: [{ scaleY: anim }] }]}
        />
      ))}
    </View>
  );
}

const waveStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', height: 44, gap: 5, marginTop: 12 },
  bar: { width: 5, height: 44, borderRadius: 3, backgroundColor: '#ef4444' },
});

// ─── Types ─────────────────────────────────────────────────────────────────

interface PhotoItem { localUri: string; key: string | null; uploading: boolean }
interface PhotoAssignment { photoKey: string; photoUrl: string; sceneDescription: string; assignedKidIds: string[] }
interface KidUpdate { kidId: string; kidName: string; avatarUrl: string | null; content: string; photoKeys: string[] }
interface EligibleKid { id: string; firstName: string; lastName: string; avatarUrl: string | null }

// ─── Kid Picker Modal ──────────────────────────────────────────────────────

function KidPickerModal({ visible, kids, excludeIds, onSelect, onClose }: {
  visible: boolean; kids: EligibleKid[]; excludeIds: string[];
  onSelect: (kid: EligibleKid) => void; onClose: () => void;
}) {
  const available = kids.filter(k => !excludeIds.includes(k.id));
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Add a kid to this photo</Text>
          {available.length === 0
            ? <Text style={styles.sheetEmpty}>All kids are already tagged</Text>
            : (
              <FlatList
                data={available}
                keyExtractor={k => k.id}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.kidRow} onPress={() => { onSelect(item); onClose(); }}>
                    {item.avatarUrl
                      ? <Image source={{ uri: item.avatarUrl }} style={styles.rowAvatar} />
                      : <View style={[styles.rowAvatar, styles.fallback]}><Text style={styles.fallbackText}>{item.firstName[0]}</Text></View>}
                    <Text style={styles.kidRowName}>{item.firstName} {item.lastName}</Text>
                  </TouchableOpacity>
                )}
              />
            )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────

export default function QuickLogScreen() {
  const { data, loading: classesLoading } = useQuery(MY_CLASSES_QUERY, { fetchPolicy: 'cache-and-network' });
  const [transcribeAudio] = useMutation(TRANSCRIBE_MUTATION);
  const [presignPhoto] = useMutation(PRESIGN_PHOTO_MUTATION);
  const [analyzeQuickLog] = useMutation(ANALYZE_QUICK_LOG_MUTATION);
  const [confirmQuickLog] = useMutation(CONFIRM_QUICK_LOG_MUTATION);

  const classes: { id: string; name: string }[] = data?.me?.classes ?? [];

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  // Voice
  const recordingRef = useRef<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [note, setNote] = useState('');

  // Photos
  const [photos, setPhotos] = useState<PhotoItem[]>([]);

  // Analysis
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<{ transcript: string; eligibleKids: EligibleKid[] } | null>(null);
  const [photoAssignments, setPhotoAssignments] = useState<PhotoAssignment[]>([]);
  const [kidUpdates, setKidUpdates] = useState<KidUpdate[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerPhotoKey, setPickerPhotoKey] = useState<string | null>(null);

  const [confirming, setConfirming] = useState(false);

  // ── Audio ──────────────────────────────────────────────────────────────

  const startRecording = async () => {
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Microphone access required', 'Please allow microphone access in Settings.');
      return;
    }
    try {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
      setIsRecording(true);
      setNote('');
    } catch {
      Alert.alert('Could not start recording.');
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;
    try {
      await recordingRef.current.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      setIsRecording(false);
      if (!uri) return;

      setTranscribing(true);
      setNote('Transcribing…');
      const b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      const { data: td } = await transcribeAudio({ variables: { audioBase64: b64, audioMimeType: 'audio/m4a' } });
      setNote(td.transcribeAudio || '');
    } catch {
      setIsRecording(false);
      setNote('');
    } finally {
      setTranscribing(false);
    }
  };

  // ── Photos ─────────────────────────────────────────────────────────────

  const pickPhotos = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Photo access required', 'Please allow photo access in Settings.');
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

  // ── Next / Analyze ─────────────────────────────────────────────────────

  const handleNext = async () => {
    const uploadedKeys = photos.filter(p => p.key).map(p => p.key as string);
    if (!note.trim() && uploadedKeys.length === 0) {
      Alert.alert('Nothing to send', 'Record a voice note or add photos first.');
      return;
    }
    setAnalyzing(true);
    try {
      const { data: ad } = await analyzeQuickLog({
        variables: {
          classId: selectedClassId ?? undefined,
          transcript: note.trim() || undefined,
          photoKeys: uploadedKeys.length > 0 ? uploadedKeys : undefined,
        },
      });
      const result = ad.analyzeQuickLog;
      setAnalysis({ transcript: result.transcript, eligibleKids: result.eligibleKids });
      setPhotoAssignments(result.photoResults.map((pr: any) => ({
        photoKey: pr.photoKey,
        photoUrl: pr.photoUrl,
        sceneDescription: pr.sceneDescription,
        assignedKidIds: [...pr.detectedKidIds],
      })));
      setKidUpdates(result.suggestions.map((s: any) => ({
        kidId: s.kidId, kidName: s.kidName,
        avatarUrl: s.avatarUrl ?? null, content: s.content, photoKeys: s.photoKeys,
      })));
      setStep(result.photoResults.length > 0 ? 2 : 3);
    } catch (e: any) {
      Alert.alert('Analysis failed', e.message ?? 'Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  // ── Step 2 helpers ─────────────────────────────────────────────────────

  const eligibleKids: EligibleKid[] = analysis?.eligibleKids ?? [];
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
    setKidUpdates(prev => {
      if (prev.find(u => u.kidId === kid.id)) return prev;
      return [...prev, { kidId: kid.id, kidName: `${kid.firstName} ${kid.lastName}`, avatarUrl: kid.avatarUrl, content: '', photoKeys: [photoKey] }];
    });
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

  // ── Confirm ────────────────────────────────────────────────────────────

  const handleConfirm = async () => {
    const valid = kidUpdates.filter(u => u.content.trim());
    if (!valid.length) { Alert.alert('Nothing to send', 'Add at least one update.'); return; }
    setConfirming(true);
    try {
      await confirmQuickLog({
        variables: { updates: valid.map(u => ({ kidId: u.kidId, content: u.content.trim(), photoKeys: u.photoKeys })) },
      });
      Alert.alert('Updates sent! ✅', `${valid.length} update${valid.length !== 1 ? 's' : ''} sent to parents.`, [{ text: 'Done', onPress: reset }]);
    } catch (e: any) {
      Alert.alert('Failed to send', e.message ?? 'Please try again.');
    } finally {
      setConfirming(false);
    }
  };

  const reset = () => {
    setStep(1); setSelectedClassId(null); setNote('');
    setPhotos([]); setAnalysis(null); setPhotoAssignments([]); setKidUpdates([]);
  };

  const uploadingAny = photos.some(p => p.uploading);

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>

      {/* ── Step 1 ── */}
      {step === 1 && (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

          {/* Class filter */}
          <Text style={styles.sectionLabel}>CLASS</Text>
          {classesLoading && classes.length === 0
            ? <ActivityIndicator color={Colors.primary} style={{ marginBottom: Spacing.md }} />
            : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                <TouchableOpacity
                  style={[styles.chip, !selectedClassId && styles.chipActive]}
                  onPress={() => setSelectedClassId(null)}
                >
                  <Text style={[styles.chipText, !selectedClassId && styles.chipTextActive]}>All kids</Text>
                </TouchableOpacity>
                {classes.map(cls => (
                  <TouchableOpacity
                    key={cls.id}
                    style={[styles.chip, selectedClassId === cls.id && styles.chipActive]}
                    onPress={() => setSelectedClassId(selectedClassId === cls.id ? null : cls.id)}
                  >
                    <Text style={[styles.chipText, selectedClassId === cls.id && styles.chipTextActive]}>{cls.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

          {/* Voice input */}
          <Text style={styles.sectionLabel}>VOICE NOTE</Text>
          <View style={styles.micSection}>
            <TouchableOpacity
              style={[styles.micBtn, isRecording && styles.micBtnRecording]}
              onPressIn={startRecording}
              onPressOut={stopRecording}
              activeOpacity={0.9}
            >
              <Text style={styles.micIcon}>{isRecording ? '⏹' : '🎙'}</Text>
            </TouchableOpacity>
            <Text style={styles.micLabel}>
              {isRecording ? 'Recording… release to stop' : 'Hold to record'}
            </Text>
            {isRecording && <WaveformBars active={isRecording} />}
          </View>

          <TextInput
            style={styles.noteInput}
            value={note}
            onChangeText={setNote}
            multiline
            placeholder="Your voice note will appear here…"
            placeholderTextColor={Colors.textSecondary}
            textAlignVertical="top"
            editable={!isRecording && !transcribing}
          />
          {transcribing && (
            <View style={styles.transcribingRow}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.transcribingText}>Transcribing…</Text>
            </View>
          )}

          {/* Photos */}
          <Text style={styles.sectionLabel}>PHOTOS</Text>
          <View style={styles.photoSection}>
            {photos.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.sm }}>
                <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                  {photos.map(p => (
                    <View key={p.localUri} style={styles.thumb}>
                      <Image source={{ uri: p.localUri }} style={styles.thumbImg} />
                      {p.uploading
                        ? <View style={styles.thumbOverlay}><ActivityIndicator color={Colors.white} size="small" /></View>
                        : (
                          <TouchableOpacity
                            style={styles.thumbRemove}
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
              <TouchableOpacity style={styles.addPhotoBtn} onPress={pickPhotos}>
                <Text style={styles.addPhotoBtnText}>📷  {photos.length === 0 ? 'Add Photos' : 'Add More'}</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[styles.nextBtn, (analyzing || uploadingAny || transcribing) && styles.btnDisabled]}
            onPress={handleNext}
            disabled={analyzing || uploadingAny || transcribing}
            activeOpacity={0.85}
          >
            {analyzing
              ? <ActivityIndicator color={Colors.white} />
              : <Text style={styles.nextBtnText}>Next →</Text>}
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ── Step 2: Photo Review ── */}
      {step === 2 && (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.pageTitle}>Photo Review</Text>
          <Text style={styles.pageSubtitle}>Tap a tag to remove · ＋ to add a kid</Text>

          {photoAssignments.map(pa => (
            <View key={pa.photoKey} style={styles.photoCard}>
              <Image source={{ uri: pa.photoUrl }} style={styles.photoCardImg} resizeMode="cover" />
              {!!pa.sceneDescription && <Text style={styles.sceneDesc}>{pa.sceneDescription}</Text>}
              <View style={styles.tagRow}>
                {pa.assignedKidIds.map(kidId => (
                  <TouchableOpacity key={kidId} style={styles.kidTag} onPress={() => removeKidFromPhoto(pa.photoKey, kidId)}>
                    <Text style={styles.kidTagText}>{getKidName(kidId)}  ✕</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={styles.addKidTag} onPress={() => { setPickerPhotoKey(pa.photoKey); setPickerOpen(true); }}>
                  <Text style={styles.addKidTagText}>＋</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          <TouchableOpacity style={styles.nextBtn} onPress={proceedToStep3} activeOpacity={0.85}>
            <Text style={styles.nextBtnText}>Next →</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backBtn} onPress={() => setStep(1)}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ── Step 3: Review & Confirm ── */}
      {step === 3 && (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.pageTitle}>Review Updates</Text>
          <Text style={styles.pageSubtitle}>Edit each message before sending to parents</Text>

          {analysis?.transcript ? (
            <View style={styles.transcriptBox}>
              <Text style={styles.transcriptLabel}>TRANSCRIPT</Text>
              <Text style={styles.transcriptText}>{analysis.transcript}</Text>
            </View>
          ) : null}

          {kidUpdates.length === 0
            ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No kids identified</Text>
                <Text style={styles.emptyHint}>Try again with a clearer voice note or tag kids on the photos.</Text>
              </View>
            )
            : kidUpdates.map((u, idx) => (
              <View key={u.kidId} style={styles.updateCard}>
                <View style={styles.updateHeader}>
                  {u.avatarUrl
                    ? <Image source={{ uri: u.avatarUrl }} style={styles.updateAvatar} />
                    : <View style={[styles.updateAvatar, styles.fallback]}><Text style={styles.fallbackText}>{u.kidName[0]}</Text></View>}
                  <Text style={styles.updateName}>{u.kidName}</Text>
                  {u.photoKeys.length > 0 && (
                    <View style={styles.photoBadge}>
                      <Text style={styles.photoBadgeText}>📷 {u.photoKeys.length}</Text>
                    </View>
                  )}
                </View>
                <TextInput
                  style={styles.updateInput}
                  value={u.content}
                  onChangeText={text => setKidUpdates(prev => prev.map((x, i) => i === idx ? { ...x, content: text } : x))}
                  multiline
                  placeholder="Write an update for parents…"
                  placeholderTextColor={Colors.textSecondary}
                  textAlignVertical="top"
                />
              </View>
            ))}

          <TouchableOpacity
            style={[styles.nextBtn, (confirming || !kidUpdates.some(u => u.content.trim())) && styles.btnDisabled]}
            onPress={handleConfirm}
            disabled={confirming || !kidUpdates.some(u => u.content.trim())}
            activeOpacity={0.85}
          >
            {confirming ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.nextBtnText}>✅  Send Updates</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.backBtn} onPress={() => setStep(photoAssignments.length > 0 ? 2 : 1)}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      <KidPickerModal
        visible={pickerOpen}
        kids={eligibleKids}
        excludeIds={photoAssignments.find(pa => pa.photoKey === pickerPhotoKey)?.assignedKidIds ?? []}
        onSelect={kid => pickerPhotoKey && addKidToPhoto(pickerPhotoKey, kid)}
        onClose={() => { setPickerOpen(false); setPickerPhotoKey(null); }}
      />
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.lg, paddingBottom: 48 },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: Colors.textSecondary,
    letterSpacing: 0.7, marginTop: Spacing.lg, marginBottom: Spacing.sm,
  },

  chipRow: { gap: Spacing.sm, paddingBottom: Spacing.xs },
  chip: {
    paddingHorizontal: Spacing.md, paddingVertical: 8,
    borderRadius: Radius.full, borderWidth: 1.5,
    borderColor: Colors.border, backgroundColor: Colors.card, ...Shadow.small,
  },
  chipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  chipText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  chipTextActive: { color: Colors.primary },

  micSection: { alignItems: 'center', paddingVertical: Spacing.md },
  micBtn: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.primaryLight,
    borderWidth: 2.5, borderColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    ...Shadow.medium,
  },
  micBtnRecording: {
    backgroundColor: '#fee2e2', borderColor: '#ef4444',
    transform: [{ scale: 1.08 }],
  },
  micIcon: { fontSize: 32 },
  micLabel: { marginTop: 8, fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },

  noteInput: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.md,
    fontSize: 15, color: Colors.textPrimary,
    minHeight: 100,
    ...Shadow.small,
  },
  transcribingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  transcribingText: { fontSize: 13, color: Colors.textSecondary },

  photoSection: { marginBottom: Spacing.sm },
  thumb: { width: 80, height: 80, borderRadius: Radius.sm, overflow: 'hidden' },
  thumbImg: { width: 80, height: 80 },
  thumbOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  thumbRemove: {
    position: 'absolute', top: 4, right: 4,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center',
  },
  addPhotoBtn: {
    height: 44, borderRadius: Radius.sm,
    borderWidth: 1.5, borderColor: Colors.primary,
    borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center',
  },
  addPhotoBtnText: { fontSize: 14, fontWeight: '600', color: Colors.primary },

  nextBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.sm,
    paddingVertical: 15, alignItems: 'center', marginTop: Spacing.lg,
    ...Shadow.small,
  },
  nextBtnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  btnDisabled: { opacity: 0.45 },

  backBtn: { alignItems: 'center', marginTop: Spacing.md, paddingVertical: 8 },
  backBtnText: { color: Colors.textSecondary, fontSize: 14, fontWeight: '600' },

  // Step 2
  pageTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  pageSubtitle: { fontSize: 13, color: Colors.textSecondary, marginBottom: Spacing.lg },
  photoCard: { backgroundColor: Colors.card, borderRadius: Radius.md, overflow: 'hidden', marginBottom: Spacing.md, ...Shadow.small },
  photoCardImg: { width: '100%', height: 200 },
  sceneDesc: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18, paddingHorizontal: Spacing.md, paddingTop: 10 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, padding: Spacing.md },
  kidTag: { paddingHorizontal: 10, paddingVertical: 5, backgroundColor: Colors.primaryLight, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.primary },
  kidTagText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  addKidTag: { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, borderColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  addKidTagText: { fontSize: 18, color: Colors.primary, lineHeight: 22 },

  // Step 3
  transcriptBox: { backgroundColor: Colors.card, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.md, borderLeftWidth: 3, borderLeftColor: Colors.primary },
  transcriptLabel: { fontSize: 10, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 0.6, marginBottom: 4 },
  transcriptText: { fontSize: 13, color: Colors.textPrimary, lineHeight: 20 },
  emptyCard: { backgroundColor: Colors.card, borderRadius: Radius.md, padding: Spacing.lg, alignItems: 'center', ...Shadow.small, marginVertical: Spacing.lg },
  emptyText: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  emptyHint: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', marginTop: 6 },
  updateCard: { backgroundColor: Colors.card, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.md, ...Shadow.small },
  updateHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  updateAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: Spacing.sm },
  updateName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, flex: 1 },
  photoBadge: { backgroundColor: Colors.primaryLight, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  photoBadgeText: { fontSize: 12, fontWeight: '600', color: Colors.primary },
  updateInput: { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, padding: Spacing.sm, fontSize: 14, color: Colors.textPrimary, minHeight: 90, backgroundColor: Colors.bg },

  // Fallback avatar
  fallback: { backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  fallbackText: { fontSize: 14, fontWeight: '700', color: Colors.primary },

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
