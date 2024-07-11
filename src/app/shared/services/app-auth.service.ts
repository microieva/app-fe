import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Apollo } from 'apollo-angular';
import { DateTime } from "luxon";
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
      login(directLoginInput: $directLoginInput)
    }`

      try {
        const response = await this.graphQLService.send(query, {directLoginInput: input});

        if (response.data) {
          const token = response.data.login;
          this.isAuthenticated = true;
          const tokenStart = DateTime.local();
          const tokenExpire = tokenStart.plus({ hours: 1 }).toISO();
          localStorage.setItem('authToken', token);
          localStorage.setItem('tokenExpire', tokenExpire);
          return token;
        }
      } catch (error) {
        this.dialog.open({data: {message: error}});
      }
    }

  async loginWithGoogle(credential: string){
    const mutation = `mutation ($googleCredential: String!){
        loginWithGoogle(googleCredential: $googleCredential) 
    }`

    try {
      const response = await this.graphQLService.mutate(mutation, { googleCredential: credential });

      if (response.data) {
        const token = response.data.loginWithGoogle;
        this.isAuthenticated = true;
        const tokenStart = DateTime.local();
        const tokenExpire = tokenStart.plus({ hours: 1 }).toISO();
        localStorage.setItem('authToken', token);
        localStorage.setItem('tokenExpire', tokenExpire);
        this.dialog.close();
        window.location.reload();
      }
    } catch (error) {
      this.dialog.open({data: { message: error}});
    }
  }

  logOut() {
    console.log('calling logout in auth service')
    this.apollo.client.clearStore(); 
    localStorage.clear(); 
    this.isAuthenticated = false;
    this.router.navigate(['/']);
  }

  getAuthStatus(): boolean {
    return this.isAuthenticated;
  }
}
