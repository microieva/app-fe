import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { firstValueFrom } from 'rxjs';

@Injectable({
    providedIn: 'root'
})

export class AppGraphQLService {
    constructor(private apollo: Apollo) {}

    async send(query: string, variables?: Object, useCache = false): Promise<any> {  
        const fetchPolicy = useCache ? 'cache-first' : 'network-only';
        const result = this.apollo.watchQuery({
            query: gql`${query}`,
            variables,
            fetchPolicy: fetchPolicy,
            pollInterval: 3000 
        }).valueChanges;
    
        return firstValueFrom(result);
    }

    async mutate(mutation: string, variables: Object): Promise<any> {
        const result = this.apollo.mutate({
            mutation: gql`${mutation}`,
            variables,
            fetchPolicy: 'network-only'
        });
        console.log('GRAPHQL RESULT ',result)
        return firstValueFrom(result);
    }
}
