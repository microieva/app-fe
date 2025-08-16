import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from "@angular/core";
import { merge, Subscription, tap } from "rxjs";
import { animate, state, style, transition, trigger } from "@angular/animations";
import { ActivatedRoute, Router } from "@angular/router";
import { DateTime } from "luxon";
import { MatDialog } from "@angular/material/dialog";
import { AppGraphQLService } from "../../services/app-graphql.service";
import { AppUserRoomService } from "../../services/socket/app-user-room.service";
import { AppUiSyncService } from "../../services/app-ui-sync.service";
import { AppTimerService } from "../../services/app-timer.service";
import { AppAppointmentService } from "../../services/app-appointment.service";
import { AppStepperComponent as CreateNewUser } from "../app-stepper-create-user/app-stepper.component";
import { UserComponent } from "../../../graphql/user/user.component";
import { AlertComponent } from "../app-alert/app-alert.component";
import { RecordComponent } from "../../../graphql/record/record.component";
import { AppTabsService } from "../../services/app-tabs.service";
import { AppTableComponent } from "../app-table/app-table.component";
import { AppointmentComponent } from "../../../graphql/appointment/appointment.component";
import { Appointment } from "../../../graphql/appointment/appointment";
import { Record } from "../../../graphql/record/record";
import { User } from "../../../graphql/user/user";
import { getNextAppointmentWeekdayStart, getPatientAge, getTodayWeekdayTime } from "../../utils";
import { 
    APPOINTMENT_ACCEPTED, 
    APPOINTMENT_CANCELLED, 
    APPOINTMENT_CREATED, 
    APPOINTMENT_DELETED, 
    APPOINTMENT_UPDATED, 
    DOCTOR_ACCOUNT_CREATED, 
    DOCTOR_REQUEST_CREATED, 
    FEEDBACK_CREATED, 
    MESSAGE_CREATED, 
    RECORD_CREATED, 
    USER_STATUS, 
    USER_UPDATED
} from "../../constants";
import { EventComponent } from "../app-event/app-event.component";
import { NextAppointmentData } from "../../types";

@Component({
    selector: 'app-dashboard',
    templateUrl: 'app-dashboard.component.html',
    styleUrls: ['app-dashboard.component.scss'],
    animations: [
        trigger('slideInOut', [
            state('in', style({ transform: 'translateY(0)', opacity: 1 })),
            transition(':enter', [
                style({ transform: 'translateY(80%)', opacity: 0.1 }),
                animate('600ms cubic-bezier(0.25, 0.8, 0.25, 1)', style({ transform: 'translateY(0)', opacity: 1 }))
            ])
        ])
    ]
})
export class AppDashboardComponent implements OnInit, OnDestroy{
    @Input() me!: User;

    countUnreadFeedback:number=0;
    countDoctorRequests:number=0;
    countMissedAppointments:number=0;
    countPendingAppointments:number=0;
    countUnreadMessages:number=0;
    countUpcomingAppointments:number=0;

    msgAnimationDuration:number | null = null;
    draftAnimationDuration:number | null = null;
    recordsAnimationDuration:number | null = null;
    doctorsAnimationDuration:number | null = null;
    div1animationDuration:number | null = null;
    div2animationDuration:number | null = null;

    nextAppointment: NextAppointmentData | null = null;
    nextId: number | null = null;
    previousNextId: number | null = null;
    nextAppointmentStartTime:string | null = null;
    nextStart: { dayName: string; time: string; date: string; } | null = null;
    nextAppointmentPatientName: string | null = null;
    nextAppointmentDoctorName: string | null = null;
    nextAppointmentPatientAge: string | null = null;
    nextAppointmentPatientMsg:string | null = null;
    nextAppointmentDoctorMsg:string | null = null;
    previousAppointmentDate: string | null = null;
    recordIds: number[] | null = null;

    isSocketConnected:boolean = false;
    isLoading: boolean = true;
    showCreateAppointment: boolean = false;

