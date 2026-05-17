import React from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { gql, useQuery } from '@apollo/client';
import { useAuth } from '../../contexts/AuthContext';
import { Colors, Spacing, Radius, Shadow } from '../../theme';

const MY_CLASSES_QUERY = gql`
  query MyClasses {
    me {
      id
      profile { firstName lastName }
      classes {
        id
        name
        kids { id }
        educators { id }
      }
    }
  }
`;

export default function ClassesScreen({ navigation }: any) {
  const { user } = useAuth();
  const { data, loading, refetch } = useQuery(MY_CLASSES_QUERY, { fetchPolicy: 'cache-and-network' });

  const classes = data?.me?.classes ?? [];
  const name = data?.me?.profile?.firstName ?? user?.firstName ?? '';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, {name}! 👋</Text>
        <Text style={styles.subtitle}>Your assigned classes</Text>
      </View>

      {loading && classes.length === 0 ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={Colors.primary} />
      ) : classes.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📚</Text>
          <Text style={styles.emptyText}>No classes assigned yet.</Text>
          <Text style={styles.emptySubtext}>Ask your institution admin to assign you to a class.</Text>
        </View>
      ) : (
        <FlatList
          data={classes}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={Colors.primary} />}
          renderItem={({ item }: any) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('Roster', { classId: item.id, className: item.name })}
              activeOpacity={0.8}
            >
              <View style={styles.classIcon}>
                <Text style={styles.classIconText}>
                  {item.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.classInfo}>
                <Text style={styles.className}>{item.name}</Text>
                <Text style={styles.classMeta}>
                  {item.kids?.length ?? 0} kids · {item.educators?.length ?? 0} educators
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
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
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    ...Shadow.small,
  },
  classIcon: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    marginRight: Spacing.md,
  },
  classIconText: { fontSize: 20, fontWeight: '700', color: Colors.primary },
  classInfo: { flex: 1 },
  className: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  classMeta: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  chevron: { fontSize: 24, color: Colors.textSecondary },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.md },
  emptyText: { fontSize: 17, fontWeight: '600', color: Colors.textPrimary, textAlign: 'center' },
  emptySubtext: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: 6, lineHeight: 20 },
});
