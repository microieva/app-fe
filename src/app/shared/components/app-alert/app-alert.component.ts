import { Component, EventEmitter, Inject, Output } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";

@Component({
    selector: 'app-alert',
    templateUrl: './app-alert.component.html',
    styleUrls: ['app-alert.component.scss']
})
export class AlertComponent {
    @Output() ok = new EventEmitter<void>();
    message: string;

    constructor(
        public dialogRef: MatDialogRef<AlertComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {
        this.message = data.message;
    }
    onOkClick(){
        this.ok.emit();
        this.dialogRef.close();
    }
}