import { ApolloClient, InMemoryCache, HttpLink, ApolloLink } from '@apollo/client/core';
import { setContext } from '@apollo/client/link/context';
import { offsetLimitPagination } from '@apollo/client/utilities/policies/pagination';
import { environment } from '../environments/environment';

const httpLink = new HttpLink({
  uri: environment.url
});

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('authToken');
    return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : ""
    }
  }
});

const link = ApolloLink.from([authLink, httpLink]);

export const client = new ApolloClient({
  link,
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          slice: offsetLimitPagination(),
          me: {
            merge(existing, incoming) {
              return { ...existing, ...incoming };
            },
            read(existing) {
              return existing;
            }
          }
        }
      }
    }
  })
});

