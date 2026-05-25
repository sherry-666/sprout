import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { gql, useQuery, useMutation } from '@apollo/client';
import { Colors, Radius, Shadow } from '../../theme';
import {
  MY_CALENDAR_INTEGRATIONS,
  BEGIN_CALENDAR_OAUTH,
  REGISTER_APPLE_CALENDAR,
  DELINK_CALENDAR,
  openOAuthBrowser,
} from '../../lib/calendar/oauth';
import { requestCalendarPermission } from '../../lib/calendar/apple';

type Provider = 'google' | 'microsoft' | 'apple';

interface Integration {
  id: string;
  provider: Provider;
  providerAccountEmail: string;
  lastSyncedAt?: string;
}

const PROVIDERS: Array<{ key: Provider; labelKey: string }> = [
  { key: 'google', labelKey: 'calendar.providers.google' },
  { key: 'microsoft', labelKey: 'calendar.providers.microsoft' },
  { key: 'apple', labelKey: 'calendar.providers.apple' },
];

export default function CalendarSettingsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [busy, setBusy] = useState<Provider | null>(null);

  const { data, loading, refetch } = useQuery(MY_CALENDAR_INTEGRATIONS, {
    fetchPolicy: 'cache-and-network',
  });
  const integrations: Integration[] = data?.myCalendarIntegrations ?? [];

  const [beginOAuth] = useMutation(BEGIN_CALENDAR_OAUTH);
  const [registerApple] = useMutation(REGISTER_APPLE_CALENDAR);
  const [delink] = useMutation(DELINK_CALENDAR);

  const linkedMap: Partial<Record<Provider, Integration>> = {};
  for (const i of integrations) linkedMap[i.provider] = i;

  const handleConnect = async (provider: Provider) => {
    setBusy(provider);
    try {
      if (provider === 'apple') {
        const status = await requestCalendarPermission();
        if (status === 'denied') {
          Alert.alert(t('calendar.permissionTitle'), t('calendar.permissionDenied'));
          return;
        }
        await registerApple({
          refetchQueries: [{ query: MY_CALENDAR_INTEGRATIONS }],
        });
        await refetch();
      } else {
        const { data: oauthData } = await beginOAuth({
          variables: { provider: provider.toUpperCase() },
        });
        const authUrl = oauthData?.beginCalendarOAuth?.authorizationUrl;
        if (!authUrl) throw new Error('No auth URL returned');

        const result = await openOAuthBrowser(authUrl);
        if (result === 'success') {
          await refetch();
        } else if (result === 'cancelled') {
          // User dismissed — no alert needed
        } else {
          Alert.alert('Error', 'OAuth connection failed. Please try again.');
        }
      }
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Connection failed');
    } finally {
      setBusy(null);
    }
  };

  const handleDelink = (integration: Integration) => {
    Alert.alert(
      t('calendar.disconnect'),
      `Disconnect ${t(`calendar.providers.${integration.provider}`)}?`,
      [
        { text: t('profile.cancel'), style: 'cancel' },
        {
          text: t('calendar.disconnect'),
          style: 'destructive',
          onPress: async () => {
            setBusy(integration.provider);
            try {
              await delink({
                variables: { integrationId: integration.id },
                refetchQueries: [{ query: MY_CALENDAR_INTEGRATIONS }],
              });
              await refetch();
            } catch (e: any) {
              Alert.alert('Error', e.message ?? 'Could not disconnect');
            } finally {
              setBusy(null);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backTxt}>‹</Text>
        </TouchableOpacity>
        <Text style={s.title}>{t('calendar.linkedCalendars')}</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {loading && integrations.length === 0 ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} />
        ) : (
          <View style={s.card}>
            {PROVIDERS.map(({ key, labelKey }, idx) => {
              const linked = linkedMap[key];
              const isBusy = busy === key;
              return (
                <View key={key} style={[s.row, idx < PROVIDERS.length - 1 && s.rowBorder]}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.providerName}>{t(labelKey)}</Text>
                    {linked && (
                      <Text style={s.email} numberOfLines={1}>
                        {linked.providerAccountEmail}
                      </Text>
                    )}
                  </View>
                  {isBusy ? (
                    <ActivityIndicator size="small" color={Colors.primary} />
                  ) : linked ? (
                    <TouchableOpacity
                      style={s.disconnectBtn}
                      onPress={() => handleDelink(linked)}
                      activeOpacity={0.7}
                    >
                      <Text style={s.disconnectTxt}>{t('calendar.disconnect')}</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={s.connectBtn}
                      onPress={() => handleConnect(key)}
                      activeOpacity={0.8}
                    >
                      <Text style={s.connectTxt}>{t('calendar.connect')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        )}

        <Text style={s.hint}>
          Events from linked calendars appear on your home screen under "Today's schedule".
        </Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f6f4ec' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
  },
  backBtn: { padding: 4 },
  backTxt: { fontSize: 28, color: Colors.primary, lineHeight: 32 },
  title: {
    fontSize: 22, fontWeight: '600', letterSpacing: -0.4,
    color: '#1d2a22',
  },

  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },

  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    ...Shadow.small,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  providerName: {
    fontSize: 15, fontWeight: '500', color: '#1d2a22',
  },
  email: {
    fontSize: 12, color: Colors.textSecondary, marginTop: 2,
  },
  connectBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  connectTxt: {
    color: '#fff', fontSize: 13, fontWeight: '600',
  },
  disconnectBtn: {
    borderRadius: Radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1.5,
    borderColor: Colors.danger,
  },
  disconnectTxt: {
    color: Colors.danger, fontSize: 13, fontWeight: '600',
  },
  hint: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 16,
    paddingHorizontal: 4,
    lineHeight: 18,
  },
});
