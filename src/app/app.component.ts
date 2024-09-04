import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { DateTime } from 'luxon';
import { AppTimerService } from './shared/services/app-timer.service';
import { AppAppointmentService } from './shared/services/app-appointment.service';
import { AppTabsService } from './shared/services/app-tabs.service';
import { AppAuthService } from './shared/services/app-auth.service';
import { AppGraphQLService } from './shared/services/app-graphql.service';
import { AppointmentComponent } from './graphql/appointment/appointment.component';
import { AlertComponent } from './shared/components/app-alert/app-alert.component';
import { LoginComponent } from './shared/components/app-login/app-login.componnet';
import { Appointment } from './graphql/appointment/appointment';
import { User } from './graphql/user/user';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit{
    title = 'Health Center';

    me: User | null = null;
    nowAppointment: Appointment | null = null;

    remainder!: Subscription;
    time!: string | null;
    userRole: string | null = null;

    constructor (
        private dialog: MatDialog,
        private location: Location,
        private router: Router,
        private activatedRoute: ActivatedRoute,
        private authService: AppAuthService,
        private graphQLService: AppGraphQLService,
        private timerService: AppTimerService,
        private appointmentService: AppAppointmentService,
        private tabsService: AppTabsService
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
                if (this.me.userRole === 'doctor') {
                    await this.appointmentService.pollNextAppointment();
                    const nowAppointment = await this.appointmentService.loadNowAppointment();
                    let isTabAdded: boolean = false;
                    if (nowAppointment) {
                        const patientName = nowAppointment.patient.firstName+" "+nowAppointment.patient.lastName;
                        const start = DateTime.fromJSDate(new Date(nowAppointment.start)).toFormat('hh:mm a');
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
            }
        } else {
            this.me = null;
            this.userRole = null;
        }
    }

    async loadMe() {
        const query = `query {
            me {
                userRole
                updatedAt
                firstName
                lastName
                streetAddress
            }
        }`
        try {
            const response = await this.graphQLService.send(query);

            if (response.data) {
                this.me = response.data.me;
                this.userRole = response.data.me.userRole;
            } else {
                this.me = null;
            }
        } catch (error) {
            localStorage.clear();
            console.error(error);
        }
    }

    onDirectLoginClick() {
        this.dialog.open(LoginComponent, {data: {directLogin: true}});
    }
    onGoogleLoginClick() {
        this.dialog.open(LoginComponent, {data: {googleLogin: true}});
    }
    
    async logOut() {
        this.timerService.cancelTokenTimer();
        this.authService.logOut(); 

        this.router.navigate(['/'])
            .then(() => {
                this.location.replaceState('/');
                window.location.reload();
            });
    }
}
