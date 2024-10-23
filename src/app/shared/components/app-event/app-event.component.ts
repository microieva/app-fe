import { DateTime } from "luxon";
import { Component, ElementRef, EventEmitter, Inject, OnInit, Output, ViewChild } from "@angular/core";
import { FormBuilder, FormGroup } from "@angular/forms";
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from "@angular/router";
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from "@angular/material/dialog";
import { AppGraphQLService } from "../../services/app-graphql.service";
import { AlertComponent } from "../app-alert/app-alert.component";
import { ConfirmComponent } from "../app-confirm/app-confirm.component";

@Component({
    selector: 'app-event',
    templateUrl: './app-event.component.html',
    styleUrls: ['app-event.component.scss']
})
export class EventComponent implements OnInit{
    form!: FormGroup;
    showInput: boolean = false;
    id!: number;
    userRole!: string;
    isOpened: boolean = false;
    isConfirmed: boolean = false;
    samePatient: boolean = false;
    
    createdAt: string | undefined;
    patientName: string | undefined;
    patientDob:  string | undefined;     
    doctorName: string | null = null;
    eventDate:  string | undefined;
    eventStartTime:  string | undefined;
    eventEndTime:  string | undefined;
    
    @Output() submit = new EventEmitter<{input: string, showSnackbar: boolean}>();
    @Output() delete = new EventEmitter<number>();
    @Output() message = new EventEmitter<string>();
    @Output() deleteMessage = new EventEmitter<number>();
    @Output() acceptAppointment = new EventEmitter<number>();
    @Output() isOpeningTab = new EventEmitter<number>();

    @ViewChild('el') el: ElementRef | undefined;

    appointmentInfo: any;
    justCreatedId: number | undefined;
    doctorMessage: string | null = null;
    patientMessage: string | null = null;
    patientId: number | undefined;
    appointmentId: number | undefined;
    
    constructor(
        private formBuilder: FormBuilder,
        private router: Router,
        private location: Location,
        private dialog: MatDialog,
        private graphQLService: AppGraphQLService,
        private activatedRoute: ActivatedRoute,

        public dialogRef: MatDialogRef<EventComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any
    ){
        this.appointmentInfo = this.data.eventInfo;
        this.patientId= this.data.eventInfo.patientId;
        this.samePatient = this.data.samePatient;
    }

