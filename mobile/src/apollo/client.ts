import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GRAPHQL_URL } from '../config';

// Callback registered by AuthContext so the error link can trigger signOut
// without creating a circular dependency.
let _onAuthFailed: (() => void) | null = null;

export function setAuthErrorHandler(handler: () => void) {
  _onAuthFailed = handler;
}

const httpLink = createHttpLink({ uri: GRAPHQL_URL });

const authLink = setContext(async (_, { headers }) => {
  const token = await AsyncStorage.getItem('jwt');
  return {
    headers: {
      ...headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
});

const errorLink = onError(({ graphQLErrors, networkError }) => {
  const isUnauthenticated =
    graphQLErrors?.some(e => e.extensions?.code === 'UNAUTHENTICATED') ||
    (networkError && 'statusCode' in networkError && (networkError as any).statusCode === 401);

  if (isUnauthenticated && _onAuthFailed) {
    _onAuthFailed();
  }
});

export const apolloClient = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: { fetchPolicy: 'cache-and-network' },
  },
});
