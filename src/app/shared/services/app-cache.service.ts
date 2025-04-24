import { Injectable } from "@angular/core";
import { Apollo, gql } from "apollo-angular";
import { ME_QUERY } from "../constants";
import { User } from "../../graphql/user/user";

@Injectable({
  providedIn: 'root'
})
export class AppCacheService {
  constructor(private apollo: Apollo) {}

  clearCachedMe(): void {
    this.apollo.client.cache.evict({
      id: 'ROOT_QUERY',
      fieldName: 'me'
    });
  }

  updateCachedMe(newData: User): void {
    this.apollo.client.writeQuery({
      query: gql`${ME_QUERY}`,
      data: {
        me: newData
      }
    });
  }
}