

import { Component, EventEmitter, Inject, OnInit, Output } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { AppDialogData } from "../../types";
import { FormBuilder, FormControl, FormGroup, Validators } from "@angular/forms";
import { AppDialogService } from "../../services/app-dialog.service";

@Component({
    selector: 'app-dialog',
    templateUrl: './app-dialog.component.html',
    styleUrls: ['./app-dialog.component.scss']
})
export class AppDialogComponent implements OnInit {
    loading: boolean | undefined;
    isDeleting: boolean | undefined;
    showDirectLoginForm: boolean | undefined;
    isLoggingIn: boolean;

    form: LoginForm | undefined;

    @Output() ok = new EventEmitter<boolean>(false);

    constructor(
        @Inject(MAT_DIALOG_DATA) data: AppDialogData,
        private dialogRef: MatDialogRef<AppDialogComponent>,
        private formBuilder: FormBuilder,
        private dialog: AppDialogService
    ) {
        this.loading = data.loading;
        this.isDeleting = data.isDeleting;
        this.isLoggingIn = data.isLoggingIn;
        this.showDirectLoginForm = data.showDirectLoginForm;
    }

    ngOnInit() {
        if (this.showDirectLoginForm) {
            this.buildLoginForm()
        }
    }

    buildLoginForm(){
        this.form = this.formBuilder.group({
            email: this.formBuilder.control<string>('', [Validators.required]),
            password: this.formBuilder.control<string>('', [Validators.required])
        })
    }

    onOk(ok: boolean){
        this.ok.emit(ok)
    }

    cancelDirectLogin(){
        this.isLoggingIn = true;
        this.showDirectLoginForm = false;
    }
}

type LoginForm = FormGroup<({
    email: FormControl<string | null>
    password: FormControl<string | null>
})>