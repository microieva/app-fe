import { Component, EventEmitter, Inject, Input, Output } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from "@angular/material/dialog";

@Component({
    selector: 'app-confirm',
    templateUrl: './app-confirm.component.html',
    styleUrls: ['app-confirm.component.scss']
})
export class ConfirmComponent {
    title= "Are you sure?"
    @Output() ok = new EventEmitter<boolean>(false);

    message: string;

    constructor(
        private dialog: MatDialog,
        
        public dialogRef: MatDialogRef<ConfirmComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {
        this.message = data.message;
    }
    onOkClick(){
        this.ok.emit(true);
    }
    onCancel() {
        this.dialog.closeAll();
    }
}