    appointments: any[] = [];
    appointmentsLength:number = 0;
    doctors: User[] = [];
    doctorsLength: number = 0;
    patients: Appointment[] = [];
    patientsLength: number = 0;

    drafts: Record[] = [];
    draftsLength: number = 0;

    records: Record[] = [];
    recordsLength: number = 0;

    today: { weekday: string, time: string, date: string} | undefined;
    clock: string | undefined;

    subscriptions: Subscription[] = [];
    @Output() isNextAppointment = new EventEmitter<boolean>(false);

    constructor(
        private graphQLService: AppGraphQLService,
        private dialog: MatDialog,
        private roomService: AppUserRoomService,
        private uiSyncService: AppUiSyncService,
        private timerService: AppTimerService,
        private appointmentService: AppAppointmentService,
        private tabsService: AppTabsService,
        private router: Router,
        private activatedRoute: ActivatedRoute
    ){
    }

    async ngOnInit() {
        if (this.me) {
            this.today = getTodayWeekdayTime();
            const now = DateTime.now().toISO();
            
            switch (this.me.userRole) {
                case 'admin':
                    await this.initAdminDashboard();
                    this.setupAdminSubscriptions();
                    this.timerService.startClock(now!);
                    break;
                case 'doctor':
                    await this.initDoctorDashboard();
                    this.setupDoctorSubscriptions();
                    if (this.nextAppointment) {
                        this.displayNextAppointment();
                    } else {
                        this.timerService.startClock(now!);
                    }
                    break;
                case 'patient':
                    this.initPatientDashboard();
                    this.setupPatientSubscriptions();
                    if (this.nextAppointment) {
                        this.displayNextAppointment();
                    } else {
                        this.timerService.startClock(now);
                    }
                    break;
            }
        }
    }

