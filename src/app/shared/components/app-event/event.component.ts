import { Component, ElementRef, EventEmitter, Inject, Input, OnInit, Output, ViewChild } from "@angular/core";
import { FormBuilder, FormGroup } from "@angular/forms";
import { Router } from "@angular/router";
import { AppGraphQLService } from "../../services/app-graphql.service";
import { AlertComponent } from "../app-alert/app-alert.component";
import { ConfirmComponent } from "../app-confirm/app-confirm.component";
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from "@angular/material/dialog";
import { DateTime } from "luxon";

@Component({
    selector: 'app-event',
    templateUrl: './event.component.html',
    styleUrls: ['event.component.scss']
})
export class EventComponent implements OnInit{
    form!: FormGroup;
    showInput: boolean = false;
    userRole!: string;
    
    createdAt: string | undefined;
    patientName: string | undefined;
    patientDob:  string | undefined;       
    doctorName: string | null = null;
    eventDate:  string | undefined;
    eventStartTime:  string | undefined;
    eventEndTime:  string | undefined;
    
    @Output() submit = new EventEmitter<{input: string}>();
    @Output() delete = new EventEmitter<number>();
    @Output() message = new EventEmitter<string>();
    @Output() deleteMessage = new EventEmitter<number>();

    @ViewChild('el') el: ElementRef | undefined;

    appointmentInfo: any;
    doctorMessage: string | undefined;
    patientMessage: string | undefined;
    
    constructor(
        private formBuilder: FormBuilder,
        private router: Router,
        private dialog: MatDialog,
        private graphQLService: AppGraphQLService,

        public dialogRef: MatDialogRef<EventComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any
    ){
        this.appointmentInfo = this.data.eventInfo;
    }

    async ngOnInit() {

        this.form = this.formBuilder.group({
            input: this.formBuilder.control<string>(' ')
        })
        await this.loadUserRole();
    }
    async loadUserRole() {
        const query = `query { me { userRole }}`
        try {
            const response = await this.graphQLService.send(query);
            if (response.data.me.userRole) {
                this.userRole =response.data.me.userRole;
                this.loadAppointment();
            }
        } catch (error) {
            this.dialog.closeAll();
            this.dialog.open(AlertComponent, {data: {message: "No user, must login "+error}})
        }
    }
    async onSaveMessage(message: string){
        const mutation = `mutation (
            $appointmentMessage: String!, 
            $appointmentId: Int!
        ) {
            saveAppointmentMessage (
                appointmentMessage: $appointmentMessage, 
                appointmentId: $appointmentId
            ) {
                success
                message
            }
        }`

        try {
            const response = await this.graphQLService.mutate(
                mutation, 
                { appointmentId: this.appointmentInfo.id, appointmentMessage: message }
            );
            if (response.data.saveAppointmentMessage.success) {
                await this.loadAppointment();
            }
        } catch (error) {
            this.dialog.open(AlertComponent, { data: {message: "Error saving appointment message: "+ error}})
        }
        this.showInput = false;

    }
    async onDeleteMessage(){
        const dialogRef = this.dialog.open(ConfirmComponent);
        dialogRef.componentInstance.ok.subscribe(async value => {
            if (value) {
                const mutation = `mutation ($appointmentId: Int!) {
                    deleteAppointmentMessage (appointmentId: $appointmentId) {
                        success
                        message
                    }
                }`
        
                try {
                    const response = await this.graphQLService.mutate(
                        mutation, { appointmentId: this.appointmentInfo.id }
                    );
                    if (response.data.deleteAppointmentMessage.success) {
                        await this.loadAppointment();
                    }
                } catch (error) {
                    this.dialog.open(AlertComponent, { data: {message: "Error saving appointment message: "+ error}})
                }
            }
        })
    }
    async loadAppointment() {
        const query = `query ($appointmentId: Int!){ 
            appointment (appointmentId: $appointmentId){ 
                patientMessage
                doctorMessage
                patient {
                    firstName
                    lastName
                    dob
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
            const response = await this.graphQLService.send(query, {appointmentId: this.appointmentInfo.id});
            if (response.data.appointment) {
                const appointment = response.data.appointment;
                this.createdAt = DateTime.fromJSDate(new Date(appointment.createdAt)).toFormat('MMM dd, yyyy');
                this.patientName = appointment.patient?.firstName+" "+appointment.patient?.lastName;
                this.patientDob = appointment.patient?.dob && DateTime.fromJSDate(new Date(appointment.patient.dob)).toFormat('MMM dd, yyyy'); 
                this.doctorName = appointment.doctor ? appointment.doctor?.firstName+" "+appointment.doctor?.lastName : null;
                this.eventDate = DateTime.fromJSDate(new Date(appointment.start)).toFormat('MMM dd, yyyy');
                this.eventStartTime =  DateTime.fromJSDate(new Date(appointment.start)).toFormat('hh:mm');
                this.eventEndTime =DateTime.fromJSDate(new Date(appointment.end)).toFormat('hh:mm');
                this.doctorMessage = response.data.appointment.doctorMessage;
                this.patientMessage = response.data.appointment.patientMessage;
            }
        } catch (error) {
            this.dialog.open(AlertComponent, {data: {message: "Unexpected error fetching appointment: "+error}});
            this.router.navigate(['/appointments']);
        }
    }

    onSubmit(){
        this.submit.emit(this.form.value);
    }
    onDelete(){
        this.delete.emit(this.appointmentInfo.id);
    }

    onLinkClick(id: number) {
        this.dialog.closeAll();

        switch (this.appointmentInfo.title) {
            case 'Pending':
                this.router.navigate(['/appointments'], { queryParams: { tab: 0, id } }); 
                break;
            case 'Upcoming':
                this.router.navigate(['/appointments'], { queryParams: { tab: 1, id } }); 
                break;
            case 'Past':
                this.router.navigate(['/appointments'], { queryParams: { tab: 2, id } });
                break;
            default:
                break; 
        }
    }
    onAddClick(){
        this.scrollToView();
    }
    scrollToView() {
        if (this.el) {
            //TO DO: fix scroll to view for textarea
            this.el.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
    }
}