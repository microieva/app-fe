import { Component } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { LoginComponent } from "../app-login/app-login.componnet";

@Component({
    selector: 'app-login-menu',
    templateUrl: './app-login-menu.component.html',
    styleUrls: ['app-login-menu.component.scss']
})
export class LoginMenuComponent {
    constructor(
        private dialog: MatDialog
    ){}

    onBankLoginClick(){
        const authEndpoint = 'https://health-center.sandbox.signicat.com/auth/open/connect/authorize' 
        const clientId = 'sandbox-itchy-wheel-954';
        const redirectUri = 'https://app-fe-gamma.vercel.app/'; 
        const state = generateRandomState(); 
        const responseType= 'code'
        const prompt = 'login'
        const scope = 'openid profile';
        const acrValues = 'idp:ftn'
        const clientSecret = 'EJTOPAOXSS2c8bPpMOeJpTe64DvbFdWBS2wH5ytbvT7Tt5Yh'
        const grantType = "authorization_code"
    
        const authUrl = `${authEndpoint}?client_id=${clientId}&client_secret=${clientSecret}&response_type=${responseType}&grant_type=${grantType}&scope=${scope}&state=${state}&prompt=${prompt}&acr_values=${acrValues}&redirect_uri=${redirectUri}`;

        window.location.href = authUrl;

        function generateRandomState(): string {
            const array = new Uint32Array(10);
            window.crypto.getRandomValues(array);
            return Array.from(array, dec => ('0' + dec.toString(10)).substr(-2)).join('');
          }
    }
 
    onDirectLoginClick() {
        this.dialog.open(LoginComponent, {data: {directLogin: true}});
    }
    onGoogleLoginClick() {
        this.dialog.open(LoginComponent, {data: {googleLogin: true}});
    }
}