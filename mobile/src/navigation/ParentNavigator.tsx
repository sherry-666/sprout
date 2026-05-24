import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';
import FeedScreen from '../screens/parent/FeedScreen';
import KidDetailScreen from '../screens/parent/KidDetailScreen';
import SummaryScreen from '../screens/parent/SummaryScreen';
import ActivityDetailScreen from '../screens/educator/ActivityDetailScreen';
import ChatListScreen from '../screens/chat/ChatListScreen';
import KidChatScreen from '../screens/chat/KidChatScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { Colors } from '../theme';

const Tab = createBottomTabNavigator();
const FeedStack = createNativeStackNavigator();
const ChatStack = createNativeStackNavigator();

function FeedStackNav() {
  return (
    <FeedStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: Colors.white,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <FeedStack.Screen name="FeedList" component={FeedScreen} options={{ title: 'My Kids' }} />
      <FeedStack.Screen name="KidDetail" component={KidDetailScreen} options={({ route }: any) => ({ title: route.params?.kidName ?? 'Updates' })} />
      <FeedStack.Screen name="Summary" component={SummaryScreen} options={({ route }: any) => ({ title: `${route.params?.kidName ?? 'Daily'} Summary` })} />
      <FeedStack.Screen name="ActivityDetail" component={ActivityDetailScreen} options={{ headerShown: false }} />
    </FeedStack.Navigator>
  );
}

const NAV_OPTS = {
  headerStyle: { backgroundColor: Colors.primary },
  headerTintColor: Colors.white,
  headerTitleStyle: { fontWeight: '700' as const },
};

function ChatStackNav() {
  return (
    <ChatStack.Navigator screenOptions={NAV_OPTS}>
      <ChatStack.Screen name="ChatList" component={ChatListScreen} options={{ title: 'Messages' }} />
      <ChatStack.Screen name="KidChat" component={KidChatScreen} options={({ route }: any) => ({ title: route.params?.kidName ?? 'Chat' })} />
    </ChatStack.Navigator>
  );
}

export default function ParentNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: { borderTopColor: Colors.border, backgroundColor: Colors.white },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Feed"
        component={FeedStackNav}
        options={{ tabBarLabel: 'My Kids', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>👶</Text> }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatStackNav}
        options={{ tabBarLabel: 'Chat', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>💬</Text> }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>👤</Text>,
          headerShown: true,
          headerStyle: { backgroundColor: Colors.primary },
          headerTintColor: Colors.white,
          headerTitleStyle: { fontWeight: '700' },
          title: 'My Profile',
        }}
      />
    </Tab.Navigator>
  );
}
