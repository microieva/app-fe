import { Component, ElementRef, EventEmitter, OnInit, Output, QueryList, ViewChild, ViewChildren, ViewContainerRef, signal } from "@angular/core";
import { trigger, state, style, transition, animate } from "@angular/animations";
import { ActivatedRoute, Router } from "@angular/router";
import { MatTableDataSource } from "@angular/material/table";
import { MatTabGroup } from "@angular/material/tabs";
import { MatDialog } from "@angular/material/dialog";
import { DateTime } from "luxon";
import { AppGraphQLService } from "../../../shared/services/app-graphql.service";
import { AppAppointmentService } from "../../../shared/services/app-appointment.service";
import { AppTimerService } from "../../../shared/services/app-timer.service";
import { AppointmentComponent } from "../appointment.component";
import { AppTabsService } from "../../../shared/services/app-tabs.service";
import { AlertComponent } from "../../../shared/components/app-alert/app-alert.component";
import { ConfirmComponent } from "../../../shared/components/app-confirm/app-confirm.component";
import { EventComponent } from "../../../shared/components/app-event/app-event.component";
import { AppointmentDataSource } from "../../../shared/types";
import { Appointment } from "../appointment";

@Component({
    selector: 'app-appointments',
    templateUrl: './appointments.component.html',
    styleUrls: ['./appointments.component.scss'],
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
    ]
})
export class AppointmentsComponent implements OnInit {
    selectedIndex: number = 0;
    id!: number;
    routedAppointmentId: number | undefined;
    length: number = 0;
    now: boolean = false;
    nextAppointmentStartTime: string | undefined;
    appointment: Appointment | null = null;
    private previousNextId: number | null = null;
    nextId: number | null = null;
    markAppointmentId: number| null = null;

    @ViewChildren('tabContent', { read: ViewContainerRef }) tabContents!: QueryList<ViewContainerRef>;
    tabs: any[] | null = null;
    @ViewChild('tabGroup', { static: true }) tabGroup!: MatTabGroup;

    countPendingAppointments: number = 0;
    countUpcomingAppointments: number = 0;
    countPastAppointments: number = 0;

    pendingDataSource: AppointmentDataSource[] | null = null;
    upcomingDataSource: AppointmentDataSource[] | null = null;
    pastDataSource: AppointmentDataSource[] | null = null;

    pendingAppointments: Appointment[] = [];
    upcomingAppointments: Appointment[] = [];
    pastAppointments: Appointment[] = [];
    isReservedDay: boolean = false;
    dataSource: MatTableDataSource<AppointmentDataSource> | null = null;

    @Output() activeTab = new EventEmitter<string>();
    @ViewChild('scrollView') scrollView!: ElementRef;
    readonly panelOpenState = signal(false);

    userRole!: string;
    pageIndex: number = 0;
    pageLimit: number = 10;
    sortDirection: string | null = null;
    sortActive: string | null = 'start';
    filterInput: string | null = null;

    constructor(
        private graphQLService: AppGraphQLService,
        private router: Router,
        private dialog: MatDialog,
        private activatedRoute: ActivatedRoute,
        private appointmentService: AppAppointmentService,
        private timerService: AppTimerService,
        public tabsService: AppTabsService
    ){}
    
