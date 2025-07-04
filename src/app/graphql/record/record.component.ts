import { Component, ElementRef, EventEmitter, Inject, Input, OnInit, Optional, Output, ViewChild } from "@angular/core";
import { DateTime } from "luxon";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { BreakpointObserver } from "@angular/cdk/layout";
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from "@angular/material/dialog";
import { AppGraphQLService } from "../../shared/services/app-graphql.service";
import { AlertComponent } from "../../shared/components/app-alert/app-alert.component";
import { ConfirmComponent } from "../../shared/components/app-confirm/app-confirm.component";
import { Record } from "./record"; 
import { RecordInput } from "./record.input";

@Component({
    selector: 'app-record',
    templateUrl: './record.component.html',
    styleUrls: ['./record.component.scss']
})
export class RecordComponent implements OnInit {
    isMobile:boolean = false; 

    isCreating: boolean = false;
    isEditting: boolean = false;
    isLoading: boolean = false;

    updated: string | undefined;
    created: string | undefined;
    record: Record | null = null;
    patientName: string | undefined;
    doctorName: string = '';

    aptId :number | undefined;

    @Input() recordId: number | undefined;
    @Input() appointmentId: number | undefined;

    @Output() cancel = new EventEmitter<boolean>();
    @Output() reload = new EventEmitter<boolean>();
    @ViewChild('recordContent', { static: false }) recordContent!: ElementRef;

    recId: number | undefined;
    id: number | undefined;
    noDelete: boolean = false;

    constructor(
        private dialog: MatDialog,
        private graphQLService: AppGraphQLService,
        private breakpointObserver: BreakpointObserver,

        @Optional() public dialogRef: MatDialogRef<RecordComponent>,
        @Optional() @Inject(MAT_DIALOG_DATA) public data: any
    ){
        if (this.data) {
            this.recId = this.data.recordId;
            this.aptId = this.data.appointmentId;
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
        this.breakpointObserver.observe(['(max-width: 1024px)']).subscribe(result => {
            //this.isTablet = this.breakpointObserver.isMatched('(min-width: 768px) and (max-width: 1023px)');
            this.isMobile =  this.breakpointObserver.isMatched('(max-width: 430px)');
            //this.isMobileSmall = this.breakpointObserver.isMatched('(max-width: 410px)');
            //if (this.isMobile) this.width = '35rem';
        });
    }

    downloadRecord(): void {
        if (this.record) {
            const element = this.recordContent.nativeElement;
            html2canvas(element).then((canvas) => {
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF('p', 'mm', 'a4');
                const imgWidth = 210; 
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                const date = DateTime.fromISO(this.record!.createdAt).toFormat('dd-MM-YYYY'); 
                const lastName = this.record?.patient.lastName
            
                pdf.addImage(imgData, 'PNG', 0, 10, imgWidth, imgHeight);
                pdf.save(`HealthCenterRecord_${date}_${lastName}.pdf`);
            });
        } else {
            this.dialog.open(AlertComponent, {data:{message: "Unexpected issue, please retry.."}})
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
                    id
                    firstName
                    lastName
                }
                doctor {
                    id
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
                    this.patientName = this.record.patient.firstName+' '+this.record.patient.lastName;
                    this.doctorName = this.record.doctor && this.record.doctor.firstName+' '+this.record.doctor.lastName || '-';
                }
                this.isLoading = false;
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
        this.isCreating = false;
        this.reload.emit(true);
        this.isLoading = false;
    }
    close(){
        this.dialogRef.close();
    }
    async onSave(input: RecordInput){
        if (!input.draft) {
            const ref =  this.dialog.open(ConfirmComponent, {disableClose:true, data: {message: "Are you sure you want to save this as final version? This action will open access to this medical record to the patient. The patient will be notified by email and notification."}})
            ref.componentInstance.isConfirming.subscribe(async ()=> {
                await this.saveRecord(input);
            });

            ref.componentInstance.isCancelling.subscribe(async ()=> {
                this.dialog.closeAll();
            })
        } else {
            await this.saveRecord(input);
        }
    }
    async saveRecord(input: RecordInput) {
        this.isLoading = true;
    
        const recordInput: RecordInput = {
            ...input,
            id: this.id,
            appointmentId: this.appointmentId!
        }

        const mutation = `mutation ($recordInput: RecordInput!){
            saveRecord(recordInput: $recordInput) {
                success
                message
            }
        }`
        try {
            const response = await this.graphQLService.mutate(mutation, { recordInput });
            if (response.data.saveRecord.success) { // TO DO: should return saved instead of loading!   
                await this.onReload();
            } else {
                this.isLoading = false;
                this.dialog.open(AlertComponent, {data: { message: response.data.saveRecord.message}})
            }  
        } catch (error) {
            this.dialog.open(AlertComponent, {data: { message: "Unexpected error saving medical record: "+error}})
        }
    }
}