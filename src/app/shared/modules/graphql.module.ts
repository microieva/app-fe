import {NgModule} from '@angular/core';
import {ApolloModule, APOLLO_OPTIONS} from 'apollo-angular';
import {ApolloClientOptions, InMemoryCache} from '@apollo/client/core';
import {HttpLink} from 'apollo-angular/http';
import { client } from '../../apollo.config';

// const uri = 'http://localhost:4000/graphql'; 
// export function createApollo(httpLink: HttpLink): ApolloClientOptions<any> {
//   return {
//     link: httpLink.create({uri}),
//     cache: new InMemoryCache(),
//     headers: {
//       'Access-Control-Allow-Origin': '*',
//     },
//   };
// }

@NgModule({
  exports: [ApolloModule],
  providers: [
    {
      provide: APOLLO_OPTIONS,
      useFactory: () => {
        return {
          cache: client.cache,
          link: client.link
        }
      },
      deps: [HttpLink],
    },
  ],
})
export class GraphQLModule {}