    async ngOnInit() {
        this.tabs = this.tabsService.getTabs();
        await this.loadUserRole();

        if (this.userRole !=='admin') {
            await this.loadStatic();
            await this.loadData();
        }
        
        this.activatedRoute.queryParams.subscribe(async (params)=> {
            const id = params['id']; 
            if (id) this.routedAppointmentId = +id;
        });
        
        this.activatedRoute.queryParams.subscribe(async params => {
            const tab = params['tab'];
            this.selectedIndex = tab ? +tab : 0;
        }); 

        this.appointmentService.appointmentInfo.subscribe((subscription) => {
            if (subscription && subscription.nextAppointment) {
                this.nextId = subscription.nextAppointment.nextId;

                if (this.previousNextId !== this.nextId) {
                    this.previousNextId = this.nextId;
                    this.timerService.startAppointmentTimer(subscription.nextAppointment.nextStart);
                }
                this.nextAppointmentStartTime = DateTime.fromISO(subscription.nextAppointment.nextStart, {setZone: true}).toFormat('hh:mm a');
            }
        });

        this.timerService.nextAppointmentCountdown.subscribe(async value => {
            if (value === '00:05:00') {  
                this.createAppointmentTab();
            } 
        });
    }
    createAppointmentTab(appointmentId?: number) {
        const id = this.nextId
        const title = this.nextAppointmentStartTime;
        const component = AppointmentComponent;

        if (id && title && !appointmentId) {
            this.tabsService.addTab(title, component, id, this.tabGroup);

            this.tabs = this.tabsService.getTabs();
            this.router.navigate([], {
                relativeTo: this.activatedRoute,
                queryParams: { tab: 3},
                queryParamsHandling: 'merge' 
            });
        }

        if (appointmentId) {
            this.tabsService.addTab("Appointment Workspace", component, appointmentId, this.tabGroup);

            this.tabs = this.tabsService.getTabs();
            this.router.navigate([], {
                relativeTo: this.activatedRoute,
                queryParams: { tab: 3},
                queryParamsHandling: 'merge' 
            });
        }
    }
    onTabClose(id: number){
        this.tabsService.closeTab(id);
        this.tabs = this.tabsService.getTabs();
    }
    
    async loadData() {
        switch (this.selectedIndex) {
            case 0:
                if (this.countPendingAppointments > 0) {
                    await this.loadPendingAppointments();
                }
                return;
            case 1:
                if (this.countUpcomingAppointments > 0) {
                    await this.loadUpcomingAppointments();
                }
                return;
            case 2:
                if (this.countPastAppointments > 0) {
                    await this.loadPastAppointments();
                }
                return;
            default:
                return;
        }
    }

    async loadUserRole() {
        const query = `query { 
            me { userRole }
        }`

        try {
            const response = await this.graphQLService.send(query);
            if (response.data.me.userRole) {
                this.userRole = response.data.me.userRole;
            }
        } catch (error) {
            this.router.navigate(['/'])
        }
    }
    async loadStatic(){
        const query = `query {
                    countPendingAppointments
                    countUpcomingAppointments
                    countPastAppointments
                }`
                try {
                    const response = await this.graphQLService.send(query);
                    if (response.data) {
                        this.countPendingAppointments = response.data.countPendingAppointments
                        this.countUpcomingAppointments = response.data.countUpcomingAppointments
                        this.countPastAppointments = response.data.countPastAppointments
                    }
                } catch (error) {
                    this.dialog.open(AlertComponent, {data: {message: "Error getting count: "+error}})
                }
    }
    async onTabChange(value: any) {
        this.selectedIndex = value;

        this.router.navigate([], {
          relativeTo: this.activatedRoute,
          queryParams: { tab: value }
        });
        await this.loadData();
    }

