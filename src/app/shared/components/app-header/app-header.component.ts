import {  Component, OnInit } from "@angular/core";
import { AppAuthService } from "../../services/app-auth.service";
import { ActivatedRoute, Router } from "@angular/router";
import { catchError, distinctUntilChanged, filter, forkJoin, of, Subject, Subscription, switchMap, take, takeUntil, tap } from "rxjs";
import { MatDialog } from "@angular/material/dialog";
import { BreakpointObserver } from "@angular/cdk/layout";
import { DateTime } from "luxon";
import { environment } from "../../../../environments/environment";
import { AppAppointmentService } from "../../services/app-appointment.service";
import { AppGraphQLService } from "../../services/app-graphql.service";
import { AppSnackbarService } from "../../services/app-snackbar.service";
import { AppSocketService } from "../../services/app-socket.service";
import { AppTabsService } from "../../services/app-tabs.service";
import { AppHeaderService } from "../../services/app-header.service";
import { AppTimerService } from "../../services/app-timer.service";
import { AppointmentComponent } from "../../../graphql/appointment/appointment.component";
import { AlertComponent } from "../app-alert/app-alert.component";
import { LoadingComponent } from "../app-loading/loading.component";
import { LoginMenuComponent } from "../app-login-menu/app-login-menu.component";
import { User } from "../../../graphql/user/user";
import { Appointment } from "../../../graphql/appointment/appointment";
import { CancelledAppointmentNotification, NewAppointmentNotification, NewFeedbackNotification, NewMessageNotification } from "../../types";

@Component({
    selector: 'app-header',
    templateUrl: 'app-header.component.html',
    styleUrls: ['app-header.component.scss']
})
export class AppHeader implements OnInit {
    isDesktop: boolean = false; 
    expand:boolean = false;

    unreadMessages: number | null= null;
    missedAppointments: number | null = null;
    isDisabled:boolean = true;

    me: User | null = null;
    nowAppointment: Appointment | null = null;

    remainder!: Subscription;
    time: string | null = null;
    userRole: string | null = null;
    isUserUpdated: boolean = false;

    snackbarMessage: string | undefined;
    snackbarAppointmentId: number | undefined;
    snackbarReceiverId: number | undefined;

    private destroy$ = new Subject<void>();

    buttonClickListener!: () => void;
    private subscriptions: Subscription = new Subscription();

    constructor(
        private dialog: MatDialog,
        private router: Router,
        private activatedRoute: ActivatedRoute,
        private authService: AppAuthService,
        private graphQLService: AppGraphQLService,
        private timerService: AppTimerService,
        private appointmentService: AppAppointmentService,
        private tabsService: AppTabsService,
        private socketService: AppSocketService,
        private snackbarService: AppSnackbarService,
        private headerService: AppHeaderService,
        private breakpointObserver: BreakpointObserver
    ){}
    async ngOnInit() {
        this.breakpointObserver.observe([`(min-width: 1024px)`]).subscribe(result => {
            this.isDesktop = result.matches;
        });
        this.me = null;
        this.time = null;
        this.authService.isLoggedIn$.subscribe(isLoggedIn => {
            if (isLoggedIn) {
                const sub = this.headerService.isUserUpdated.subscribe(async () => {
                    await this.loadMe(false);
                });
                const subMsgCount = this.headerService.isMsgCountUpdated.subscribe(async()=> {
                    await this.countUnreadMessages();
                });
                const subAptCount = this.headerService.isAptCountUpdated.subscribe(async()=> {
                    await this.countMissedAppointments(true);
                });
                const subToggle = this.headerService.toggleSidenav.subscribe(
                    toggle => this.expand = toggle
                )
                this.subscriptions.add(subToggle);
                this.subscriptions.add(sub);
                this.subscriptions.add(subMsgCount);
                this.subscriptions.add(subAptCount);
                this.initHeader();
            }
            else {
                this.me = null;
                this.time = null;
                this.subscriptions.unsubscribe();
            }
        })    
    }
    
