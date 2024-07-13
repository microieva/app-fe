import { Component, OnInit } from "@angular/core";
import { AppDialogService } from "../../services/app-dialog.service";
import { AppAuthService } from "../../services/app-auth.service";
import { AppGraphQLService } from "../../services/app-graphql.service";
import { Subscription, take } from "rxjs";
import { AppTimerService } from "../../services/app-timer.service";
import { Router } from "@angular/router";

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['home.component.scss']
})
export class HomeComponent implements OnInit{
    me: any;
    updatedAt: string | null = null;
    isAuth: boolean = false;
    remainder!: Subscription;
    time!: string | null;

    constructor (
        private dialog: AppDialogService,
        private authService: AppAuthService,
        private graphQLService: AppGraphQLService,
        private timerService: AppTimerService,
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
                })
                this.timerService.logout.subscribe(value => {
                    if (value) {
                        this.time = null;
                        this.logOut();
                        this.remainder.unsubscribe();
                    }
                });
                this.timerService.ok.subscribe(value => {
                    if (value) this.router.navigate(['/'])
                })
            }
        } else {
            this.me = null;
            this.updatedAt = null;
            this.isAuth = false;
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
            }
        } catch (error) {
            console.log(error)
        }
    }

    logIn() {
        this.dialog.open({data: {isLoggingIn: true}});
    }

    async logOut() {
        console.log('calling logout in home component')
        this.timerService.cancelTimer();
        this.authService.logOut(); 
        this.router.navigate(['/']);
        await this.ngOnInit(); 
    }
}