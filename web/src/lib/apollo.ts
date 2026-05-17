import { ApolloClient, InMemoryCache, createHttpLink, CombinedGraphQLErrors, ServerParseError } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { ErrorLink } from '@apollo/client/link/error';
import { clearSession } from './api';

const API_BASE = 'http://localhost:8000';

const httpLink = createHttpLink({
  uri: `${API_BASE}/graphql`,
});

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('sprout_token');
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

const errorLink = new ErrorLink(({ error }) => {
  let isUnauthenticated = false;

  if (CombinedGraphQLErrors.is(error)) {
    isUnauthenticated = error.errors.some((e) => e.extensions?.['code'] === 'UNAUTHENTICATED');
  } else if (ServerParseError.is(error) && error.statusCode === 401) {
    isUnauthenticated = true;
  }

  if (isUnauthenticated) {
    clearSession();
    window.dispatchEvent(new Event('auth:logout'));
  }
});

export const client = new ApolloClient({
  link: errorLink.concat(authLink).concat(httpLink),
  cache: new InMemoryCache({
    typePolicies: {
      User:        { keyFields: ['id'] },
      Institution: { keyFields: ['id'] },
      Kid:         { keyFields: ['id'] },
      Class:       { keyFields: ['id'] },
      Update:      { keyFields: ['id'] },
    },
  }),
});