    displayNextAppointment(){
        if (!this.nextAppointment) return;

        this.nextId = this.nextAppointment.nextId;
        if (this.previousNextId !== this.nextId) {
            this.previousNextId = this.nextId;
        } 
        const nextStart = this.nextAppointment.nextStart;
        this.timerService.startAppointmentTimer(nextStart);
        this.nextAppointmentStartTime = ''
        this.nextStart = getNextAppointmentWeekdayStart(nextStart);
        this.nextAppointmentPatientName = this.nextAppointment.patient.firstName+' '+this.nextAppointment.patient.lastName;
        this.nextAppointmentDoctorName = this.nextAppointment.doctor.firstName+' '+this.nextAppointment.doctor.lastName;
        this.nextAppointmentPatientAge = getPatientAge(this.nextAppointment.patient.dob);
        const str = DateTime.fromISO(this.nextAppointment.previousAppointmentDate).toFormat('MMM dd, yyyy'); 
        this.previousAppointmentDate = str !== 'Invalid DateTime' ? str : '-';
        this.recordIds = this.nextAppointment.recordIds;
        this.nextAppointmentPatientMsg = this.nextAppointment.patientMessage;
        this.nextAppointmentDoctorMsg = this.nextAppointment.doctorMessage;
        this.isNextAppointment.emit(true);
    }
    async initPatientDashboard(){
        const query = `query (
                    $pageIndex: Int!, 
                    $pageLimit: Int!, 
                    $sortDirection: String, 
                    $sortDirectionAppointments: String,
                    $sortActiveRecords: String,  
                    $sortActiveAppointments: String, 
                    $filterInput: String
                ){ 
                    countPendingAppointments
                    countMissedAppointments
                    countUpcomingAppointments
                    nextAppointment {
                        nextId
                        nextStart
                        nextEnd
                        previousAppointmentDate
                        recordIds
                        patient {
                            firstName
                            lastName
                            dob
                        }
                        doctor {
                            firstName
                            lastName
                            dob
                        }
                        patientMessage
                        doctorMessage
                    }
                    records (
                        pageIndex: $pageIndex, 
                        pageLimit: $pageLimit,
                        sortDirection: $sortDirection,
                        sortActive: $sortActiveRecords,
                        filterInput: $filterInput
                    ){
                        length
                        slice {
                            ...RecordFields
                        }
                    }
                    upcomingAppointments (
                        pageIndex: $pageIndex,
                        pageLimit: $pageLimit,
                        sortDirection: $sortDirectionAppointments,
                        sortActive: $sortActiveAppointments,
                        filterInput: $filterInput
                    ) {
                        ...AppointmentFields
                    }
                    
                    pastAppointments (
                        pageIndex: $pageIndex,
                        pageLimit: $pageLimit,
                        sortDirection: $sortDirectionAppointments,
                        sortActive: $sortActiveAppointments,
                        filterInput: $filterInput
                    ) {
                        ...AppointmentFields
                    }
                }
                fragment RecordFields on Record {
                    id
                    title
                    createdAt
                    updatedAt
                    appointmentId

                    doctor {
                        id
                        firstName
                        lastName
                    }
                }

                fragment AppointmentFields on Paged {
                    length
                    slice {
                        ... on Appointment {
                            id
                            start
                            end
                            doctor {
                                id
                                firstName
                                lastName
                            }
                        }
                    }    
                }`
                const variables = {
                    pageIndex: 0,
                    pageLimit: 5, 
                    sortActiveRecords: 'createdAt',
                    sortActiveAppointments: 'start',
                    sortDirection: 'DESC',
                    sortDirectionAppointments: 'ASC',
                    filterInput: null
                }
                try {
                    const response = await this.graphQLService.send(query, variables);
                    if (response.data) {
                        this.records = response.data.records.slice;
                        this.recordsLength = response.data.records.length;
                        const upcomingAppointments: Appointment[] = response.data.upcomingAppointments.slice;
                        const pastAppointments:Appointment[] = response.data.pastAppointments.slice;
                        const data = [
                            ...upcomingAppointments,
                            ...pastAppointments
                        ];
                        this.appointmentsLength = response.data.upcomingAppointments.length + response.data.pastAppointments.length;
                        const now = DateTime.now().toISO();

                        this.appointments = data
                            .map((appointment:Appointment) => {
                                const isPast:boolean = appointment.start < now && appointment.end < now;
                                const isNext = appointment.id === response.data.nextAppointment?.nextId;
                                return {
                                    ...appointment,
                                    isPast,
                                    isNext
                                }
                            })

                        this.countPendingAppointments = response.data.countPendingAppointments;
                        this.countMissedAppointments = response.data.countMissedAppointments;
                        this.countUpcomingAppointments = response.data.countUpcomingAppointments;
                        this.nextAppointment = response.data.nextAppointment;

                        if (!this.nextAppointment && this.appointmentsLength === 0) {
                            this.showCreateAppointment = true;
                            this.div1animationDuration = null; 
                        }
                        
                    }
                } catch (error) {
                    this.dialog.open(AlertComponent, {data: {message: "Unexpected error loading patient dashboard data: "+error}})
                }
    }
    async initDoctorDashboard(){
        const query = `query (
                    $pageIndex: Int!, 
                    $pageLimit: Int!, 
                    $sortDirection: String, 
                    $sortDirectionAppointments: String,
                    $sortActiveDrafts: String,  
                    $sortActiveAppointments: String, 
                    $filterInput: String
                ){ 
                    countPendingAppointments
                    countUnreadMessages
                    countMissedAppointments
                    countUpcomingAppointments
                    nextAppointment {
                        nextId
                        nextStart
                        nextEnd
                        previousAppointmentDate
                        recordIds
                        patient {
                            firstName
                            lastName
                            dob
                        }
                        patientMessage
                        doctorMessage
                    }
                    drafts (
                        pageIndex: $pageIndex, 
                        pageLimit: $pageLimit,
                        sortDirection: $sortDirection,
                        sortActive: $sortActiveDrafts,
                        filterInput: $filterInput
                    ){
                        length
                        slice {
                            ...RecordFields
                        }
                    }
                    upcomingAppointments (
                        pageIndex: $pageIndex,
                        pageLimit: $pageLimit,
                        sortDirection: $sortDirectionAppointments,
                        sortActive: $sortActiveAppointments,
                        filterInput: $filterInput
                    ) {
                        ...AppointmentFields
                    }
                    
                    pastAppointments (
                        pageIndex: $pageIndex,
                        pageLimit: $pageLimit,
                        sortDirection: $sortDirectionAppointments,
                        sortActive: $sortActiveAppointments,
                        filterInput: $filterInput
                    ) {
                        ...AppointmentFields
                    }
                }
                fragment RecordFields on Record {
                    id
                    title
                    patient {
                        id
                        firstName
                        lastName
                    }
                    createdAt
                }

                fragment AppointmentFields on Paged {
                    length
                    slice {
                        ... on Appointment {
                            id
                            start
                            end
                            patient {
                                id
                                firstName
                                lastName
                            }
                        }
                    }    
                }`
                const variables = {
                    pageIndex: 0,
                    pageLimit: 5,
                    sortActiveDrafts: 'createdAt',  
                    sortActiveAppointments: 'start',
                    sortDirection: 'DESC',
                    sortDirectionAppointments: 'ASC',
                    filterInput: null
                }
                try {
                    const response = await this.graphQLService.send(query, variables);
                    if (response.data) {
                        this.drafts = response.data.drafts.slice;
                        this.draftsLength = response.data.drafts.length;
                        const upcomingAppointments = response.data.upcomingAppointments.slice;
                        const pastAppointments = response.data.pastAppointments.slice;
                        
                        const data = [
                            ...upcomingAppointments,
                            ...pastAppointments
                        ];

                        const uniquePatientsMap = new Map<number, any>();
                        const now = DateTime.now().toISO();

                        data.forEach((appointment:Appointment) => {
                            const patientId:number = appointment.patientId; 
                            if (!uniquePatientsMap.has(patientId)) {
                                const isPast:boolean = appointment.start < now && appointment.end < now;
                                const isNext = appointment.id === response.data.nextAppointment?.nextId;
                                uniquePatientsMap.set(patientId, {
                                    ...appointment,
                                    isPast,
                                    isNext
                                });
                            }
                            });

                        this.patients = Array.from(uniquePatientsMap.values())
                            .slice(0, 5);
                        this.patientsLength = this.patients.length;
                        this.countPendingAppointments = response.data.countPendingAppointments;
                        this.countUnreadMessages = response.data.countUnreadMessages;
                        this.countMissedAppointments = response.data.countMissedAppointments;
                        this.countUpcomingAppointments = response.data.countUpcomingAppointments;
                        this.nextAppointment = response.data.nextAppointment as NextAppointmentData;
                        
                    }
                } catch (error) {
                    this.dialog.open(AlertComponent, {data: {message: "Unexpected error loading doctor dashboard data: "+error}})
                }
    }

