

import { Component, EventEmitter, Inject, Output } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { AppDialogData } from "../../types";

@Component({
    selector: 'app-dialog',
    templateUrl: './app-dialog.component.html',
    styleUrls: ['./app-dialog.component.scss']
})
export class AppDialogComponent {
    loading: boolean | undefined;
    isDeleting: boolean | undefined;

    @Output() ok = new EventEmitter<boolean>(false);

    constructor(
        @Inject(MAT_DIALOG_DATA) data: AppDialogData,
        private dialogRef: MatDialogRef<AppDialogComponent>
    ) {
        this.loading = data.loading;
        this.isDeleting = data.isDeleting;
    }

    onOk(ok: boolean){
        this.ok.emit(ok)
    }
}