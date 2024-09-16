import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { HttpClient, HttpHeaders } from "@angular/common/http";
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
import { LoadingComponent } from './shared/components/app-loading/loading.component';
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
        private tabsService: AppTabsService,
        private http: HttpClient
    ) {}

    async ngOnInit() {
        this.activatedRoute.queryParams.subscribe(params => {
            const code = params['code'];
            const state = params['state'];
            const scope = params['scope']

            if (code && state) {
                this.exchangeCodeForToken(code, state, scope);
            } else {
                console.error('Authorization code not found');
            }
        });

        if (localStorage.getItem('authToken')) {
            await this.loadMe();
            const tokenExpire = localStorage.getItem('tokenExpire');
            
            if (tokenExpire && this.me) {
                this.router.navigate(['/home'])
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
    onBankLoginClick(){
        const authEndpoint = 'https://health-center.sandbox.signicat.com/auth/open/connect/authorize' 
        const clientId = 'sandbox-itchy-wheel-954';
        const redirectUri = 'http://localhost:4200/'; 
        const state = generateRandomState(); 
        const responseType= 'code'
        const prompt = 'login'
        const scope = 'openid profile';
        const acrValues = 'idp:ftn'
        const clientSecret = 'EJTOPAOXSS2c8bPpMOeJpTe64DvbFdWBS2wH5ytbvT7Tt5Yh'
        const grantType = "authorization_code"
    
        const authUrl = `${authEndpoint}?client_id=${clientId}&client_secret=${clientSecret}&response_type=${responseType}&grant_type=${grantType}&scope=${scope}&state=${state}&prompt=${prompt}&acr_values=${acrValues}&redirect_uri=${redirectUri}`;

        window.location.href = authUrl;

        function generateRandomState(): string {
            const array = new Uint32Array(10);
            window.crypto.getRandomValues(array);
            return Array.from(array, dec => ('0' + dec.toString(10)).substr(-2)).join('');
          }
    }
    exchangeCodeForToken(code: string, state: string, scope: any) {

        const tokenEndpoint = 'https://health-center.sandbox.signicat.com/auth/open/connect/token'; 
        const clientId = 'sandbox-itchy-wheel-954';
        const clientSecret = 'EJTOPAOXSS2c8bPpMOeJpTe64DvbFdWBS2wH5ytbvT7Tt5Yh';
        const redirectUri = 'http://localhost:4200/'; 
      
        const headers = new HttpHeaders({
          'Content-Type': 'application/x-www-form-urlencoded',
        });
      
        const body = new URLSearchParams();
        body.set('grant_type', 'authorization_code'); 
        body.set('code', code);
        body.set('redirect_uri', redirectUri);
        body.set('client_id', clientId);
        body.set('client_secret', clientSecret);
        body.set('scope', scope);
        this.dialog.open(LoadingComponent);
        this.http.post(tokenEndpoint, body.toString(), { headers }).subscribe(
            async (response: any) => {
                if (response) {
                    await this.authService.loginWithSignicat(response.id_token);
                }
                await this.ngOnInit();
            },
            (error) => {
                console.error('Token exchange failed', error);
                this.router.navigate(['/']);
            }
        );
    }
    
    async logOut() {
        this.dialog.open(LoadingComponent);
        this.timerService.cancelTokenTimer();
        this.authService.logOut(); 

        this.router.navigate(['/'])
            .then(() => {
                this.location.replaceState('/');
                window.location.reload();
            });
    }
}
