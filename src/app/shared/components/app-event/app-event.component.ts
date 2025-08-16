import { DateTime } from "luxon";
import { Subscription } from "rxjs";
import { Component, ElementRef, EventEmitter, Inject, OnDestroy, OnInit, Output, ViewChild } from "@angular/core";
import { FormBuilder, FormControl, FormGroup, Validators } from "@angular/forms";
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from "@angular/router";
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from "@angular/material/dialog";
import { overTimeValidator, timeRangeValidator, weekendValidator } from "../../validators";
import { AppGraphQLService } from "../../services/app-graphql.service";
import { AppUiSyncService } from "../../services/app-ui-sync.service";
import { AppTabsService } from "../../services/app-tabs.service";
import { AlertComponent } from "../app-alert/app-alert.component";
import { LoadingComponent } from "../app-loading/loading.component";
import { ConfirmComponent } from "../app-confirm/app-confirm.component";
import { AppointmentComponent } from "../../../graphql/appointment/appointment.component";
import { AppointmentInput } from "../../../graphql/appointment/appointment.input";
import { Appointment } from "../../../graphql/appointment/appointment";
import { APPOINTMENT_UPDATED } from "../../constants";


@Component({
    selector: 'app-event',
    templateUrl: './app-event.component.html',
    styleUrls: ['app-event.component.scss']
})
export class EventComponent implements OnInit, OnDestroy{
    form = new FormGroup({
        input: new FormControl<string | null>(null)
    });
    appointmentTimeForm = new FormGroup({
        date: new FormControl(),
        startHour: new FormControl(),
        startMin: new FormControl(),
        endHour: new FormControl(),
        endMin: new FormControl()
    });
    showInput: boolean = false;
    id!: number;
    userRole!: string;
    isOpened: boolean = false;
    isConfirmed: boolean = false;
    isEditting: boolean | undefined;
    isClickable: boolean = false;
    isLoadingDetails: boolean = false;
    isLoadingMessage: boolean = false;
    isDisabled: boolean = true;
    isPast: boolean = false;
    samePatient: boolean = false;
    
    createdAt: string | undefined;
    patientName: string | undefined;
    patientDob:  string | undefined;     
    doctorName: string | null = null;
    eventDate:  string | undefined;
    eventStartTime:  string | undefined;
    eventEndTime:  string | undefined;

    startHour: string | undefined;
    startMin: string | undefined;
    endHour: string | undefined;
    endMin: string | undefined;
    
    @Output() isSubmitting = new EventEmitter<string>();
    @Output() isDeleting = new EventEmitter<number>();
    @Output() update = new EventEmitter<boolean>();
    @Output() message = new EventEmitter<string>();
    @Output() deleteMessage = new EventEmitter<number>();
    @Output() isMessageSaved = new EventEmitter<boolean>(false);
    @Output() isMessageDeleted = new EventEmitter<boolean>(false);
    @Output() isAccepting = new EventEmitter<number>();
    @Output() isUnaccepting = new EventEmitter<number>();
    @Output() isOpeningTab = new EventEmitter<number>();

    @ViewChild('el') el: ElementRef | undefined;
    @ViewChild('textarea') textarea: ElementRef | undefined;

    appointmentInput: AppointmentInput | undefined;
    justCreatedId: number | null = null;
    doctorMessage: string | undefined;
    patientMessage: string | undefined;
    patientId: number | undefined;
    doctorId: number | undefined;
    appointmentId: number | undefined;
    patientPhoneNr: any | undefined;
    patientEmail: any | undefined;
    subscriptions: Subscription = new Subscription();
    isLoading: boolean = true;

    hours: string[] = Array.from({ length: 11 }, (_, i) => (8 + i).toString().padStart(2, '0')); 
    minutes: string[] = ['00', '30'];

    justCreatedAppointment: Appointment | null = null;
    title: string | null = null;
    
    constructor(
        private formBuilder: FormBuilder,
        private router: Router,
        private location: Location,
        private dialog: MatDialog,
        private graphQLService: AppGraphQLService,
        private activatedRoute: ActivatedRoute,
        private tabsService:AppTabsService,
        private uiSyncService: AppUiSyncService,

        public dialogRef: MatDialogRef<EventComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any
    ){
        this.appointmentInput = this.data.eventInfo;
        this.patientId= this.data.eventInfo.patientId;
        this.appointmentId = this.data.eventInfo.id;
        this.samePatient = this.data.samePatient;
    }

