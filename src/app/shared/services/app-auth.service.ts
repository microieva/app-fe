import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Apollo } from 'apollo-angular';
import { AppGraphQLService } from './app-graphql.service';
import { AppDialogService } from './app-dialog.service';
import { DirectLoginInput } from '../types';

@Injectable({
  providedIn: 'root'
})
export class AppAuthService {
  isAuthenticated: boolean = false;

  constructor(
    private apollo: Apollo,
    private graphQLService: AppGraphQLService,
    private dialog: AppDialogService,
    private router: Router
  ) {}

  async logIn(input: DirectLoginInput) {
    const query = `query ($directLoginInput: LoginInput!) {
      login(directLoginInput: $directLoginInput) {
        token
        expiresAt
      }
    }`

      try {
        const response = await this.graphQLService.send(query, {directLoginInput: input});

        if (response.data) {
          const token = response.data.login.token;
          const tokenExpire = response.data.login.expiresAt;
          this.isAuthenticated = true;

          localStorage.setItem('authToken', token);
          localStorage.setItem('tokenExpire', tokenExpire);
          return token;
        }
      } catch (error) {
        this.dialog.open({data: {message: "Unexpected AuthService error: "+error}});
        this.logOut();
      }
    }

  async loginWithGoogle(credential: string){
    const mutation = `mutation ($googleCredential: String!){
        loginWithGoogle(googleCredential: $googleCredential) {
          token
          expiresAt
        } 
    }`

    try {
      const response = await this.graphQLService.mutate(mutation, { googleCredential: credential });

      if (response.data) {
        const token = response.data.loginWithGoogle.token;
        const tokenExpire = response.data.loginWithGoogle.expiresAt;
        this.isAuthenticated = true;

        localStorage.setItem('authToken', token);
        localStorage.setItem('tokenExpire', tokenExpire);
        this.dialog.close();
        window.location.reload();
      }
    } catch (error) {
      this.dialog.open({data: { message:  "Unexpected AuthService error: "+error}});
      this.logOut();
    }
  }

  logOut() {
    this.apollo.client.clearStore(); 
    localStorage.clear(); 
    this.isAuthenticated = false;
    this.router.navigate(['/']);
  }

  getAuthStatus(): boolean {
    return this.isAuthenticated;
  }
}
