import { Component, OnInit, Renderer2 } from "@angular/core";
import { AppAuthService } from "../../services/app-auth.service";
import { ActivatedRoute, Router } from "@angular/router";
import { Subscription } from "rxjs";
import { MatDialog } from "@angular/material/dialog";
import { DateTime } from "luxon";
import { environment } from "../../../../environments/environment";
import { AppAppointmentService } from "../../services/app-appointment.service";
import { AppCountUnreadMessagesService } from "../../services/app-count-unread.service";
import { AppDialogService } from "../../services/app-dialog.service";
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

@Component({
    selector: 'app-header',
    templateUrl: 'app-header.component.html',
    styleUrls: ['app-header.component.scss']
})
export class AppHeader implements OnInit {
    unreadMessages: string = '';
    missedAppointments: string | undefined;
    isDisabled:boolean = true;

    me: User | null = null;
    nowAppointment: Appointment | null = null;

    remainder!: Subscription;
    time!: string | null;
    userRole: string | null = null;
    isUserUpdated: boolean = false;

    snackbarMessage: string | undefined;
    snackbarAppointmentId: number | undefined;
    snackbarReceiverId: number | undefined;

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
        private snackbarService: AppSnackbarService,
        private dialogService: AppDialogService,
        private countService: AppCountUnreadMessagesService
    ){}
    async ngOnInit() {
        if (this.authService.isAuth()) {
            this.router.navigate(['/home'])
            await this.loadMe();
            const tokenExpire = localStorage.getItem('tokenExpire');
            if (tokenExpire && this.me) {
                this.socketService.registerUser({id: this.me.id, userRole: this.me.userRole} as User);
                this.remainder = this.timerService.startTokenTimer(tokenExpire);
    
                const subTokenCountDown = this.timerService.tokenCountdown.subscribe(value=> {
                    this.time = value;
                });
                const subSessionExpire = this.timerService.logout.subscribe(async value => {
                    if (value) {
                        this.time = null;
                        await this.onLogOut();
                        this.remainder.unsubscribe();
                    }
                });
                const subSessionExpireClickedOk = this.timerService.ok.subscribe(value => {
                    if (value) this.router.navigate(['/'])
                });
                const subNotifications = this.socketService.receiveNotification().subscribe(async (subscription: any)=> {
                    if (subscription && subscription.receiverId) {
                        if (this.me?.id === JSON.parse(subscription.receiverId)) {
                            if (subscription.chatId) {
                                this.snackbarService.show(subscription.message, null, null, subscription.chatId, subscription.sender);
                                this.countService.countUnreadMessages();
                                if (this.userRole === 'admin') {
                                    this.socketService.requestOnlineUsers()
                                }
                            } else {
                                this.snackbarMessage = subscription.message;
                                this.snackbarAppointmentId = subscription.appointmentId;
                                this.snackbarReceiverId = subscription.receiverId;
                                this.snackbarService.show(subscription.message, subscription.appointmentId, subscription.doctorRequestId, null, null);
                            }
                        }
                    } else if (subscription && subscription.message === "New appointment request") {
                        this.snackbarMessage = subscription.message;
                        this.snackbarAppointmentId = subscription.appointmentId;
                        this.snackbarReceiverId = subscription.receiverId;
                    }
                });
    
                const subMatDialogButtons = this.dialogService.dialogOpened$.subscribe(() => {
                    const eventComponent = document.querySelector('app-event');
                    const confirmComponent = document.querySelector('app-confirm');
        
                    if (eventComponent) {
                        const actionButton = eventComponent.querySelector('#submit-btn');
                        if (actionButton) {
                            this.buttonClickListener = this.renderer.listen(
                                actionButton,
                                'click',
                                () => { 
                                    if (this.snackbarMessage === "New appointment request") {
                                        this.socketService.notifyDoctors({
                                            message: this.snackbarMessage,
                                            appointmentId: this.snackbarAppointmentId
                                        });
                                    }
                                }
                            );
                        }
                    }
                    if (confirmComponent) {
                        const actionButton = confirmComponent.querySelector('#confirm-btn');
                        if (actionButton) {
                            this.buttonClickListener = this.renderer.listen(
                                actionButton,
                                'click',
                                () => { 
                                    this.socketService.notifyDoctor({
                                        message: this.snackbarMessage,
                                        doctorId: this.snackbarReceiverId
                                    });
                                }
                            );
                        }
                    }
                });
                const subUpdateMissedAppointmentsCount = this.socketService.getMissedAppointmentsCount()  
                    .subscribe(async isUpdated => {
                        if (isUpdated) {
                            await this.countMissedAppointments();
                        }
                    });
    
                this.subscriptions.add(subTokenCountDown); 
                this.subscriptions.add(subSessionExpire); 
                this.subscriptions.add(subSessionExpireClickedOk); 
                this.subscriptions.add(subNotifications); 
                this.subscriptions.add(subMatDialogButtons); 
                this.subscriptions.add(subUpdateMissedAppointmentsCount);
    
                if (this.userRole === 'admin') {
                    this.socketService.requestOnlineUsers();
                    this.socketService.requestCountMissedAppointments();
                    await this.countMissedAppointments();
                }
    
                if (this.userRole === 'doctor') {
                    await this.appointmentService.pollNextAppointment();
    
                    const nowAppointment = await this.appointmentService.loadNowAppointment();
                    let isTabAdded: boolean = false;
    
                    if (nowAppointment) {
                        const patientName = nowAppointment.patient.firstName+" "+nowAppointment.patient.lastName;
                        const start = DateTime.fromISO(nowAppointment.start,  {zone: 'utc'}).setZone().toFormat('HH:mm a');
                        isTabAdded = JSON.parse(localStorage.getItem('tabs') || '[]').find((tab: any)=> tab.id === nowAppointment?.id);
                        let isTabCreated: boolean;
                        
                        const subRouteParams = this.activatedRoute.queryParams.subscribe(params => {
                            const tab = params['tab'];
                            if (!tab) isTabCreated = false;
                            isTabCreated = true;
                        });
    
                        if (!isTabAdded) {
                            this.tabsService.addTab("offline start: "+start, AppointmentComponent, nowAppointment.id);
                            this.dialog.open(AlertComponent, {data: {message: "Current appointment with "+patientName+"\nStarted at "+start}});
                            this.nowAppointment = nowAppointment;
                        } 
                        this.subscriptions.add(subRouteParams);
                    }
    
                    const subNextAppointmentInfo = this.appointmentService.appointmentInfo.subscribe((subscription) => {
                        if (subscription && subscription.nextAppointment) {
                            this.timerService.startAppointmentTimer(subscription.nextAppointment.nextStart);
                            const start = DateTime.fromISO(subscription.nextAppointment.nextStart, { setZone: true }).setZone('Europe/Helsinki', { keepLocalTime: true }); 
                            
                            const subAppointmentCountDown = this.timerService.nextAppointmentCountdown.subscribe(async value => {
                                if (value === environment.triggerTime) {
                                    const displayTime = `\n Starting at ${start.toFormat('HH:mm a')}`
                                    const ref = this.dialog.open(AlertComponent, {data: { message: `You have an appointment in 5 min. ${displayTime}`}});    
                                    const tabs = this.tabsService.getTabs();
    
                                    if (tabs) {
                                        const isCreated = tabs.some(tab => tab.id === subscription.nextAppointment.nextId)
                                        if (!isCreated) {
                                            this.tabsService.addTab(start.toFormat('HH:mm a'), AppointmentComponent, subscription.nextAppointment.nextId);
                                        }
                                    } 
                                    const subAlertClickOk = ref.componentInstance.ok.subscribe(ok => {
                                        if (ok) {
                                            this.dialog.closeAll();
                                            this.router.navigate(['/home/appointments'], {
                                                relativeTo: this.activatedRoute,
                                                queryParams: { tab: 3 },
                                                queryParamsHandling: 'merge' 
                                            });
                                        }
                                    });
                                    this.subscriptions.add(subAlertClickOk);
                                }
                            });
                            this.subscriptions.add(subAppointmentCountDown);
                        }
                    });
                    const subNewAppointmentNotification = this.socketService.newAppointmentRequest().subscribe((info: any)=> {
                        if (info) {
                            this.snackbarService.show(info.message, info.appointmentId, null, null, null); 
                        }
                    });
                    const subDeletedAppointmentNotification = this.socketService.deletedAppointmentInfo().subscribe((info: any)=> {
                        if (info && this.me?.id === info.doctorId) {
                            this.snackbarService.show(info.message, null, null, null, null); 
                        }
                    });
                    this.subscriptions.add(subNextAppointmentInfo);
                    this.subscriptions.add(subNewAppointmentNotification);
                    this.subscriptions.add(subDeletedAppointmentNotification);
                }
                
                if (this.me.updatedAt) {
                    if (this.userRole !=='patient') {
                        this.countService.countUnreadMessages();   
                    }
                    const subUnreadMessagesCount = this.countService.unreadCount$.subscribe((count) => {
                        if (count !== 0) {
                            if (this.userRole !== 'patient') {
                                this.unreadMessages = count.toString();
                            }
                        } else {
                            this.unreadMessages = ''
                        }
                    });
                    this.subscriptions.add(subUnreadMessagesCount);
                }          
            } 

        } 
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
        }`
        try {
            const response = await this.graphQLService.send(query);

            if (response.data.me) {
                this.me = response.data.me;
                this.userRole = response.data.me.userRole;
                this.isUserUpdated = response.data.me.updatedAt;
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

    async countMissedAppointments() {
        const query = `query { countMissedAppointments }`
        try {
            const response = await this.graphQLService.send(query);
            if (response.data.countMissedAppointments !== 0) {
                this.missedAppointments = response.data.countMissedAppointments.toString();
                this.isDisabled = false;
            } 
        } catch (error) {
            this.dialog.open(AlertComponent, {data: {message: error}});
        }
    }
    ngOnDestroy() {
        if (this.buttonClickListener) {
            this.buttonClickListener();
        }
        this.subscriptions.unsubscribe();
    }
    onLogIn(){
        this.dialog.open(LoginMenuComponent)
    }

    async onLogOut() {
        this.dialog.open(LoadingComponent);
        this.timerService.cancelTokenTimer();
        this.me = null;
        this.subscriptions.unsubscribe();
        await this.authService.logOut();
    }
      
}