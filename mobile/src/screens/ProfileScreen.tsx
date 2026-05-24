import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { Colors, Radius, Shadow } from '../theme';

export default function ProfileScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
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
  const nameHue = ((user.firstName.charCodeAt(0) * 31 + user.lastName.charCodeAt(0)) % 360);

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={s.backBtn}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
        >
          <Text style={s.backBtnTxt}>‹ {t('settings.title')}</Text>
        </TouchableOpacity>
        <Text style={s.title}>{t('profile.title')}</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar card */}
        <View style={s.avatarCard}>
          <View style={[s.avatar, { backgroundColor: `hsl(${nameHue}, 55%, 87%)` }]}>
            <Text style={[s.avatarText, { color: `hsl(${nameHue}, 60%, 30%)` }]}>{initials}</Text>
          </View>
          <Text style={s.name}>{user.firstName} {user.lastName}</Text>
          <View style={s.roleBadge}>
            <Text style={s.roleText}>{roleLabel}</Text>
          </View>
        </View>

        {/* Account info */}
        <Text style={s.sectionLabel}>{t('settings.accountSection').toUpperCase()}</Text>
        <View style={s.card}>
          <InfoRow label={t('profile.role')} value={roleLabel} />
        </View>

        {/* Sign out */}
        <TouchableOpacity style={s.signOutBtn} onPress={handleSignOut} activeOpacity={0.85}>
          <Text style={s.signOutText}>{t('profile.signOut')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f6f4ec' },

  // Header
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
  backBtn: { marginBottom: 8 },
  backBtnTxt: { fontSize: 15, color: Colors.primary, fontWeight: '500' },
  title: {
    fontSize: 30, fontWeight: '600', letterSpacing: -0.6,
    color: '#1d2a22', marginBottom: 4,
  },

  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },

  // Avatar card
  avatarCard: {
    backgroundColor: Colors.card,
    borderRadius: 16, padding: 28,
    alignItems: 'center',
    marginBottom: 28,
    ...Shadow.small,
  },
  avatar: {
    width: 76, height: 76, borderRadius: 38,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
  },
  avatarText: { color: Colors.white, fontSize: 28, fontWeight: '700' },
  name: { fontSize: 20, fontWeight: '600', color: '#1d2a22', marginBottom: 8 },
  roleBadge: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.full,
    paddingHorizontal: 14, paddingVertical: 5,
  },
  roleText: { color: Colors.primary, fontSize: 13, fontWeight: '600' },

  sectionLabel: {
    fontSize: 11, fontWeight: '600', letterSpacing: 1.1,
    color: 'rgba(60,60,67,0.55)', marginBottom: 8,
  },

  card: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 24,
    ...Shadow.small,
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 15,
  },
  rowLabel: { fontSize: 15, color: '#1d2a22', flex: 1 },
  rowValue: { fontSize: 15, color: 'rgba(60,60,67,0.55)' },

  signOutBtn: {
    backgroundColor: 'rgba(220,38,38,0.07)',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.15)',
  },
  signOutText: { color: Colors.danger, fontSize: 15, fontWeight: '600' },
});
