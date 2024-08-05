import { Component, EventEmitter, Inject, OnInit, Output } from "@angular/core";
import { FormBuilder, FormControl, FormGroup, Validators } from "@angular/forms";
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from "@angular/material/dialog";
import { AppAuthService } from "../../services/app-auth.service";
import { AppDialogData, DirectLoginInput } from "../../types";
import { AppGraphQLService } from "../../services/app-graphql.service";
//import { AppDialogService } from "../../services/app-dialog.service";
import { Appointment } from "../../../graphql/appointment/appointment";
import { DateTime } from "luxon";
import { Router } from "@angular/router";
import { Record } from "../../../graphql/record/record";
import { AlertComponent } from "../app-alert/app-alert.component";

@Component({
    selector: 'app-dialog',
    templateUrl: './app-dialog.component.html',
    styleUrls: ['./app-dialog.component.scss']
})
class AppDialogComponent implements OnInit {
    isLoading: boolean;
    isAlert: boolean;
    message: string | undefined;
    isConfirming: boolean;
    showDirectLoginForm: boolean;
    isLoggingIn: boolean;
    input: boolean;
    eventInfo: any;
    recordInfo: any;
    error: string | undefined;
    form: LoginForm;

    appointment: Appointment | undefined;

    createdAt: string | undefined;
    eventTitle: string | undefined;
    patientName: string | undefined;
    patientDob:  string | undefined;
    doctorName: string | null = null;
    eventDate:  string | undefined;
    eventStartTime:  string | undefined;
    eventEndTime:  string | undefined;
    appointmentId: number | undefined;
    doctorMessage: string | null = null;
    patientMessage: string | null = null;
    recordId: number | undefined;
    //appointmentId: number | undefined;
    openRecord: boolean = false;

    @Output() ok = new EventEmitter<boolean>(false);
    @Output() loginSuccess = new EventEmitter<boolean>(false);
    @Output() event = new EventEmitter<string>();
    @Output() eventId = new EventEmitter<number>();
    @Output() linkId = new EventEmitter<number>();
    @Output() reload = new EventEmitter<boolean>();

    constructor(
        @Inject(MAT_DIALOG_DATA) data: AppDialogData,
        private dialogRef: MatDialogRef<AppDialogComponent>,
        private formBuilder: FormBuilder,
        private authService: AppAuthService,
        private graphQLService: AppGraphQLService,
        private dialog: MatDialog,
        private router: Router
    ) {
        this.isLoading = data.isLoading;
        this.isAlert = data.isAlert;
        this.message = data.message;
        this.isConfirming = data.isConfirming;
        this.isLoggingIn = data.isLoggingIn;
        this.showDirectLoginForm = data.showDirectLoginForm;
        this.input = data.input;
        this.eventInfo = data.eventInfo;
        this.recordId = data.recordId;
        this.appointmentId = data.appointmentId;
        this.openRecord = data.openRecord;
        this.form = this.buildLoginForm();
    }

    async ngOnInit() {
        if (this.showDirectLoginForm) {
            this.buildLoginForm()
        }
        if (this.eventInfo) {
            this.eventTitle = this.eventInfo.title;
            await this.loadAppointment(this.eventInfo.id);
        }
        if (this.appointment) {
            this.createdAt = DateTime.fromJSDate(new Date(this.appointment.createdAt)).toFormat('MMM dd, yyyy');
            this.patientName = this.appointment.patient?.firstName+" "+this.appointment.patient?.lastName;
            this.patientDob = this.appointment.patient?.dob && DateTime.fromJSDate(new Date(this.appointment.patient.dob)).toFormat('MMM dd, yyyy') 
            this.doctorName = this.appointment.doctor ? this.appointment.doctor?.firstName+" "+this.appointment.doctor?.lastName : null;
            this.eventDate = DateTime.fromJSDate(new Date(this.appointment.start)).toFormat('MMM dd, yyyy');
            this.eventStartTime =  DateTime.fromJSDate(new Date(this.appointment.start)).toFormat('hh:mm');
            this.eventEndTime =DateTime.fromJSDate(new Date(this.appointment.end)).toFormat('hh:mm');
            this.appointmentId = this.appointment.id;
            this.doctorMessage = this.appointment.doctorMessage !=='0' ? this.appointment.doctorMessage : null;
            this.patientMessage = this.appointment.patientMessage !== '0' ? this.appointment.patientMessage : null;
        }
    }

    buildLoginForm(){
        return this.form = this.formBuilder.group({
            email: this.formBuilder.control<string>('', [Validators.required]),
            password: this.formBuilder.control<string>('', [Validators.required, Validators.email])
        }) as LoginForm
    }

    onOk(ok: boolean){
        this.ok.emit(ok);
    }

    cancelDirectLogin(){
        this.isLoggingIn = true;
        this.showDirectLoginForm = false;
    }

    onEventSubmit(value: any){
        this.event.emit(value.input)
    }

    onEventDelete(id: number){
        this.eventId.emit(id);
    }

    onEventLink(id: number){
        this.linkId.emit(id);
    }

    async submit() {
        const input = this.form.value;

        const token = await this.authService.logIn(input as DirectLoginInput);
        if (token) {
            this.dialogRef.close();
            window.location.reload(); 
        } else {
            this.error = "Invalid email or password"
        }
    }
    async loadAppointment(id: number){
        const query = `query ($appointmentId: Int!){ 
            appointment (appointmentId: $appointmentId){ 
                id
                start
                end
                patientMessage
                patient {
                    firstName
                    lastName
                    dob
                    id
                }
                doctorMessage
                doctor {
                    firstName
                    lastName
                    id
                }
                createdAt
                updatedAt 
                allDay
            }
        }`
        try {
            const response = await this.graphQLService.send(query, {appointmentId: id});
            if (response.data.appointment) {
                this.appointment = response.data.appointment;
            }
        } catch (error) {
            this.dialog.open(AlertComponent, {data: {message: "Unexpected error fetching appointment: "+error}});
            this.router.navigate(['/appointments']);
        }
    }

    onRecordCancel(){

    }
    onReload(){
        this.reload.emit(true)
    }
}

type LoginForm = FormGroup<({
    email: FormControl<string>
    password: FormControl<string>
})>
