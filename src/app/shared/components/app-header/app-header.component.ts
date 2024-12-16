import {  Component, OnInit, Renderer2 } from "@angular/core";
import { AppAuthService } from "../../services/app-auth.service";
import { ActivatedRoute, Router } from "@angular/router";
import { catchError, distinctUntilChanged, filter, forkJoin, of, Subject, Subscription, switchMap, take, takeUntil, tap } from "rxjs";
import { MatDialog } from "@angular/material/dialog";
import { DateTime } from "luxon";
import { environment } from "../../../../environments/environment";
import { AppAppointmentService } from "../../services/app-appointment.service";
import { AppGraphQLService } from "../../services/app-graphql.service";
import { AppSnackbarService } from "../../services/app-snackbar.service";
import { AppSocketService } from "../../services/app-socket.service";
import { AppTabsService } from "../../services/app-tabs.service";
import { AppTimerService } from "../../services/app-timer.service";
import { AppointmentComponent } from "../../../graphql/appointment/appointment.component";
import { AlertComponent } from "../app-alert/app-alert.component";
import { LoadingComponent } from "../app-loading/loading.component";
import { LoginMenuComponent } from "../app-login-menu/app-login-menu.component";
import { User } from "../../../graphql/user/user";
import { Appointment } from "../../../graphql/appointment/appointment";
import { CancelledAppointmentNotification, NewAppointmentNotification, NewMessageNotification } from "../../types";

@Component({
    selector: 'app-header',
    templateUrl: 'app-header.component.html',
    styleUrls: ['app-header.component.scss']
})
export class AppHeader implements OnInit {
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
        private renderer: Renderer2,
        private activatedRoute: ActivatedRoute,
        private authService: AppAuthService,
        private graphQLService: AppGraphQLService,
        private timerService: AppTimerService,
        private appointmentService: AppAppointmentService,
        private tabsService: AppTabsService,
        private socketService: AppSocketService,
        private snackbarService: AppSnackbarService
    ){}
    async ngOnInit() {
        this.authService.isLoggedIn$.subscribe(is=> {
            if (is) this.initHeader();
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
                            refresh: this.socketService.refresh$.pipe(
                                filter(isUpdated => isUpdated), 
                                tap(async ()=> await this.ngOnInit()),
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
                                
                                        ref.componentInstance.ok.subscribe((ok) => {
                                            if (ok) {
                                                this.dialog.closeAll();
                                                this.router.navigate(['/home/appointments'], {
                                                    relativeTo: this.activatedRoute,
                                                    queryParams: { tab: 3 },
                                                    queryParamsHandling: 'merge', 
                                                });
                                            }
                                        });
                                    }
                                    })
                                    );
                                })
                             )
                                  
                        })
                    } 
                    return of(null)
                }), 
                catchError(err => {
                    console.error("Error in header initialization", err);
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

    async loadMe() {
        const query = `query {
            me {
                id
                email
                userRole
                updatedAt
                firstName
                lastName
                streetAddress
            }
            countMissedAppointments
        }`
        try {
            const response = await this.graphQLService.send(query);

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
            ref.componentInstance.ok.subscribe(ok => {
                if (ok)  this.router.navigate([''])
            })
        }
    }
    openChat() {
        this.router.navigate(['/home/messages']);
    }
    openCalendar() {
        if (this.userRole === 'admin') {
            this.router.navigate(['/home/calendar']);
        } else {

            this.router.navigate(['/home/appointments/calendar']);
        }
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
        this.timerService.cancelTokenTimer(); 
        this.dialog.open(LoadingComponent);

        this.me = null;
        this.time = null;
        this.ngOnDestroy();
       
        await this.authService.logOut();
    }

}
      