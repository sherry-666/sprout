import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';
import FeedScreen from '../screens/parent/FeedScreen';
import KidDetailScreen from '../screens/parent/KidDetailScreen';
import SummaryScreen from '../screens/parent/SummaryScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { Colors } from '../theme';

const Tab = createBottomTabNavigator();
const FeedStack = createNativeStackNavigator();

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
    </FeedStack.Navigator>
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
