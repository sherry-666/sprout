import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { gql, useMutation } from '@apollo/client';
import { Colors, Spacing, Radius, Shadow } from '../../theme';

const CREATE_UPDATE_MUTATION = gql`
  mutation CreateUpdate($input: CreateUpdateInput!) {
    createUpdate(input: $input) {
      id
      type
      content
      timestamp
    }
  }
`;

const ACTIVITY_TYPES = [
  { key: 'meal', emoji: '🍎', label: 'Meal', hint: 'What did they eat?' },
  { key: 'nap', emoji: '💤', label: 'Nap', hint: 'How long did they sleep?' },
  { key: 'activity', emoji: '🎨', label: 'Activity', hint: 'What activity did they do?' },
  { key: 'photo', emoji: '📷', label: 'Photo', hint: 'Describe what is happening...' },
] as const;

type ActivityKey = 'meal' | 'nap' | 'activity' | 'photo';

export default function LogActivityScreen({ route, navigation }: any) {
  const { classId, className, kidId, kidName } = route.params;
  const [selectedType, setSelectedType] = useState<ActivityKey>('activity');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [createUpdate] = useMutation(CREATE_UPDATE_MUTATION);

  const forClass = !kidId;
  const hint = ACTIVITY_TYPES.find(a => a.key === selectedType)?.hint ?? '';

  const handleSubmit = async () => {
    if (!content.trim()) {
      Alert.alert('Required', 'Please write something before sending.');
      return;
    }
    setSubmitting(true);
    try {
      await createUpdate({
        variables: {
          input: {
            classId,
            type: selectedType,
            content: content.trim(),
            ...(kidId ? { kidId } : {}),
          },
        },
      });
      Alert.alert('Sent!', `Update logged for ${forClass ? className : kidName}.`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to log activity.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Who is this for */}
        <View style={styles.forBadge}>
          <Text style={styles.forLabel}>Logging for: </Text>
          <Text style={styles.forName}>{forClass ? `${className} (whole class)` : kidName}</Text>
        </View>

        {/* Activity type selector */}
        <Text style={styles.sectionTitle}>Activity Type</Text>
        <View style={styles.typeGrid}>
          {ACTIVITY_TYPES.map(type => (
            <TouchableOpacity
              key={type.key}
              style={[styles.typeCard, selectedType === type.key && styles.typeCardSelected]}
              onPress={() => setSelectedType(type.key)}
              activeOpacity={0.8}
            >
              <Text style={styles.typeEmoji}>{type.emoji}</Text>
              <Text style={[styles.typeLabel, selectedType === type.key && styles.typeLabelSelected]}>
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content input */}
        <Text style={styles.sectionTitle}>Note</Text>
        <TextInput
          style={styles.noteInput}
          placeholder={hint}
          placeholderTextColor={Colors.textSecondary}
          multiline
          value={content}
          onChangeText={setContent}
          textAlignVertical="top"
        />

        {/* AI tip */}
        <View style={styles.aiTip}>
          <Text style={styles.aiTipText}>
            💡 Tip: Write quick notes like "ate all lunch", "napped 90 min" — parents will love the detail!
          </Text>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting
            ? <ActivityIndicator color={Colors.white} />
            : <Text style={styles.submitBtnText}>📤 Send Update</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.lg, paddingBottom: 40 },
  forBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.full,
    paddingHorizontal: 14, paddingVertical: 8,
    alignSelf: 'flex-start', marginBottom: Spacing.lg,
  },
  forLabel: { fontSize: 13, color: Colors.textSecondary },
  forName: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: Colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  typeGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm,
    marginBottom: Spacing.lg,
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
  typeCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  typeEmoji: { fontSize: 28, marginBottom: 4 },
  typeLabel: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  typeLabelSelected: { color: Colors.primary },
  noteInput: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.md,
    fontSize: 15, color: Colors.textPrimary,
    minHeight: 120,
    marginBottom: Spacing.md,
    ...Shadow.small,
  },
  aiTip: {
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderRadius: Radius.sm,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  aiTipText: { fontSize: 13, color: '#92400e', lineHeight: 18 },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.sm,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.7 },
  submitBtnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
});
