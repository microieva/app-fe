import { AfterViewInit, Component, Inject, OnInit } from "@angular/core";
//import { AppDialogService } from "../../../services/app-dialog.service";
import { Router } from "@angular/router";
import { AppAuthService } from "../../services/app-auth.service";
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from "@angular/material/dialog";
import { FormGroup, FormControl, FormBuilder } from "@angular/forms";
import { Validators } from "ngx-editor";
import { DirectLoginInput } from "../../types";

@Component({
    selector: 'app-login',
    templateUrl: './app-login.component.html',
    styleUrls: ['app-login.component.scss']
})
export class LoginComponent implements OnInit, AfterViewInit    {
    title = "Log In"
    error = ''
    googleCredential: string | undefined;
    directLogin: boolean = false;
    googleLogin: boolean = false;

    form: LoginForm | undefined;

    constructor (
        private dialog: MatDialog,
        private authService: AppAuthService,
        private router: Router,
        private formBuilder: FormBuilder,

        public dialogRef: MatDialogRef<LoginComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {
        this.directLogin = this.data.directLogin;
        this.googleLogin = this.data.googleLogin;
    }

    ngOnInit() {
        if (this.directLogin) {
            this.buildForm()
        }
    }

    buildForm(){
        this.form = this.formBuilder.group({
            email: new FormControl<string>('', Validators.required()),
            password: new FormControl<string>('', Validators.required()),
        }) as LoginForm
    }
    ngAfterViewInit(): void {
        this.initializeGoogleSignIn();
    }

    initializeGoogleSignIn(): void {
        // @ts-ignore
        google.accounts.id.initialize({
            client_id: '234359946846-qk29f6skfdjaaoklv41g49f1du23c177.apps.googleusercontent.com',
            callback: (res: any)=> this.handleCredentialResponse(res),
            cancel_on_tap_outside: true
        });
        const buttonElement = document.getElementById('g_id_signin');
        if (buttonElement) {
            // @ts-ignore
            google.accounts.id.renderButton(buttonElement, { theme: 'outline', size: 'large' });
        } else {
            console.error('Parent element not found');
        }
      }
    
    async submit() {
        const input = this.form?.value;

        const token = await this.authService.logIn(input as DirectLoginInput);
        if (token) {
            this.dialogRef.close();
            window.location.reload(); 
        } else {
            this.error = "Invalid email or password"
        }
    }
    cancelDirectLogin(){
        this.dialog.closeAll();
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

type LoginForm = FormGroup<({
    email: FormControl<string>
    password: FormControl<string>
})>
