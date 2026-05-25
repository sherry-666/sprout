import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  RefreshControl, TouchableOpacity,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { gql, useQuery } from '@apollo/client';
import { Colors, Radius, Shadow } from '../../theme';

const EDUCATOR_KID_QUERY = gql`
  query EducatorKidDetail($kidId: ID!, $first: Int, $after: String) {
    kid(id: $kidId) {
      id
      firstName
      lastName
      profilePhotoUrl
      dateOfBirth
      classes { id name }
      parents {
        id
        profile { firstName lastName avatarUrl }
      }
      updates(first: $first, after: $after) {
        edges {
          cursor
          node {
            id
            type
            content
            aiGeneratedContent
            mediaUrls
            timestamp
            educator { profile { firstName lastName } }
          }
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
`;

function nameToHue(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h * 31 + s.charCodeAt(i)) >>> 0);
  return h % 360;
}

function formatAge(dob: string): string {
  const birth = new Date(dob);
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  if (months < 0) { years--; months += 12; }
  if (years === 0) return `${months}m`;
  if (months === 0) return `${years}y`;
  return `${years}y ${months}m`;
}

function formatDOB(dob: string): string {
  return new Date(dob).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function formatTime(ts: string): string {
  const d = new Date(ts);
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const period = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${period}`;
}

function dateSectionLabel(ts: string): string {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'TODAY';
  if (d.toDateString() === yesterday.toDateString()) return 'YESTERDAY';
  return d.toLocaleDateString('en-US', {
    weekday: 'long', month: 'short', day: 'numeric',
  }).toUpperCase();
}

type ListItem =
  | { type: 'section'; label: string }
  | { type: 'update'; data: any };

function KidHeader({ kid, initials, kidBg, parents, updateCount, totalPhotos, navigation }: any) {
  if (!kid) return null;
  return (
    <>
      <View style={s.kidHeader}>
        <View style={[s.kidAvatar, { backgroundColor: kidBg }]}>
          {kid.profilePhotoUrl ? (
            <Image
              source={{ uri: kid.profilePhotoUrl }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : (
            <Text style={s.kidAvatarTxt}>{initials}</Text>
          )}
        </View>
        <View style={s.kidInfo}>
          <Text style={s.kidName}>{kid.firstName}</Text>
          <Text style={s.kidLastName}>{kid.lastName}</Text>
          <View style={s.pillRow}>
            {kid.classes?.[0] && (
              <View style={s.classPill}>
                <Text style={s.classPillTxt}>
                  {kid.classes[0].name[0]} · {kid.classes[0].name}
                </Text>
              </View>
            )}
            {kid.dateOfBirth && (
              <View style={s.agePill}>
                <Text style={s.agePillTxt}>{formatAge(kid.dateOfBirth)}</Text>
              </View>
            )}
          </View>
          {kid.dateOfBirth && (
            <Text style={s.dob}>Born {formatDOB(kid.dateOfBirth)}</Text>
          )}
        </View>
      </View>

      {parents.length > 0 && (
        <View style={s.card}>
          <Text style={s.cardLabel}>PARENTS · {parents.length}</Text>
          {parents.map((p: any, i: number) => {
            const hue = nameToHue(p.id);
            const bg = `hsl(${hue}, 50%, 82%)`;
            const ink = `hsl(${hue}, 55%, 30%)`;
            const gi = `${p.profile?.firstName?.[0] ?? ''}${p.profile?.lastName?.[0] ?? ''}`.toUpperCase();
            return (
              <View key={p.id} style={[s.parentRow, i < parents.length - 1 && s.parentRowBorder]}>
                <View style={[s.parentAvatar, { backgroundColor: bg }]}>
                  {p.profile?.avatarUrl ? (
                    <Image
                      source={{ uri: p.profile.avatarUrl }}
                      style={StyleSheet.absoluteFill}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                    />
                  ) : (
                    <Text style={[s.parentAvatarTxt, { color: ink }]}>{gi}</Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.parentName}>{p.profile?.firstName} {p.profile?.lastName}</Text>
                  <Text style={s.parentRole}>Parent</Text>
                </View>
              </View>
            );
          })}
          <TouchableOpacity
            style={s.messageBtn}
            activeOpacity={0.85}
            onPress={() =>
              navigation.navigate('KidChat', {
                kidId: kid.id,
                kidName: `${kid.firstName} ${kid.lastName}`,
              })
            }
          >
            <Text style={s.messageBtnTxt}>💬  Message</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={s.activityHeader}>
        <Text style={s.cardLabel}>ACTIVITY</Text>
        <Text style={s.activityMeta}>
          {updateCount} update{updateCount !== 1 ? 's' : ''} · {totalPhotos} photo{totalPhotos !== 1 ? 's' : ''}
        </Text>
      </View>
    </>
  );
}

export default function EducatorKidDetailScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { kidId, className } = route.params;
  const [loadingMore, setLoadingMore] = useState(false);

  const { data, loading, refetch, fetchMore } = useQuery(EDUCATOR_KID_QUERY, {
    variables: { kidId, first: 5 },
    fetchPolicy: 'cache-and-network',
  });

  const kid = data?.kid;
  const edges = kid?.updates?.edges ?? [];
  const pageInfo = kid?.updates?.pageInfo;
  const updates: any[] = edges.map((e: any) => e.node);
  const parents: any[] = kid?.parents ?? [];

  const handleLoadMore = useCallback(async () => {
    if (!pageInfo?.hasNextPage || loadingMore) return;
    setLoadingMore(true);
    await fetchMore({
      variables: { kidId, first: 10, after: pageInfo.endCursor },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) return prev;
        return {
          kid: {
            ...fetchMoreResult.kid,
            updates: {
              ...fetchMoreResult.kid.updates,
              edges: [
                ...(prev.kid?.updates?.edges ?? []),
                ...fetchMoreResult.kid.updates.edges,
              ],
            },
          },
        };
      },
    });
    setLoadingMore(false);
  }, [pageInfo, loadingMore, kidId]);

  const listItems: ListItem[] = [];
  let lastSection = '';
  updates.forEach((u: any) => {
    const sec = dateSectionLabel(u.timestamp);
    if (sec !== lastSection) {
      listItems.push({ type: 'section', label: sec });
      lastSection = sec;
    }
    listItems.push({ type: 'update', data: u });
  });

  const kidHue = nameToHue(kid?.id ?? '');
  const kidBg = `hsl(${kidHue}, 45%, 72%)`;
  const initials = kid
    ? `${kid.firstName?.[0] ?? ''}${kid.lastName?.[0] ?? ''}`.toUpperCase()
    : '';
  const totalPhotos = updates.reduce(
    (acc: number, u: any) => acc + (u.mediaUrls?.length ?? 0), 0,
  );

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <TouchableOpacity
        style={s.backBtn}
        onPress={() => navigation.goBack()}
        hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
      >
        <Text style={s.backBtnTxt}>‹ {className ?? 'Class'}</Text>
      </TouchableOpacity>

      <FlatList
        data={listItems}
        keyExtractor={(item, i) =>
          item.type === 'section' ? `sec-${i}` : `upd-${item.data.id}`
        }
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading && !data}
            onRefresh={refetch}
            tintColor={Colors.primary}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <KidHeader
            kid={kid}
            initials={initials}
            kidBg={kidBg}
            parents={parents}
            updateCount={updates.length}
            totalPhotos={totalPhotos}
            navigation={navigation}
          />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={s.empty}>
              <Text style={s.emptyIcon}>📋</Text>
              <Text style={s.emptyTxt}>No activity yet</Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          loadingMore
            ? <ActivityIndicator color={Colors.primary} style={{ margin: 16 }} />
            : null
        }
        renderItem={({ item }) => {
          if (item.type === 'section') {
            return <Text style={s.sectionHeader}>{item.label}</Text>;
          }
          const update = item.data;
          const hasPhotos = (update.mediaUrls ?? []).length > 0;
          const displayContent = update.aiGeneratedContent || update.content;
          const isAI = !!update.aiGeneratedContent && update.aiGeneratedContent !== update.content;
          return (
            <TouchableOpacity
              style={s.updateCard}
              activeOpacity={0.85}
              onPress={() =>
                navigation.navigate('ActivityDetail', {
                  update,
                  kidName: kid?.firstName,
                })
              }
            >
              {hasPhotos && (
                <View style={s.photoRow}>
                  {update.mediaUrls.slice(0, 2).map((url: string, i: number) => (
                    <Image
                      key={i}
                      source={{ uri: url }}
                      style={s.photoImg}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                    />
                  ))}
                </View>
              )}
              <View style={s.updateBody}>
                <Text style={s.updateContent} numberOfLines={3}>{displayContent}</Text>
                <View style={s.updateFooter}>
                  <Text style={s.updateTime}>{formatTime(update.timestamp)}</Text>
                  {isAI && (
                    <View style={s.aiChip}>
                      <Text style={s.aiChipTxt}>+AI</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }} />
                  <Text style={s.sentLabel} numberOfLines={1}>✓ Sent</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  backBtn: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 2 },
  backBtnTxt: { fontSize: 15, color: Colors.primary, fontWeight: '500' },
  list: { paddingHorizontal: 16, paddingBottom: 40 },

  kidHeader: { flexDirection: 'row', gap: 14, paddingVertical: 16 },
  kidAvatar: {
    width: 84, height: 84, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  kidAvatarTxt: { fontSize: 26, fontWeight: '700', color: '#fff' },
  kidInfo: { flex: 1, justifyContent: 'center' },
  kidName: { fontSize: 26, fontWeight: '600', letterSpacing: -0.4, color: Colors.textPrimary },
  kidLastName: { fontSize: 15, color: Colors.textSecondary, marginTop: 1 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  classPill: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.full,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  classPillTxt: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
  agePill: {
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: Radius.full,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  agePillTxt: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
  dob: { fontSize: 12, color: Colors.textSecondary, marginTop: 4 },

  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg, padding: 16,
    marginBottom: 16, ...Shadow.small,
  },
  cardLabel: {
    fontSize: 11, fontWeight: '700', letterSpacing: 1.1,
    color: Colors.textSecondary, textTransform: 'uppercase', marginBottom: 10,
  },
  parentRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  parentRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  parentAvatar: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  parentAvatarTxt: { fontSize: 13, fontWeight: '700' },
  parentName: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  parentRole: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  messageBtn: {
    backgroundColor: Colors.primary, borderRadius: 12,
    paddingVertical: 12, alignItems: 'center', marginTop: 12,
  },
  messageBtnTxt: { color: Colors.white, fontSize: 15, fontWeight: '600' },

  activityHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 6,
  },
  activityMeta: { fontSize: 12, color: Colors.textSecondary },
  sectionHeader: {
    fontSize: 11, fontWeight: '700', letterSpacing: 1.1,
    color: Colors.textSecondary, textTransform: 'uppercase',
    marginBottom: 8, marginTop: 4,
  },

  updateCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg, marginBottom: 10,
    overflow: 'hidden', ...Shadow.small,
  },
  photoRow: { flexDirection: 'row', gap: 2 },
  photoImg: { flex: 1, height: 130 },
  updateBody: { padding: 12 },
  updateContent: { fontSize: 14, color: Colors.textPrimary, lineHeight: 20 },
  updateFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  updateTime: { fontSize: 11, color: Colors.textSecondary },
  aiChip: {
    backgroundColor: '#e8f5e9', borderRadius: 5,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  aiChipTxt: { fontSize: 10, color: Colors.primary, fontWeight: '600' },
  sentLabel: { fontSize: 11, color: Colors.textSecondary, flexShrink: 0 },

  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
  emptyTxt: { fontSize: 15, color: Colors.textSecondary },
});
