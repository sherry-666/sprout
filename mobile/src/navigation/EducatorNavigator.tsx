import React from 'react';
import { View, StyleSheet } from 'react-native';
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
import { HomeIcon, AIIcon, ChatIcon, SettingsIcon } from '../components/SproutIcons';

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();
const AgentsStack = createNativeStackNavigator();
const ChatStack = createNativeStackNavigator();
const SettingsStack = createNativeStackNavigator();

const INACTIVE = '#a8b0a4';

// ─── AI tab icon with active-job badge ────────────────────────────────────
function AITabIcon({ color }: { color: string }) {
  const { activeConversationId } = useQuickLog();
  return (
    <View>
      <AIIcon size={24} color={color} />
      {!!activeConversationId && (
        <View style={s.badge} />
      )}
    </View>
  );
}

const s = StyleSheet.create({
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
  return (
    <ChatStack.Navigator screenOptions={{ headerShown: false }}>
      <ChatStack.Screen name="ChatList" component={ChatListScreen} />
      <ChatStack.Screen name="KidChat" component={KidChatScreen} />
    </ChatStack.Navigator>
  );
}

function SettingsStackNav() {
  return (
    <SettingsStack.Navigator screenOptions={{ headerShown: false }}>
      <SettingsStack.Screen name="SettingsHome" component={SettingsScreen} />
      <SettingsStack.Screen name="Profile" component={ProfileScreen} />
    </SettingsStack.Navigator>
  );
}

// ─── Tab navigator ─────────────────────────────────────────────────────────
function TabNavigator() {
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: INACTIVE,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopWidth: 0.5,
          borderTopColor: 'rgba(0,0,0,0.08)',
          height: 72,
          paddingTop: 8,
          paddingBottom: 0,
        },
        tabBarItemStyle: { paddingBottom: 10 },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '500' },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStackNav}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => <HomeIcon size={24} color={color} />,
        }}
      />
      <Tab.Screen
        name="Agents"
        component={AgentsStackNav}
        options={{
          tabBarLabel: 'AI',
          tabBarIcon: ({ color }) => <AITabIcon color={color} />,
        }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatStackNav}
        options={{
          tabBarLabel: 'Chat',
          tabBarIcon: ({ color }) => <ChatIcon size={24} color={color} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsStackNav}
        options={{
          tabBarLabel: t('tabs.settings'),
          tabBarIcon: ({ color }) => <SettingsIcon size={24} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

// ─── Root export ───────────────────────────────────────────────────────────
export default function EducatorNavigator() {
  return (
    <QuickLogProvider>
      <TabNavigator />
    </QuickLogProvider>
  );
}
