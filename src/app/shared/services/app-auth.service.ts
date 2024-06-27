import { Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import gql from 'graphql-tag';
import { AppGraphQLService } from './app-graphql.service';
import { DirectLoginInput } from '../types';

declare const gapi: any;

@Injectable({
  providedIn: 'root'
})
export class AppAuthService {
  constructor(
    private apollo: Apollo,
    private graphQLService: AppGraphQLService
  ) {}

  logIn(input: DirectLoginInput) {
    const query = `query ($directLoginInput: LoginInput!) {
      login(directLoginInput: $directLoginInput)
    }`
    return this.graphQLService
      .send(query, {directLoginInput: input})
      .pipe(map(result => {
        if (result.data.login) {
          const token = result.data.login;
          localStorage.setItem('authToken', token);
          return token;
        } 
      }))
  }

  getMe(): Observable<any> {
    const ME_QUERY = gql`
      query Me {
        me {
          firstName
          userRole
        }
      }
    `;

    return this.apollo.query({
      query: ME_QUERY
    }).pipe(
      map((result: any) => result.data.me)
    );
  }

  logOut() {
    localStorage.removeItem('authToken'); 
    this.apollo.client.clearStore(); 
  }
}
