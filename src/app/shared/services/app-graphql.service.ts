import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { firstValueFrom } from 'rxjs';
import { ME_QUERY } from '../constants';

@Injectable({
    providedIn: 'root'
})

export class AppGraphQLService {
    constructor(private apollo: Apollo) {}

    // async send(query: string, variables?: Object, useCache = false): Promise<any> {  
    //     const fetchPolicy = useCache ? 'cache-first' : 'network-only';
    //     const result = this.apollo.watchQuery({
    //         query: gql`${query}`,
    //         variables,
    //         fetchPolicy: fetchPolicy
    //         //pollInterval: 3000 
    //     }).valueChanges;
    
    //     return firstValueFrom(result);
    // }

    async send(query: string, variables?: Object, options: { 
      useCache?: boolean,
      forceFetch?: boolean,
    } = {useCache: true, forceFetch: false}): Promise<any> {
      const { useCache, forceFetch } = options;
        
        const result = await firstValueFrom(this.apollo.watchQuery({
          query: gql`${ME_QUERY}`,
          variables,
          fetchPolicy: 'cache-first'
        }).valueChanges);
        
        if (ME_QUERY.includes(query) && !forceFetch) {
          this.apollo.client.writeQuery({
            query: gql`${ME_QUERY}`,
            data: result.data
          });
        }
  
      const fetchPolicy = useCache ? 'cache-first' : 'network-only';

      const watchQueryConfig: any = {
        query: gql`${query}`,
        variables,
        fetchPolicy: forceFetch ? 'network-only' : fetchPolicy
      };
      return firstValueFrom(this.apollo.watchQuery(watchQueryConfig).valueChanges);
    }

    async mutate(mutation: string, variables: Object): Promise<any> {
        const result = this.apollo.mutate({
            mutation: gql`${mutation}`,
            variables,
            fetchPolicy: 'network-only'
        });

        return firstValueFrom(result);
    }
}
