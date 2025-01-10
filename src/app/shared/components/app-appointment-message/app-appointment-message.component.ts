import { Component, EventEmitter, Inject, Output } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";

@Component({
    selector: 'app-appointment-message',
    templateUrl: './app-appointment-message.component.html',
    styleUrls: ['app-appointment-message.component.scss']
})
export class AppointmentMessageComponent { 
    @Output() isCancelling = new EventEmitter<void>();
    @Output() isSaving = new EventEmitter<string>();

    message: string | null = null;

    constructor(
        public dialogRef: MatDialogRef<AppointmentMessageComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {}
    onCancelClick(){
        this.isCancelling.emit();
        this.dialogRef.close();
    }
    onSaveClick(message:string){
        this.isSaving.emit(message);
    }
}