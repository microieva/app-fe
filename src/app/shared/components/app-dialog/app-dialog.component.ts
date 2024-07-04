import { Component, EventEmitter, Inject, OnInit, Output } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { AppDialogData, DirectLoginInput } from "../../types";
import { FormBuilder, FormControl, FormGroup, Validators } from "@angular/forms";
import { AppAuthService } from "../../services/app-auth.service";

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
    error: string | undefined;
    form: LoginForm;

    @Output() ok = new EventEmitter<boolean>(false);
    @Output() loginSuccess = new EventEmitter<boolean>(false);

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
        this.ok.emit(ok)
    }

    cancelDirectLogin(){
        this.isLoggingIn = true;
        this.showDirectLoginForm = false;
    }

    submit() {
        const input = this.form.value;
        this.authService.logIn(input as DirectLoginInput).subscribe({
            next: (token) => {
                if (token) {
                    this.dialogRef.close();
                    window.location.reload();
                }
            },
            error: (err) => {
                this.error = "Invalid password or email"
                console.error(err);
            }
        })
    }
}

type LoginForm = FormGroup<({
    email: FormControl<string>
    password: FormControl<string>
})>