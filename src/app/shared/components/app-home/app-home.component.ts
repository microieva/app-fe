import { Component, ElementRef, OnInit, Renderer2, ViewChild } from "@angular/core";
import { Subscription } from "rxjs";
import { MatDialog } from "@angular/material/dialog";
import { ActivatedRoute, NavigationEnd, Router } from "@angular/router";
import { animate, state, style, transition, trigger } from "@angular/animations";
import { BreakpointObserver } from "@angular/cdk/layout";
import { DateTime } from "luxon";
import { AppAuthService } from "../../services/app-auth.service";
import { AppGraphQLService } from "../../services/app-graphql.service";
import { AppAppointmentService } from "../../services/app-appointment.service";
import { AppTimerService } from "../../services/app-timer.service";
import { AppTabsService } from "../../services/app-tabs.service";
import { AppCountUnreadMessagesService } from "../../services/app-count-unread.service";
import { AppUiSyncService } from "../../services/app-ui-sync.service";
import { AlertComponent } from "../app-alert/app-alert.component";
import { AppTableComponent } from "../app-table/app-table.component";
import { AppointmentComponent } from "../../../graphql/appointment/appointment.component";
import { Appointment } from "../../../graphql/appointment/appointment";
import { getTodayWeekdayTime, getNextAppointmentWeekdayStart, getLastLogOutStr } from "../../utils";
import { User } from "../../../graphql/user/user";
import { AppUserRoomService } from "../../services/socket/app-user-room.service";

