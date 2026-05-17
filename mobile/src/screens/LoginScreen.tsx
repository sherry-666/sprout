import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { gql, useMutation } from '@apollo/client';
import { useAuth } from '../contexts/AuthContext';
import { Colors, Spacing, Radius } from '../theme';

const LOGIN_MUTATION = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      __typename
      ... on AuthPayload {
        accessToken
        user {
          id
          role
          profile { firstName lastName }
        }
      }
      ... on InvalidCredentialsError { message }
      ... on AccountPendingError { message }
    }
  }
`;

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [loginMutation, { loading }] = useMutation(LOGIN_MUTATION);

  const handleLogin = async () => {
    if (!login.trim() || !password) {
      Alert.alert('Error', 'Please enter your email and password.');
      return;
    }
    try {
      const { data } = await loginMutation({ variables: { input: { login: login.trim(), password } } });
      const result = data?.login;
      if (!result) throw new Error('No response');
      if (result.__typename !== 'AuthPayload') {
        Alert.alert('Error', result.message || 'Login failed.');
        return;
      }
      await signIn(result.accessToken, {
        id: result.user.id,
        role: result.user.role.toLowerCase(),
        firstName: result.user.profile.firstName,
        lastName: result.user.profile.lastName,
      });
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Login failed. Check your connection.');
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.card}>
        {/* Logo / branding */}
        <View style={styles.logoRow}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>🌱</Text>
          </View>
        </View>
        <Text style={styles.title}>Welcome to Sprout</Text>
        <Text style={styles.subtitle}>Sign in to your account</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Email or Username</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor={Colors.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            value={login}
            onChangeText={setLogin}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={Colors.textSecondary}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={handleLogin}
            returnKeyType="done"
          />
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color={Colors.white} />
            : <Text style={styles.buttonText}>Sign In</Text>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  logoRow: { alignItems: 'center', marginBottom: Spacing.md },
  logoCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  logoText: { fontSize: 32 },
  title: {
    fontSize: 22, fontWeight: '700', color: Colors.textPrimary,
    textAlign: 'center', marginBottom: 4,
  },
  subtitle: {
    fontSize: 14, color: Colors.textSecondary,
    textAlign: 'center', marginBottom: Spacing.lg,
  },
  field: { marginBottom: Spacing.md },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: Colors.textPrimary, backgroundColor: '#FAFAFA',
  },
  button: {
    backgroundColor: Colors.primary, borderRadius: Radius.sm,
    paddingVertical: 14, alignItems: 'center', marginTop: 4,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
});
