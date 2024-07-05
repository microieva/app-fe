import {NgModule} from '@angular/core';
import {ApolloModule, APOLLO_OPTIONS} from 'apollo-angular';
import {HttpLink} from 'apollo-angular/http';
import { client } from '../../apollo.config';

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