    initHeader() {
        this.authService.isLoggedIn$
            .pipe(
                filter(isLoggedIn => isLoggedIn), 
                switchMap(async () => await this.loadMe()),  
                switchMap(() => this.timerService.tokenCountdown$),
                tap(countdown => this.time = countdown), 
                switchMap(() => {
                    
                    if (this.me?.updatedAt) {
                        return forkJoin({
                            socketUpdates: this.socketService.getMissedAppointmentsCount().pipe(
                                tap(isUpdated => this.countMissedAppointments(isUpdated)),   
                                catchError(err => {
                                    console.error("Error receiving socket update", err);
                                    return of(null); 
                                })
                            ),
                            notifications: this.socketService.receiveNotification().pipe(
                                tap(async (notification: NewMessageNotification) => {
                                    if (this.me?.id === notification.receiverId && notification.chatId) {
                                        this.snackbarService.addSnackbar(notification)
                                        if (this.userRole !== 'patient') {
                                            await this.countUnreadMessages();
                                           
                                        }
                                        if (this.userRole === 'admin') {
                                            this.socketService.requestOnlineUsers()
                                        }  
                                    }
                                    return of(null)
                                }),
                                catchError(err => {
                                    console.error("Error receiving socket update", err);
                                    return of(null); 
                                })
                            ),
                            newAppointemntNoti: this.socketService.newAppointmentRequest().pipe(
                                tap((info: NewAppointmentNotification )=> {
                                    if (this.userRole === 'doctor') {
                                        this.snackbarService.addSnackbar(info)
                                    }
                                }),
                                catchError(err => {
                                    console.error("Error receiving socket update", err);
                                    return of(null); 
                                })
                            ),
                            cancelledAppointmentNoti: this.socketService.deletedAppointmentInfo().pipe(
                                tap((info: CancelledAppointmentNotification )=> {
                                    if (this.me?.id === info.receiverId) {
                                        this.snackbarService.addSnackbar(info)
                                    }
                                    return of(null); 
                                }),
                                catchError(err => {
                                    console.error("Error receiving socket update", err);
                                    return of(null); 
                                })
                            ),
                            nextAppointmentInfo: this.appointmentService.appointmentInfo$.pipe(
                                filter((info) => !!info),
                                switchMap((info) => {
                                    const start = DateTime.fromISO(info.nextStart, { zone: 'utc' }).setZone('utc'); 
                                
                                    return this.timerService.appointmentCountdown$.pipe(
                                    distinctUntilChanged(),
                                    take(1),
                                    tap((value) => {
                                        if (value === environment.triggerTime) {
                                            const displayTime = `\n Starting at ${start.toFormat('HH:mm a')}`;
                                            const ref = this.dialog.open(AlertComponent, { 
                                                data: { message: `You have an appointment in 5 min. ${displayTime}` } 
                                        });
                                
                                        const tabs = this.tabsService.getTabs();
                                        if (tabs) {
                                            const isCreated = tabs.some((tab) => tab.id === info.nextId);
                                            if (!isCreated) {
                                                this.tabsService.addTab(start.toFormat('HH:mm a'), AppointmentComponent, info.nextId);
                                            }
                                        }
                                
                                        ref.componentInstance.ok.subscribe(() => {      
                                            this.dialog.closeAll();
                                            this.router.navigate(['/home/appointments'], {
                                                relativeTo: this.activatedRoute,
                                                queryParams: { tab: 3 },
                                                queryParamsHandling: 'merge', 
                                            });
                                        });
                                    }
                                    })
                                    );
                                })
                            ),
                            newFeedbackNoti: this.socketService.newFeedback().pipe(
                                tap((info: NewFeedbackNotification )=> {
                                    if (this.userRole === 'admin') {
                                        this.snackbarService.addSnackbar(info)
                                    }
                                }),
                                catchError(err => {
                                    console.error("Error receiving socket update", err);
                                    return of(null); 
                                })
                            ),    
                        })
                    } 
                    return of(null)
                }), 
                catchError(err => {
                    console.error("Error in header initialization", err);
                    this.me = null;
                    this.time = null;
                    return of(null); 
                }),
                takeUntil(this.destroy$), 
            )
            .subscribe()   
    }

    async countMissedAppointments(isUpdated: boolean) {
        const query = `query { countMissedAppointments }`;
        if (isUpdated) {
            await this.graphQLService.send(query)
                .then((response: any) => {
                    this.missedAppointments = response.data.countMissedAppointments;
                })
                .catch((error) => {
                    console.error('Error fetching unread messages count:', error);
                });
        }
    }
    async countUnreadMessages() {
        const query = `query { countUnreadMessages }`;

        await this.graphQLService.send(query)
            .then((response: any) => {
                this.unreadMessages = response.data.countUnreadMessages;
            })
            .catch((error) => {
                console.error('Error fetching unread messages count:', error);
            });
    }

    async loadMe(useCache?:boolean) {
        const query = `
            query {
                me {
                    id
                    userRole
                    firstName
                    lastName
                    dob
                    phone
                    email
                    streetAddress
                    city
                    postCode
                    updatedAt
                    lastLogOutAt
                }
                countMissedAppointments
            }
        `;

        try {
            const response = await this.graphQLService.send(query, useCache);

            if (response.data.me) {
                this.me = response.data.me;
                this.userRole = response.data.me.userRole;
                this.isUserUpdated = response.data.me.updatedAt;
                this.missedAppointments = response.data.countMissedAppointments;
                if (this.userRole !== 'patient') {
                    await this.countUnreadMessages();
                }
            } else {
                localStorage.clear();
                this.router.navigate([''])
            }
        } catch (error) {
            localStorage.clear();
            const ref = this.dialog.open(AlertComponent, {data: {message: error}});
            ref.componentInstance.ok.subscribe(() => {
                this.router.navigate(['/'])
            })
        }
    }
    openChat() {
        if (this.userRole === 'doctor') this.headerService.notifyUnreadCountUpdate();
        if (this.expand) this.headerService.openSidenav(!this.expand);
        this.router.navigate(['/home/messages']);
    }
    openCalendar() {
        if (this.userRole === 'admin') {
            this.router.navigate(['/home/calendar']);
        } else {
            this.router.navigate(['/home/appointments/calendar']);
        }
        if (this.expand) this.headerService.openSidenav(!this.expand);
    }


    ngOnDestroy() {
        if (this.buttonClickListener) {
            this.buttonClickListener();
        }
        this.subscriptions.unsubscribe();
        this.destroy$.next(); 
        this.destroy$.complete();
    }
    onLogIn(){
        this.dialog.open(LoginMenuComponent)
    }

    async onLogOut() {   
        if (this.userRole === 'doctor') {
            this.socketService.userLogout(this.me!.id);
        }     
        this.timerService.cancelTokenTimer(); 
        this.snackbarService.clearSnackbars();
        this.dialog.open(LoadingComponent);

        this.me = null;
        this.time = null;
        this.ngOnDestroy();
       
        await this.authService.logOut();
    }
    toggleSidenav(){
        this.headerService.openSidenav(!this.expand);
    }

}
      