    async initAdminDashboard() {
        const query = `query (
                    $pageIndex: Int!, 
                    $pageLimit: Int!, 
                    $sortDirection: String, 
                    $sortActive: String,
                    $filterInput: String
                ){ 
                    doctors (
                        pageIndex: $pageIndex, 
                        pageLimit: $pageLimit,
                        sortDirection: $sortDirection,
                        sortActive: $sortActive,
                        filterInput: $filterInput
                    ){
                        length
                        slice {
                            ... on User {
                                id
                                email
                                firstName
                                lastName
                                createdAt
                            }
                        }
                    }
                    countMissedAppointments
                    countUnreadFeedback
                    countDoctorRequests
                    countUnreadMessages
                }`
                const variables = {
                    pageIndex: 0,
                    pageLimit: 5,
                    sortActive: 'createdAt',
                    sortDirection: 'DESC',
                    filterInput: null
                }
                try {
                    const response = await this.graphQLService.send(query, variables);
                    if (response.data) {
                        // this.doctors = (response.data.doctors.slice).map((doctor: User) => {
                        //     return {
                        //         ...doctor,
                        //         createdAt: DateTime.fromISO(doctor.createdAt, {zone: 'Europe/Helsinki'}).toLocaleString(DateTime.DATETIME_MED)
                        //     }
                        // });
                        this.doctors = response.data.doctors.slice;
                        this.doctorsLength = response.data.doctors.length;
                        this.countDoctorRequests = response.data.countDoctorRequests;
                        this.countMissedAppointments = response.data.countMissedAppointments;
                        this.countUnreadFeedback = response.data.countUnreadFeedback;
                        this.countUnreadMessages = response.data.countUnreadMessages;
                    }
                } catch (error) {
                    this.dialog.open(AlertComponent, {data: {message: "Unexpected error loading admin dashboard data: "+error}})
                }
    }
    setupPatientSubscriptions(){
        const dashboardEvents$ = merge(
            this.uiSyncService.sync(APPOINTMENT_CREATED).pipe(tap(()=>this.div2animationDuration = 2000)),
            this.uiSyncService.sync(APPOINTMENT_UPDATED),
            this.uiSyncService.sync(APPOINTMENT_ACCEPTED).pipe(tap(()=>this.div1animationDuration = 2000)),
            this.uiSyncService.sync(APPOINTMENT_CANCELLED),
            this.uiSyncService.sync(APPOINTMENT_DELETED),
            this.uiSyncService.sync(USER_STATUS),
            this.uiSyncService.sync(USER_UPDATED),
            this.uiSyncService.sync(RECORD_CREATED).pipe(tap(()=>this.recordsAnimationDuration = 2000))
        );

        this.appointmentService.pollNextAppointment();
        const subscriptions = [
            this.appointmentService.appointmentInfo$.subscribe(async (info:any) => {
                if (info && info.nextAppointment) {
                    this.clock = undefined;
                    this.nextAppointment = info.nextAppointment;
                    this.displayNextAppointment();
                } 
            }),

            dashboardEvents$
                .subscribe({
                    next: async () => {await this.initPatientDashboard();},
                    error: (err) => console.error('Sync failed:', err)
                })
        ]
        if (!this.nextAppointment) {
            subscriptions.push(
                this.timerService.clock.subscribe(value=> {
                    this.clock = value;
                })
            )
        }
        this.subscriptions.push(...subscriptions);
        this.isLoading = false;
    }

