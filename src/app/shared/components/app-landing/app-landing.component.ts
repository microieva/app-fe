import { Component, OnInit } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { ActivatedRoute, Router } from "@angular/router";
import { DateTime } from "luxon";
import { AppGraphQLService } from "../../services/app-graphql.service";
import { AppAppointmentService } from "../../services/app-appointment.service";
import { AppTimerService } from "../../services/app-timer.service";
import { AlertComponent } from "../app-alert/app-alert.component";
import { User } from "../../../graphql/user/user";
import { Appointment } from "../../../graphql/appointment/appointment";

@Component({
    selector: 'app-landing',
    templateUrl: './app-landing.component.html',
    styleUrls: ['app-landing.component.scss']
})
export class AppLandingComponent implements OnInit {
    isHomeRoute: boolean = true;
    userRole!: string;
    me!: User;
    isUserUpdated: boolean = false;
    nowAppointment: Appointment | null = null;

    countDoctorRequests: number = 0;
    countDoctors: number = 0;
    countPatients: number = 0;
    countMissedAppointments: number = 0;
    countUpcomingAppointments: number = 0;
    countPendingAppointments: number = 0;
    countRecords: number = 0;

    nextId: number | null = null;
    previousNextId: number | null = null;
    nextAppointmentStartTime: string | undefined;
    nextAppointmentName: string | undefined;

    constructor(
        private activatedRoute: ActivatedRoute,
        private dialog: MatDialog,
        private router: Router,
        private graphQLService: AppGraphQLService,
        private appointmentService: AppAppointmentService,
        private timerService: AppTimerService
    ){}

    async ngOnInit() {
        await this.loadMe();
        await this.loadData();

        this.router.events.subscribe(() => {
            this.isHomeRoute = this.router.url === '/home';
        });

        this.activatedRoute.queryParams.subscribe(async params => {
            if(params['updated']) {
                this.isUserUpdated = true;
            }
        });

        if (this.userRole === 'doctor') {
            this.appointmentService.pollNextAppointment();
            this.appointmentService.appointmentInfo.subscribe(async (subscription) => {

                if (subscription && subscription.nextAppointment) {
                    this.nextId = subscription.nextAppointment.nextId;
                    if (this.previousNextId !== this.nextId) {
                        this.previousNextId = this.nextId;
                    } 
                    this.nextAppointmentStartTime = DateTime.fromISO(subscription.nextAppointment.nextStart, {setZone: true}).toFormat('hh:mm a, MMM dd');
                    this.nextAppointmentName = subscription.nextAppointment.patient.firstName+' '+subscription.nextAppointment.patient.lastName;
                }
            });
        }
    }

    async loadData(){
        switch (this.userRole) {
            case 'admin':
                await this.loadAdminStatic();
                break;
            case 'doctor':
                await this.loadDoctorStatic();
                this.nowAppointment = await this.appointmentService.loadNowAppointment();
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
            }
        }`
        try {
            const response = await this.graphQLService.send(query);
            if (response.data) {
                this.me = response.data.me;
                this.userRole = response.data.me.userRole;
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
        }`
        try {
            const response = await this.graphQLService.send(query);
            if (response.data) {
                this.countPendingAppointments = response.data.countPendingAppointments;
                this.countUpcomingAppointments = response.data.countUpcomingAppointments;
                this.countPatients = response.data.countPatients;
                this.countMissedAppointments = response.data.countMissedAppointments;
                this.countRecords = response.data.countRecords;
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
                    this.nextAppointmentStartTime = DateTime.fromISO(response.data.nextAppointment.nextStart, {setZone: true}).toFormat('hh:mm a, MMM dd');
                    this.nextAppointmentName = response.data.nextAppointment.doctor.firstName+' '+response.data.nextAppointment.doctor.lastName;

                } else {
                    this.nextAppointmentName = undefined;
                    this.nextAppointmentStartTime = undefined;
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
}