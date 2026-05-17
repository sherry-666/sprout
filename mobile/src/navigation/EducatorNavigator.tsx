import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';
import ClassesScreen from '../screens/educator/ClassesScreen';
import RosterScreen from '../screens/educator/RosterScreen';
import LogActivityScreen from '../screens/educator/LogActivityScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { Colors } from '../theme';

const Tab = createBottomTabNavigator();
const ClassesStack = createNativeStackNavigator();

function ClassesStackNav() {
  return (
    <ClassesStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: Colors.white,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <ClassesStack.Screen name="ClassesList" component={ClassesScreen} options={{ title: 'My Classes' }} />
      <ClassesStack.Screen name="Roster" component={RosterScreen} options={({ route }: any) => ({ title: route.params?.className ?? 'Roster' })} />
      <ClassesStack.Screen name="LogActivity" component={LogActivityScreen} options={({ route }: any) => ({ title: route.params?.kidName ? `Log for ${route.params.kidName}` : 'Log Activity' })} />
    </ClassesStack.Navigator>
  );
}

export default function EducatorNavigator() {
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
        name="Classes"
        component={ClassesStackNav}
        options={{ tabBarLabel: 'Classes', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📚</Text> }}
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
