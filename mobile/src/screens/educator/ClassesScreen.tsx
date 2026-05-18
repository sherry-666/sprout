import React from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { gql, useQuery } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing, Radius, Shadow } from '../../theme';

const MY_CLASSES_QUERY = gql`
  query MyClasses {
    me {
      id
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
  const { t } = useTranslation();
  const { data, loading, refetch } = useQuery(MY_CLASSES_QUERY, { fetchPolicy: 'cache-and-network' });

  const classes = data?.me?.classes ?? [];

  return (
    <View style={styles.container}>
      {loading && classes.length === 0 ? (
        <ActivityIndicator style={{ marginTop: 60 }} size="large" color={Colors.primary} />
      ) : classes.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📚</Text>
          <Text style={styles.emptyText}>{t('classes.noClasses')}</Text>
          <Text style={styles.emptySubtext}>{t('classes.noClassesHint')}</Text>
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
                  {t('classes.kids', { count: item.kids?.length ?? 0 })}
                  {' · '}
                  {t('classes.educators', { count: item.educators?.length ?? 0 })}
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
  list: { padding: Spacing.md, paddingTop: Spacing.lg },
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
