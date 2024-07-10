import { Component, EventEmitter, Inject, OnInit, Output } from "@angular/core";
import { FormBuilder, FormControl, FormGroup, Validators } from "@angular/forms";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { AppAuthService } from "../../services/app-auth.service";
import { AppDialogData, DirectLoginInput } from "../../types";

@Component({
    selector: 'app-dialog',
    templateUrl: './app-dialog.component.html',
    styleUrls: ['./app-dialog.component.scss']
})
export class AppDialogComponent implements OnInit {
    loading: boolean;
    message: string | undefined;
    isDeleting: boolean;
    showDirectLoginForm: boolean;
    isLoggingIn: boolean;
    input: boolean;
    error: string | undefined;
    form: LoginForm;

    @Output() ok = new EventEmitter<boolean>(false);
    @Output() loginSuccess = new EventEmitter<boolean>(false);
    @Output() event = new EventEmitter<string>();

    constructor(
        @Inject(MAT_DIALOG_DATA) data: AppDialogData,
        private dialogRef: MatDialogRef<AppDialogComponent>,
        private formBuilder: FormBuilder,
        private authService: AppAuthService
    ) {
        this.loading = data.loading;
        this.message = data.message;
        this.isDeleting = data.isDeleting;
        this.isLoggingIn = data.isLoggingIn;
        this.showDirectLoginForm = data.showDirectLoginForm;
        this.input = data.input;
        this.form = this.buildLoginForm()
    }

    ngOnInit() {
        if (this.showDirectLoginForm) {
            this.buildLoginForm()
        }
    }

    buildLoginForm(){
        return this.form = this.formBuilder.group({
            email: this.formBuilder.control<string>('', [Validators.required]),
            password: this.formBuilder.control<string>('', [Validators.required])
        }) as LoginForm
    }

    onOk(ok: boolean){
        console.log('is this emitting ? dialog component ok: ', ok)
        this.ok.emit(ok);
    }

    cancelDirectLogin(){
        this.isLoggingIn = true;
        this.showDirectLoginForm = false;
    }

    onEventSubmit(event: any){
        this.event.emit(event.input)
    }

    async submit() {
        const input = this.form.value;

        const token = await this.authService.logIn(input as DirectLoginInput);
        if (token) {
            this.dialogRef.close();
            window.location.reload(); 
        } else {
            this.error = "Invalid email or password"
        }
    }
}

type LoginForm = FormGroup<({
    email: FormControl<string>
    password: FormControl<string>
})>
