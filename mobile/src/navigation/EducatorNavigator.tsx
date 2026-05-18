import React, { useRef } from 'react';
import {
  Animated, Pressable, StyleSheet, Text,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import ClassesScreen from '../screens/educator/ClassesScreen';
import RosterScreen from '../screens/educator/RosterScreen';
import LogActivityScreen from '../screens/educator/LogActivityScreen';
import QuickLogScreen from '../screens/educator/QuickLogScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { Colors } from '../theme';

const Tab = createBottomTabNavigator();
const ClassesStack = createNativeStackNavigator();
const SettingsStack = createNativeStackNavigator();

const NAV_OPTS = {
  headerStyle: { backgroundColor: Colors.primary },
  headerTintColor: Colors.white,
  headerTitleStyle: { fontWeight: '700' as const },
};

// ─── Animated tab button ───────────────────────────────────────────────────
function AnimatedTabButton({ children, onPress, onLongPress, accessibilityState, style }: any) {
  const focused = accessibilityState?.selected;
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.22, friction: 4, tension: 220, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1,    friction: 5, tension: 120, useNativeDriver: true }),
    ]).start();
    onPress?.();
  };

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={onLongPress}
      style={[style, tabStyles.outer]}
      android_ripple={undefined}
    >
      <Animated.View style={[
        tabStyles.inner,
        focused && tabStyles.focused,
        { transform: [{ scale }] },
      ]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

const tabStyles = StyleSheet.create({
  outer: { justifyContent: 'center', alignItems: 'center' },
  inner: {
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderRadius: 999,
    alignItems: 'center',
    minWidth: 68,
  },
  focused: {
    backgroundColor: Colors.primaryLight,
  },
});

// ─── Stack navigators ──────────────────────────────────────────────────────
function ClassesStackNav() {
  const { t } = useTranslation();
  return (
    <ClassesStack.Navigator screenOptions={NAV_OPTS}>
      <ClassesStack.Screen name="ClassesList" component={ClassesScreen} options={{ title: t('classes.title') }} />
      <ClassesStack.Screen name="Roster" component={RosterScreen} options={({ route }: any) => ({ title: route.params?.className ?? 'Roster' })} />
      <ClassesStack.Screen name="LogActivity" component={LogActivityScreen} options={({ route }: any) => ({ title: route.params?.kidName ? `Log for ${route.params.kidName}` : 'Log Activity' })} />
      <ClassesStack.Screen name="QuickLog" component={QuickLogScreen} options={{ title: 'Quick Log' }} />
    </ClassesStack.Navigator>
  );
}

function SettingsStackNav() {
  const { t } = useTranslation();
  return (
    <SettingsStack.Navigator screenOptions={NAV_OPTS}>
      <SettingsStack.Screen name="SettingsHome" component={SettingsScreen} options={{ title: t('settings.title') }} />
      <SettingsStack.Screen name="Profile" component={ProfileScreen} options={{ title: t('profile.title') }} />
    </SettingsStack.Navigator>
  );
}

// ─── Tab navigator ─────────────────────────────────────────────────────────
export default function EducatorNavigator() {
  const { t } = useTranslation();

  const tabButton = (props: any) => <AnimatedTabButton {...props} />;

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: { borderTopColor: Colors.border, backgroundColor: Colors.white, height: 60 },
        tabBarItemStyle: { paddingVertical: 4 },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Classes"
        component={ClassesStackNav}
        options={{
          tabBarLabel: t('tabs.classes'),
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📚</Text>,
          tabBarButton: tabButton,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsStackNav}
        options={{
          tabBarLabel: t('tabs.settings'),
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>⚙️</Text>,
          tabBarButton: tabButton,
        }}
      />
    </Tab.Navigator>
  );
}
