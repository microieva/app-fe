import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Apollo } from 'apollo-angular';
import { MatDialog } from '@angular/material/dialog';
import { AppGraphQLService } from './app-graphql.service';
import { AlertComponent } from '../components/app-alert/app-alert.component';
import { DirectLoginInput } from '../types';

@Injectable({
  providedIn: 'root'
})
export class AppAuthService {
    isAuthenticated: boolean = false;

    constructor(
        private apollo: Apollo,
        private graphQLService: AppGraphQLService,
        private dialog: MatDialog,
        private router: Router
    ) {}

    async logIn(input: DirectLoginInput) {
        const mutation = `mutation ($directLoginInput: LoginInput!) {
            login(directLoginInput: $directLoginInput) {
                token
                expiresAt
            }
        }`

        try {
            const response = await this.graphQLService.mutate(mutation, {directLoginInput: input});

            if (response.data) {
                const token = response.data.login.token;
                const tokenExpire = response.data.login.expiresAt;
                this.isAuthenticated = true;

                localStorage.setItem('authToken', token);
                localStorage.setItem('tokenExpire', tokenExpire);
                return token;
            }
        } catch (error) {
            console.error(error);
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
                this.dialog.closeAll();
                window.location.reload();
            }
        } catch (error) {
            const ref = this.dialog.open(AlertComponent, {data: { message:  "AuthService: "+error}});
            ref.componentInstance.ok.subscribe(subscription => {
                if (subscription) {
                    this.dialog.closeAll(); // for google login dialog
                }
            })
        }
    }

    logOut() {
        this.apollo.client.clearStore(); 
        localStorage.clear(); 
        this.isAuthenticated = false;
    }

    getAuthStatus(): boolean {
        return this.isAuthenticated;
    }

    isLoggedIn(): boolean {
        return !!localStorage.getItem('authToken'); 
    }
}
