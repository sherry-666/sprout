import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import EducatorNavigator from './EducatorNavigator';
import ParentNavigator from './ParentNavigator';
import { Colors } from '../theme';

const Stack = createNativeStackNavigator();

function UnsupportedRoleScreen() {
  const { signOut } = useAuth();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: Colors.bg }}>
      <Text style={{ fontSize: 40, marginBottom: 16 }}>🌱</Text>
      <Text style={{ fontSize: 18, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center', marginBottom: 8 }}>
        Sprout Mobile
      </Text>
      <Text style={{ fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginBottom: 32, lineHeight: 20 }}>
        This app is for educators and parents.{'\n'}Administrators use the web portal.
      </Text>
      <TouchableOpacity
        onPress={signOut}
        style={{ backgroundColor: Colors.primary, borderRadius: 8, paddingHorizontal: 24, paddingVertical: 12 }}
      >
        <Text style={{ color: Colors.white, fontWeight: '700', fontSize: 15 }}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function AppNavigator() {
  const { token, user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const isAuthenticated = !!token && !!user;
  const isEducator = user?.role === 'educator';
  const isParent = user?.role === 'parent';

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : isEducator ? (
          <Stack.Screen name="EducatorApp" component={EducatorNavigator} />
        ) : isParent ? (
          <Stack.Screen name="ParentApp" component={ParentNavigator} />
        ) : (
          // Admin or super_admin — mobile app is for educators and parents only
          <Stack.Screen name="UnsupportedRole" component={UnsupportedRoleScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
