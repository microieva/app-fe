import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { MatDialog } from "@angular/material/dialog";
import { Subscription } from "rxjs";
import { DateTime } from "luxon";
import { AppAuthService } from "../../services/app-auth.service";
import { AppGraphQLService } from "../../services/app-graphql.service";
import { AppTimerService } from "../../services/app-timer.service";
import { AppAppointmentService } from "../../services/app-appointment.service";
import { AppTabsService } from "../../services/app-tabs.service";
import { AlertComponent } from "../app-alert/app-alert.component";
import { LoginComponent } from "../app-login/app-login.componnet";
import { AppointmentComponent } from "../../../graphql/appointment/appointment.component";
import { Appointment } from "../../../graphql/appointment/appointment";

@Component({
    selector: 'app-home',
    templateUrl: './app-home.component.html',
    styleUrls: ['app-home.component.scss']
})
export class AppHomeComponent implements OnInit{
    me: any;
    updatedAt: string | null = null;
    isAuth: boolean = false;
    isRecords: boolean = false;
    isRequests: boolean =false;
    isUserUpdated: boolean = false;
    remainder!: Subscription;
    time!: string | null;
    userRole: string | null = null;
    nextAppointmentId: number | null = null;
    nowAppointment: Appointment | null = null;

    constructor (
        private dialog: MatDialog,
        private authService: AppAuthService,
        private graphQLService: AppGraphQLService,
        private timerService: AppTimerService,
        private appointmentService: AppAppointmentService,
        private router: Router,
        private tabsService: AppTabsService,
        private activatedRoute: ActivatedRoute
    ) {}

    async ngOnInit() {
        if (localStorage.getItem('authToken')) {
            await this.loadMe();
            const tokenExpire = localStorage.getItem('tokenExpire');
            if (tokenExpire && this.me) {
                this.remainder = this.timerService.startTokenTimer(tokenExpire);
                this.timerService.tokenCountdown.subscribe(value=> {
                    this.time = value;
                });
                this.timerService.logout.subscribe(value => {
                    if (value) {
                        this.time = null;
                        this.logOut();
                        this.remainder.unsubscribe();
                    }
                });
                this.timerService.ok.subscribe(value => {
                    if (value) this.router.navigate(['/'])
                });
            }
            if (this.me.userRole === 'doctor') {
                const nowAppointment = await this.appointmentService.loadNowAppointment();
                let isTabAdded: boolean = false;
                if (nowAppointment) {
                    const patientName = nowAppointment.patient.firstName+" "+nowAppointment.patient.lastName;
                    const start = DateTime.fromJSDate(new Date(nowAppointment.start)).toFormat('hh:mm');
                    isTabAdded = JSON.parse(localStorage.getItem('tabs') || '[]').find((tab: any)=> tab.id === nowAppointment?.id);
                    let isTabCreated: boolean;
                    
                    this.activatedRoute.queryParams.subscribe(params => {
                        const tab = params['tab'];
                        if (!tab) isTabCreated = false;
                        isTabCreated = true;
                    });

                    if (!isTabAdded) {
                        this.tabsService.addTab("offline start: "+start, AppointmentComponent, nowAppointment.id);
                        this.dialog.open(AlertComponent, {data: {message: "Current appointment with "+patientName+"\nStarted at "+start}});
                        this.nowAppointment = nowAppointment;
                    } 
                }
            }
        } else {
            this.me = null;
            this.updatedAt = null;
            this.userRole = null;
            this.isRecords = false;
        }
        if (this.userRole === 'doctor') {
            await this.appointmentService.pollNextAppointment();
        }
    }

    async loadMe() {
        const query = `query {
            me {
                userRole
                updatedAt
            }
        }`
        try {
            const response = await this.graphQLService.send(query);

            if (response.data.me) {
                this.me = response.data.me;
                this.isAuth = true;
                this.isUserUpdated = response.data.me.updatedAt || null;
                this.userRole = response.data.me.userRole;

                if (this.userRole !== 'admin') {
                    try {
                        const query = `query { countUserRecords {
                            countRecords
                            countDrafts
                        }}`
                        const response = await this.graphQLService.send(query);
                        this.isRecords = response.data.countUserRecords.countRecords >0 || response.data.countUserRecords.countDrafts >0;
                        
                    } catch (error) {
                        this.dialog.open(AlertComponent, {data: {message: "Unable to get record count "+error}});
                    }

                } else {
                    try {
                        const query = `query { 
                            countDoctorRequests
                        }`
                        const response = await this.graphQLService.send(query);
                        this.isRequests = response.data.countDoctorRequests > 0;
                    } catch (error) {
                        this.dialog.open(AlertComponent, {data: {message: "Unable to get request count "+error}});
                    }
                }    
            } else {
                this.me = null;
            }
        } catch (error) {
            this.dialog.open(AlertComponent, {data: {message: "No user :"+error}});
            localStorage.clear();
        }
    }
    onDirectLoginClick() {
        this.dialog.open(LoginComponent, {data: {directLogin: true}});
    }
    onGoogleLoginClick() {
        this.dialog.open(LoginComponent, {data: {googleLogin: true}});
    }

    getIsUserUpdated () {
        return this.isUserUpdated
    }

    async logOut() {
        this.timerService.cancelTokenTimer();
        this.authService.logOut(); 
        this.router.navigate(['/']);
        await this.ngOnInit(); 
    }
}