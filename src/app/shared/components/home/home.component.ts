import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { Subscription } from "rxjs";
import { AppDialogService } from "../../services/app-dialog.service";
import { AppAuthService } from "../../services/app-auth.service";
import { AppGraphQLService } from "../../services/app-graphql.service";
import { AppTimerService } from "../../services/app-timer.service";
import { AppPollingService } from "../../services/app-polling.service";
import { Appointment } from "../../../graphql/appointment/appointment";

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['home.component.scss']
})
export class HomeComponent implements OnInit{
    me: any;
    updatedAt: string | null = null;
    isAuth: boolean = false;
    isUserUpdated: boolean = false;
    remainder!: Subscription;
    time!: string | null;
    userRole: string | null = null;
    nextAppointment: Appointment | null = null;

    constructor (
        private dialog: AppDialogService,
        private authService: AppAuthService,
        private graphQLService: AppGraphQLService,
        private timerService: AppTimerService,
        private pollingService: AppPollingService,
        private router: Router
    ) {}

    async ngOnInit() {
        if (localStorage.getItem('authToken')) {
            await this.loadMe();
            const tokenExpire = localStorage.getItem('tokenExpire');
            if (tokenExpire) {
                this.remainder = this.timerService.startTimer(tokenExpire);
                this.timerService.time.subscribe(value=> {
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
                this.pollingService.isAppointment.subscribe(async (value: any) => {
                    if (value.nextAppointment) {
                        this.nextAppointment = value.nextAppointment
                        console.log('AT HOME: ', this.nextAppointment)
                        if (this.nextAppointment) {
                            this.dialog.open({data: {isAlert: true, message: `You have an appointment in 5 min\n ${this.nextAppointment.start}`}})

                        }
                    }
                });
            }
        } else {
            this.me = null;
            this.updatedAt = null;
            this.isAuth = false;
        }
        if (!this.nextAppointment) {
            await this.pollingService.pollNextAppointmentStartTime();
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
                this.updatedAt = this.me.updatedAt;
                this.isAuth = true;
                this.isUserUpdated = response.data.me.updatedAt || null;
                this.userRole = response.data.me.userRole;
            }
        } catch (error) {
            this.dialog.open({data: {message: "No user, must login :"+error}})
        }
    }

    logIn() {
        this.dialog.open({data: {isLoggingIn: true}});
    }

    getIsUserUpdated () {
        return this.isUserUpdated
    }

    async logOut() {
        this.timerService.cancelTimer();
        this.authService.logOut(); 
        this.router.navigate(['/']);
        await this.ngOnInit(); 
    }
}