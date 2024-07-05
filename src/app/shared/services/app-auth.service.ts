import { Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { map, take, takeWhile } from 'rxjs/operators';
import { AppGraphQLService } from './app-graphql.service';
import { AppDialogService } from './app-dialog.service';
import { DirectLoginInput } from '../types';
import gql from 'graphql-tag';
import { Router } from '@angular/router';
import { DateTime } from "luxon";

@Injectable({
  providedIn: 'root'
})
export class AppAuthService {
  private isAuthenticated = false;

  constructor(
    private apollo: Apollo,
    private graphQLService: AppGraphQLService,
    private dialog: AppDialogService,
    private router: Router
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
          this.isAuthenticated = true;
          const tokenStart = DateTime.local();
          const tokenExpire = tokenStart.plus({ hours: 1 }).toISO();
          localStorage.setItem('authToken', token);
          localStorage.setItem('tokenExpire', tokenExpire);
          return token;
        }
      }));

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
                this.isAuthenticated = true;
                const tokenStart = DateTime.local();
                const tokenExpire = tokenStart.plus({ hours: 1 }).toISO();
                localStorage.setItem('authToken', token);
                localStorage.setItem('tokenExpire', tokenExpire);
                this.dialog.close();
                window.location.reload();
            } else {
                console.error('Unexpected error from loginWithGoogle: ', res.data.loginWithGoogle.message)
            }
        });
  }
  // getMe() {
  //   const ME_QUERY = gql`
  //     query Me {
  //       me {
  //         firstName
  //         userRole
  //       }
  //     }
  //   `;

  //   return this.apollo.query({
  //     query: ME_QUERY
  //   }).pipe(
  //     map((result: any) => {console.log('getMe: ', result.data.me); result.data.me})
  //   )
  // }

  logOut() {
    this.apollo.client.clearStore(); 
    localStorage.clear(); 
    this.isAuthenticated = false;
    this.router.navigate(['/']);
  }

  getAuthStatus(): boolean {
    // this.getMe for userRole
    return this.isAuthenticated;
  }
}
