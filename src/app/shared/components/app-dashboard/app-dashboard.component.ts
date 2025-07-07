import { Component, Input, OnDestroy, OnInit } from "@angular/core";
import { User } from "../../../graphql/user/user";
import { merge, Subscription } from "rxjs";
import { DateTime } from "luxon";
import { MatDialog } from "@angular/material/dialog";
import { AppGraphQLService } from "../../services/app-graphql.service";
import { AppUserRoomService } from "../../services/socket/app-user-room.service";
import { AppUiSyncService } from "../../services/app-ui-sync.service";
import { AppTimerService } from "../../services/app-timer.service";
import { AppStepperComponent as CreateNewUser } from "../app-stepper-create-user/app-stepper.component";
import { UserComponent } from "../../../graphql/user/user.component";
import { AlertComponent } from "../app-alert/app-alert.component";
import { getLastLogOutStr, getTodayWeekdayTime } from "../../utils";
import { DOCTOR_REQUEST_CREATED, FEEDBACK_CREATED, MESSAGE_CREATED } from "../../constants";

@Component({
    selector: 'app-dashboard',
    templateUrl: 'app-dashboard.component.html',
    styleUrls: ['app-dashboard.component.scss']
})
export class AppDashboardComponent implements OnInit, OnDestroy{
    @Input() me!: User;

    countUnreadFeedback:number=0;
    countDoctorRequests:number=0;
    countMissedAppointments:number=0;
    countUnreadMessages:number=0;

    isSocketConnected:boolean = false;
    isLoading: boolean = true;
    lastLogOut!: string;

    doctors: User[] = [];
    doctorsLength: number = 0;
    today: { weekday: string, time: string, date: string} | undefined;
    clock: string | undefined;

    subscriptions: Subscription[] = [];

    constructor(
        private graphQLService: AppGraphQLService,
        private dialog: MatDialog,
        private roomService: AppUserRoomService,
        private uiSyncService: AppUiSyncService,
        private timerService: AppTimerService 
    ){}

    async ngOnInit() {
        if (this.me) {
            const str = getLastLogOutStr(this.me.lastLogOutAt);
            this.lastLogOut = str !== 'Invalid DateTime' ? str : '-';

            switch (this.me.userRole) {
                case 'admin':
                    this.today = getTodayWeekdayTime();
                    const now = DateTime.now().setZone('Europe/Helsinki').toISO();
                    this.timerService.startClock(now!);
                    await this.initAdminDashboard();
                    this.setupAdminSubscriptions();
                    this.isLoading = false;
                    break;
                // case 'doctor':
                //     this.initDoctorDashboard();
                //     break;
                // case 'patient':
                //     this.initPatientDashboard();
                //     break;
            }
        }
    }

    async initAdminDashboard() {
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
                    countMissedAppointments
                    countUnreadFeedback
                    countDoctorRequests
                    countUnreadMessages
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
                        this.doctors = (response.data.doctors.slice).map((doctor: User) => {
                            return {
                                ...doctor,
                                createdAt: DateTime.fromISO(doctor.createdAt, {zone: 'Europe/Helsinki'}).toLocaleString(DateTime.DATETIME_MED)
                            }
                        });
                        this.doctorsLength = response.data.doctors.length;
                        this.countDoctorRequests = response.data.countDoctorRequests;
                        this.countMissedAppointments = response.data.countMissedAppointments;
                        this.countUnreadFeedback = response.data.countUnreadFeedback;
                        this.countUnreadMessages = response.data.countUnreadMessages;
                    }
                } catch (error) {
                    this.dialog.open(AlertComponent, {data: {message: "Unexpected error loading requests: "+error}})
                }
    }

    setupAdminSubscriptions() {
        const dashboardEvents$ = merge(
            this.uiSyncService.sync(MESSAGE_CREATED),
            this.uiSyncService.sync(FEEDBACK_CREATED),
            this.uiSyncService.sync(DOCTOR_REQUEST_CREATED)
        );

        const subscriptions = [
            this.timerService.clock.subscribe(value=> {
                this.clock = value;
            }),
            this.roomService.onUserStatus().subscribe({
                next: (status) => {
                    this.isSocketConnected = status.online; 
                },
                error: (err) => console.error('Status sync error:', err)
            }),
            dashboardEvents$
                .subscribe({
                    next: async () => {await this.initAdminDashboard()},
                    error: (err) => console.error('Sync failed:', err)
                })
        ]
        this.subscriptions.push(...subscriptions);
    }
    // async unreadMessages() {
    //     const query = `query {
    //         countUnreadMessages
    //     }`
    //     try {
    //         const response = await this.graphQLService.send(query);
    //         if (response.data) {    
    //             this.countUnreadMessages = response.data.countUnreadMessages;
    //         }
    //         } catch (error) {
    //         this.dialog.open(AlertComponent, {data: {message: "Unexpected error loading messages: "+error}})
    //     }
    // }                                                                
    // async doctorRequests() {
    //     const query = `query {
    //         countDoctorRequests
    //     }`
    //     try {
    //         const response = await this.graphQLService.send(query);
    //         if (response.data) {
    //             this.countDoctorRequests = response.data.countDoctorRequests;
    //         }
    //     } catch (error) {
    //         this.dialog.open(AlertComponent, {data: {message: "Unexpected error loading requests: "+error}})
    //     }
    // }

    // async unreadFeedback() {
    //     const query = `query {
    //         countUnreadFeedback
    //     }`
    //     try {
    //         const response = await this.graphQLService.send(query);
    //         if (response.data) {
    //             this.countUnreadFeedback = response.data.countUnreadFeedback;
    //         }
    //     } catch (error) {
    //         this.dialog.open(AlertComponent, {data: {message: "Unexpected error loading feedback: "+error}})
    //     }
    // }

    onListOpen(userId:number){
        const dialogRef = this.dialog.open(UserComponent, {data: {userId}});
        
        this.subscriptions.push(dialogRef.componentInstance.isDeletingUser.subscribe(async subscription => {
            if (subscription) {
                await this.deleteUser(userId);
            }
        }));
    }
    async deleteUser(id: number){
        const mutation = `mutation ($userId: Int!) {
            deleteUser(userId: $userId) {
                success
                message
            }
        }`
        try {
            const response = await this.graphQLService.mutate(mutation, { userId: id});
            if (response.data.deleteUser.success) {
                this.dialog.closeAll();
                await this.initAdminDashboard();
                this.dialog.open(AlertComponent, {data: {message: "Account deleted"}});
            } else {
                this.dialog.open(AlertComponent, {data: {message:response.data.deleteUser.message}});
            }
        } catch (error) {
            this.dialog.open(AlertComponent, { data: {message: "Error deleting user: "+ error}});
        }
    }

    onCreateNewUser() {
        this.dialog.open(CreateNewUser);
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach(sub => sub.unsubscribe());
    }

}