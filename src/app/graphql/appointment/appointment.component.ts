import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from "@angular/core";
import { Subscription } from "rxjs";
import { Appointment } from "./appointment";
import { AppGraphQLService } from "../../shared/services/app-graphql.service";
import { MatDialog } from "@angular/material/dialog";
import { DateTime } from "luxon";
import { ConfirmComponent } from "../../shared/components/app-confirm/app-confirm.component";
import { AlertComponent } from "../../shared/components/app-alert/app-alert.component";
import { Record } from "../record/record"; 

@Component({
    selector: 'app-appointment',
    templateUrl: './appointment.component.html',
    styleUrls: ['./appointment.component.scss']
})
export class AppointmentComponent implements OnInit, OnDestroy {  
    appointment!: Appointment
    record: Record | null = null;
    formattedDate!: string;
    updated: string | null = null;
    recordId: number | null = null;
    appointmentId!:number;
    startTime!: string;
    date!: string;

    isCreating: boolean = false;
    
    @Input() id!: number;
    @Output() close = new EventEmitter<number>();
    subscription: Subscription | undefined;

    constructor(
        private graphQLService: AppGraphQLService,
        private dialog: MatDialog
    ){}

    async ngOnInit() {
        this.isCreating = false;
        await this.loadAppointment();
    }
    ngOnDestroy(): void {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
    }
    closeTab(){
        const dialogref = this.dialog.open(ConfirmComponent, {data: { message: "All unsaved data will be lost"}});
        this.subscription = dialogref.componentInstance.isConfirming.subscribe(() => {
            this.close.emit(this.id)
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
                this.formattedDate = DateTime.fromISO(response.data.appointment.patient.dob).toFormat('MMM dd, yyyy');
                this.startTime = DateTime.fromISO(response.data.appointment.start, {zone:"utc"}).setZone('utc').toFormat('HH:mm a');
                this.date = DateTime.fromISO(response.data.appointment.start).toFormat('MMM dd, yyyy');
            }
        } catch (error) {
            this.dialog.open(AlertComponent, {data: {message: "Unexpected error loading current appointment: "+error}});
        }
    }
    createRecord(id: number) {
        this.isCreating = true;
        this.appointmentId = id;
    }
    onRecordCancel(){
        this.isCreating = false;
    }
    async reload(value: boolean){
        this.isCreating = false;
        this.loadAppointment();
    }
}
