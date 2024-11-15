import { Component, OnInit } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { ActivatedRoute, Router } from "@angular/router";
import { animate, state, style, transition, trigger } from "@angular/animations";
import { DateTime } from "luxon";
import { AppGraphQLService } from "../../services/app-graphql.service";
import { AppAppointmentService } from "../../services/app-appointment.service";
import { AppTimerService } from "../../services/app-timer.service";
import { getTodayWeekdayTime, getNextAppointmentWeekdayStart, getLastLogOutStr } from "../../utils";
import { AlertComponent } from "../app-alert/app-alert.component";
import { AppTableComponent } from "../app-table/app-table.component";
import { Appointment } from "../../../graphql/appointment/appointment";
import { User } from "../../../graphql/user/user";
import { AppCountUnreadMessagesService } from "../../services/app-count-unread.service";

@Component({
    selector: 'app-home',
    templateUrl: './app-home.component.html',
    styleUrls: ['app-home.component.scss'],
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
export class AppHomeComponent implements OnInit {
    isHomeRoute: boolean = true;
    isLoading: boolean = true;
    userRole!: string;
    me!: User;
    lastLogOut!: string;
    isUserUpdated: boolean = false;
    nowAppointment: Appointment | null = null;

    countDoctorRequests: number = 0;
    countDoctors: number = 0;
    countPatients: number = 0;
    countMissedAppointments: number = 0;
    countUpcomingAppointments: number = 0;
    countPendingAppointments: number = 0;
    countRecords: number = 0;
    countTodayAppointments: number = 0;
    countTotalHoursToday: string | undefined;

    nextId: number | null = null;
    previousNextId: number | null = null;
    nextAppointmentStartTime: string | undefined;
    nextAppointmentName: string | undefined;
    nextAppointmentPatientDob: string | undefined;
    previousAppointmentDate: string | undefined;
    nextStart: { dayName: string, time: string, date: string} | undefined;
    today: { weekday: string, time: string, date: string} | undefined;
    clock: string | undefined;
    recordIds: number[] = [];

    constructor(
        private activatedRoute: ActivatedRoute,
        private dialog: MatDialog,
        private router: Router,
        private graphQLService: AppGraphQLService,
        private appointmentService: AppAppointmentService,
        private timerService: AppTimerService,
        private countService: AppCountUnreadMessagesService
    ){}

    async ngOnInit() {
        await this.loadMe();
        await this.loadData();
        
        this.router.events.subscribe(async () => {
            this.isHomeRoute = this.router.url === '/home';
            if (this.isHomeRoute) {  
                await this.loadData();
            }
        });

        this.activatedRoute.queryParams.subscribe(async params => {
            if(params['updated']) {
                this.isUserUpdated = true;
                this.isLoading = false;
            }
        });

        if (this.userRole !== 'patient') {
            this.countService.countUnreadMessages();
        }

        if (this.userRole === 'admin') {
            this.today = getTodayWeekdayTime();
            const now = DateTime.now().setZone('Europe/Helsinki').toISO();
            this.timerService.startClock(now!);
            this.timerService.clock.subscribe(value=> {
                this.clock = value;
            });
        }

        if (this.userRole === 'doctor') {
            this.appointmentService.pollNextAppointment();
            this.appointmentService.appointmentInfo.subscribe(async (subscription) => {

                if (subscription && subscription.nextAppointment) {
                    this.nextId = subscription.nextAppointment.nextId;
                    if (this.previousNextId !== this.nextId) {
                        this.previousNextId = this.nextId;
                    } 
                    const nextStart = subscription.nextAppointment.nextStart;
                    this.nextAppointmentStartTime = ''
                    this.nextStart = getNextAppointmentWeekdayStart(nextStart);
                    this.nextAppointmentName = subscription.nextAppointment.patient.firstName+' '+subscription.nextAppointment.patient.lastName;
                    this.nextAppointmentPatientDob = DateTime.fromISO(subscription.nextAppointment.patient.dob).toFormat('MMM dd, yyyy');
                    const str = DateTime.fromISO(subscription.nextAppointment.previousAppointmentDate).toFormat('MMM dd, yyyy'); 
                    this.previousAppointmentDate = str !== 'Invalid DateTime' ? str : '-';
                    this.recordIds = subscription.nextAppointment.recordIds;
                   
                } 
            });       
        }
        this.isLoading = false;
    }

    async loadData(){
        switch (this.userRole) {
            case 'admin':
                await this.loadAdminStatic();
                break;
            case 'doctor':
                await this.loadDoctorStatic();
                this.nowAppointment = await this.appointmentService.loadNowAppointment();
                this.appointmentService.pollNextAppointment();
                break;
            case 'patient':
                await this.loadPatientStatic();
                break;
        }
        this.dialog.closeAll();
    }

    async loadMe() {
        const query = `query { 
            me { 
                userRole 
                streetAddress
                lastLogOutAt
            }
        }`
        try {
            const response = await this.graphQLService.send(query);
            if (response.data) {
                this.me = response.data.me;
                this.userRole = response.data.me.userRole;
                const str = getLastLogOutStr(this.me.lastLogOutAt);
                this.lastLogOut = str !== 'Invalid DateTime' ? str : '-'
                this.isUserUpdated = response.data.me.streetAddress ? true : false;
            }
        } catch (error) {
            this.dialog.open(AlertComponent, {data: {message: "No user, "+error}})
        }
    }

    async loadAdminStatic(){
        const query = `query { 
            countDoctorRequests 
            countDoctors
            countPatients
            countMissedAppointments
        }`
        try {
            const response = await this.graphQLService.send(query);

            if (response.data) {
                this.countDoctorRequests = response.data.countDoctorRequests;
                this.countDoctors = response.data.countDoctors;
                this.countPatients = response.data.countPatients;
                this.countMissedAppointments = response.data.countMissedAppointments;
            }
        } catch (error) {
            this.dialog.open(AlertComponent, {data: {message: error}});
        }
    }

    async loadDoctorStatic(){
        const query = `query { 
            countPendingAppointments
            countUpcomingAppointments
            countPatients
            countMissedAppointments
            countRecords
            countTodayAppointments
            countTotalHoursToday
        }`
        try {
            const response = await this.graphQLService.send(query);
            if (response.data) {
                this.countPendingAppointments = response.data.countPendingAppointments;
                this.countUpcomingAppointments = response.data.countUpcomingAppointments;
                this.countPatients = response.data.countPatients;
                this.countMissedAppointments = response.data.countMissedAppointments;
                this.countRecords = response.data.countRecords;
                this.countTotalHoursToday = response.data.countTotalHoursToday;
                this.countTodayAppointments = response.data.countTodayAppointments;
            }
        } catch (error) {
            this.dialog.open(AlertComponent, {data: {message: error}});
        }
    }

    async loadPatientStatic(){
        const query = `query { 
            countPendingAppointments
            countUpcomingAppointments
            countRecords
            countMissedAppointments
            nextAppointment {
                nextId
                nextStart
                nextEnd
                previousAppointmentDate
                recordIds
                doctor {
                    firstName
                    lastName
                }
            }
        }`
        try {
            const response = await this.graphQLService.send(query);

            if (response.data) {
                this.countPendingAppointments = response.data.countPendingAppointments;
                this.countUpcomingAppointments = response.data.countUpcomingAppointments;
                this.countRecords = response.data.countRecords;
                this.countMissedAppointments = response.data.countMissedAppointments;

                if (response.data.nextAppointment) {
                    const previous = response.data.nextAppointment.previousAppointmentDate;
                    this.previousAppointmentDate = previous ? DateTime.fromISO(previous).toFormat('MMM dd, yyyy') : '-';
                    const nextStart = response.data.nextAppointment.nextStart;
                    this.nextStart = nextStart && getNextAppointmentWeekdayStart(nextStart);
                    this.nextId = response.data.nextAppointment.nextId;
                    this.recordIds = response.data.nextAppointment.recordIds;
                    this.nextAppointmentStartTime = DateTime.fromISO(response.data.nextAppointment.nextStart, {setZone: true}).toFormat('HH:mm a, MMM dd');
                    this.nextAppointmentName = response.data.nextAppointment.doctor.firstName+' '+response.data.nextAppointment.doctor.lastName;
                    this.isLoading = false;
                } 
            }
        } catch (error) {
            this.dialog.open(AlertComponent, {data: {message: error}});
        }
    }

    onAppointmentsClick(){
        if (this.nowAppointment && this.userRole === 'doctor') {
            this.router.navigate(['appointments'], {
                relativeTo: this.activatedRoute,
                queryParams: { tab: 3},
                queryParamsHandling: 'merge' 
            });
        }
        this.nowAppointment = null;
    }
    onOpenRecords(){
        this.dialog.open(AppTableComponent, {data: {recordIds: this.recordIds, userRole: this.userRole}});
    }
}