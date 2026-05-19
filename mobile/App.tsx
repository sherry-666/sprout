import 'react-native-gesture-handler';
import './src/i18n';
import React, { useEffect } from 'react';
import { ApolloProvider } from '@apollo/client';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { apolloClient } from './src/apollo/client';
import { AuthProvider } from './src/contexts/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { loadSavedLanguage } from './src/i18n';

export default function App() {
  useEffect(() => { loadSavedLanguage(); }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ApolloProvider client={apolloClient}>
        <AuthProvider>
          <StatusBar style="light" />
          <AppNavigator />
        </AuthProvider>
      </ApolloProvider>
    </GestureHandlerRootView>
  );
}
