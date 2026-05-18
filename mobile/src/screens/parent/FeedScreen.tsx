import React from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Image,
} from 'react-native';
import { gql, useQuery } from '@apollo/client';
import { useAuth } from '../../contexts/AuthContext';
import { Colors, Spacing, Radius, Shadow } from '../../theme';

const MY_KIDS_QUERY = gql`
  query MyKidsForFeed {
    kids(first: 50) {
      edges {
        node {
          id
          firstName
          lastName
          gender
          profilePhotoUrl
          institution { id name }
          classes {
            id
            name
            educators { id profile { firstName lastName } }
          }
        }
      }
    }
  }
`;

export default function FeedScreen({ navigation }: any) {
  const { user } = useAuth();
  const { data, loading, refetch } = useQuery(MY_KIDS_QUERY, { fetchPolicy: 'cache-and-network' });

  const kids = data?.kids?.edges?.map((e: any) => e.node) ?? [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, {user?.firstName}! 👋</Text>
        <Text style={styles.subtitle}>Your children's updates</Text>
      </View>

      {loading && kids.length === 0 ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={Colors.primary} />
      ) : kids.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>👶</Text>
          <Text style={styles.emptyText}>No children linked to your account yet.</Text>
          <Text style={styles.emptySubtext}>Contact your day care to register your child.</Text>
        </View>
      ) : (
        <FlatList
          data={kids}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={Colors.primary} />}
          renderItem={({ item }: any) => (
            <KidCard kid={item} onPress={() => navigation.navigate('KidDetail', {
              kidId: item.id,
              kidName: `${item.firstName} ${item.lastName}`,
            })} />
          )}
        />
      )}
    </View>
  );
}

function KidCard({ kid, onPress }: { kid: any; onPress: () => void }) {
  const avatarColor = kid.gender === 'female' ? '#EC4899' : Colors.primary;
  const educators: any[] = kid.class?.educators ?? [];
  const educatorNames = educators.map((e: any) =>
    `${e.profile?.firstName ?? ''} ${e.profile?.lastName ?? ''}`.trim()
  ).join(', ');

  return (
    <TouchableOpacity style={styles.kidCard} onPress={onPress} activeOpacity={0.8}>
      {kid.profilePhotoUrl ? (
        <Image source={{ uri: kid.profilePhotoUrl }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
          <Text style={styles.avatarText}>{kid.firstName.charAt(0)}</Text>
        </View>
      )}
      <View style={styles.kidInfo}>
        <Text style={styles.kidName}>{kid.firstName} {kid.lastName}</Text>
        {kid.institution && (
          <Text style={styles.kidMeta}>🏫 {kid.institution.name}</Text>
        )}
        {kid.class ? (
          <Text style={styles.kidMeta}>📚 {kid.class.name}</Text>
        ) : (
          <Text style={[styles.kidMeta, { color: Colors.warning }]}>📚 Not enrolled in a class</Text>
        )}
        {educatorNames ? (
          <Text style={styles.kidMeta}>👩‍🏫 {educatorNames}</Text>
        ) : null}
      </View>
      <View style={styles.feedBadge}>
        <Text style={styles.feedBadgeText}>Feed ›</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    backgroundColor: Colors.primary,
    paddingTop: 20, paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  greeting: { fontSize: 22, fontWeight: '700', color: Colors.white },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  list: { padding: Spacing.md },
  kidCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    ...Shadow.small,
  },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
    marginRight: Spacing.md,
  },
  avatarText: { color: Colors.white, fontSize: 22, fontWeight: '700' },
  kidInfo: { flex: 1 },
  kidName: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  kidMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  feedBadge: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.full,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  feedBadgeText: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.md },
  emptyText: { fontSize: 17, fontWeight: '600', color: Colors.textPrimary, textAlign: 'center' },
  emptySubtext: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: 6, lineHeight: 20 },
});