    async onPageChange(value: any) {
        this.pageIndex = value.pageIndex;
        this.pageLimit = value.pageLimit;
        await this.loadData();
    }
    async onSortChange(value: any) {
        switch (value.active) {
            case 'howLongAgoStr':
                this.sortActive = 'createdAt';
                break;
            case 'howSoonStr':
                this.sortActive = 'start';
                break;
            case 'pastDate':
                this.sortActive = 'end';
                break;
            case 'patientName':
            case 'name':
                this.sortActive = 'firstName';
                break;
        }        

        if (value.direction)
        this.sortDirection = value.direction.toUpperCase();
        await this.loadData();
    }
    async onFilterValueChange(value: any){
        this.filterInput = value;
        await this.loadData();
    }
    scrollToTop() {
        if (this.scrollView) {
          this.scrollView.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
    
    async loadPendingAppointments() {
        const query = `query (
            $pageIndex: Int!, 
            $pageLimit: Int!, 
            $sortDirection: String, 
            $sortActive: String,
            $filterInput: String
        ){
            pendingAppointments (
                pageIndex: $pageIndex, 
                pageLimit: $pageLimit,
                sortDirection: $sortDirection,
                sortActive: $sortActive,
                filterInput: $filterInput
            ){
                length
                slice {
                    ... on Appointment {
                        id
                        start
                        end
                        patientId
                        doctorId
                        createdAt
                        allDay     
                        patient {
                            firstName
                            lastName
                        }
                        doctor {
                            firstName
                            lastName
                        }
                        record {
                            id
                            title
                            text
                        }
                    }    
                }
            }
        }`
        const variables = {
            pageIndex: this.pageIndex,
            pageLimit: this.pageLimit,
            sortActive: this.sortActive || 'start',
            sortDirection: this.sortDirection || 'ASC',
            filterInput: this.filterInput
        }
        
        try {
            const response = await this.graphQLService.send(query, variables);
            if (response.data.pendingAppointments) {
                this.pendingAppointments = response.data.pendingAppointments.slice;
                this.length = response.data.pendingAppointments.length;
                this.formatDataSource("pending");

                if (this.pendingDataSource) {
                    this.dataSource = new MatTableDataSource<AppointmentDataSource>(this.pendingDataSource);
                }
            }
        } catch (error){
            this.dialog.open(AlertComponent, {data: {message: "Unexpected error while getting pending appointments: "+error}})
        }
    }
    async loadUpcomingAppointments() {
        const query = `query (
            $pageIndex: Int!, 
            $pageLimit: Int!, 
            $sortDirection: String, 
            $sortActive: String,
            $filterInput: String
        ){
            upcomingAppointments (
                pageIndex: $pageIndex, 
                pageLimit: $pageLimit,
                sortDirection: $sortDirection,
                sortActive: $sortActive,
                filterInput: $filterInput
            ){
                length
                slice {
                    ... on Appointment {
                        id
                        start
                        end
                        patientId
                        doctorId
                        createdAt
                        allDay     
                        patient {
                            firstName
                            lastName
                        }
                    }    
                }
            }
        }`
        const variables = {
            pageIndex: this.pageIndex,
            pageLimit: this.pageLimit,
            sortActive: this.sortActive,
            sortDirection: this.sortDirection || 'ASC',
            filterInput: this.filterInput
        }

        try {
            const response = await this.graphQLService.send(query, variables);
            if (response.data.upcomingAppointments) {
                this.upcomingAppointments = response.data.upcomingAppointments.slice;
                this.length = response.data.upcomingAppointments.length;
                this.formatDataSource("upcoming");
                
                if (this.upcomingDataSource) {
                    this.dataSource = new MatTableDataSource<AppointmentDataSource>(this.upcomingDataSource);
                }
            }
        } catch (error){
            this.dialog.open(AlertComponent, {data: {message: "Unexpected error while getting upcoming appointments: "+error}})
        }
    }
    async loadPastAppointments() {
        const query = `query (
            $pageIndex: Int!, 
            $pageLimit: Int!, 
            $sortDirection: String, 
            $sortActive: String,
            $filterInput: String
        ){
            pastAppointments (
                pageIndex: $pageIndex, 
                pageLimit: $pageLimit,
                sortDirection: $sortDirection,
                sortActive: $sortActive,
                filterInput: $filterInput
            ){
                length
                slice {
                    ... on Appointment {
                        id
                        start
                        end
                        patientId
                        doctorId
                        createdAt
                        allDay     
                        patient {
                            firstName
                            lastName
                        }
                    }    
                }
            }
        }`
        const variables = {
            pageIndex: this.pageIndex,
            pageLimit: this.pageLimit,
            sortActive: this.sortActive,
            sortDirection: this.sortDirection || 'DESC',
            filterInput: this.filterInput
        }

        try {
            const response = await this.graphQLService.send(query, variables);
            if (response.data.pastAppointments) {
                this.pastAppointments = response.data.pastAppointments.slice;
                this.length = response.data.pastAppointments.length;
                this.formatDataSource("past");

                if (this.pastDataSource) {
                    this.dataSource = new MatTableDataSource<AppointmentDataSource>(this.pastDataSource);
                }
            }
        } catch (error){
            this.dialog.open(AlertComponent, {data: {message: "Unexpected error while getting past appointments: "+error}})
        }
    }
    async checkIsReservedDay(date: string) {
        const query = `query ($date: Date!) { isReservedDay (date: $date)}`
        
        try {
            this.isReservedDay = await this.graphQLService.send(query, {date: DateTime.fromISO(date).toJSDate()});
        } catch (error) {
           console.error(error);
        }
    }

    formatDataSource(view: string) {
        const allButtons = [
            {
                text: 'Cancel Appointment',
                disabled: false
            }, {
                text: 'Accept Appointment',
                disabled: false
            }, {
                text: 'View In Calendar',
                disabled: false
            }];
        const cancelButton = [
            {
                text: 'Cancel Appointment',
                disabled: false
            }
        ]
        const deleteButton = [
            {
                text: 'Delete Appointment',
                disabled: false
            }
        ]
        switch (view) {
            case "pending":
                this.pendingDataSource = this.pendingAppointments.map(row => {
                    const howLongAgoStr = this.getHowLongAgo(row.createdAt);
                    this.checkIsReservedDay(row.start);

                    return {
                        id: row.id,
                        howLongAgoStr: howLongAgoStr,
                        title: this.userRole === 'patient' ? "Pending doctor confirmation" : undefined,
                        buttons: this.userRole === 'doctor' ? allButtons : cancelButton,
                        date: DateTime.fromISO(row.start, {setZone: true}).toFormat('MMM dd, yyyy'),
                        start: DateTime.fromISO(row.start, {setZone: true}).toFormat('hh:mm a'),
                        end: DateTime.fromISO(row.end, {setZone: true}).toFormat('hh:mm a'),
                        patientName: this.userRole==='doctor' ? `${row.patient.firstName} ${row.patient.lastName}` : undefined
                    } 
                });
                break;
            case "upcoming":
                this.upcomingDataSource = this.upcomingAppointments.map(row => {
                    const howSoonStr = this.getHowSoonUpcoming(row.start);
  
                    return {
                        id: row.id,
                        howSoonStr,
                        title: this.userRole === 'patient' ? "Confirmed appointment" : undefined,
                        buttons: cancelButton,
                        date: DateTime.fromISO(row.start, {setZone: true}).toFormat('MMM dd, yyyy'),
                        start: DateTime.fromISO(row.start, {setZone: true}).toFormat('hh:mm a'),
                        end: DateTime.fromISO(row.end, {setZone: true}).toFormat('hh:mm a'),
                        patientName: this.userRole==='doctor' ? `${row.patient.firstName} ${row.patient.lastName}`: undefined
                    };
                });
                break;
            case "past":
                this.pastDataSource = this.pastAppointments.map(row => {
                    const howLongAgoStr = this.getHowLongAgo(row.start);

                    return {
                        id: row.id,
                        pastDate: howLongAgoStr,
                        title: this.userRole === 'patient' ? "View details": undefined,
                        buttons: deleteButton,
                        date: DateTime.fromISO(row.start, {setZone: true}).toFormat('MMM dd, yyyy'),
                        start: DateTime.fromISO(row.start, {setZone: true}).toFormat('hh:mm a'),
                        end: DateTime.fromISO(row.end, {setZone: true}).toFormat('hh:mm a'),
                        patientName: this.userRole==='doctor' ? `${row.patient.firstName} ${row.patient.lastName}`: undefined
                    };
                });
                break;
            default:
                break;
        }
    }
    getHowSoonUpcoming(datetime: string) {
        const now = DateTime.now().setZone('Europe/Helsinki');
        const inputDate = DateTime.fromISO(datetime, { zone: 'utc' }).setZone('Europe/Helsinki', {keepLocalTime: true});
    
        const diff = inputDate.diff(now, ['years', 'months', 'days', 'hours', 'minutes', 'seconds']);
        let howSoonStr = 'in ';

        if (diff.years > 0) {
            howSoonStr += `${diff.years} year${diff.years === 1 ? '' : 's'} `;
        }
        if (diff.months > 0) {
            howSoonStr += `${diff.months} month${diff.months === 1 ? '' : 's'} `;
        }
        if (diff.days > 0) {
            howSoonStr += `${diff.days} day${diff.days === 1 ? '' : 's'} `;
        }
        if (diff.days < 1 && diff.hours > 0) {
            howSoonStr += `${diff.hours} hour${diff.hours === 1 ? '' : 's'} `;
        }
        if (diff.days < 1 && diff.minutes > 0) {
            howSoonStr += `${diff.minutes} minute${diff.minutes === 1 ? '' : 's'} `;
        }
    
        howSoonStr = howSoonStr.trim();
    
        if (!howSoonStr || howSoonStr === 'in') {
            howSoonStr = 'now';
        }
    
        return howSoonStr;
    }

    getHowLongAgo(datetime: string) {
        const now = DateTime.now().setZone('Europe/Helsinki');
        const inputDate = DateTime.fromISO(datetime, { zone: 'utc' }).setZone('Europe/Helsinki', {keepLocalTime: true});
        const diff = now.diff(inputDate, ['years', 'months', 'days', 'hours', 'minutes', 'seconds']);
        let howLongAgoStr = '';

        if (diff.years > 0) {
            howLongAgoStr += `${diff.years} year${diff.years === 1 ? '' : 's'} `;
        }
        if (diff.months > 0) {
            howLongAgoStr += `${diff.months} month${diff.months === 1 ? '' : 's'} `;
        }
        if (diff.months < 1) {
            howLongAgoStr += `${diff.days} day${diff.days === 1 ? '' : 's'} `;
        }
        if (diff.months <1 && diff.days < 1 && diff.hours > 0) {
            howLongAgoStr += `${diff.hours} hour${diff.hours === 1 ? '' : 's'} `;
        }
        if (diff.months < 1 && diff.days < 1 && diff.hours <1 && diff.minutes > 0) {
            if (diff.minutes <= 5) {
                howLongAgoStr = 'Just now';
            } else {
                howLongAgoStr += `${diff.minutes} minute${diff.minutes === 1 ? '' : 's'} `;
            }
        }
        if (diff.days <1 && diff.minutes === 0 ) {
            howLongAgoStr = 'Just now';
        }

        howLongAgoStr = howLongAgoStr.trim();

        if (howLongAgoStr && howLongAgoStr !== 'Just now') {
            howLongAgoStr += ' ago';
        } 
        return howLongAgoStr;
    }

    openCalendar() {
        this.router.navigate(['home/appointments/calendar'])
    }

    deleteAppointment(id: number) {
        const dialogRef = this.dialog.open(ConfirmComponent, {data: {message: "Deleting permanently"}})
        
        dialogRef.componentInstance.ok.subscribe(async (value)=> {
            if (value) {
                try {
                    const mutation = `mutation ($appointmentId: Int!) {
                        deleteAppointment (appointmentId: $appointmentId) {
                            success
                            message
                        }
                    }`
                    const response = await this.graphQLService.mutate(mutation, {appointmentId: id});
                    if (response.data.deleteAppointment.success) {
                        this.dialog.closeAll();
                        this.ngOnInit();
                    }
                } catch (error) {
                    this.dialog.open(AlertComponent, {data: {message: "Unexpected error while deleting appointment: "+error}})
                }
            }
        });  
    }

    onButtonClick({ id, text }: {id: number, text: string}) {
        switch (text) {
            case 'Cancel Appointment':
                this.deleteAppointment(id);
                break;
            case 'Delete Appointment':
                this.deleteAppointment(id);
                break;
            case 'Accept Appointment':
                if (this.dataSource!.data.length === 1) {
                    this.acceptAppointment(id);
                    this.pageIndex-=-1;
                } else {
                    this.acceptAppointment(id);
                }
                break;
            case 'View In Calendar':
                this.router.navigate(['appointments', 'calendar']);
                break;
            default:
                break;
        }
    }

    onAppointmentClick(eventInfo: {id: string, title: string}){
        if (!eventInfo.title && this.userRole === 'doctor') {
            eventInfo.title = 'Appointment Info'
        }
        const dialogRef = this.dialog.open(EventComponent, {data: {eventInfo, samePatient: true}});
        dialogRef.componentInstance.delete.subscribe(async id => {
            if (id) {
                this.deleteAppointment(id);
            }
        })
        dialogRef.componentInstance.isOpeningTab.subscribe(subscription => {
            if (subscription) {
                this.createAppointmentTab(subscription);
                this.dialog.closeAll();
            }
        });
    }

    async acceptAppointment(id: number) {
        const appointment: Appointment | undefined = this.pendingAppointments.find(app => app.id);
        if (appointment) {
            const mutation = `mutation ($appointmentId: Int!) {
                acceptAppointment(appointmentId: $appointmentId) {
                    success
                    message
                }
            }`
            try {   
                const response = await this.graphQLService.mutate(mutation, {appointmentId: id});

                if (response.data.acceptAppointment.success) {
                    const ref = this.dialog.open(ConfirmComponent, {data: {message: "Appointment added to your calendar"}});

                    ref.componentInstance.ok.subscribe(async subscription => {
                        if (subscription) {
                            this.loadPendingAppointments();
                        }
                    });
                }
            } catch (error) {
                this.dialog.open(AlertComponent, {data: {message: `Unexpected error: ${error}`}})
            }
        }
    } 
}