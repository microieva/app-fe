import { ApolloClient, InMemoryCache, HttpLink, ApolloLink } from '@apollo/client/core';
import { setContext } from '@apollo/client/link/context';
import { offsetLimitPagination } from '@apollo/client/utilities/policies/pagination';
import {environment} from '../environments/environment';

const httpLink = new HttpLink({
  uri: environment.url
});

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('authToken');
    return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
      //'Access-Control-Allow-Origin': 'https://health-center.happypond-6e715cde.northeurope.azurecontainerapps.io'
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
          slice: offsetLimitPagination(),  // (BP auth note) without this, the initial query fetches the right data but fetchMore() doesn't cause the observable to be hit
        }
      }
    }
  })
});
