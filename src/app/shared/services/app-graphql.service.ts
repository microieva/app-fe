import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable, firstValueFrom } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class AppGraphQLService {
    
    /*constructor(
        private apollo: Apollo
    ) {}

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
    }*/
    constructor(private apollo: Apollo) {}

    async send(query: string, variables?: Object): Promise<any> {
        const result = this.apollo.watchQuery({
        query: gql`${query}`,
        variables,
        fetchPolicy: 'network-only',
        pollInterval: 3000,
        }).valueChanges;

        return firstValueFrom(result);
    }

    async mutate(mutation: string, variables: Object): Promise<any> {
        const result = this.apollo.mutate({
        mutation: gql`${mutation}`,
        variables,
        fetchPolicy: 'network-only',
        });

        return firstValueFrom(result);
    }
}