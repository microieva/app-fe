import { Component, EventEmitter, Inject, Input, OnInit, Optional, Output } from "@angular/core";
import { DateTime } from "luxon";
import { Router } from "@angular/router";
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from "@angular/material/dialog";
import { AppGraphQLService } from "../../shared/services/app-graphql.service";
import { AlertComponent } from "../../shared/components/app-alert/app-alert.component";
import { ConfirmComponent } from "../../shared/components/app-confirm/app-confirm.component";
import { Record } from "./record"; 

@Component({
    selector: 'app-record',
    templateUrl: './record.component.html',
    styleUrls: ['./record.component.scss']
})
export class RecordComponent implements OnInit {
    isCreating: boolean = false;
    isEditting: boolean = false;

    updated: string | undefined;
    created: string | undefined;
    record: Record | null = null;
    patientName: string | undefined;

    aptId :number | undefined;

    @Input() recordId: number | undefined;
    @Input() appointmentId: number | undefined;

    @Output() cancel = new EventEmitter<boolean>();
    @Output() reload = new EventEmitter<boolean>();

    recId: number | undefined;
    id: number | undefined;
    width: string | undefined;
    noDelete: boolean = false;

    constructor(
        private dialog: MatDialog,
        private graphQLService: AppGraphQLService,
        private router: Router,

        @Optional() public dialogRef: MatDialogRef<RecordComponent>,
        @Optional() @Inject(MAT_DIALOG_DATA) public data: any
    ){
        if (this.data) {
            this.recId = this.data.recordId;
            this.aptId = this.data.appointmentId;
            this.width = this.data.width;
            this.noDelete = this.data.noDelete;
        }
    }

    ngOnInit(): void {
        this.id = this.recordId || this.recId;
        if (this.id) {
            this.loadRecord();
        }
        this.appointmentId = this.appointmentId || this.aptId;

        if (this.appointmentId && !this.id){
            this.isCreating = true
        } else {
            this.isCreating = false;
        }
    }
    
    async loadRecord(){
        const query = `query ($recordId: Int){ 
            record (recordId: $recordId) {
                id
                title
                text
                createdAt
                updatedAt
                draft
                appointment {
                    id
                }
                patient {
                    firstName
                    lastName
                }
            }
        }`
        try {
            const response = await this.graphQLService.send(query, {recordId: this.id});
            if (response.data.record) {
                this.record = response.data.record;
                this.aptId = response.data.record.appointment?.id;
                this.isCreating = false;
                this.updated = DateTime.fromISO(response.data.record.updatedAt).toFormat('MMM dd, yyyy'); 
                this.created = DateTime.fromISO(response.data.record.createdAt).toFormat('MMM dd, yyyy'); 
                if (this.record) {
                    this.patientName = this.record.patient.firstName+' '+this.record.patient.lastName
                }
            }
        } catch (error) {
            this.dialog.open(AlertComponent, {data: {message: "Unexpected error loading record: "+error}})
        }
    }
    editRecord() {
        this.isEditting = true;
    }
    deleteRecord() {
        const dialogref = this.dialog.open(ConfirmComponent, {data: {message: "This will delete the record permanently"}});
        dialogref.componentInstance.isConfirming.subscribe(async () => {
            const mutation = `mutation ($recordId: Int!) {
                deleteRecord(recordId: $recordId) {
                    success
                    message
                }
            }`
            try {
                const response = await this.graphQLService.mutate(mutation, {recordId: this.id});
                if (response.data.deleteRecord.success) {
                    this.dialog.closeAll(); 
                    await this.loadRecord();
                    this.reload.emit(true);
                }
            } catch (error) {
                this.dialog.open(AlertComponent, {data: {message: "Unexpected error deleting record: "+error}})
            }
        })
    }
    onCancel(){
        this.isEditting = false;
        this.cancel.emit(true);
    }
    async onReload(){
        await this.loadRecord();
        this.isEditting = false;
        this.reload.emit(true);
    }
    close(){
        this.dialogRef.close();
    }
    async onSave(input: any){
        const recordInput = {
            id: this.id,
            title: input.title,
            text: input.text,
            appointmentId: this.appointmentId,
            draft: input.draft
        }
        
        const mutation = `mutation ($recordInput: RecordInput!){
            saveRecord(recordInput: $recordInput) {
                success
                message
            }
        }`
        try {
            const response = await this.graphQLService.mutate(mutation, { recordInput });
            if (response.data.saveRecord) {
                await this.loadRecord();
                this.isEditting = false;
                this.reload.emit(true);
            }   
        } catch (error) {
            this.dialog.open(AlertComponent, {data: { message: "Unexpected error saving medical record: "+error}})
        }
    }
}