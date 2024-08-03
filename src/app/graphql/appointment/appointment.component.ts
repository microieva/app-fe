import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { Appointment } from "./appointment";
import { AppGraphQLService } from "../../shared/services/app-graphql.service";
//import { AppDialogService } from "../../shared/services/app-dialog.service";
import { FormBuilder } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { Record } from "../record/record"; 
import { DateTime } from "luxon";
import { ConfirmComponent } from "../../shared/components/app-confirm/app-confirm.component";
import { AlertComponent } from "../../shared/components/app-alert/app-alert.component";
import { RecordComponent } from "../record/record.component";
import { MatDialog } from "@angular/material/dialog";

@Component({
    selector: 'app-appointment',
    templateUrl: './appointment.component.html',
    styleUrls: ['./appointment.component.scss']
})
export class AppointmentComponent implements OnInit {  
    appointment!: Appointment
    record: Record | null = null;
    formattedDate!: string;
    updated: string | null = null;
    recordId: number | null = null;
    appointmentId!:number;

    isCreating: boolean = false;
    
    @Input() id!: number;
    @Output() close = new EventEmitter<number>();

    constructor(
        private graphQLService: AppGraphQLService,
        private dialog: MatDialog,
        private activatedRoute: ActivatedRoute,
        private router: Router
    ){}

    async ngOnInit() {
        //if (this.id) {
            this.isCreating = false;
            await this.loadAppointment();
        //}
        //if (this.recordId) {
        //}
    }
    closeTab(){
        const dialogref = this.dialog.open(ConfirmComponent, {data: { message: "All unsaved data will be lost"}});
        dialogref.componentInstance.ok.subscribe(subscription => {
            if (subscription) {
                this.close.emit(this.id)
            }
        })
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
                record {
                    id
                }
                record {
                    id
                    title
                    text
                }
            }
        }`
        try {
            const response = await this.graphQLService.send(query, {appointmentId: this.id});
            if (response.data.appointment) {
                this.appointment = response.data.appointment;
                this.appointmentId = this.appointment.id;
                this.record = response.data.appointment.record;
                this.recordId = response.data.appointment.record?.id || null;
                this.formattedDate = DateTime.fromJSDate(new Date(response.data.appointment.patient.dob)).toFormat('MMM dd, yyyy') 
                console.log('apppointment !!: ', this.appointment)
            }
        } catch (error) {
            this.dialog.open(AlertComponent, {data: {message: "Unexpected error loading current appointment: "+error}})
        }
    }
    createRecord(id: number) {
        /*const dialogRef = this.dialog.open(RecordComponent, {data: {recordId: null, appointmentId: this.appointment.id}})
        dialogRef.componentInstance.reload.subscribe(subscription => {
            if (subscription) this.loadAppointment();
        })*/
        this.isCreating = true;
        this.appointmentId = id;
    }
    onRecordCancel(){
        this.isCreating = false;
    }
    async reload(value: boolean){
        this.isCreating = false;
        this.loadAppointment();
        //window.location.reload(); // works
        console.log('reloading call -- id: ', this.appointmentId)
    }
}
