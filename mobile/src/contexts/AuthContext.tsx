import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apolloClient } from '../apollo/client';

interface UserInfo {
  id: string;
  role: 'educator' | 'parent' | 'admin' | 'super_admin';
  firstName: string;
  lastName: string;
}

interface AuthContextValue {
  token: string | null;
  user: UserInfo | null;
  loading: boolean;
  signIn: (token: string, user: UserInfo) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  token: null, user: null, loading: true,
  signIn: async () => {}, signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.multiGet(['jwt', 'user']).then(([jwtEntry, userEntry]) => {
      const storedToken = jwtEntry[1];
      const storedUser = userEntry[1];
      if (storedToken) setToken(storedToken);
      if (storedUser) setUser(JSON.parse(storedUser));
      setLoading(false);
    });
  }, []);

  const signIn = async (newToken: string, newUser: UserInfo) => {
    await AsyncStorage.multiSet([['jwt', newToken], ['user', JSON.stringify(newUser)]]);
    setToken(newToken);
    setUser(newUser);
  };

  const signOut = async () => {
    await AsyncStorage.multiRemove(['jwt', 'user']);
    await apolloClient.clearStore();
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
