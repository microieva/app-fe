import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { Appointment } from "./appointment";
import { AppGraphQLService } from "../../shared/services/app-graphql.service";
import { AppDialogService } from "../../shared/services/app-dialog.service";
import { FormBuilder } from "@angular/forms";
import { Router } from "@angular/router";
import { Record } from "../record/record"; 
import { DateTime } from "luxon";

@Component({
    selector: 'app-appointment',
    templateUrl: './appointment.component.html',
    styleUrls: ['./appointment.component.scss']
})
export class AppointmentComponent implements OnInit {
    @Input() id!: number;
    @Output() close = new EventEmitter<number>();
    appointment!: Appointment
    formattedDate!: string;
    created!: string;
    updated: string | null = null;;
    record: Record | null = null;
    isCreating: boolean = false;
    isEditting: boolean = false;
    
    constructor(
        private graphQLService: AppGraphQLService,
        private dialog: AppDialogService,
        private formBuilder: FormBuilder,
        private router: Router
    ){}

    async ngOnInit() {
        await this.loadAppointment();
        await this.loadRecord();
    }
    closeTab(){
        const dialogref = this.dialog.open({data: {isConfirming: true, message: "All unsaved data will be lost"}});
        dialogref.componentInstance.ok.subscribe(subscription => {
            if (subscription) {
                this.close.emit(this.id)
            }
        })
    }

    async loadRecord(){
        const query = `query ($appointmentId: Int!){ 
            record (appointmentId: $appointmentId) {
                title
                text
                createdAt
                updatedAt
                draft
            }
        }`
        try {
            const response = await this.graphQLService.send(query, {appointmentId: this.id});
            if (response.data.record) {
                this.record = response.data.record;
                this.created = DateTime.fromJSDate(new Date(response.data.record.createdAt)).toFormat('MMM dd, yyyy');
                this.updated = DateTime.fromJSDate(new Date(response.data.record.updatedAt)).toFormat('MMM dd, yyyy'); 
            }
        } catch (error) {
            this.dialog.open({data: {isAlert: true, message: "Unexpected error loading current appointment: "+error}})
        }
    }

    async loadAppointment(){
        const query = `query ($appointmentId: Int!){ 
            appointment (appointmentId: $appointmentId) {
                id
                patient {
                    id
                    firstName
                    lastName
                    dob
                    email
                    phone
                }
                doctor {
                    firstName
                    lastName
                }
                start
                end
                createdAt
            }
        }`
        try {
            const response = await this.graphQLService.send(query, {appointmentId: this.id});
            if (response.data.appointment) {
                this.appointment = response.data.appointment;
                this.formattedDate = DateTime.fromJSDate(new Date(response.data.appointment.patient.dob)).toFormat('MMM dd, yyyy') 
            }
        } catch (error) {
            this.dialog.open({data: {isAlert: true, message: "Unexpected error loading current appointment: "+error}})
        }
    }
    createRecord() {
        this.isCreating = true;
    }
    editRecord() {
        this.isEditting = true;
    }
    deleteRecord() {
        const dialogref = this.dialog.open({data: {isConfirming: true, message: "This will delete the record permanently"}});
        dialogref.componentInstance.ok.subscribe(async subscription => {
            if (subscription) {
                const mutation = `mutation ($appointmentId: Int!) {
                    deleteRecord(appointmentId: $appointmentId) {
                        success
                        message
                    }
                }`
                try {
                    const response = await this.graphQLService.mutate(mutation, {appointmentId: this.appointment.id});
                    if (response.data.deleteRecord.success) {
                        this.record = null;
                    }
                } catch (error) {
                    this.dialog.open({data: {isAlert: true, message: "Unexpected error deleting record: "+error}})
                }
            }
        })
    }
    openRecords(){

    }
    onCancel(){
        this.isCreating = false;
        this.isEditting = false;
    }
    async onReload(){
        this.isCreating = false;
        this.isEditting = false;
        await this.loadRecord();
    }
}
