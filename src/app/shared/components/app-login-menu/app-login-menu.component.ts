import { Subscription } from "rxjs";
import { Component, OnDestroy, OnInit } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { AppDbWakeUpService } from "../../services/app-db-wake-up.service";
import { LoginComponent } from "../app-login/app-login.componnet";
import { AlertComponent } from "../app-alert/app-alert.component";
import { environment } from "../../../../environments/environment";

@Component({
    selector: 'app-login-menu',
    templateUrl: 'app-login-menu.component.html',
    styleUrls: ['app-login-menu.component.scss']
})
export class LoginMenuComponent implements OnInit, OnDestroy {
    connected:boolean = false;
    error:string | undefined;
    sub: Subscription = new Subscription();

    constructor(
        private dialog: MatDialog,
        private dbWakeUpService: AppDbWakeUpService,
    ){}

    ngOnInit() {
        this.sub = this.dbWakeUpService.ping().subscribe((response:any) => {
            this.connected = response.status === 200;
            if (!this.connected) {
                this.error = response.body+" Please try again";
            }
        });
    }

    showError(){
        const ref = this.dialog.open(AlertComponent, {disableClose:true, data: {message: this.error}});
        ref.componentInstance.ok.subscribe(() => { this.dialog.closeAll(); });
    }

    onBankLoginClick(){
        const authEndpoint = environment.authEndpoint;
        const clientId = environment.clientId;
        const redirectUri = environment.redirectUri;
        const state = generateRandomState(); 
        const responseType= 'code'
        const prompt = 'login'
        const scope = 'openid profile';
        const acrValues = 'idp:ftn'
        const clientSecret = environment.clientSecret;
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

    ngOnDestroy() {
        this.sub.unsubscribe();
    }
}