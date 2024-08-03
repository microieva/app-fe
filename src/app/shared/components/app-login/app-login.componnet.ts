import { Component, Inject, OnInit } from "@angular/core";
//import { AppDialogService } from "../../../services/app-dialog.service";
import { Router } from "@angular/router";
import { AppAuthService } from "../../services/app-auth.service";
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from "@angular/material/dialog";

@Component({
    selector: 'app-login',
    templateUrl: './app-login.component.html',
    styleUrls: ['app-login.component.scss']
})
export class LoginComponent implements OnInit{
    title = "Log In"
    googleCredential: string | undefined;
    showDirectLoginForm: boolean = false;
    isLoggingIn: boolean = false;

    constructor (
        private dialog: MatDialog,
        private authService: AppAuthService,
        private router: Router,

        public dialogRef: MatDialogRef<LoginComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {
        this.showDirectLoginForm = this.data.showDirectLoginForm;
        this.isLoggingIn = this.data.isLoggingIn;
    }

    ngOnInit() {
        // @ts-ignore
        google.accounts.id.initialize({
            client_id: "234359946846-qk29f6skfdjaaoklv41g49f1du23c177.apps.googleusercontent.com",
            callback: this.handleCredentialResponse.bind(this),
            auto_select: false,
            cancel_on_tap_outside: true,

        });
        // @ts-ignore
        google.accounts.id.renderButton(
        // @ts-ignore
            document.getElementById("google-button"),
            { theme: "outline", size: "large", width: "" }
        );
        const googleButton = document.querySelector('#google-button div');
        if (googleButton) {
            googleButton.classList.add('google-btn');
        }
        // @ts-ignore
        google.accounts.id.prompt((notification: PromptMomentNotification) => {});
      }

    onDirectLoginClick(){
        this.dialog.open(LoginComponent, { data: { showDirectLoginForm: true, isLoggingIn: false }})
    }

    async handleCredentialResponse(response: any) {
        this.googleCredential = response.credential;
        this.loginWithGoogle();
    }

    loginWithGoogle(){
        if (this.googleCredential) {
            this.authService.loginWithGoogle(this.googleCredential);
            this.router.navigate(['/']);
        }
    }
}