    setupAdminSubscriptions() {
        this.roomService.requestUserStatus(this.me.id);
        const dashboardEvents$ = merge(
            this.uiSyncService.sync(MESSAGE_CREATED).pipe(tap(()=>this.msgAnimationDuration = 2000)),
            this.uiSyncService.sync(FEEDBACK_CREATED).pipe(tap(()=>this.div1animationDuration = 2000)),
            this.uiSyncService.sync(DOCTOR_REQUEST_CREATED).pipe(tap(()=>this.div2animationDuration = 2000)),
            this.uiSyncService.sync(USER_STATUS),
            this.uiSyncService.sync(USER_UPDATED),
            this.uiSyncService.sync(DOCTOR_ACCOUNT_CREATED)
        );

        const subscriptions = [
            this.timerService.clock.subscribe(value=> {
                this.clock = value;
            }),
            this.roomService.onUserStatus().subscribe({
                next: (status) => {
                    this.isSocketConnected = status.online; 
                },
                error: (err) => console.error('Status sync error:', err)
            }),
            dashboardEvents$
                .subscribe({
                    next: async () => {await this.initAdminDashboard();},
                    error: (err) => console.error('Sync failed:', err)
                })
        ]
        this.subscriptions.push(...subscriptions);
        this.isLoading = false;
    }
    setupDoctorSubscriptions(){
        this.roomService.requestUserStatus(this.me.id);
        const dashboardEvents$ = merge(
            this.uiSyncService.sync(MESSAGE_CREATED).pipe(tap(()=>this.msgAnimationDuration = 2000)),
            this.uiSyncService.sync(APPOINTMENT_CREATED).pipe(tap(()=>this.div2animationDuration = 2000)),
            this.uiSyncService.sync(APPOINTMENT_UPDATED),
            this.uiSyncService.sync(APPOINTMENT_ACCEPTED).pipe(tap(()=>this.div1animationDuration = 2000)),
            this.uiSyncService.sync(APPOINTMENT_CANCELLED),
            this.uiSyncService.sync(APPOINTMENT_DELETED),
            this.uiSyncService.sync(USER_STATUS),
            this.uiSyncService.sync(USER_UPDATED), // TO DO
            this.uiSyncService.sync(RECORD_CREATED).pipe(tap(()=>this.draftAnimationDuration = 2000)),
        );

        this.appointmentService.pollNextAppointment();

        const subscriptions = [
            this.appointmentService.appointmentInfo$.subscribe(async (info:any) => {
                if (info && info.nextAppointment) {
                    this.nextAppointment = info.nextAppointment;
                    this.displayNextAppointment();
                } 
            }),
            this.roomService.onUserStatus().subscribe({
                next: (status) => {
                    this.isSocketConnected = status.online;     
                },
                error: (err) => console.error('Status sync error:', err)
                }
            ),
            dashboardEvents$
                .subscribe({
                    next: async () => {await this.initDoctorDashboard();},
                    error: (err) => console.error('Sync failed:', err)
                })
        ]
        if (!this.nextAppointment) {
            subscriptions.push(
                this.timerService.clock.subscribe(value=> {
                    this.clock = value;
                })
            )
        }
        this.subscriptions.push(...subscriptions);
        this.isLoading = false;
    }

