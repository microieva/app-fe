import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { Subscription } from "rxjs";
import { AppDialogService } from "../../services/app-dialog.service";
import { AppAuthService } from "../../services/app-auth.service";
import { AppGraphQLService } from "../../services/app-graphql.service";
import { AppTimerService } from "../../services/app-timer.service";
import { AppNextAppointmentService } from "../../services/app-next-appointment.service";

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['home.component.scss']
})
export class HomeComponent implements OnInit{
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
        private dialog: AppDialogService,
        private authService: AppAuthService,
        private graphQLService: AppGraphQLService,
        private timerService: AppTimerService,
        private nextAppointmentService: AppNextAppointmentService,
        private router: Router
    ) {}

    async ngOnInit() {
        if (localStorage.getItem('authToken')) {
            await this.loadStatic();
            const tokenExpire = localStorage.getItem('tokenExpire');
            if (tokenExpire) {
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
            this.isAuth = false;
            this.isRecords = false;
        }
        if (this.userRole === 'doctor') {
            await this.nextAppointmentService.pollNextAppointment();
        }
    }

    async loadStatic() {
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
                        const query = `query { countUserRecords }`
                        const response = await this.graphQLService.send(query);
                        this.isRecords = response.data.countUserRecords >0
                    } catch (error) {
                        this.dialog.open({data: {isAlert: true, message: "Unable to get record count "+error}});
                    }

                }        
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