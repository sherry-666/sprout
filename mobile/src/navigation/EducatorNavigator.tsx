import React, { useRef } from 'react';
import {
  Animated, Pressable, StyleSheet, Text, View,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import ClassesScreen from '../screens/educator/ClassesScreen';
import RosterScreen from '../screens/educator/RosterScreen';
import LogActivityScreen from '../screens/educator/LogActivityScreen';
import AgentsListScreen from '../screens/agents/AgentsListScreen';
import ConversationScreen from '../screens/agents/ConversationScreen';
import ChatListScreen from '../screens/chat/ChatListScreen';
import KidChatScreen from '../screens/chat/KidChatScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { Colors } from '../theme';
import { QuickLogProvider, useQuickLog } from '../contexts/QuickLogContext';

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();
const AgentsStack = createNativeStackNavigator();
const ChatStack = createNativeStackNavigator();
const SettingsStack = createNativeStackNavigator();

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

// ─── AI tab icon with active-job badge ────────────────────────────────────
function AITabIcon({ color }: { color: string }) {
  const { activeConversationId } = useQuickLog();
  return (
    <View>
      <Text style={{ fontSize: 20, color }}>✨</Text>
      {!!activeConversationId && (
        <View style={tabStyles.badge} />
      )}
    </View>
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
  badge: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    borderWidth: 1.5,
    borderColor: Colors.white,
  },
});

// ─── Stack navigators ──────────────────────────────────────────────────────
function HomeStackNav() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="ClassesList" component={ClassesScreen} />
      <HomeStack.Screen name="Roster" component={RosterScreen} />
      <HomeStack.Screen name="LogActivity" component={LogActivityScreen} />
    </HomeStack.Navigator>
  );
}

function AgentsStackNav() {
  return (
    <AgentsStack.Navigator screenOptions={{ headerShown: false }}>
      <AgentsStack.Screen name="AgentsList" component={AgentsListScreen} />
      <AgentsStack.Screen name="Conversation" component={ConversationScreen} />
    </AgentsStack.Navigator>
  );
}

function ChatStackNav() {
  const { t } = useTranslation();
  return (
    <ChatStack.Navigator screenOptions={{
      headerStyle: { backgroundColor: Colors.primary },
      headerTintColor: Colors.white,
      headerTitleStyle: { fontWeight: '700' as const },
    }}>
      <ChatStack.Screen name="ChatList" component={ChatListScreen} options={{ title: 'Messages' }} />
      <ChatStack.Screen name="KidChat" component={KidChatScreen} options={({ route }: any) => ({ title: route.params?.kidName ?? 'Chat' })} />
    </ChatStack.Navigator>
  );
}

function SettingsStackNav() {
  const { t } = useTranslation();
  return (
    <SettingsStack.Navigator screenOptions={{
      headerStyle: { backgroundColor: Colors.primary },
      headerTintColor: Colors.white,
      headerTitleStyle: { fontWeight: '700' as const },
    }}>
      <SettingsStack.Screen name="SettingsHome" component={SettingsScreen} options={{ title: t('settings.title') }} />
      <SettingsStack.Screen name="Profile" component={ProfileScreen} options={{ title: t('profile.title') }} />
    </SettingsStack.Navigator>
  );
}

// ─── Tab navigator (inner, needs QuickLogContext) ──────────────────────────
function TabNavigator() {
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
        name="Home"
        component={HomeStackNav}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🏠</Text>,
          tabBarButton: tabButton,
        }}
      />
      <Tab.Screen
        name="Agents"
        component={AgentsStackNav}
        options={{
          tabBarLabel: 'AI',
          tabBarIcon: ({ color }) => <AITabIcon color={color} />,
          tabBarButton: tabButton,
        }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatStackNav}
        options={{
          tabBarLabel: 'Chat',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>💬</Text>,
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

// ─── Root export (provides context) ───────────────────────────────────────
export default function EducatorNavigator() {
  return (
    <QuickLogProvider>
      <TabNavigator />
    </QuickLogProvider>
  );
}
