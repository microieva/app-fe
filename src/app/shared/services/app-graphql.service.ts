import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class AppGraphQLService {
    //private apollo: ApolloBase
    
    constructor(
        private apollo: Apollo
    ) {
        //this.apollo = this.apolloProvider.use("app")
    }

    send(query: string, variables?: Object): Observable<any> {
        return this.apollo
            .watchQuery(
                {
                    query: gql`${query}`,
                    variables,
                    fetchPolicy: 'network-only',
                    pollInterval: 3000
                }).valueChanges
  }

    mutate(mutation: string, variables: Object): Observable<any> {
        return this.apollo
            .mutate({
                mutation: gql`${mutation}`,
                variables,
                fetchPolicy: 'network-only'
            })
    }
}