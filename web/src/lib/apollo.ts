import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

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

export const client = new ApolloClient({
  link: authLink.concat(httpLink),
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