    async ngOnInit() {
        await this.loadMe();

        const sub = this.activatedRoute.queryParams.subscribe(params => {
            this.patientId = +params['id']; 
        });
        this.subscriptions.add(sub);

        if (this.appointmentInput) {
            if (this.appointmentId) {
                await this.loadAppointment(this.appointmentId);
            } else {
                this.title = "New Appointment"
                this.eventDate = this.appointmentInput.start;
                this.eventStartTime = this.appointmentInput.start;
                this.eventEndTime = this.appointmentInput.end;
            
            }

            this.isLoading = false;
            if (this.justCreatedAppointment) {
                this.justCreatedId = this.justCreatedAppointment.id;
                this.eventDate = this.justCreatedAppointment.start;
                this.eventStartTime = this.justCreatedAppointment.start;
                this.eventEndTime = this.justCreatedAppointment.end;
            }
        }

        this.form = this.formBuilder.group({
            input: this.formBuilder.control<string>(' ')
        });
        this.isClickable = this.userRole === 'admin' && this.title ==='Missed request' && !this.isEditting;
    }


    async saveAppointment() {
        const mutation = `
            mutation ($appointmentInput: AppointmentInput!) {
                saveAppointment (appointmentInput: $appointmentInput) {
                    success
                    message
                    data {
                        ... on Appointment {
                            id
                            start
                            end
                            patientId
                            createdAt
                            allDay  
                        }
                    } 
                        
                }
            }
        `  
        try {
            const response = await this.graphQLService.mutate(mutation, {appointmentInput: this.appointmentInput});     

            if (response.data.saveAppointment.success) {
                this.justCreatedAppointment = response.data.saveAppointment.data;

            } else {
                this.dialog.closeAll();
                this.dialog.open(AlertComponent, {data: {message:response.data.saveAppointment.message}});
            }
        } catch (error) {
            this.dialog.open(AlertComponent, {data: {message: "Error saving appointment: "+error}});
        }
    }

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }
    async loadMe() {
        const query = `query { me { id userRole }}`
        try {
            const response = await this.graphQLService.send(query, true);
            if (response.data.me.userRole) {
                this.userRole =response.data.me.userRole;
                this.id = response.data.me.id;
            }
        } catch (error) {
            this.dialog.open(AlertComponent, {data: {message: "No user, must login "+error}})
        }
    }

    async loadAppointment(id: number) {
        const query = `query ($appointmentId: Int!){ 
            appointment (appointmentId: $appointmentId){ 
                id
                patientMessage
                doctorMessage
                patient {
                    id
                    firstName
                    lastName
                    dob
                    phone
                    email
                }
                doctorId
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
            const response = await this.graphQLService.send(query, {appointmentId: id});
            if (response.data.appointment) {
                const appointment = response.data.appointment;

                this.createdAt =  DateTime.fromISO(appointment.createdAt, {setZone: true}).toFormat('MMM dd, yyyy');
                this.patientName = appointment.patient?.firstName+" "+appointment.patient?.lastName;
                this.patientDob = appointment.patient?.dob && DateTime.fromISO(appointment.patient.dob).toFormat('MMM dd, yyyy'); 
                this.doctorName = appointment.doctor ? appointment.doctor.firstName+" "+appointment.doctor.lastName : null;
                this.eventDate = appointment.start;
                this.eventStartTime =  appointment.start;
                this.eventEndTime = appointment.end;
                this.doctorMessage = appointment.doctorMessage;
                this.patientMessage = appointment.patientMessage;
                this.appointmentId = appointment.id;
                this.doctorId = appointment.doctorId;
                
                if (this.userRole === 'admin') {
                    this.patientPhoneNr = appointment.patient.phone;
                    this.patientEmail = appointment.patient.email;
                    this.startHour = DateTime.fromISO(appointment.start, {zone: 'utc'}).setZone('utc').toFormat('HH');
                    this.startMin = DateTime.fromISO(appointment.start, {zone: 'utc'}).setZone('utc').toFormat('mm');
                    this.endHour = DateTime.fromISO(appointment.end, {zone: 'utc'}).setZone('utc').toFormat('HH');
                    this.endMin = DateTime.fromISO(appointment.end, {zone: 'utc'}).setZone('utc').toFormat('mm');
                }

                const now = DateTime.now().toISO();
                this.isPast = appointment.end < now;

                if (!appointment.doctor) {
                    if (appointment.end < now) this.title = "Missed request";
                    else this.title = "Pending confirmation";
                } else {
                    if (appointment.start > now) this.title = "Upcoming appointment"
                    else if (appointment.start < now && appointment.end > now) this.title = "Ongoing appointment"
                    else this.title = "Past appointment"
                }

            }
        } catch (error) {
            this.location.back();
            this.dialog.open(AlertComponent, {data: {message: "Unexpected error fetching appointment: "+error}});
        }
    }

    async onConfirmAppointment(){
        const ref = this.dialog.open(LoadingComponent);
        if (!this.appointmentId && this.appointmentInput) {
            this.appointmentInput = {
                patientMessage: this.patientMessage,
                ...this.appointmentInput
            }
        }
        await this.saveAppointment();
        this.isSubmitting.emit();
        ref.close();
    }
    onDeleteAppointment(){
        if (this.appointmentId) {
            this.isDeleting.emit(this.appointmentId);
        }
        if (!this.justCreatedId && !this.appointmentId) {
            const ref = this.dialog.open(ConfirmComponent, {data:{message: "Cancel booking this appointment?"}});
            ref.componentInstance.isConfirming.subscribe(async ()=> {
                this.dialog.closeAll();
            })
        }
    }
    
    get characterCount(): number {
        const characters = this.textarea?.nativeElement.value || '';
        return characters.replace(/\n/g, '').length; 
    }
    async onSaveMessage(message: string){
        this.showInput = false;

        if (!this.appointmentId) {
            if (this.userRole === 'doctor') {
                this.doctorMessage = message
            } else {
                this.patientMessage = message;
            }
            this.isMessageSaved.emit(true);
        } else  {
            await this.saveAppointmentMessage(message);
            this.isLoadingMessage = false;
        }
    }
    async saveAppointmentMessage(message:string) {
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
        this.isLoadingMessage = true;
        const id = this.justCreatedId || this.appointmentId;
        try {
            const response = await this.graphQLService.mutate(
                mutation, 
                { appointmentId: id, appointmentMessage: message }
            );
            if (response.data.saveAppointmentMessage.success) {
                if (this.userRole === 'doctor') {
                    this.doctorMessage = message;
                } else {
                    this.patientMessage = message;
                }
                this.uiSyncService.triggerSync(APPOINTMENT_UPDATED);
                this.isMessageSaved.emit(true);
            } else {
                this.dialog.open(AlertComponent, {data: {message:response.data.saveAppointmentMessage.message}})
            }
        } catch (error) {
            this.dialog.open(AlertComponent, { data: {message: "Error saving appointment message: "+ error}})
        }
    }
    adjustHeight(event:any){
        const el = event.target as HTMLTextAreaElement;
        el.style.height='auto';
        el.style.height =`${el.scrollHeight}px`;
    }
    async onDeleteMessage(){
        if (this.userRole ==='admin'){this.patientMessage = undefined; return;}
        const dialogRef = this.dialog.open(ConfirmComponent, {data: {message: "Remove message"}});
        const sub = dialogRef.componentInstance.isConfirming.subscribe(async () => {
            const mutation = `mutation ($appointmentId: Int!) {
                deleteAppointmentMessage (appointmentId: $appointmentId) {
                    success
                    message
                }
            }`
            const id = this.appointmentInput?.id || this.appointmentId
            try {
                const ref = this.dialog.open(LoadingComponent);
                const response = await this.graphQLService.mutate(
                    mutation, { appointmentId:  id}
                );
                ref.close();
                if (response.data.deleteAppointmentMessage.success) {
                    await this.loadAppointment(id!);
                    this.isMessageDeleted.emit(true);
                    this.uiSyncService.triggerSync(APPOINTMENT_UPDATED);
                }
            } catch (error) {
                this.dialog.open(AlertComponent, { data: {message: "Error removing appointment message: "+ error}})
            }
        });
        this.subscriptions.add(sub);
    }
    onCancelAppointment() {
        this.isUnaccepting.emit(this.appointmentId);
        this.uiSyncService.triggerSync(APPOINTMENT_UPDATED);
    }
    async onAcceptAppointment(){
        await this.acceptAppointment();
        this.uiSyncService.triggerSync(APPOINTMENT_UPDATED);
    }
    onOpenAppointmentTab(appointmentId: number){
        const tabs = this.tabsService.getTabs();
        const isCreated = tabs.find((tab: any) => tab.id === appointmentId);

        if (!isCreated) {
            this.isOpeningTab.emit(appointmentId);
            if (this.router.url.includes('calendar')) {
                this.tabsService.addTab('Appointment Workspace', AppointmentComponent, appointmentId);
                this.router.navigate(['/home/appointments'], {
                    relativeTo: this.activatedRoute,
                    queryParams: { tab: 3},
                    queryParamsHandling: 'merge' 
                });
                this.dialog.closeAll();
            }
            this.isOpened = true;
        } else {
            const ref = this.dialog.open(AlertComponent, {data: {message: "Workspace open"}});
            const sub = ref.componentInstance.ok.subscribe(() => {
                this.dialog.closeAll();
            });
            this.subscriptions.add(sub);
        }
    }
    onUpdate(){
        this.isEditting = true;

        if (this.eventDate && this.startHour && this.startMin && this.endHour&& this.endMin) {
            this.appointmentTimeForm = this.formBuilder.group({
                date: this.formBuilder.control<Date>(new Date(this.eventDate), [Validators.required]), 
                startHour: this.formBuilder.control<string>(this.startHour,  [Validators.required]),
                startMin: this.formBuilder.control<string>(this.startMin,  [Validators.required]),
                endHour: this.formBuilder.control<string>(this.endHour,  [Validators.required]),
                endMin: this.formBuilder.control<string>(this.endMin,  [Validators.required]),
            },
            { validators: [timeRangeValidator, overTimeValidator, weekendValidator] });

            const sub = this.appointmentTimeForm.statusChanges.subscribe(() => {
                this.checkFormState();   
            });
            this.subscriptions.add(sub);
        }     
    }
    checkFormState(): void {
        this.isDisabled = !(
            this.appointmentTimeForm.untouched &&
            !this.appointmentTimeForm.errors
        );
    }
    async onNewTimeSubmit(){
        if (this.appointmentTimeForm.valid) {
            const { date, startHour, startMin, endHour, endMin } = this.appointmentTimeForm.value;

            const year = date.getFullYear();
            const month = date.getMonth()+1; 
            const day = date.getDate();

            const startDateTime = DateTime.fromObject(
                { year, month, day, hour: parseInt(startHour, 10)+2, minute: parseInt(startMin, 10) }
              );
              
              const endDateTime = DateTime.fromObject(
                { year, month, day, hour: parseInt(endHour, 10)+2, minute: parseInt(endMin, 10) }
              );

            if (date && startDateTime && endDateTime) {
                const appointmentInput = {
                    id: this.appointmentInput?.id,
                    start: startDateTime.toISO() as string,
                    end: endDateTime.toISO() as string,
                    allDay: false
                }
                this.isEditting = false;
                this.isLoadingDetails = true;
                await this.updateAppointment(appointmentInput);
                // TO DO
                //this.headerService.notifyMissingAptUpdate();
                //this.uiSyncService.triggerSync(MISSED_APT_COUNT_UPDATE);
                this.uiSyncService.notifyMissingAptUpdate();
            } else {
                this.isEditting = false;
            }
        } else {
            this.isEditting = false;
        }
    } 
    async updateAppointment(appointmentInput: AppointmentInput){
        const mutation = `
        mutation ($appointmentInput: AppointmentInput!) {
            saveAppointment (appointmentInput: $appointmentInput) {
                success
                message
            }
        }`

        try {
            const response = await this.graphQLService.mutate(mutation, {appointmentInput});
            if (response.data.saveAppointment.success) {
                await this.loadAppointment(this.appointmentId!);
            } else {
                this.dialog.open(AlertComponent, {data: {message: response.data.saveAppointment.message}});
                await this.loadAppointment(this.appointmentId!);
            }
            this.isLoadingDetails = false;
            //this.socketService.requestCountMissedAppointments();
            this.update.emit(true);
        } catch (error) {
            this.dialog.open(AlertComponent, {data: {message: "Error saving appointment: "+error}});
        }
    }
     async acceptAppointment(){
        const ref = this.dialog.open(LoadingComponent);

        const mutation = `
        mutation ($appointmentId: Int!) {
            acceptAppointment (appointmentId: $appointmentId) {
                success
                message
            }
        }`

        try {
            const response = await this.graphQLService.mutate(mutation, {appointmentId: this.appointmentId});
            if (response.data.acceptAppointment.success) {
                this.dialog.closeAll();
            } else {
                ref.close();
                this.dialog.open(AlertComponent, {data: {message: response.data.saveAppointment.message}});    
            }

        } catch (error) {
            ref.close();
            this.dialog.open(AlertComponent, {data: {message: "Error saving appointment: "+error}});
        }
    }
}