    async ngOnInit() {
  
        this.activatedRoute.queryParams.subscribe(params => {
            this.patientId = +params['id']; 
        });
        await this.loadMe();

        if (this.userRole === 'admin' && this.patientId && !this.appointmentInfo.id) {
            this.loadJustCreatedAppointment(this.patientId);
        } else {
            this.loadJustCreatedAppointment(this.id);
        }

        this.form = this.formBuilder.group({
            input: this.formBuilder.control<string>(' ')
        });
    }
    async loadJustCreatedAppointment(patientId: number){
        const query = `query ($patientId: Int!) {
            justCreatedAppointment(patientId: $patientId) {
                id
                start
                end
                createdAt
            }
        }`
        try {
            const response = await this.graphQLService.send(query, {patientId});
            if (response.data.justCreatedAppointment) {
                this.justCreatedId = response.data.justCreatedAppointment.id;
                this.eventDate = DateTime.fromISO(response.data.justCreatedAppointment.start, {setZone: true}).toFormat('MMM dd, yyyy');
                this.eventStartTime = DateTime.fromISO(response.data.justCreatedAppointment.start,  {setZone: true}).toFormat('HH:mm a');
                this.eventEndTime = DateTime.fromISO(response.data.justCreatedAppointment.end,  {setZone: true}).toFormat('HH:mm a');
            }
        } catch (error) {
            this.dialog.open(AlertComponent, {data: {message: "Appointment failed "+error}})
        }
    }
    async loadMe() {
        const query = `query { me { id userRole }}`
        try {
            const response = await this.graphQLService.send(query);
            if (response.data.me.userRole) {
                this.userRole =response.data.me.userRole;
                this.id = response.data.me.id;

                if (this.appointmentInfo.id) {
                    this.loadAppointment();
                } else {
                    this.eventStartTime = this.appointmentInfo.start;
                    this.eventEndTime = this.appointmentInfo.end;
                    this.eventDate = this.appointmentInfo.date
                }
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
            const id = this.appointmentInfo.id || this.justCreatedId;
            const response = await this.graphQLService.mutate(
                mutation, 
                { appointmentId: id, appointmentMessage: message }
            );
            if (response.data.saveAppointmentMessage.success) {
                await this.loadAppointment();
                await this.ngOnInit();
            }
        } catch (error) {
            this.dialog.open(AlertComponent, { data: {message: "Error saving appointment message: "+ error}})
        }
        this.showInput = false;

    }
    async onDeleteMessage(){
        const dialogRef = this.dialog.open(ConfirmComponent, {data: {message: "Remove message"}});
        dialogRef.componentInstance.ok.subscribe(async value => {
            if (value) {
                const mutation = `mutation ($appointmentId: Int!) {
                    deleteAppointmentMessage (appointmentId: $appointmentId) {
                        success
                        message
                    }
                }`
                const id = this.appointmentInfo.id || this.appointmentId
                try {
                    const response = await this.graphQLService.mutate(
                        mutation, { appointmentId:  id}
                    );
                    if (response.data.deleteAppointmentMessage.success) {
                        await this.loadAppointment();
                    }
                } catch (error) {
                    this.dialog.open(AlertComponent, { data: {message: "Error removing appointment message: "+ error}})
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
                    id
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
            const id = this.appointmentInfo.id || this.justCreatedId
            const response = await this.graphQLService.send(query, {appointmentId: id});
            if (response.data.appointment) {
                const appointment = response.data.appointment;
                this.createdAt =  DateTime.fromISO(appointment.createdAt, {setZone: true}).toFormat('MMM dd, yyyy');
                this.patientName = appointment.patient?.firstName+" "+appointment.patient?.lastName;
                this.patientDob = appointment.patient?.dob && DateTime.fromISO(appointment.patient.dob, {setZone: true}).toFormat('MMM dd, yyyy'); 
                this.doctorName = appointment.doctor ? appointment.doctor?.firstName+" "+appointment.doctor?.lastName : null;
                this.eventDate = DateTime.fromISO(appointment.start, {setZone: true}).toFormat('MMM dd, yyyy');
                this.eventStartTime =  DateTime.fromISO(appointment.start, {setZone: true}).toFormat('HH:mm a');
                this.eventEndTime = DateTime.fromISO(appointment.end, {setZone: true}).toFormat('HH:mm a');
                this.doctorMessage = response.data.appointment.doctorMessage;
                this.patientMessage = response.data.appointment.patientMessage;
                this.appointmentId = response.data.appointment.id;
            }
        } catch (error) {
            this.location.back();
            this.dialog.open(AlertComponent, {data: {message: "Unexpected error fetching appointment: "+error}});
        }
    }

    onSubmit(){
        const value = {
            input: this.form.value,
            showSnackbar: true
        } // TO DO delete boolean from emit value
        this.submit.emit(value);
    }
    async onDelete(){
        if (this.appointmentInfo.id) {
            this.delete.emit(this.appointmentInfo.id);
        }
        if (this.justCreatedId) {
            this.delete.emit(this.justCreatedId);
        }
    }

    onLinkClick(id: number) {
        this.dialog.closeAll();

        switch (this.appointmentInfo.title) {
            case 'Pending':
                this.router.navigate(['/home/appointments'], { queryParams: { tab: 0, id } }); 
                break;
            case 'Upcoming':
                this.router.navigate(['/home/appointments'], { queryParams: { tab: 1, id } }); 
                break;
            case 'Past':
                this.router.navigate(['/home/appointments'], { queryParams: { tab: 2, id } });
                break;
            default:
                break; 
        }
    }
    async onAddClick(){
        if (this.patientId) {
            await this.loadJustCreatedAppointment(this.patientId);
        }
    }
    onOpenAppointmentTab(appointmentId: number){
        const tabs = JSON.parse(localStorage.getItem('tabs') || '[]');
        const isCreated = tabs.find((tab: any) => tab.id === appointmentId);

        if (!isCreated) {
            this.isOpeningTab.emit(appointmentId);
            this.isOpened = true;
        } else {
            const ref = this.dialog.open(AlertComponent, {data: {message: "Workspace open"}});
            ref.componentInstance.ok.subscribe(subscription => {
                if (subscription) this.dialog.closeAll();
            })
        }
    }
    onAcceptAppointment(id: number){
        this.acceptAppointment.emit(id);
    }

}