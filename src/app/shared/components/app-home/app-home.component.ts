import { trigger, transition, style, animate, state, keyframes } from "@angular/animations";
import { Component, HostListener, OnInit, ViewChild } from "@angular/core";
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from "@angular/router";
import { FormBuilder, FormControl } from "@angular/forms";
import { MatDialog } from "@angular/material/dialog";
import { MatMenuTrigger } from "@angular/material/menu";
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
    styleUrls: ['app-home.component.scss'],
    animations: [
        trigger('slideInOut', [
            state('in', style({ transform: 'translateY(0)', opacity: 1 })),
            transition(':enter', [
                style({ transform: 'translateY(80%)', opacity: 0.1 }),
                animate('600ms cubic-bezier(0.25, 0.8, 0.25, 1)', style({ transform: 'translateY(0)', opacity: 1 }))
            ]),
            transition(':leave', [
                animate('600ms cubic-bezier(0.25, 0.8, 0.25, 1)', style({ transform: 'translateY(100%)', opacity: 0.1 }))
            ])
        ]),
        trigger('typingAnimation', [
            transition(':enter', [
              animate('3s steps(30)', keyframes([
                style({ width: '0', overflow: 'hidden', borderRight: '1px solid black' }),
                style({ width: '100%', overflow: 'hidden', borderRight: '1px solid black' }),
              ]))
            ]),
            transition(':leave', [
              animate('0s')
            ])
        ]),
        trigger('cursorAnimation', [
            state('blink', style({ opacity: 0 })),
            transition('* => blink', animate('700ms ease-in-out infinite')),
        ])
    ]
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
    scrollOffset: number = 0;
    fullText: string = 'Sign up for our Newsletter!';
    displayedText: string = '';
    email!: FormControl;
    homeRoute: boolean = true;
    @ViewChild(MatMenuTrigger) menuTrigger!: MatMenuTrigger;
    
    @HostListener('window:scroll', ['$event'])
    onWindowScroll(): void {
        const scrollPosition = window.scrollY;
        this.scrollOffset = scrollPosition * -3.1; 
    }

    constructor (
        private dialog: MatDialog,
        private authService: AppAuthService,
        private graphQLService: AppGraphQLService,
        private timerService: AppTimerService,
        private appointmentService: AppAppointmentService,
        private router: Router,
        private tabsService: AppTabsService,
        private activatedRoute: ActivatedRoute,
        private formBuilder: FormBuilder,
        private location: Location
    ) {}

    async ngOnInit() {
        this.startTypingAnimation();
        this.email = this.formBuilder.control<string>('');

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
    openMenu() {
        this.menuTrigger.openMenu();
        this.menuTrigger.menu!.xPosition = 'after';
        this.menuTrigger.menu!.yPosition = 'above';
    }

    startTypingAnimation() {
        let index = 0;
        const interval = setInterval(() => {
            if (index < this.fullText.length) {
                this.displayedText += this.fullText.charAt(index);
                index++;
            } else {
                clearInterval(interval);
                setTimeout(() => {
                this.displayedText = '';
                this.startTypingAnimation();
                }, 1000); // pause before restart
            }
        }, 150); // Typing speed
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
                this.isAuth = true;
                this.isUserUpdated = response.data.me.streetAddress ? true : false;
                this.userRole = response.data.me.userRole;
                this.router.navigate(['/home'])
                if (this.userRole !== 'admin' && this.isUserUpdated) {
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

                } else if (this.userRole === 'admin'){
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

