import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { gql, useQuery } from '@apollo/client';
import { Colors, Spacing, Radius, Shadow } from '../../theme';
import { useQuickLog } from '../../contexts/QuickLogContext';
import ComposeSheet from './ComposeSheet';

const CLASS_DETAIL_QUERY = gql`
  query ClassDetailRoster($id: ID!) {
    class(id: $id) {
      id
      name
      kids {
        id
        firstName
        lastName
        profilePhotoUrl
        dateOfBirth
      }
    }
  }
`;

// Deterministic color palette for kid avatars
const KID_PALETTES = [
  { bg: '#fef3c7', ink: '#92400e' },
  { bg: '#dcfce7', ink: '#166534' },
  { bg: '#dbeafe', ink: '#1e40af' },
  { bg: '#fce7f3', ink: '#9d174d' },
  { bg: '#f3e8ff', ink: '#6b21a8' },
  { bg: '#ffedd5', ink: '#c2410c' },
  { bg: '#e0f2fe', ink: '#075985' },
  { bg: '#fdf4ff', ink: '#86198f' },
];

function kidPalette(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = ((h * 31 + id.charCodeAt(i)) >>> 0);
  return KID_PALETTES[h % KID_PALETTES.length];
}

const CLASS_PALETTES = [
  { bg: '#fef3c7', ink: '#92400e' },
  { bg: '#dcfce7', ink: '#166534' },
  { bg: '#dbeafe', ink: '#1e40af' },
  { bg: '#fce7f3', ink: '#9d174d' },
  { bg: '#f3e8ff', ink: '#6b21a8' },
  { bg: '#ffedd5', ink: '#c2410c' },
  { bg: '#e0f2fe', ink: '#075985' },
  { bg: '#fdf4ff', ink: '#86198f' },
];

function classPalette(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h * 31 + name.charCodeAt(i)) >>> 0);
  return CLASS_PALETTES[h % CLASS_PALETTES.length];
}

export default function RosterScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { classId, className } = route.params;
  const { data, loading, refetch } = useQuery(CLASS_DETAIL_QUERY, {
    variables: { id: classId },
    fetchPolicy: 'cache-first',
  });
  const { setActiveConversationId } = useQuickLog();
  const [sheetOpen, setSheetOpen] = useState(false);

  const cls = data?.class;
  const kids: any[] = cls?.kids ?? [];
  const palette = classPalette(className ?? '');

  const handleSheetSent = (conversationId: string) => {
    setSheetOpen(false);
    setActiveConversationId(conversationId);
    navigation.getParent()?.navigate('Agents', {
      screen: 'Conversation',
      params: { conversationId },
    });
  };

  const NUM_COLUMNS = 3;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Custom header */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={s.backBtn}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
        >
          <Text style={s.backBtnTxt}>‹ Home</Text>
        </TouchableOpacity>

        <View style={s.classInfo}>
          <View style={[s.classGlyph, { backgroundColor: palette.bg }]}>
            <Text style={[s.classGlyphTxt, { color: palette.ink }]}>
              {(className ?? '').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.className}>{className}</Text>
            <Text style={s.classSub}>
              {kids.length} kid{kids.length === 1 ? '' : 's'} enrolled
            </Text>
          </View>
        </View>
      </View>

      {/* Grid */}
      {loading && !cls ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={Colors.primary} />
      ) : kids.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyIcon}>👶</Text>
          <Text style={s.emptyTxt}>No kids enrolled yet</Text>
        </View>
      ) : (
        <FlatList
          data={kids}
          keyExtractor={item => item.id}
          numColumns={NUM_COLUMNS}
          contentContainerStyle={s.grid}
          columnWrapperStyle={s.columnWrapper}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={refetch} tintColor={Colors.primary} />
          }
          renderItem={({ item }) => {
            const p = kidPalette(item.id);
            const initials = `${item.firstName?.[0] ?? ''}${item.lastName?.[0] ?? ''}`.toUpperCase();
            return (
              <View style={s.kidCard}>
                {/* Profile photo or gradient placeholder */}
                <View style={[s.kidAvatar, { backgroundColor: p.bg }]}>
                  {item.profilePhotoUrl ? (
                    <Image source={{ uri: item.profilePhotoUrl }} style={StyleSheet.absoluteFill} />
                  ) : (
                    <Text style={[s.kidAvatarTxt, { color: p.ink }]}>{initials}</Text>
                  )}
                  {/* Radial highlight overlay */}
                  <View style={s.kidAvatarHighlight} />
                </View>
                <Text style={s.kidName} numberOfLines={1}>{item.firstName}</Text>
                <Text style={s.kidLast} numberOfLines={1}>{item.lastName}</Text>
              </View>
            );
          }}
        />
      )}

      {/* Footer CTA */}
      <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity
          style={s.qlBtn}
          onPress={() => setSheetOpen(true)}
          activeOpacity={0.85}
        >
          <Text style={s.qlBtnTxt}>🎙  Quick Log for {className}</Text>
        </TouchableOpacity>
      </View>

      <ComposeSheet
        visible={sheetOpen}
        initialClassId={classId}
        onClose={() => setSheetOpen(false)}
        onSent={handleSheetSent}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },

  // Header
  header: { paddingHorizontal: 20, paddingBottom: 14 },
  backBtn: { marginBottom: 14 },
  backBtnTxt: { fontSize: 15, color: Colors.primary, fontWeight: '500' },
  classInfo: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  classGlyph: {
    width: 52, height: 52, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  classGlyphTxt: { fontSize: 22, fontWeight: '700' },
  className: { fontSize: 24, fontWeight: '600', letterSpacing: -0.3, color: Colors.textPrimary },
  classSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },

  // Grid
  grid: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 100 },
  columnWrapper: { gap: 10, marginBottom: 10 },
  kidCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 12,
    alignItems: 'center',
    ...Shadow.small,
  },
  kidAvatar: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 8,
  },
  kidAvatarTxt: { fontSize: 22, fontWeight: '700', letterSpacing: 0.5 },
  kidAvatarHighlight: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
    // Subtle radial highlight
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  kidName: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary, textAlign: 'center' },
  kidLast: { fontSize: 11, color: Colors.textSecondary, marginTop: 1, textAlign: 'center' },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.md },
  emptyTxt: { fontSize: 16, color: Colors.textSecondary, textAlign: 'center' },

  // Footer
  footer: { paddingHorizontal: 20, paddingTop: 12, backgroundColor: Colors.bg },
  qlBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: 15,
    alignItems: 'center',
    ...Shadow.small,
  },
  qlBtnTxt: { color: Colors.white, fontSize: 15, fontWeight: '600' },
});
