import { AfterViewInit, Component, Inject, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { AppAuthService } from "../../services/app-auth.service";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { FormGroup, FormControl, FormBuilder } from "@angular/forms";
import { Validators } from "ngx-editor";
import { environment } from "../../../../environments/environment";
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
            client_id: environment.client_id,
            callback: (res: any)=> this.handleCredentialResponse(res),
            cancel_on_tap_outside: true
        });
        const buttonElement = document.getElementById('g_id_signin');
        if (buttonElement) {
            // @ts-ignore
            google.accounts.id.renderButton(buttonElement, { theme: 'outline', size: 'large' });
        } 
    }
    
    async submit() {
        const input = this.form?.value;
        const token = await this.authService.logIn(input as DirectLoginInput);

        if (token) {
            this.dialogRef.close();
            this.router.navigate(['/home'])
        } else {
            this.error = "Invalid email or password"
        }
    }
    cancelDirectLogin(){
        this.dialogRef.close();
    }

    async handleCredentialResponse(response: any) {
        this.googleCredential = response.credential;
        await this.loginWithGoogle();
    }

    async loginWithGoogle(){
        if (this.googleCredential) {
            await this.authService.loginWithGoogle(this.googleCredential);
            this.router.navigate(['/home']);
        }
    }
}

type LoginForm = FormGroup<({
    email: FormControl<string>
    password: FormControl<string>
})>
