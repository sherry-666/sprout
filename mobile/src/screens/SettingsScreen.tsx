import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { gql, useMutation } from '@apollo/client';
import { Colors, Radius, Shadow } from '../theme';

const REGENERATE_EMBEDDINGS = gql`
  mutation RegenerateFaceEmbeddings {
    regenerateFaceEmbeddings
  }
`;

export default function SettingsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
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
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.eyebrow}>PREFERENCES</Text>
        <Text style={s.title}>{t('settings.title')}</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Account section */}
        <Text style={s.sectionLabel}>{t('settings.accountSection').toUpperCase()}</Text>
        <View style={s.card}>
          <TouchableOpacity
            style={s.row}
            onPress={() => navigation.navigate('Profile')}
            activeOpacity={0.7}
          >
            <Text style={s.rowLabel}>{t('settings.myProfile')}</Text>
            <Text style={s.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Admin section */}
        <Text style={[s.sectionLabel, { marginTop: 24 }]}>ADMIN</Text>
        <View style={s.card}>
          <TouchableOpacity
            style={s.row}
            onPress={handleRegenerate}
            disabled={regenerating}
            activeOpacity={0.7}
          >
            {regenerating && (
              <ActivityIndicator size="small" color={Colors.primary} style={{ marginRight: 10 }} />
            )}
            <Text style={s.rowLabel}>Regenerate Face Data</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f6f4ec' },

  // Header
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 },
  eyebrow: {
    fontSize: 11, fontWeight: '600', letterSpacing: 1.2,
    textTransform: 'uppercase', color: 'rgba(60,60,67,0.55)',
  },
  title: {
    fontSize: 30, fontWeight: '600', letterSpacing: -0.6,
    color: '#1d2a22', marginTop: 4, marginBottom: 4,
  },

  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },

  sectionLabel: {
    fontSize: 11, fontWeight: '600', letterSpacing: 1.1,
    color: 'rgba(60,60,67,0.55)',
    marginBottom: 8,
  },

  card: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    overflow: 'hidden',
    ...Shadow.small,
  },

  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 15,
  },
  rowLabel: { fontSize: 15, color: '#1d2a22', flex: 1 },
  chevron: { fontSize: 20, color: 'rgba(60,60,67,0.4)' },

});
