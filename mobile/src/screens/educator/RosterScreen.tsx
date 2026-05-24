import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Image, Dimensions,
} from 'react-native';

const { width: SCREEN_W } = Dimensions.get('window');
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { gql, useQuery } from '@apollo/client';
import { Colors } from '../../theme';
import { MicIcon } from '../../components/SproutIcons';
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

// Hue-based color system matching the design (proto-shared.jsx KidAvatar / ClassGlyph)
function nameToHue(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h * 31 + s.charCodeAt(i)) >>> 0);
  return h % 360;
}

function kidColors(hue: number) {
  return {
    bg: `hsl(${hue}, 50%, 86%)`,
    ink: `hsl(${hue}, 50%, 28%)`,
  };
}

function classColors(hue: number) {
  return {
    bg: `hsl(${hue}, 55%, 87%)`,
    ink: `hsl(${hue}, 60%, 30%)`,
  };
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

  const classHue = nameToHue(className ?? '');
  const { bg: classBg, ink: classInk } = classColors(classHue);

  const handleSheetSent = (conversationId: string) => {
    setSheetOpen(false);
    setActiveConversationId(conversationId);
    navigation.navigate('Conversation', { conversationId });
  };

  const NUM_COLUMNS = 3;
  const GRID_H_PAD = 14;
  const GRID_GAP = 10;
  const CARD_WIDTH = Math.floor((SCREEN_W - GRID_H_PAD * 2 - GRID_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS);

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
          <View style={[s.classGlyph, { backgroundColor: classBg }]}>
            <Text style={[s.classGlyphTxt, { color: classInk }]}>
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
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={refetch} tintColor={Colors.primary} />
          }
          renderItem={({ item }) => {
            const hue = nameToHue(item.id);
            const { bg, ink } = kidColors(hue);
            const initials = `${item.firstName?.[0] ?? ''}${item.lastName?.[0] ?? ''}`.toUpperCase();
            return (
              <TouchableOpacity
                style={[s.kidCard, { width: CARD_WIDTH }]}
                activeOpacity={0.82}
                onPress={() => navigation.navigate('EducatorKidDetail', {
                  kidId: item.id,
                  className,
                })}
              >
                <View style={[s.kidAvatar, { backgroundColor: bg }]}>
                  {item.profilePhotoUrl ? (
                    <Image source={{ uri: item.profilePhotoUrl }} style={StyleSheet.absoluteFill} borderRadius={12} />
                  ) : (
                    <Text style={[s.kidAvatarTxt, { color: ink }]}>{initials}</Text>
                  )}
                  <View style={s.kidAvatarHighlight} />
                </View>
                <Text style={s.kidName} numberOfLines={1}>{item.firstName}</Text>
                <Text style={s.kidLast} numberOfLines={1}>{item.lastName}</Text>
              </TouchableOpacity>
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <MicIcon size={16} color={Colors.white} />
            <Text style={s.qlBtnTxt}>Quick Log for {className}</Text>
          </View>
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
  root: { flex: 1, backgroundColor: '#f6f4ec' },

  // Header
  header: { paddingHorizontal: 20, paddingBottom: 14 },
  backBtn: { marginBottom: 14 },
  backBtnTxt: { fontSize: 15, color: Colors.primary, fontWeight: '500' },
  classInfo: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  classGlyph: {
    width: 52, height: 52, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  classGlyphTxt: { fontSize: 22, fontWeight: '700', letterSpacing: -0.4 },
  className: { fontSize: 26, fontWeight: '600', letterSpacing: -0.4, color: '#1d2a22' },
  classSub: { fontSize: 13, color: 'rgba(60,60,67,0.6)', marginTop: 2 },

  // Grid
  grid: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 100 },
  columnWrapper: { gap: 10, marginBottom: 10 },
  kidCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 12,
    alignItems: 'center',
    shadowColor: '#1a2820',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 2,
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
  },
  kidName: { fontSize: 13, fontWeight: '600', color: '#1d2a22', textAlign: 'center' },
  kidLast: { fontSize: 11, color: 'rgba(60,60,67,0.55)', marginTop: 1, textAlign: 'center' },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTxt: { fontSize: 16, color: 'rgba(60,60,67,0.55)', textAlign: 'center' },

  // Footer
  footer: { paddingHorizontal: 20, paddingTop: 12, backgroundColor: '#f6f4ec' },
  qlBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  qlBtnTxt: { color: Colors.white, fontSize: 16, fontWeight: '600', letterSpacing: 0.2 },
});
