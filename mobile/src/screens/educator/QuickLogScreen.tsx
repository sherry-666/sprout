import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { gql, useQuery, useMutation } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing, Radius, Shadow } from '../../theme';

const MY_CLASSES_QUERY = gql`
  query QuickLogClasses {
    me {
      classes { id name }
    }
  }
`;

const CREATE_UPDATE_MUTATION = gql`
  mutation QuickLogCreate($input: CreateUpdateInput!) {
    createUpdate(input: $input) {
      id
    }
  }
`;

type ActivityKey = 'meal' | 'nap' | 'activity' | 'photo';

const ACTIVITY_KEYS: ActivityKey[] = ['meal', 'nap', 'activity', 'photo'];
const ACTIVITY_EMOJIS: Record<ActivityKey, string> = {
  meal: '🍎', nap: '💤', activity: '🎨', photo: '📷',
};

export default function QuickLogScreen() {
  const { t } = useTranslation();
  const { data, loading: classesLoading } = useQuery(MY_CLASSES_QUERY, { fetchPolicy: 'cache-and-network' });
  const [createUpdate] = useMutation(CREATE_UPDATE_MUTATION);

  const classes: { id: string; name: string }[] = data?.me?.classes ?? [];

  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [activityType, setActivityType] = useState<ActivityKey>('activity');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selectedClass = classes.find(c => c.id === selectedClassId);

  const handleSubmit = async () => {
    if (!selectedClassId) {
      Alert.alert(t('quickLog.selectClass'));
      return;
    }
    if (!note.trim()) {
      Alert.alert(t('quickLog.required'));
      return;
    }
    setSubmitting(true);
    try {
      await createUpdate({
        variables: { input: { classId: selectedClassId, type: activityType, content: note.trim() } },
      });
      Alert.alert(t('quickLog.successTitle'), t('quickLog.successMsg', { name: selectedClass?.name }), [
        { text: 'OK', onPress: () => { setNote(''); setSelectedClassId(null); } },
      ]);
    } catch (e: any) {
      Alert.alert(t('quickLog.error'), e.message ?? '');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('quickLog.title')}</Text>
          <Text style={styles.headerSubtitle}>{t('quickLog.subtitle')}</Text>
        </View>

        {/* Class selector */}
        <Text style={styles.sectionLabel}>{t('quickLog.selectClass')}</Text>
        {classesLoading && classes.length === 0 ? (
          <ActivityIndicator color={Colors.primary} style={{ marginBottom: Spacing.lg }} />
        ) : classes.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>{t('quickLog.noClasses')}</Text>
            <Text style={styles.emptyHint}>{t('quickLog.noClassesHint')}</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.classScroll} contentContainerStyle={styles.classScrollContent}>
            {classes.map(cls => (
              <TouchableOpacity
                key={cls.id}
                style={[styles.classChip, selectedClassId === cls.id && styles.classChipSelected]}
                onPress={() => setSelectedClassId(cls.id)}
                activeOpacity={0.8}
              >
                <Text style={[styles.classChipText, selectedClassId === cls.id && styles.classChipTextSelected]}>
                  {cls.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Activity type */}
        <Text style={styles.sectionLabel}>{t('quickLog.activityType')}</Text>
        <View style={styles.typeGrid}>
          {ACTIVITY_KEYS.map(key => (
            <TouchableOpacity
              key={key}
              style={[styles.typeCard, activityType === key && styles.typeCardSelected]}
              onPress={() => setActivityType(key)}
              activeOpacity={0.8}
            >
              <Text style={styles.typeEmoji}>{ACTIVITY_EMOJIS[key]}</Text>
              <Text style={[styles.typeLabel, activityType === key && styles.typeLabelSelected]}>
                {t(`quickLog.${key}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Note */}
        <Text style={styles.sectionLabel}>{t('quickLog.note')}</Text>
        <TextInput
          style={styles.noteInput}
          placeholder={t(`quickLog.${activityType}Hint`)}
          placeholderTextColor={Colors.textSecondary}
          multiline
          value={note}
          onChangeText={setNote}
          textAlignVertical="top"
        />

        <TouchableOpacity
          style={[styles.submitBtn, (submitting || !selectedClassId) && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={submitting || !selectedClassId}
          activeOpacity={0.85}
        >
          {submitting
            ? <ActivityIndicator color={Colors.white} />
            : <Text style={styles.submitBtnText}>📤 {t('quickLog.send')}</Text>
          }
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { paddingBottom: 40 },
  header: {
    backgroundColor: Colors.primary,
    paddingTop: 20, paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.white },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  sectionLabel: {
    fontSize: 13, fontWeight: '700', color: Colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginBottom: Spacing.sm, marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  classScroll: { flexGrow: 0 },
  classScrollContent: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  classChip: {
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    backgroundColor: Colors.card, borderRadius: Radius.full,
    borderWidth: 2, borderColor: Colors.border,
    ...Shadow.small,
  },
  classChipSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  classChipText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  classChipTextSelected: { color: Colors.primary },
  emptyCard: {
    marginHorizontal: Spacing.lg, backgroundColor: Colors.card,
    borderRadius: Radius.md, padding: Spacing.lg,
    alignItems: 'center', ...Shadow.small,
  },
  emptyText: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  emptyHint: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', marginTop: 4 },
  typeGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  typeCard: {
    flex: 1, minWidth: '45%',
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderWidth: 2, borderColor: 'transparent',
    ...Shadow.small,
  },
  typeCardSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  typeEmoji: { fontSize: 28, marginBottom: 4 },
  typeLabel: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  typeLabelSelected: { color: Colors.primary },
  noteInput: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.md,
    fontSize: 15, color: Colors.textPrimary,
    minHeight: 110,
    marginHorizontal: Spacing.lg,
    ...Shadow.small,
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.sm,
    paddingVertical: 16,
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
  },
  btnDisabled: { opacity: 0.45 },
  submitBtnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
});
