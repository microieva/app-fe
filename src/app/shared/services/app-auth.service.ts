import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Apollo } from 'apollo-angular';
import { MatDialog } from '@angular/material/dialog';
import { AppGraphQLService } from './app-graphql.service';
import { AlertComponent } from '../components/app-alert/app-alert.component';
import { LoadingComponent } from '../components/app-loading/loading.component';
import { DirectLoginInput } from '../types';

@Injectable({
  providedIn: 'root'
})
export class AppAuthService {
    
    constructor(
        private apollo: Apollo,
        private graphQLService: AppGraphQLService,
        private dialog: MatDialog,
        private router: Router
    ) {}

    async logIn(input: DirectLoginInput) {
        this.dialog.closeAll();
        this.dialog.open(LoadingComponent);
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

                localStorage.setItem('authToken', token);
                localStorage.setItem('tokenExpire', tokenExpire);
                return token;
            }
        } catch (error) {
            const ref = this.dialog.open(AlertComponent, {data: {message: error}});
            ref.componentInstance.ok.subscribe(async subscription => {
                if (subscription) {
                    this.dialog.closeAll();
                    await this.logOut();
                }
            });
        }
    }

    async loginWithGoogle(credential: string){
        this.dialog.closeAll();
        this.dialog.open(LoadingComponent);
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

                localStorage.setItem('authToken', token);
                localStorage.setItem('tokenExpire', tokenExpire);
                this.dialog.closeAll();
                this.router.navigate(['/']);
            }
        } catch (error) {
            const ref = this.dialog.open(AlertComponent, {data: { message:  "AuthService: "+error}});
            ref.componentInstance.ok.subscribe(subscription => {
                if (subscription) {
                    this.dialog.closeAll(); 
                }
            })
        }
    }

    async loginWithSignicat(signicatAccessToken: string){
        const mutation = `mutation ($signicatAccessToken: String!){
            loginWithSignicat(signicatAccessToken: $signicatAccessToken) {
                token
                expiresAt
            } 
        }`

        try {
            const response = await this.graphQLService.mutate(mutation, { signicatAccessToken });

            if (response.data) {
                const token = response.data.loginWithSignicat.token;
                const tokenExpire = response.data.loginWithSignicat.expiresAt;
                localStorage.setItem('authToken', token);
                localStorage.setItem('tokenExpire', tokenExpire);
            }
        } catch (error) {
            const ref = this.dialog.open(AlertComponent, {data: { message:  "AuthService: "+error}});
            ref.componentInstance.ok.subscribe(subscription => {
                if (subscription) {
                    this.dialog.closeAll(); 
                }
            });
            this.router.navigate(['/']);
        }
    }

    async logOut() {
        try {
            await this.graphQLService.mutate(`mutation { logOut }`, {});
            await this.apollo.client.clearStore();
            localStorage.clear();
            this.router.navigate(['/']);
        } catch (error) {
            console.error('Error during logout process:', error);
        }
    }

    isAuth():boolean {
        return !!localStorage.getItem('authToken'); 
    }
}
