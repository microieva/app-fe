import { Component, EventEmitter, Inject, OnInit, Output } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from "@angular/material/dialog";

@Component({
    selector: 'app-confirm',
    templateUrl: './app-confirm.component.html',
    styleUrls: ['app-confirm.component.scss']
})
export class ConfirmComponent implements OnInit{
    @Output() isConfirming = new EventEmitter<void>();
    @Output() isCancelling = new EventEmitter<void>();
    message: string;
    title:string;

    constructor(
        private dialog: MatDialog,
        
        public dialogRef: MatDialogRef<ConfirmComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {
        this.message = data.message;
        this.title = data.title;
    }

    ngOnInit(): void {
    }

    onConfirmClick(){
        this.isConfirming.emit();
    }
    onCancel() {
        this.dialog.closeAll();
        this.isCancelling.emit();
    }
}