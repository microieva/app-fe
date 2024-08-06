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
    }

    async ngOnInit() {
        if (this.eventInfo) {
            this.eventTitle = this.eventInfo.title;
            //await this.loadAppointment(this.eventInfo.id);
        }
       
    }

    onOk(ok: boolean){
        this.ok.emit(ok);
    }

    // cancelDirectLogin(){
    //     this.isLoggingIn = true;
    //     this.showDirectLoginForm = false;
    // }

    onEventSubmit(value: any){
        this.event.emit(value.input)
    }

    onEventDelete(id: number){
        this.eventId.emit(id);
    }

    onEventLink(id: number){
        this.linkId.emit(id);
    }


    onRecordCancel(){

    }
    onReload(){
        this.reload.emit(true)
    }
}

