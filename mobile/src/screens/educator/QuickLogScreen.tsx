import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput,
  ScrollView, ActivityIndicator, Alert, Image, Modal,
  FlatList, Pressable,
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
    $audioBase64: String
    $audioMimeType: String
    $photoKeys: [String!]
  ) {
    analyzeQuickLog(
      classId: $classId
      audioBase64: $audioBase64
      audioMimeType: $audioMimeType
      photoKeys: $photoKeys
    ) {
      transcript
      suggestions {
        kidId
        kidName
        avatarUrl
        content
        photoKeys
      }
      photoResults {
        photoKey
        photoUrl
        detectedKidIds
        sceneDescription
      }
      eligibleKids {
        id
        firstName
        lastName
        avatarUrl
      }
    }
  }
`;

const CONFIRM_QUICK_LOG_MUTATION = gql`
  mutation ConfirmQuickLog($updates: [QuickLogUpdateInput!]!) {
    confirmQuickLog(updates: $updates) { id }
  }
`;

// ─── Types ─────────────────────────────────────────────────────────────────

interface PhotoItem {
  localUri: string;
  key: string | null;
  uploading: boolean;
}

interface PhotoAssignment {
  photoKey: string;
  photoUrl: string;
  sceneDescription: string;
  assignedKidIds: string[];
}

interface KidUpdate {
  kidId: string;
  kidName: string;
  avatarUrl: string | null;
  content: string;
  photoKeys: string[];
}

interface EligibleKid {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}

interface QuickLogAnalysis {
  transcript: string;
  suggestions: { kidId: string; kidName: string; avatarUrl: string | null; content: string; photoKeys: string[] }[];
  photoResults: { photoKey: string; photoUrl: string; detectedKidIds: string[]; sceneDescription: string }[];
  eligibleKids: EligibleKid[];
}

// ─── Kid Picker Modal ──────────────────────────────────────────────────────

function KidPickerModal({
  visible, kids, excludeIds, onSelect, onClose,
}: {
  visible: boolean;
  kids: EligibleKid[];
  excludeIds: string[];
  onSelect: (kid: EligibleKid) => void;
  onClose: () => void;
}) {
  const available = kids.filter(k => !excludeIds.includes(k.id));
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Add a kid to this photo</Text>
          {available.length === 0 ? (
            <Text style={styles.emptyHint}>All kids are already tagged</Text>
          ) : (
            <FlatList
              data={available}
              keyExtractor={k => k.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.kidRow}
                  onPress={() => { onSelect(item); onClose(); }}
                >
                  {item.avatarUrl ? (
                    <Image source={{ uri: item.avatarUrl }} style={styles.rowAvatar} />
                  ) : (
                    <View style={[styles.rowAvatar, styles.avatarFallback]}>
                      <Text style={styles.avatarFallbackText}>{item.firstName[0]}</Text>
                    </View>
                  )}
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
  const [presignPhoto] = useMutation(PRESIGN_PHOTO_MUTATION);
  const [analyzeQuickLog] = useMutation(ANALYZE_QUICK_LOG_MUTATION);
  const [confirmQuickLog] = useMutation(CONFIRM_QUICK_LOG_MUTATION);

  const classes: { id: string; name: string }[] = data?.me?.classes ?? [];

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [audioReady, setAudioReady] = useState(false);

  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<QuickLogAnalysis | null>(null);

  const [photoAssignments, setPhotoAssignments] = useState<PhotoAssignment[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerPhotoKey, setPickerPhotoKey] = useState<string | null>(null);

  const [kidUpdates, setKidUpdates] = useState<KidUpdate[]>([]);
  const [confirming, setConfirming] = useState(false);

  // ── Audio ────────────────────────────────────────────────────────────────

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
      setAudioReady(false);
      setAudioBase64(null);
    } catch {
      Alert.alert('Recording error', 'Could not start recording.');
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
      if (uri) {
        const b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
        setAudioBase64(b64);
        setAudioReady(true);
      }
    } catch {
      setIsRecording(false);
    }
  };

  // ── Photos ───────────────────────────────────────────────────────────────

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
    const newItems: PhotoItem[] = result.assets.slice(0, slots).map(a => ({
      localUri: a.uri,
      key: null,
      uploading: true,
    }));

    setPhotos(prev => [...prev, ...newItems]);

    for (const item of newItems) {
      try {
        const { data: pd } = await presignPhoto({ variables: { contentType: 'image/jpeg' } });
        const { uploadUrl, objectKey } = pd.presignQuickLogPhoto;
        const blob = await fetch(item.localUri).then(r => r.blob());
        const putRes = await fetch(uploadUrl, { method: 'PUT', body: blob, headers: { 'Content-Type': 'image/jpeg' } });
        if (!putRes.ok) throw new Error(`Upload failed (${putRes.status})`);
        setPhotos(prev => prev.map(p => p.localUri === item.localUri ? { ...p, key: objectKey, uploading: false } : p));
      } catch {
        setPhotos(prev => prev.map(p => p.localUri === item.localUri ? { ...p, uploading: false } : p));
      }
    }
  };

  // ── Analyze ──────────────────────────────────────────────────────────────

  const handleAnalyze = async () => {
    const uploadedKeys = photos.filter(p => p.key).map(p => p.key as string);
    if (!audioBase64 && uploadedKeys.length === 0) {
      Alert.alert('Nothing to analyze', 'Record a voice note or add photos first.');
      return;
    }
    setAnalyzing(true);
    try {
      const { data: ad } = await analyzeQuickLog({
        variables: {
          classId: selectedClassId ?? undefined,
          audioBase64: audioBase64 ?? undefined,
          audioMimeType: audioBase64 ? 'audio/m4a' : undefined,
          photoKeys: uploadedKeys.length > 0 ? uploadedKeys : undefined,
        },
      });
      const result: QuickLogAnalysis = ad.analyzeQuickLog;
      setAnalysis(result);

      const assignments: PhotoAssignment[] = result.photoResults.map(pr => ({
        photoKey: pr.photoKey,
        photoUrl: pr.photoUrl,
        sceneDescription: pr.sceneDescription,
        assignedKidIds: [...pr.detectedKidIds],
      }));
      setPhotoAssignments(assignments);

      setKidUpdates(result.suggestions.map(s => ({
        kidId: s.kidId,
        kidName: s.kidName,
        avatarUrl: s.avatarUrl ?? null,
        content: s.content,
        photoKeys: s.photoKeys,
      })));

      setStep(assignments.length > 0 ? 2 : 3);
    } catch (e: any) {
      Alert.alert('Analysis failed', e.message ?? 'Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  // ── Step 2 helpers ───────────────────────────────────────────────────────

  const removeKidFromPhoto = (photoKey: string, kidId: string) => {
    setPhotoAssignments(prev =>
      prev.map(pa => pa.photoKey === photoKey
        ? { ...pa, assignedKidIds: pa.assignedKidIds.filter(id => id !== kidId) }
        : pa)
    );
  };

  const addKidToPhoto = (photoKey: string, kid: EligibleKid) => {
    setPhotoAssignments(prev =>
      prev.map(pa => pa.photoKey === photoKey
        ? { ...pa, assignedKidIds: [...pa.assignedKidIds, kid.id] }
        : pa)
    );
    setKidUpdates(prev => {
      if (prev.find(u => u.kidId === kid.id)) return prev;
      return [...prev, {
        kidId: kid.id,
        kidName: `${kid.firstName} ${kid.lastName}`,
        avatarUrl: kid.avatarUrl,
        content: '',
        photoKeys: [photoKey],
      }];
    });
  };

  const proceedToStep3 = () => {
    const kidPhotoMap: Record<string, string[]> = {};
    for (const pa of photoAssignments) {
      for (const kidId of pa.assignedKidIds) {
        if (!kidPhotoMap[kidId]) kidPhotoMap[kidId] = [];
        kidPhotoMap[kidId].push(pa.photoKey);
      }
    }
    setKidUpdates(prev => prev.map(u => ({ ...u, photoKeys: kidPhotoMap[u.kidId] ?? u.photoKeys })));
    setStep(3);
  };

  // ── Confirm ──────────────────────────────────────────────────────────────

  const handleConfirm = async () => {
    const valid = kidUpdates.filter(u => u.content.trim());
    if (valid.length === 0) {
      Alert.alert('Nothing to send', 'Add at least one update before confirming.');
      return;
    }
    setConfirming(true);
    try {
      await confirmQuickLog({
        variables: {
          updates: valid.map(u => ({ kidId: u.kidId, content: u.content.trim(), photoKeys: u.photoKeys })),
        },
      });
      Alert.alert(
        'Updates sent! ✅',
        `${valid.length} update${valid.length !== 1 ? 's' : ''} sent to parents.`,
        [{ text: 'Done', onPress: resetAll }],
      );
    } catch (e: any) {
      Alert.alert('Failed to send', e.message ?? 'Please try again.');
    } finally {
      setConfirming(false);
    }
  };

  const resetAll = () => {
    setStep(1);
    setSelectedClassId(null);
    setAudioBase64(null);
    setAudioReady(false);
    setPhotos([]);
    setAnalysis(null);
    setPhotoAssignments([]);
    setKidUpdates([]);
  };

  const eligibleKids = analysis?.eligibleKids ?? [];
  const getKidName = (id: string) => {
    const k = eligibleKids.find(k => k.id === id);
    return k ? `${k.firstName} ${k.lastName}` : id;
  };

  const uploadingAny = photos.some(p => p.uploading);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      {/* Step indicator */}
      <View style={styles.stepBar}>
        {([1, 2, 3] as const).map(s => (
          <View key={s} style={[styles.stepDot, step === s && styles.stepDotActive, step > s && styles.stepDotDone]} />
        ))}
      </View>

      {/* ── Step 1: Input ── */}
      {step === 1 && (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.stepTitle}>New Quick Log</Text>
          <Text style={styles.stepSubtitle}>Record a voice note and/or add photos, then tap Analyze</Text>

          <Text style={styles.sectionLabel}>CLASS (OPTIONAL)</Text>
          {classesLoading && classes.length === 0
            ? <ActivityIndicator color={Colors.primary} style={{ marginBottom: Spacing.lg }} />
            : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                <TouchableOpacity
                  style={[styles.chip, !selectedClassId && styles.chipSelected]}
                  onPress={() => setSelectedClassId(null)}
                >
                  <Text style={[styles.chipText, !selectedClassId && styles.chipTextSelected]}>All kids</Text>
                </TouchableOpacity>
                {classes.map(cls => (
                  <TouchableOpacity
                    key={cls.id}
                    style={[styles.chip, selectedClassId === cls.id && styles.chipSelected]}
                    onPress={() => setSelectedClassId(selectedClassId === cls.id ? null : cls.id)}
                  >
                    <Text style={[styles.chipText, selectedClassId === cls.id && styles.chipTextSelected]}>{cls.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

          <Text style={styles.sectionLabel}>VOICE NOTE</Text>
          <View style={styles.micArea}>
            <TouchableOpacity
              style={[styles.micBtn, isRecording && styles.micBtnActive]}
              onPressIn={startRecording}
              onPressOut={stopRecording}
              activeOpacity={0.8}
            >
              <Text style={styles.micIcon}>{isRecording ? '⏹' : '🎙'}</Text>
              <Text style={styles.micHint}>{isRecording ? 'Release to stop' : 'Hold to record'}</Text>
            </TouchableOpacity>
            {audioReady && <Text style={styles.readyBadge}>✓ Voice note ready</Text>}
          </View>

          <Text style={styles.sectionLabel}>PHOTOS (UP TO 10)</Text>
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
            style={[styles.primaryBtn, (analyzing || uploadingAny) && styles.btnDisabled]}
            onPress={handleAnalyze}
            disabled={analyzing || uploadingAny}
            activeOpacity={0.85}
          >
            {analyzing
              ? <ActivityIndicator color={Colors.white} />
              : <Text style={styles.primaryBtnText}>✨  Analyze</Text>}
          </TouchableOpacity>
          {uploadingAny && <Text style={styles.uploadHint}>Uploading photos…</Text>}
        </ScrollView>
      )}

      {/* ── Step 2: Photo Review ── */}
      {step === 2 && (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.stepTitle}>Photo Review</Text>
          <Text style={styles.stepSubtitle}>Tap a kid tag to remove it, or tap ＋ to add</Text>

          {photoAssignments.map(pa => (
            <View key={pa.photoKey} style={styles.photoCard}>
              <Image source={{ uri: pa.photoUrl }} style={styles.photoCardImg} resizeMode="cover" />
              {!!pa.sceneDescription && (
                <Text style={styles.sceneDesc}>{pa.sceneDescription}</Text>
              )}
              <View style={styles.tagRow}>
                {pa.assignedKidIds.map(kidId => (
                  <TouchableOpacity
                    key={kidId}
                    style={styles.kidTag}
                    onPress={() => removeKidFromPhoto(pa.photoKey, kidId)}
                  >
                    <Text style={styles.kidTagText}>{getKidName(kidId)}  ✕</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={styles.addKidTag}
                  onPress={() => { setPickerPhotoKey(pa.photoKey); setPickerOpen(true); }}
                >
                  <Text style={styles.addKidTagText}>＋</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          <TouchableOpacity style={styles.primaryBtn} onPress={proceedToStep3} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>Next →</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backBtn} onPress={() => setStep(1)}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ── Step 3: Review & Confirm ── */}
      {step === 3 && (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.stepTitle}>Review Updates</Text>
          <Text style={styles.stepSubtitle}>Edit each message before sending to parents</Text>

          {!!analysis?.transcript && (
            <View style={styles.transcriptBox}>
              <Text style={styles.transcriptLabel}>TRANSCRIPT</Text>
              <Text style={styles.transcriptText}>{analysis.transcript}</Text>
            </View>
          )}

          {kidUpdates.length === 0
            ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No updates generated</Text>
                <Text style={styles.emptyHint}>No kids were identified. Try again with a clearer voice note.</Text>
              </View>
            )
            : kidUpdates.map((u, idx) => (
              <View key={u.kidId} style={styles.updateCard}>
                <View style={styles.updateCardHeader}>
                  {u.avatarUrl
                    ? <Image source={{ uri: u.avatarUrl }} style={styles.updateAvatar} />
                    : (
                      <View style={[styles.updateAvatar, styles.avatarFallback]}>
                        <Text style={styles.avatarFallbackText}>{u.kidName[0]}</Text>
                      </View>
                    )}
                  <Text style={styles.updateKidName}>{u.kidName}</Text>
                  {u.photoKeys.length > 0 && (
                    <View style={styles.photoBadge}>
                      <Text style={styles.photoBadgeText}>📷  {u.photoKeys.length}</Text>
                    </View>
                  )}
                </View>
                <TextInput
                  style={styles.updateInput}
                  value={u.content}
                  onChangeText={text =>
                    setKidUpdates(prev => prev.map((x, i) => i === idx ? { ...x, content: text } : x))}
                  multiline
                  placeholder="Write an update for parents…"
                  placeholderTextColor={Colors.textSecondary}
                  textAlignVertical="top"
                />
              </View>
            ))}

          <TouchableOpacity
            style={[styles.primaryBtn, (confirming || kidUpdates.every(u => !u.content.trim())) && styles.btnDisabled]}
            onPress={handleConfirm}
            disabled={confirming || kidUpdates.every(u => !u.content.trim())}
            activeOpacity={0.85}
          >
            {confirming
              ? <ActivityIndicator color={Colors.white} />
              : <Text style={styles.primaryBtnText}>✅  Send Updates</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => setStep(photoAssignments.length > 0 ? 2 : 1)}
          >
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

  stepBar: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 8, paddingVertical: Spacing.sm, backgroundColor: Colors.card,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  stepDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.border,
  },
  stepDotActive: { width: 24, backgroundColor: Colors.primary },
  stepDotDone: { backgroundColor: Colors.success },

  content: { paddingHorizontal: Spacing.lg, paddingBottom: 48, paddingTop: Spacing.lg },
  stepTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  stepSubtitle: { fontSize: 14, color: Colors.textSecondary, marginBottom: Spacing.lg },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: Colors.textSecondary,
    letterSpacing: 0.6, marginTop: Spacing.md, marginBottom: Spacing.sm,
  },

  chipRow: { gap: Spacing.sm, marginBottom: Spacing.xs },
  chip: {
    paddingHorizontal: Spacing.md, paddingVertical: 8,
    borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.card, ...Shadow.small,
  },
  chipSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  chipText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  chipTextSelected: { color: Colors.primary },

  micArea: { alignItems: 'center', marginVertical: Spacing.md },
  micBtn: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: Colors.primaryLight,
    borderWidth: 2, borderColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    ...Shadow.medium,
  },
  micBtnActive: { backgroundColor: '#fee2e2', borderColor: Colors.danger, transform: [{ scale: 1.08 }] },
  micIcon: { fontSize: 34 },
  micHint: { fontSize: 11, color: Colors.textSecondary, marginTop: 4 },
  readyBadge: {
    marginTop: Spacing.sm, fontSize: 13, fontWeight: '600',
    color: Colors.success, textAlign: 'center',
  },

  photoSection: { marginBottom: Spacing.md },
  thumb: {
    width: 80, height: 80, borderRadius: Radius.sm,
    overflow: 'hidden', position: 'relative',
  },
  thumbImg: { width: 80, height: 80 },
  thumbOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
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

  primaryBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.sm,
    paddingVertical: 15, alignItems: 'center',
    marginTop: Spacing.lg, ...Shadow.small,
    flexDirection: 'row', justifyContent: 'center', gap: 6,
  },
  primaryBtnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  btnDisabled: { opacity: 0.45 },
  uploadHint: { textAlign: 'center', fontSize: 12, color: Colors.textSecondary, marginTop: Spacing.sm },

  backBtn: { alignItems: 'center', marginTop: Spacing.md, paddingVertical: 8 },
  backBtnText: { color: Colors.textSecondary, fontSize: 14, fontWeight: '600' },

  // Step 2
  photoCard: {
    backgroundColor: Colors.card, borderRadius: Radius.md,
    overflow: 'hidden', marginBottom: Spacing.md, ...Shadow.small,
  },
  photoCardImg: { width: '100%', height: 200 },
  sceneDesc: {
    fontSize: 13, color: Colors.textSecondary, lineHeight: 18,
    paddingHorizontal: Spacing.md, paddingTop: Spacing.sm,
  },
  tagRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm,
    padding: Spacing.md,
  },
  kidTag: {
    paddingHorizontal: 10, paddingVertical: 5,
    backgroundColor: Colors.primaryLight, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.primary,
  },
  kidTagText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  addKidTag: {
    width: 30, height: 30, borderRadius: 15,
    borderWidth: 1.5, borderColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  addKidTagText: { fontSize: 18, color: Colors.primary, lineHeight: 22 },

  // Step 3
  transcriptBox: {
    backgroundColor: Colors.card, borderRadius: Radius.md,
    padding: Spacing.md, marginBottom: Spacing.md,
    borderLeftWidth: 3, borderLeftColor: Colors.primary,
  },
  transcriptLabel: {
    fontSize: 10, fontWeight: '700', color: Colors.textSecondary,
    letterSpacing: 0.6, marginBottom: 4,
  },
  transcriptText: { fontSize: 13, color: Colors.textPrimary, lineHeight: 20 },

  emptyCard: {
    backgroundColor: Colors.card, borderRadius: Radius.md,
    padding: Spacing.lg, alignItems: 'center', ...Shadow.small,
    marginVertical: Spacing.lg,
  },
  emptyText: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  emptyHint: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', marginTop: 6 },

  updateCard: {
    backgroundColor: Colors.card, borderRadius: Radius.md,
    padding: Spacing.md, marginBottom: Spacing.md, ...Shadow.small,
  },
  updateCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  updateAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: Spacing.sm },
  updateKidName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, flex: 1 },
  photoBadge: {
    backgroundColor: Colors.primaryLight, borderRadius: Radius.full,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  photoBadgeText: { fontSize: 12, fontWeight: '600', color: Colors.primary },
  updateInput: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm,
    padding: Spacing.sm, fontSize: 14, color: Colors.textPrimary,
    minHeight: 90, backgroundColor: Colors.bg,
  },

  // Shared avatar fallback
  avatarFallback: { backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  avatarFallbackText: { fontSize: 14, fontWeight: '700', color: Colors.primary },

  // Kid picker modal
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: Spacing.sm, paddingBottom: 40, maxHeight: '60%',
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border,
    alignSelf: 'center', marginBottom: Spacing.md,
  },
  sheetTitle: {
    fontSize: 16, fontWeight: '700', color: Colors.textPrimary,
    paddingHorizontal: Spacing.lg, marginBottom: Spacing.md,
  },
  kidRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
  },
  rowAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: Spacing.md },
  kidRowName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
});
