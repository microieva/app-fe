import { Component, OnDestroy, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { catchError, filter, merge, of, Subject, Subscription, switchMap, takeUntil, tap } from "rxjs";
import { MatDialog } from "@angular/material/dialog";
import { BreakpointObserver } from "@angular/cdk/layout";
import { AppAuthService } from "../../services/app-auth.service";
import { AppGraphQLService } from "../../services/app-graphql.service";
import { AppSnackbarService } from "../../services/app-snackbar.service";
import { AppSocketService } from "../../services/socket/app-socket.service";
import { AppNotificationService } from "../../services/socket/app-notification.service";
import { AppUiSyncService } from "../../services/app-ui-sync.service";
import { AppTimerService } from "../../services/app-timer.service";
import { AppUserRoomService } from "../../services/socket/app-user-room.service";
import { AlertComponent } from "../app-alert/app-alert.component";
import { LoadingComponent } from "../app-loading/loading.component";
import { LoginMenuComponent } from "../app-login-menu/app-login-menu.component";
import { CustomPopupComponent } from "../app-custom-popup/app-custom-popup.component";
import { User } from "../../../graphql/user/user";
import { Appointment } from "../../../graphql/appointment/appointment";
import { 
    APPOINTMENT_ACCEPTED, 
    APPOINTMENT_CANCELLED, 
    APPOINTMENT_DELETED, 
    APPOINTMENT_UPDATED, 
    RECORD_CREATED, 
    APPOINTMENT_CREATED, 
    MESSAGE_CREATED, 
    DOCTOR_REQUEST_CREATED, 
    FEEDBACK_CREATED, 
    USER_UPDATED,
    MESSAGE_READ,
    DEMO_CREDENTIALS
} from "../../constants";
import { AppNotificationEvent } from "../../types";
import { showLoginCredentialPopups } from "../../utils";


@Component({
    selector: 'app-header',
    templateUrl: 'app-header.component.html',
    styleUrls: ['app-header.component.scss']
})
export class AppHeader implements OnInit, OnDestroy {
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
    tooltipText:string | undefined;

    snackbarMessage: string | undefined;
    snackbarAppointmentId: number | undefined;
    snackbarReceiverId: number | undefined;

    private subscriptions: Subscription[] = [];
    private destroy$ = new Subject<void>();

    constructor(
        private dialog: MatDialog,
        private router: Router,
        private authService: AppAuthService,
        private graphQLService: AppGraphQLService,
        private timerService: AppTimerService,
        private socketService: AppSocketService,
        private uiSyncService: AppUiSyncService,
        private notificationService: AppNotificationService,
        private roomService: AppUserRoomService,
        private snackbarService: AppSnackbarService,
        private breakpointObserver: BreakpointObserver
    ){
        
    }
    async ngOnInit() {
        this.breakpointObserver.observe([`(min-width: 1024px)`]).subscribe(result => {
            this.isDesktop = result.matches;
        }),
        this.router.events.subscribe(async () => {
            this.tooltipText = !this.router.url.endsWith('/home') 
                ? 'Go To Dashboard' 
                : undefined;
        }),
        this.time = null;
        this.authService.isLoggedIn$.subscribe(isLoggedIn => {
            if (isLoggedIn) {   
                this.setupSubscriptions();
            } else {
                this.me = null;
                this.time = null;
                this.ngOnDestroy();
            }
        })
    }

    setupSubscriptions() {
        const toggle = this.uiSyncService.toggleSidenav.subscribe(
            toggle => this.expand = toggle
        )
        this.subscriptions.push(toggle);
        this.setupUserRoleSubscriptions();
        this.setupUiSyncSubscriptions();
    }
    
    setupUserRoleSubscriptions() {
        this.authService.isLoggedIn$
            .pipe(
                filter(isLoggedIn => isLoggedIn), 
                switchMap(async () => await this.loadMe()), 
                switchMap(()=> {
                    this.socketService.connect({id: this.me?.id, userRole: this.me?.userRole});
                    return of(null);
                }),
                switchMap(() => this.timerService.tokenCountdown$),
                tap(countdown => this.time = countdown), 
                switchMap(() => {
                    if (this.me?.userRole === 'patient') {
                        this.setupPatientNotifications()
                    } 
                    else if (this.me?.userRole === 'doctor') {
                        this.setupDoctorNotifications();
                    } 
                    else if (this.me?.userRole === 'admin') {
                        this.setupAdminNotifications();   
                    }
                    return of(null);
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
    setupUiSyncSubscriptions() {
        const events$ = merge(
            this.uiSyncService.sync(MESSAGE_CREATED),
            this.uiSyncService.sync(MESSAGE_READ)
        );
        const unreadMsgs =  events$
                .subscribe({
                    next: async () => await this.countUnreadMessages(),
                    error: (err) => console.error('Sync failed:', err)
                })

        const userDetails =  this.uiSyncService.sync(USER_UPDATED)
            .pipe(
                switchMap(async () => {await this.loadMe(); this.isUserUpdated = true;}))
            .subscribe({
                error: (err) => console.error('Sync failed:', err)
            });
        this.subscriptions.push(unreadMsgs, userDetails);
    }
    setupPatientNotifications() {
        this.subscriptions.push(
            this.notificationService.onAppointmentAccepted(APPOINTMENT_ACCEPTED).subscribe((notification: AppNotificationEvent) => {
                this.uiSyncService.triggerSync(APPOINTMENT_ACCEPTED);
                this.showNotification(notification);
            }),
            this.notificationService.onAppointmentCancelled(APPOINTMENT_CANCELLED).subscribe((notification: AppNotificationEvent) => {
                this.uiSyncService.triggerSync(APPOINTMENT_CANCELLED);
                this.showNotification(notification);
            }),
            this.notificationService.onAppointmentDeleted(APPOINTMENT_DELETED).subscribe((notification: AppNotificationEvent) => {
                this.uiSyncService.triggerSync(APPOINTMENT_DELETED);
                this.showNotification(notification);
            }),
            this.notificationService.onAppointmentUpdated(APPOINTMENT_UPDATED).subscribe((notification: AppNotificationEvent) => {
                this.uiSyncService.triggerSync(APPOINTMENT_UPDATED);
                this.showNotification(notification);
            }),
            this.notificationService.onRecordCreated(RECORD_CREATED).subscribe((notification: AppNotificationEvent) => {
                this.uiSyncService.triggerSync(RECORD_CREATED);
                this.showNotification(notification);
            })
        );
    }
    setupDoctorNotifications(){
        this.subscriptions.push(
            this.notificationService.onAppointmentCreated(APPOINTMENT_CREATED).subscribe((notification: AppNotificationEvent) => {
                this.uiSyncService.triggerSync(APPOINTMENT_CREATED);
                this.showNotification(notification);
            }),
            this.notificationService.onAppointmentUpdated(APPOINTMENT_UPDATED).subscribe((notification: AppNotificationEvent) => {
                this.uiSyncService.triggerSync(APPOINTMENT_UPDATED);
                this.showNotification(notification);
            }),
            this.notificationService.onAppointmentDeleted(APPOINTMENT_DELETED).subscribe((notification: AppNotificationEvent) => {
                this.uiSyncService.triggerSync(APPOINTMENT_DELETED);
                this.showNotification(notification);
            }),
            this.notificationService.onChatMessageCreated(MESSAGE_CREATED).subscribe((notification: AppNotificationEvent) => {
                this.uiSyncService.triggerSync(MESSAGE_CREATED);
                this.showNotification(notification);
            })
        );
    }
    setupAdminNotifications(){
        this.subscriptions.push(
            this.notificationService.onDoctorRequestCreated(DOCTOR_REQUEST_CREATED).subscribe((notification: AppNotificationEvent) => {
                this.uiSyncService.triggerSync(DOCTOR_REQUEST_CREATED);
                this.showNotification(notification);
            }),
            this.notificationService.onChatMessageCreated(MESSAGE_CREATED).subscribe((notification: AppNotificationEvent) => {
                this.uiSyncService.triggerSync(MESSAGE_CREATED);
                this.showNotification(notification);
            }),
            this.notificationService.onFeedbackCreated(FEEDBACK_CREATED).subscribe((notification: AppNotificationEvent) => {
                this.uiSyncService.triggerSync(FEEDBACK_CREATED);
                this.showNotification(notification);
            })
        ); 
    }
    showNotification(obj:AppNotificationEvent){
        if (obj.message) {
            this.snackbarService.addSnackbar(obj);
        }
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
                this.router.navigate(['']);
            }
        } catch (error) {
            localStorage.clear();
            const ref = this.dialog.open(AlertComponent, {data: {message: "Fatal error: "+error}});
            ref.componentInstance.ok.subscribe(() => {
                this.router.navigate(['/']);
            })
        }
    }
    openChat() {
        if (this.expand) this.uiSyncService.openSidenav(!this.expand);
        this.router.navigate(['/home/messages']);
    }
    openCalendar() {
        if (this.userRole === 'admin') {
            this.router.navigate(['/home/calendar']);
        } else {
            this.router.navigate(['/home/appointments/calendar']);
        }
        if (this.expand) this.uiSyncService.openSidenav(!this.expand);
    }

    ngOnDestroy() {
        this.subscriptions.forEach(sub => sub.unsubscribe());
        this.destroy$.next();
        this.destroy$.complete();
    }
    async onLogIn(){
        this.dialog.open(LoginMenuComponent);  
        showLoginCredentialPopups(this.dialog);        
    }

    async onLogOut() {   
        if (this.userRole === 'doctor') {
            this.roomService.leaveDoctorRoom(this.me!.id);
        } 
        this.timerService.cancelTokenTimer(); 
        this.snackbarService.clearSnackbars();
        this.dialog.open(LoadingComponent);

        this.me = null;
        this.time = null;
        this.ngOnDestroy();
       
        await this.authService.logOut();
        this.socketService.disconnect();
    }
    toggleSidenav(){
        this.uiSyncService.openSidenav(!this.expand);
    }
}
      