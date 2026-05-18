import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { setLanguage } from '../i18n';
import { Colors, Spacing, Radius, Shadow } from '../theme';

const LANGUAGES = [
  { code: 'en', key: 'language.en' },
  { code: 'zh', key: 'language.zh' },
  { code: 'fr', key: 'language.fr' },
] as const;

export default function SettingsScreen({ navigation }: any) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;

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
