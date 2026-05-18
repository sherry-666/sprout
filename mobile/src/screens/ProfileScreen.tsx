import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { Colors, Spacing, Radius, Shadow } from '../theme';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();

  const handleSignOut = () => {
    Alert.alert(t('profile.signOutTitle'), t('profile.signOutMsg'), [
      { text: t('profile.cancel'), style: 'cancel' },
      { text: t('profile.signOut'), style: 'destructive', onPress: signOut },
    ]);
  };

  if (!user) return null;

  const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
  const roleLabel = t(`roles.${user.role}`, { defaultValue: user.role });

  return (
    <View style={styles.container}>
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{user.firstName} {user.lastName}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{roleLabel}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.accountSection')}</Text>
        <View style={styles.sectionCard}>
          <Row label={t('profile.role')} value={roleLabel} />
        </View>
      </View>

      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.85}>
        <Text style={styles.signOutText}>{t('profile.signOut')}</Text>
      </TouchableOpacity>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg, padding: Spacing.lg },
  profileCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.lg,
    ...Shadow.small,
  },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  avatarText: { color: Colors.white, fontSize: 28, fontWeight: '700' },
  name: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 },
  roleBadge: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.full,
    paddingHorizontal: 12, paddingVertical: 4,
  },
  roleText: { color: Colors.primary, fontSize: 13, fontWeight: '600' },
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
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  rowLabel: { fontSize: 15, color: Colors.textPrimary, flexShrink: 0, marginRight: Spacing.sm },
  rowValue: { fontSize: 15, color: Colors.textSecondary, flex: 1, textAlign: 'right' },
  signOutBtn: {
    backgroundColor: Colors.dangerLight,
    borderRadius: Radius.sm,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.2)',
  },
  signOutText: { color: Colors.danger, fontSize: 16, fontWeight: '700' },
});
