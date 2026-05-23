import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { gql, useMutation } from '@apollo/client';
import { setLanguage } from '../i18n';
import { Colors, Spacing, Radius, Shadow } from '../theme';

const REGENERATE_EMBEDDINGS = gql`
  mutation RegenerateFaceEmbeddings {
    regenerateFaceEmbeddings
  }
`;

const LANGUAGES = [
  { code: 'en', key: 'language.en' },
  { code: 'zh', key: 'language.zh' },
  { code: 'fr', key: 'language.fr' },
] as const;

export default function SettingsScreen({ navigation }: any) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  const [regenerate, { loading: regenerating }] = useMutation(REGENERATE_EMBEDDINGS);

  const handleRegenerate = async () => {
    try {
      const { data } = await regenerate();
      const count = data?.regenerateFaceEmbeddings ?? 0;
      Alert.alert('Done', count > 0
        ? `Updated face data for ${count} child${count === 1 ? '' : 'ren'}.`
        : 'All children already have face data — nothing to update.');
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not regenerate face data');
    }
  };

  return (
    <View style={styles.container}>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.accountSection')}</Text>
        <View style={styles.sectionCard}>
          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate('Profile')}
            activeOpacity={0.7}
          >
            <Text style={styles.rowLabel}>{t('settings.myProfile')}</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.appSection')}</Text>
        <View style={styles.sectionCard}>
          <View style={styles.langRow}>
            <Text style={styles.rowLabel}>{t('settings.language')}</Text>
            <View style={styles.langPicker}>
              {LANGUAGES.map(({ code, key }) => (
                <TouchableOpacity
                  key={code}
                  style={[styles.langBtn, currentLang === code && styles.langBtnActive]}
                  onPress={() => setLanguage(code)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.langBtnText, currentLang === code && styles.langBtnTextActive]}>
                    {t(key)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Admin</Text>
        <View style={styles.sectionCard}>
          <TouchableOpacity
            style={styles.row}
            onPress={handleRegenerate}
            disabled={regenerating}
            activeOpacity={0.7}
          >
            {regenerating
              ? <ActivityIndicator size="small" color={Colors.primary} style={{ marginRight: 10 }} />
              : null}
            <Text style={styles.rowLabel}>Regenerate Face Data</Text>
          </TouchableOpacity>
        </View>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg, padding: Spacing.lg },
  section: { marginBottom: Spacing.lg },
  sectionTitle: {
    fontSize: 12, fontWeight: '700', color: Colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginBottom: Spacing.sm, paddingHorizontal: 4,
  },
  sectionCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    overflow: 'hidden',
    ...Shadow.small,
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: 14,
  },
  rowLabel: { fontSize: 15, color: Colors.textPrimary, flex: 1 },
  chevron: { fontSize: 22, color: Colors.textSecondary },
  langRow: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
  },
  langPicker: {
    flexDirection: 'row', gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  langBtn: {
    flex: 1, paddingVertical: 10,
    borderRadius: Radius.sm,
    borderWidth: 1.5, borderColor: Colors.border,
    alignItems: 'center',
    backgroundColor: Colors.bg,
  },
  langBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  langBtnText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  langBtnTextActive: { color: Colors.primary },
});
