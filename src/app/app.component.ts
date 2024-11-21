import { Component, OnDestroy, OnInit, Renderer2, ViewChild } from '@angular/core';
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { DateTime } from 'luxon';
import { environment } from '../environments/environment';
import { AppTimerService } from './shared/services/app-timer.service';
import { AppSnackbarService } from './shared/services/app-snackbar.service';
import { AppSocketService } from './shared/services/app-socket.service';
import { AppAppointmentService } from './shared/services/app-appointment.service';
import { AppTabsService } from './shared/services/app-tabs.service';
import { AppAuthService } from './shared/services/app-auth.service';
import { AppGraphQLService } from './shared/services/app-graphql.service';
import { AppDialogService } from './shared/services/app-dialog.service';
import { AppRefreshService } from './shared/services/app-refresh.service';
import { AppCountUnreadMessagesService } from './shared/services/app-count-unread.service';
import { AppointmentComponent } from './graphql/appointment/appointment.component';
import { LoadingComponent } from './shared/components/app-loading/loading.component';
import { AlertComponent } from './shared/components/app-alert/app-alert.component';
import { LoginMenuComponent } from './shared/components/app-login-menu/app-login-menu.component';
import { AppSnackbarContainerComponent } from './shared/components/app-snackbar/app-snackbar.component';
import { Appointment } from './graphql/appointment/appointment';
import { User } from './graphql/user/user';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
    title = 'Health Center';
    unreadMessages: string = '';

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

    @ViewChild('snackbarContainer') snackbarContainer!: AppSnackbarContainerComponent;
    private subscriptions: Subscription = new Subscription();

    constructor (
        private dialog: MatDialog,
        private router: Router,
        private renderer: Renderer2,
        private activatedRoute: ActivatedRoute,
        private authService: AppAuthService,
        private graphQLService: AppGraphQLService,
        private timerService: AppTimerService,
        private appointmentService: AppAppointmentService,
        private tabsService: AppTabsService,
        private http: HttpClient,
        private socketService: AppSocketService,
        private snackbarService: AppSnackbarService,
        private dialogService: AppDialogService,
        private countService: AppCountUnreadMessagesService,
        private refreshService: AppRefreshService
    ) {
    }

    async ngOnInit() {
        const subRouteParams = this.activatedRoute.queryParams.subscribe(params => {
            const code = params['code'];
            const state = params['state'];
            const scope = params['scope']

            if (code && state) {
                this.exchangeCodeForToken(code, state, scope);
            } 
        });
        this.subscriptions.add(subRouteParams); 
        if (localStorage.getItem('authToken')) {
            await this.loadMe();
            const tokenExpire = localStorage.getItem('tokenExpire');
            
            if (tokenExpire && this.me) {
                this.router.navigate(['/home']);
                this.socketService.registerUser({id: this.me.id, userRole: this.me.userRole} as User);
                this.remainder = this.timerService.startTokenTimer(tokenExpire);

                const subTokenCountDown = this.timerService.tokenCountdown.subscribe(value=> {
                    this.time = value;
                });
                const subSessionExpire = this.timerService.logout.subscribe(value => {
                    if (value) {
                        this.time = null;
                        this.logOut();
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
                const subAppRefresh = this.refreshService.refresh$.subscribe((refresh) => {
                    if (refresh) {
                        this.ngOnInit();
                        this.refreshService.resetRefresh(); 
                    }
                });

                this.subscriptions.add(subTokenCountDown); 
                this.subscriptions.add(subSessionExpire); 
                this.subscriptions.add(subSessionExpireClickedOk); 
                this.subscriptions.add(subNotifications); 
                this.subscriptions.add(subMatDialogButtons); 
                this.subscriptions.add(subAppRefresh);

                if (this.userRole === 'admin') {
                    this.socketService.requestOnlineUsers();
                }

                if (this.userRole === 'doctor') {
                    await this.appointmentService.pollNextAppointment();

                    const nowAppointment = await this.appointmentService.loadNowAppointment();
                    let isTabAdded: boolean = false;

                    if (nowAppointment) {
                        const patientName = nowAppointment.patient.firstName+" "+nowAppointment.patient.lastName;
                        const start = DateTime.fromISO(nowAppointment.start,  {setZone: true}).toFormat('HH:mm a');
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
            } else {
                this.router.navigate(['/']);
            }
        } else {
            this.me = null;
            this.userRole = null;
            this.router.navigate(['/']);
        }
    }

    ngOnDestroy() {
        if (this.buttonClickListener) {
            this.buttonClickListener();
        }
        this.subscriptions.unsubscribe();
    }

    ngAfterViewInit() {
        this.snackbarService.setContainer(this.snackbarContainer);
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
                window.location.reload();
            }
        } catch (error) {
            localStorage.clear();
            const ref = this.dialog.open(AlertComponent, {data: {message: error}});
            ref.componentInstance.ok.subscribe(ok => {
                if (ok) window.location.reload();
            })
        }
    }

    onLogIn(){
        this.dialog.open(LoginMenuComponent)
    }

    exchangeCodeForToken(code: string, state: string, scope: any) {

        const tokenEndpoint = 'https://health-center.sandbox.signicat.com/auth/open/connect/token';
        const clientId = 'sandbox-itchy-wheel-954';
        const clientSecret =  'EJTOPAOXSS2c8bPpMOeJpTe64DvbFdWBS2wH5ytbvT7Tt5Yh';
        const redirectUri = 'https://app-fe-gamma.vercel.app/';
      
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
        this.subscriptions.unsubscribe();
        this.authService.logOut(); 
    }
    openChat() {
        this.router.navigate(['/home/messages']);
    }
    openCalendar() {
        this.router.navigate(['/home/appointments/calendar']);
    }
}
