import { ApolloClient, InMemoryCache, createHttpLink, from, split } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient as createWsClient } from 'graphql-ws';
import { getMainDefinition } from '@apollo/client/utilities';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GRAPHQL_URL } from '../config';

// Callback registered by AuthContext so the error link can trigger signOut
// without creating a circular dependency.
let _onAuthFailed: (() => void) | null = null;

export function setAuthErrorHandler(handler: () => void) {
  _onAuthFailed = handler;
}

// ── HTTP path: queries + mutations ─────────────────────────────────────────

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

// ── WebSocket path: subscriptions ──────────────────────────────────────────

const wsUrl = GRAPHQL_URL.replace(/^http/, 'ws');

const wsLink = new GraphQLWsLink(
  createWsClient({
    url: wsUrl,
    connectionParams: async () => {
      const token = await AsyncStorage.getItem('jwt');
      return token ? { Authorization: `Bearer ${token}` } : {};
    },
    retryAttempts: Infinity,
    shouldRetry: () => true,
    lazy: true,
    keepAlive: 10_000,
  })
);

// Route subscriptions over WS, everything else over HTTP
const splitLink = split(
  ({ query }) => {
    const def = getMainDefinition(query);
    return def.kind === 'OperationDefinition' && def.operation === 'subscription';
  },
  wsLink,
  from([authLink, httpLink]),
);

export const apolloClient = new ApolloClient({
  link: from([errorLink, splitLink]),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: { fetchPolicy: 'cache-and-network' },
  },
});
