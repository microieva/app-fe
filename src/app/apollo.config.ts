import { ApolloClient, InMemoryCache, HttpLink, ApolloLink } from '@apollo/client/core';
import { setContext } from '@apollo/client/link/context';
import { offsetLimitPagination } from '@apollo/client/utilities/policies/pagination';

const httpLink = new HttpLink({
  uri: 'http://localhost:4000/graphql' 
});

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('authToken');
    return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
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
          slice: offsetLimitPagination(),  // without this, the initial query fetches the right data but fetchMore() doesn't cause the observable to be hit
          // I have tried playing around with read() and merge() here unsuccessfully
        }
      }
    }
  })
});
