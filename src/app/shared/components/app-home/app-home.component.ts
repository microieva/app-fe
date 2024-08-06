import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { Subscription } from "rxjs";
import { AppAuthService } from "../../services/app-auth.service";
import { AppGraphQLService } from "../../services/app-graphql.service";
import { AppTimerService } from "../../services/app-timer.service";
import { AppNextAppointmentService } from "../../services/app-next-appointment.service";
import { AlertComponent } from "../app-alert/app-alert.component";
import { MatDialog } from "@angular/material/dialog";
import { LoginComponent } from "../app-login/app-login.componnet";

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
    isUserUpdated: boolean = false;
    remainder!: Subscription;
    time!: string | null;
    userRole: string | null = null;
    nextAppointmentId: number | null = null;

    constructor (
        private dialog: MatDialog,
        private authService: AppAuthService,
        private graphQLService: AppGraphQLService,
        private timerService: AppTimerService,
        private nextAppointmentService: AppNextAppointmentService,
        private router: Router
    ) {}

    async ngOnInit() {
        if (localStorage.getItem('authToken')) {
            await this.loadMe();
            const tokenExpire = localStorage.getItem('tokenExpire');
            if (tokenExpire && this.me) {
                this.remainder = this.timerService.startTokenTimer(tokenExpire);
                this.timerService.tokenCountDown.subscribe(value=> {
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
        } else {
            this.me = null;
            this.updatedAt = null;
            this.userRole = null;
            this.isRecords = false;
        }
        if (this.userRole === 'doctor') {
            await this.nextAppointmentService.pollNextAppointment();
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
                        this.isRecords = response.data.countUserRecords.countRecords >0 || response.data.countUserRecords.countDrafts >0
                    } catch (error) {
                        this.dialog.open(AlertComponent, {data: {message: "Unable to get record count "+error}});
                    }

                }     
            } else {
                this.me = null;
            }
        } catch (error) {
            this.dialog.open(AlertComponent, {data: {message: "No user :"+error}});
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
        if (this.userRole === 'doctor') {
            this.timerService.cancelAppointmentTimer();
        }
        this.authService.logOut(); 
        this.router.navigate(['/']);
        await this.ngOnInit(); 
    }
}