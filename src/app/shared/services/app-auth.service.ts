import { Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import gql from 'graphql-tag';
import { AppGraphQLService } from './app-graphql.service';
import { AppDialogService } from './app-dialog.service';
import { DirectLoginInput } from '../types';

declare const gapi: any;

@Injectable({
  providedIn: 'root'
})
export class AppAuthService {
  constructor(
    private apollo: Apollo,
    private graphQLService: AppGraphQLService,
    private dialog: AppDialogService
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

  loginWithGoogle(credential: string){
    const mutation = `mutation ($googleCredential: String!){
        loginWithGoogle(googleCredential: $googleCredential) 
    }`
    const response = this.graphQLService.mutate(mutation, { googleCredential: credential })
    response
        .pipe(take(1))
        .subscribe(res => {
            if (res.data.loginWithGoogle) {
                const token = res.data.loginWithGoogle;
                localStorage.setItem('authToken', token);
                this.dialog.close();
                window.location.reload();
            } else {
                console.error('Unexpected error from loginWithGoogle: ', res.data.loginWithGoogle.message)
            }
        });
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
