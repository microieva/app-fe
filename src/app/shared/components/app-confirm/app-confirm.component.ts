import { Component, EventEmitter, Inject, Input, OnInit, Output } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from "@angular/material/dialog";

@Component({
    selector: 'app-confirm',
    templateUrl: './app-confirm.component.html',
    styleUrls: ['app-confirm.component.scss']
})
export class ConfirmComponent implements OnInit{
    title= "Are you sure?"
    addClass: boolean = false;
    @Output() isConfirming = new EventEmitter<boolean>(false);

    message: string;

    constructor(
        private dialog: MatDialog,
        
        public dialogRef: MatDialogRef<ConfirmComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {
        this.message = data.message;
    }

    ngOnInit(): void {
        if (this.message === "This appointment booking will be cancelled") {
            this.addClass = true;
        }
    }

    onOkClick(){
        this.isConfirming.emit(true);
    }
    onCancel() {
        this.dialog.closeAll();
    }
}