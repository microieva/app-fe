import { Subscription } from "rxjs";
import { Component, OnDestroy, OnInit } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { AppDbWakeUpService } from "../../services/app-db-wake-up.service";
import { LoginComponent } from "../app-login/app-login.componnet";
import { AlertComponent } from "../app-alert/app-alert.component";
import { environment } from "../../../../environments/environment";
import { LoadingComponent } from "../app-loading/loading.component";

@Component({
    selector: 'app-login-menu',
    templateUrl: 'app-login-menu.component.html',
    styleUrls: ['app-login-menu.component.scss']
})
export class LoginMenuComponent implements OnInit, OnDestroy {
    sub: Subscription = new Subscription();

    constructor(
        private dialog: MatDialog,
        private dbWakeUpService: AppDbWakeUpService,
    ){}

    ngOnInit() {
    }

    showError(){
        this.dialog.closeAll();
        const ref = this.dialog.open(AlertComponent, {disableClose:true, data: {message: "Unexpected network error, please try again"}});
        ref.componentInstance.ok.subscribe(() => { this.dialog.closeAll(); });
    }

    onBankLoginClick(){
        const ref = this.dialog.open(LoadingComponent);
        this.sub = this.dbWakeUpService.ping().subscribe((response:any) => {
            if (response.status === 200) {
                ref.close();
                login();
            } else {
                this.showError()
            }
        });

        function login() {
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
    }
 
    onDirectLoginClick() {
        // const ref = this.dialog.open(LoadingComponent);
        // this.sub = this.dbWakeUpService.ping().subscribe((response:any) => {
        //     if (response.status === 200) {
        //         ref.close();
        //         this.dialog.open(LoginComponent, {data: {directLogin: true}});
        //     } else {
        //         this.showError()
        //     }
        // });
        this.dialog.open(LoginComponent, {data: {directLogin: true}});
    }
    onGoogleLoginClick() {
        const ref = this.dialog.open(LoadingComponent);
        this.sub = this.dbWakeUpService.ping().subscribe((response:any) => {
            if (response.status === 200) {
                ref.close();
                this.dialog.open(LoginComponent, {data: {googleLogin: true}});
            } else {
                this.showError()
            }
        });
    }

    ngOnDestroy() {
        this.sub.unsubscribe();
    }
}