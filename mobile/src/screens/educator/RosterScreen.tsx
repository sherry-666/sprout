import React from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Image,
} from 'react-native';
import { gql, useQuery } from '@apollo/client';
import { Colors, Spacing, Radius, Shadow } from '../../theme';

const CLASS_DETAIL_QUERY = gql`
  query ClassDetail($id: ID!) {
    class(id: $id) {
      id
      name
      educators { id profile { firstName lastName } }
      kids {
        id
        firstName
        lastName
        gender
        dateOfBirth
        profilePhotoUrl
      }
    }
  }
`;

const GENDER_GRADIENT: Record<string, string> = {
  male: Colors.primary,
  female: '#EC4899',
};

export default function RosterScreen({ route, navigation }: any) {
  const { classId, className } = route.params;
  const { data, loading, refetch } = useQuery(CLASS_DETAIL_QUERY, {
    variables: { id: classId },
    fetchPolicy: 'cache-first',
  });

  const cls = data?.class;
  const kids: any[] = cls?.kids ?? [];

  return (
    <View style={styles.container}>
      {loading && !cls ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={Colors.primary} />
      ) : (
        <>
          <View style={styles.classHeader}>
            <Text style={styles.kidCount}>{kids.length} kids enrolled</Text>
          </View>
          {kids.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>👶</Text>
              <Text style={styles.emptyText}>No kids enrolled in this class yet.</Text>
            </View>
          ) : (
            <FlatList
              data={kids}
              keyExtractor={(item) => item.id}
              numColumns={2}
              contentContainerStyle={styles.grid}
              refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={Colors.primary} />}
              renderItem={({ item }) => {
                const avatarColor = GENDER_GRADIENT[item.gender] ?? Colors.primary;
                return (
                  <TouchableOpacity
                    style={styles.kidCard}
                    onPress={() => navigation.navigate('LogActivity', {
                      classId, className,
                      kidId: item.id,
                      kidName: `${item.firstName} ${item.lastName}`,
                    })}
                    activeOpacity={0.8}
                  >
                    {item.profilePhotoUrl
                      ? <Image source={{ uri: item.profilePhotoUrl }} style={styles.avatarImg} />
                      : <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
                          <Text style={styles.avatarText}>{item.firstName.charAt(0)}</Text>
                        </View>
                    }
                    <Text style={styles.kidName} numberOfLines={1}>
                      {item.firstName}
                    </Text>
                    <Text style={styles.kidLastName} numberOfLines={1}>
                      {item.lastName}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          )}

          <TouchableOpacity
            style={styles.fab}
            onPress={() => navigation.navigate('LogActivity', { classId, className, kidId: null, kidName: null })}
            activeOpacity={0.85}
          >
            <Text style={styles.fabIcon}>✏️</Text>
            <Text style={styles.fabText}>Log for class</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  classHeader: {
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    backgroundColor: Colors.card,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  kidCount: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  grid: { padding: Spacing.md, paddingBottom: 100 },
  kidCard: {
    flex: 1, margin: Spacing.xs,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    ...Shadow.small,
  },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  avatarImg: {
    width: 56, height: 56, borderRadius: 28,
    marginBottom: Spacing.sm,
  },
  avatarText: { color: Colors.white, fontSize: 22, fontWeight: '700' },
  kidName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, textAlign: 'center' },
  kidLastName: { fontSize: 12, color: Colors.textSecondary, textAlign: 'center', marginTop: 2 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.md },
  emptyText: { fontSize: 16, color: Colors.textSecondary, textAlign: 'center' },
  fab: {
    position: 'absolute', bottom: 24, left: Spacing.lg, right: Spacing.lg,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    ...Shadow.medium,
  },
  fabIcon: { fontSize: 18 },
  fabText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
});