@Component({
    selector: 'app-home',
    templateUrl: 'app-home.component.html',
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
    isSocketConnected: boolean = false;
    userRole!: string;
    me: User | undefined;
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
    countUnreadFeedback:number = 0;
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
    doctors: User[] = [];
    doctorsLength: number = 0;
    private subscriptions: Subscription = new Subscription();

    @ViewChild('sidenav', { read: ElementRef }) sidenavElement: ElementRef | undefined;
    @ViewChild('resize', { read: ElementRef }) resizeElement!: ElementRef;
    @ViewChild('sidenavContent', { read: ElementRef }) sidenavContent: ElementRef | undefined;
    isResizing = false;
    lastDownX = 60;
    isDesktop: boolean = true; 
    isCompact: boolean = false; 
    showSidenav:boolean = false;

    constructor(
        private activatedRoute: ActivatedRoute,
        private dialog: MatDialog,
        private router: Router,
        private graphQLService: AppGraphQLService,
        private appointmentService: AppAppointmentService,
        private timerService: AppTimerService,
        private countService: AppCountUnreadMessagesService,
        private uiSyncService: AppUiSyncService,
        private authService: AppAuthService,
        private tabsService: AppTabsService,
        private renderer: Renderer2,
        private breakpointObserver: BreakpointObserver,
        private roomService: AppUserRoomService
    ){}

    async ngOnInit() {
        
        this.uiSyncService.toggleSidenav.subscribe((toggle:boolean)=> {
            this.showSidenav = toggle
            if (this.showSidenav) {
                this.renderer.setStyle(this.sidenavElement?.nativeElement, 'width', `288px`);
            } 
        });

        await this.loadMe();
        if (this.me) {
            await this.loadStatic();
            this.dialog.closeAll();
            const sub = this.router.events.subscribe(async (event) => {
                this.isHomeRoute = this.router.url === '/home' || (event as NavigationEnd).url === '/home';
                if (this.isHomeRoute) {  
                    await this.loadStatic();
                }
            });

            this.subscriptions.add(sub); 

            if (this.me && this.userRole !== 'patient') {
                this.countService.countUnreadMessages();
            }
            
            if (this.me && this.userRole === 'admin') {
                this.today = getTodayWeekdayTime();
                const now = DateTime.now().setZone('Europe/Helsinki').toISO();
                this.timerService.startClock(now!);
                const sub = this.timerService.clock.subscribe(value=> {
                    this.clock = value;
                });
                this.subscriptions.add(sub); 
                if (this.countDoctorRequests > 0) {
                    await this.loadLatestDoctorRequests();
                }
            }
            if (this.me && this.userRole === 'doctor') {
                await this.appointmentService.pollNextAppointment();
                const sub = this.appointmentService.appointmentInfo$.subscribe(async (info:any) => {
                    if (info && info.nextAppointment) {
                        this.nextId = info.nextAppointment.nextId;
                        if (this.previousNextId !== this.nextId) {
                            this.previousNextId = this.nextId;
                        } 
                        const nextStart = info.nextAppointment.nextStart;
                        this.timerService.startAppointmentTimer(nextStart);
                        this.nextAppointmentStartTime = ''
                        this.nextStart = getNextAppointmentWeekdayStart(nextStart);
                        this.nextAppointmentName = info.nextAppointment.patient.firstName+' '+info.nextAppointment.patient.lastName;
                        this.nextAppointmentPatientDob = DateTime.fromISO(info.nextAppointment.patient.dob).toFormat('MMM dd, yyyy');
                        const str = DateTime.fromISO(info.nextAppointment.previousAppointmentDate).toFormat('MMM dd, yyyy'); 
                        this.previousAppointmentDate = str !== 'Invalid DateTime' ? str : '-';
                        this.recordIds = info.nextAppointment.recordIds;
                        
                    } 
                });  
                this.subscriptions.add(sub);  

                const nowAppointment = await this.appointmentService.loadNowAppointment();
                let isTabAdded: boolean = false;

                if (nowAppointment) {
                    const patientName = nowAppointment.patient.firstName+" "+nowAppointment.patient.lastName;
                    const start = DateTime.fromISO(nowAppointment.start, {zone:'utc'}).setZone('utc').toFormat('HH:mm a');
                    isTabAdded = JSON.parse(localStorage.getItem('tabs') || '[]').find((tab: any)=> tab.id === nowAppointment?.id);
                    let isTabCreated: boolean;
                    
                    const subRouteParams = this.activatedRoute.queryParams.subscribe(params => {
                        const tab = params['tab'];
                        if (!tab) isTabCreated = false;
                        isTabCreated = true;
                    });

                    if (!isTabAdded) {
                        this.tabsService.addTab("offline start: "+start, AppointmentComponent, nowAppointment.id);
                        const ref = this.dialog.open(AlertComponent, {data: {message: "Current appointment with "+patientName+", started at "+start}});
                        ref.componentInstance.ok.subscribe(() => {
                            this.router.navigate(['/home/appointments'])
                        })
                        this.nowAppointment = nowAppointment;
                    } 
                    this.subscriptions.add(subRouteParams);
                }
            }
        } else {
            this.router.navigate([''])
        }
        this.breakpointObserver.observe(['(min-width: 1024px)', '(max-width: 1431px)']).subscribe(result => {
            this.isDesktop = this.breakpointObserver.isMatched('(min-width: 1024px)');
        });
        this.requestSocketStatus();

    }

    requestSocketStatus() {
        this.roomService.requestUserStatus(this.me?.id  || 0);
        
    }

    async loadLatestDoctorRequests() {
        const query = `query (
            $pageIndex: Int!, 
            $pageLimit: Int!, 
            $sortDirection: String, 
            $sortActive: String,
            $filterInput: String
        ){ 
            doctors (
                pageIndex: $pageIndex, 
                pageLimit: $pageLimit,
                sortDirection: $sortDirection,
                sortActive: $sortActive,
                filterInput: $filterInput
            ){
                length
                slice {
                    ... on User {
                        id
                        email
                        firstName
                        lastName
                        createdAt
                    }
                }
            }
        }`
        const variables = {
            pageIndex: 0,
            pageLimit: 5,
            sortActive: 'createdAt',
            sortDirection: 'DESC',
            filterInput: null
        }
        try {
            const response = await this.graphQLService.send(query, variables);
            if (response.data) {
                this.doctors = response.data.doctors.slice;
                this.doctorsLength = response.data.doctors.length;
                //this.formatDataSource("doctors")
                //this.isLoading = false;
            }
        } catch (error) {
            this.dialog.open(AlertComponent, {data: {message: "Unexpected error loading requests: "+error}})
        }
    }

    ngAfterViewInit() {
        this.renderer.listen(this.resizeElement.nativeElement, 'click', (event: MouseEvent) => {
            event.stopPropagation(); 
        });
          
        this.renderer.listen(this.sidenavElement?.nativeElement, 'mousedown', (event: MouseEvent) => this.onMouseDown(event));
        this.renderer.listen(document, 'mousemove', (event: MouseEvent) => this.onMouseMove(event));
        this.renderer.listen(document, 'mouseup', () => this.onMouseUp());    

       
    }

    onMouseDown(event: MouseEvent) {
        event.stopPropagation();
        this.isResizing = true;
        this.lastDownX = event.clientX;
    }

    onMouseMove(event: MouseEvent) {
        event.stopPropagation();
        if (this.isResizing) {
            const newWidth = event.clientX;
            const adjustedWidth = Math.max(20, Math.min(newWidth, 288));
            this.renderer.setStyle(this.sidenavElement?.nativeElement, 'width', `${adjustedWidth}px`);
            if (adjustedWidth > 55) {
                this.renderer.setStyle(this.sidenavContent?.nativeElement, 'margin-left', `${adjustedWidth}px`);
            } else {
                this.renderer.setStyle(this.sidenavContent?.nativeElement, 'margin-left', `60px`);
            }
        } 
    }

    onMouseUp() {
        this.isResizing = false;
    }

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }
    onResizeSidenav(){
        const isResized = this.sidenavElement?.nativeElement.offsetWidth === 60;

        if (isResized) {
            this.renderer.setStyle(this.sidenavElement?.nativeElement, 'width', '288px');
            this.renderer.setStyle(this.sidenavContent?.nativeElement, 'margin-left', '288px');
        } else {
            this.renderer.setStyle(this.sidenavElement?.nativeElement, 'width', '60px');
            this.renderer.setStyle(this.sidenavContent?.nativeElement, 'margin-left', '60px');
        }    
    }

    async loadStatic(){
        if (this.authService.isAuth()) {
            switch (this.userRole) {
                case 'admin':
                    await this.loadAdminStatic();
                    break;
                case 'doctor':
                    await this.loadDoctorStatic();
                    break;
                case 'patient':
                    await this.loadPatientStatic();
                    break;
            }
            this.dialog.closeAll();
        }
    }

    async loadMe() {
        const query = `query { 
            me { 
                id
                userRole 
                updatedAt
                lastLogOutAt
                firstName
                lastName
                email
            }
        }`
        const response = await this.graphQLService.send(query);
        if (response.data.me) {
            this.me = response.data.me;
            this.userRole = response.data.me.userRole;
            const str = getLastLogOutStr(response.data.me.lastLogOutAt);
            this.lastLogOut = str !== 'Invalid DateTime' ? str : '-'
            this.isUserUpdated = response.data.me.updatedAt;
        }
    }

    async loadAdminStatic(){
        const query = `query { 
            countDoctorRequests 
            countDoctors
            countPatients
            countMissedAppointments
            countUnreadFeedback
        }`
        try {
            const response = await this.graphQLService.send(query);

            if (response.data) {
                this.countDoctorRequests = response.data.countDoctorRequests;
                this.countDoctors = response.data.countDoctors;
                this.countPatients = response.data.countPatients;
                this.countMissedAppointments = response.data.countMissedAppointments;
                this.countUnreadFeedback = response.data.countUnreadFeedback;
                this.isLoading = false;
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
                this.isLoading = false;
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
            nowAppointment {
                id
            }
        }`
        try {
            const response = await this.graphQLService.send(query);

            if (response.data) {
                this.countPendingAppointments = response.data.countPendingAppointments;
                this.countUpcomingAppointments = response.data.countUpcomingAppointments;
                this.countRecords = response.data.countRecords;
                this.countMissedAppointments = response.data.countMissedAppointments;
                this.nowAppointment = response.data.nowAppointment;

                if (response.data.nextAppointment) {
                    const previous = response.data.nextAppointment.previousAppointmentDate;
                    this.previousAppointmentDate = previous ? DateTime.fromISO(previous).toFormat('MMM dd, yyyy') : '-';
                    const nextStart = response.data.nextAppointment.nextStart;
                    this.nextStart = nextStart && getNextAppointmentWeekdayStart(nextStart);
                    this.nextId = response.data.nextAppointment.nextId;
                    this.recordIds = response.data.nextAppointment.recordIds;
                    this.nextAppointmentStartTime = DateTime.fromISO(response.data.nextAppointment.nextStart, {setZone: true}).toFormat('HH:mm a, MMM dd');
                    this.nextAppointmentName = response.data.nextAppointment.doctor.firstName+' '+response.data.nextAppointment.doctor.lastName;
                   
                } 
                this.isLoading = false;
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
    onClickNavLink(){
        if (!this.isDesktop) {
            this.showSidenav = !this.showSidenav;
            if (!this.showSidenav) {
                this.uiSyncService.openSidenav(false);
            }
        }
    }
}