    onUserOpen(userId:number){
        const dialogRef = this.dialog.open(UserComponent, {data: {userId}});
        
        this.subscriptions.push(dialogRef.componentInstance.isDeletingUser.subscribe(async subscription => {
            if (subscription) {
                await this.deleteUser(userId);
            }
        }));
    }
    onDraftOpen(recordId:number){
        const dialogRef = this.dialog.open(RecordComponent, {width:"45rem", data: {recordId}});
        dialogRef.componentInstance.reload.subscribe(async subscription => {
            if (subscription) await this.initDoctorDashboard();
        });
    }
    async deleteUser(id: number){
        const mutation = `mutation ($userId: Int!) {
            deleteUser(userId: $userId) {
                success
                message
            }
        }`
        try {
            const response = await this.graphQLService.mutate(mutation, { userId: id});
            if (response.data.deleteUser.success) {
                this.dialog.closeAll();
                await this.initAdminDashboard();
                this.dialog.open(AlertComponent, {data: {message: "Account deleted"}});
            } else {
                this.dialog.open(AlertComponent, {data: {message:response.data.deleteUser.message}});
            }
        } catch (error) {
            this.dialog.open(AlertComponent, { data: {message: "Error deleting user: "+ error}});
        }
    }
    onCreateNewUser() {
        this.dialog.open(CreateNewUser);
    }
    onOpenRecords(){
        this.dialog.open(AppTableComponent, {data: {recordIds: this.recordIds, userRole: this.me.userRole}});
    }
    onOpenNextAppointment() {
        if (this.me.userRole === 'doctor') {

            const tabs = this.tabsService.getTabs();
            const isCreated = tabs.some((tab: any) => tab.id === this.nextId);
            if (!isCreated) {
                this.tabsService.addTab('Appointment Workspace', AppointmentComponent, this.nextId!);
            } 
            this.router.navigate(['/home/appointments'], {
                relativeTo: this.activatedRoute,
                queryParams: { tab: 3, id: this.nextId },
                queryParamsHandling: 'merge' 
            });    
        } else if (this.me.userRole === 'patient') {
             this.router.navigate(['/home/appointments'], {
                relativeTo: this.activatedRoute,
                queryParams: { tab: 1, id: this.nextId },
                queryParamsHandling: 'merge' 
            }); 
        }
    }
    onAppointemntOpen(id:number){
        const eventInfo = {id}
        this.dialog.open(EventComponent, {data: { eventInfo }})
    }
    ngOnDestroy(): void {
        this.subscriptions.forEach(sub => sub.unsubscribe());
    }
}