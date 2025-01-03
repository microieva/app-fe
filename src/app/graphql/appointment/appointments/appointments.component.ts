import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, EventEmitter, OnDestroy, OnInit, Output, QueryList, SimpleChanges, ViewChild, ViewChildren, ViewContainerRef, signal } from "@angular/core";
import { trigger, state, style, transition, animate } from "@angular/animations";
import { ActivatedRoute, Router } from "@angular/router";
import { MatTableDataSource } from "@angular/material/table";
import { MatTabGroup } from "@angular/material/tabs";
import { MatDialog } from "@angular/material/dialog";
import { DateTime } from "luxon";
import { Subscription, take, tap } from "rxjs";
import { environment } from '../../../../environments/environment';
import { AppGraphQLService } from "../../../shared/services/app-graphql.service";
import { AppAppointmentService } from "../../../shared/services/app-appointment.service";
import { AppDialogService } from "../../../shared/services/app-dialog.service";
import { AppTimerService } from "../../../shared/services/app-timer.service";
import { AppointmentComponent } from "../appointment.component";
import { AppTabsService } from "../../../shared/services/app-tabs.service";
import { AlertComponent } from "../../../shared/components/app-alert/app-alert.component";
import { ConfirmComponent } from "../../../shared/components/app-confirm/app-confirm.component";
import { EventComponent } from "../../../shared/components/app-event/app-event.component";
import { AppointmentDataSource } from "../../../shared/types";
import { Appointment } from "../appointment";
import { AppSocketService } from "../../../shared/services/app-socket.service";

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
export class AppointmentsComponent implements OnInit, OnDestroy {
    selectedIndex: number = 0;
    isLoading: boolean = true;
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
    displayedColumns: Array<{ columnDef: string, header: string }> = [];

    @Output() activeTab = new EventEmitter<string>();
    @ViewChild('scrollView') scrollView!: ElementRef;

    readonly panelOpenState = signal(false);
    private subscriptions: Subscription = new Subscription();

    userRole!: string;
    pageIndex: number = 0;
    pageLimit: number = 10;
    sortDirection: string | null = null;
    sortActive: string | null= null;
    filterInput: string | null = null;

    //initialized:boolean = false;

    constructor(
        private graphQLService: AppGraphQLService,
        private router: Router,
        private dialog: MatDialog,
        private activatedRoute: ActivatedRoute,
        private appointmentService: AppAppointmentService,
        private timerService: AppTimerService,
        public tabsService: AppTabsService,
        private dialogService: AppDialogService,
        private socketService: AppSocketService
    ){}
    
    async ngOnInit() {
        this.tabs = this.tabsService.getTabs();
        await this.loadUserRole();

        if (this.userRole !=='admin') {
            await this.loadStatic();
            await this.loadData();
        }
        this.isLoading = false;

        const subRouterParamsId = this.activatedRoute.queryParams.subscribe(async (params)=> {
            const id = params['id']; 
            if (id) this.routedAppointmentId = +id;
        });
        
        const subRouterParamsTab = this.activatedRoute.queryParams.subscribe(async params => {
            const tab = params['tab'];
            this.selectedIndex = tab ? +tab : 0;
        }); 

        const subNextAppointmentInfo = this.appointmentService.appointmentInfo$.subscribe((info) => {
            if (info && info.nextAppointment) {
                this.nextId = info.nextAppointment.nextId;

                if (this.previousNextId !== this.nextId) {
                    this.previousNextId = this.nextId;
                }
                this.nextAppointmentStartTime = DateTime.fromISO(info.nextAppointment.nextStart, {setZone:true}).toFormat('HH:mm a');
            }
        });

        const subNextAppointmentCountDown = this.timerService.appointmentCountdown$.subscribe(async value => {
            const start = this.nextAppointmentStartTime;
            if (value === environment.triggerTime) {  
                this.tabs = this.tabsService.getTabs();
                if (this.tabs) {
                    const isCreated = this.tabs.some(tab => tab.id === this.nextId)
                    if (!isCreated) {
                        this.createAppointmentTab();  
                    }
                } 
            } 
            if (value === '00:00:00') {
                await this.appointmentService.pollNextAppointment();
                if (this.nextAppointmentStartTime !== start) {
                    this.timerService.startAppointmentTimer(this.nextAppointmentStartTime!);   
                } 
            }
        });
        this.socketService.refresh$.subscribe(async (isUpdated) => {
            if (isUpdated) {
                await this.ngOnInit()
            }
        });
           
        

        this.subscriptions.add(subRouterParamsId);
        this.subscriptions.add(subRouterParamsTab);
        this.subscriptions.add(subNextAppointmentInfo);
        this.subscriptions.add(subNextAppointmentCountDown);
    }

    ngOnDestroy(){
        this.subscriptions.unsubscribe();
    }


    createAppointmentTab(appointmentId?: number) {
        const id = this.nextId
        const title = this.nextAppointmentStartTime;
        const component = AppointmentComponent;

        if (id && title && !appointmentId) {
            this.tabsService.addTab(title, component, id, this.tabGroup);
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
                await this.loadPendingAppointments();
                return;
            case 1:
                await this.loadUpcomingAppointments();
                return;
            case 2:
                await this.loadPastAppointments();
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
        
        this.sortDirection = null;
        this.sortActive = 'start';
        this.filterInput = null;
        this.pageIndex = 0;

        await this.loadData();
        this.router.navigate([], {
            queryParams: { tab: value }
        });
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
            case 'name':
                this.sortActive = 'firstName';
                break;
            case 'draft':
                this.sortActive = 'draft';
                break;
            case 'record':
                this.sortActive = 'record';
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
                        patientMessage
                        doctorMessage   
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
                        patientMessage
                        doctorMessage    
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
                            draft
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
                        patientMessage
                        doctorMessage    
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
                            draft
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
        let date: string;
        switch (view) {
            case "pending":
                this.pendingDataSource = this.pendingAppointments.map(row => {
                    const howLongAgoStr = row.createdAt;
                    const startDate = DateTime.fromISO(row.start, { setZone: true });
                    const today = DateTime.now().setZone(startDate.zone);
                    const tomorrow = today.plus({ days: 1 });

                    if (startDate.hasSame(today, 'day')) {
                        date = 'Today';
                    } else if (startDate.hasSame(tomorrow, 'day')) {
                        date = 'Tomorrow';
                    } else {
                        date = startDate.toFormat('MMM dd, yyyy'); 
                    }

                    return {
                        id: row.id,
                        howLongAgoStr,
                        title: this.userRole === 'patient' ? "Pending doctor confirmation" : "",
                        date: DateTime.fromISO(row.start, {setZone: true}).toFormat('MMM dd, yyyy'),
                        start: date+`, ${DateTime.fromISO(row.start, {zone: 'utc'}).setZone('utc').toFormat('HH:mm a')}`,
                        end: DateTime.fromISO(row.end, {zone: 'utc'}).setZone('utc').toFormat('HH:mm a'),
                        name: this.userRole==='doctor' ? `${row.patient.firstName} ${row.patient.lastName}` : undefined,
                        message: this.userRole==='doctor' ? row.patientMessage : undefined
                    } 
                });
                if (this.userRole === 'patient') {
                    this.displayedColumns = [ 
                        {header: 'Appointment time', columnDef: 'start'},
                        {header: 'Request created', columnDef: 'howLongAgoStr'}
                    ]
                } else {
                    this.displayedColumns = [ 
                        {header: 'Appointment time', columnDef: 'start'},
                        {header: `Patient's name`, columnDef: 'name'},
                        {header: 'Request created', columnDef: 'howLongAgoStr'}
                    ]
                }
                break;
            case "upcoming":
                this.upcomingDataSource = this.upcomingAppointments.map(row => {
                    const howSoonStr = row.start;
                    const startDate = DateTime.fromISO(row.start, { setZone: true });
                    const today = DateTime.now().setZone(startDate.zone);
                    const tomorrow = today.plus({ days: 1 });

                    if (startDate.hasSame(today, 'day')) {
                        date = 'Today';
                    } else if (startDate.hasSame(tomorrow, 'day')) {
                        date = 'Tomorrow';
                    } else {
                        date = startDate.toFormat('MMM dd, yyyy');
                    }
  
                    return {
                        id: row.id,
                        howSoonStr,
                        title: this.userRole === 'patient' ? "Confirmed appointment" : undefined,
                        date: DateTime.fromISO(row.start, {setZone: true}).toFormat('MMM dd, yyyy'),
                        start: date+`, ${DateTime.fromISO(row.start, {zone: 'utc'}).setZone('utc').toFormat('HH:mm a')}`,
                        end: DateTime.fromISO(row.end, {zone: 'utc'}).setZone('utc').toFormat('HH:mm a'),
                        name: this.userRole==='doctor' ? `${row.patient.firstName} ${row.patient.lastName}` : `${row.doctor?.firstName} ${row.doctor?.lastName}`,
                        message: this.userRole==='doctor' ? row.patientMessage : row.doctorMessage,
                        draft: this.userRole==='doctor' && row.record ? row.record.draft : undefined,
                        record: this.userRole==='patient' && row.record && !row.record.draft ? true : undefined,
                    };
                });

                this.displayedColumns = [ 
                    {header: 'Appointment time', columnDef: 'start'},
                    {header: this.userRole==='doctor' ? `Patient's name`:`Doctor's name`, columnDef: 'name'},
                    {header: 'Starts', columnDef: 'howSoonStr'},
                    {header: 'Record', columnDef: this.userRole==='doctor' ? 'draft': 'record'}
                ]
                break;
            case "past":
                this.pastDataSource = this.pastAppointments.map(row => {
                    const howLongAgoStr = row.end;
                    const startDate = DateTime.fromISO(row.start, { setZone: true });
                    const today = DateTime.now().setZone(startDate.zone);
                    const yesterday = today.minus({ days: 1 });
                    
                    if (startDate.hasSame(today, 'day')) {
                      date = 'Today';
                    } else if (startDate.hasSame(yesterday, 'day')) {
                      date = 'Yesterday';
                    } else {
                      date = startDate.toFormat('MMM dd, yyyy'); 
                    }  

                    return {
                        id: row.id,
                        pastDate: howLongAgoStr,
                        title: this.userRole === 'patient' ? "View details": undefined,
                        date: DateTime.fromISO(row.start, {zone: 'utc'}).setZone('utc').toFormat('MMM dd, yyyy'),
                        start: date+`, ${DateTime.fromISO(row.start, {zone: 'utc'}).setZone('utc').toFormat('HH:mm a')}`,
                        end: DateTime.fromISO(row.end, {zone: 'utc'}).setZone('utc').toFormat('HH:mm a'),
                        name: this.userRole==='doctor' ? `${row.patient.firstName} ${row.patient.lastName}` : `${row.doctor?.firstName} ${row.doctor?.lastName}`,
                        message: this.userRole==='doctor' ? row.patientMessage : row.doctorMessage,
                        draft: this.userRole==='doctor' && row.record ? row.record.draft : undefined,
                        record: this.userRole==='patient' && row.record ? !row.record.draft : undefined,
                    };
                });

                this.displayedColumns = [ 
                    {header: 'Appointment time', columnDef: 'start'},
                    {header: this.userRole==='doctor' ? `Patient's name`:`Doctor's name`, columnDef: 'name'},
                    {header: 'Ended', columnDef: 'pastDate'},
                    {header: 'Record', columnDef: this.userRole==='doctor' ? 'draft': 'record'}
                ]
                break;
            default:
                break;
        }
    }

    openCalendar() {
        this.router.navigate(['home/appointments/calendar'])
    }

    deleteAppointment(id: number) {
        const dialogRef = this.dialog.open(ConfirmComponent, {data: {message: "This appointment booking will be cancelled"}})

        dialogRef.componentInstance.isConfirming.subscribe(async (isConfirmed)=> {
            if (isConfirmed) {
                try {
                    const mutation = `mutation ($appointmentId: Int!) {
                        deleteAppointment (appointmentId: $appointmentId) {
                            success
                            message
                            data {
                                 ... on Appointment {
                                    start
                                    doctorId
                                }
                            }
                        }
                    }`
                    const response = await this.graphQLService.mutate(mutation, {appointmentId: id});
                    if (response.data.deleteAppointment.success) {
                        const start = response.data.deleteAppointment.data.start;
                        const doctorId = response.data.deleteAppointment.data.doctorId;
                        this.dialog.closeAll();

                        if (this.userRole === 'doctor') {
                            this.appointmentService.pollNextAppointment();
                        } else {
                            const timeStr = DateTime.fromISO(start).setZone('Europe/Helsinki').toFormat('HH:mm a, MMM dd');
                
                            this.socketService.notifyDoctor({
                                receiverId: doctorId,
                                message: `${timeStr} appointment has been cancelled. Check email for more details`,
                            });
                        }
                        await this.ngOnInit();
                    }
                } catch (error) {
                    this.dialog.open(AlertComponent, {data: {message: "Unexpected error while deleting appointment: "+error}})
                }
            }
        });  
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
        dialogRef.componentInstance.isAccepting.subscribe(isAccepted => {
            if (isAccepted) {
                this.ngOnInit();
                this.appointmentService.pollNextAppointment();
            }
        })
        dialogRef.componentInstance.isOpeningTab.subscribe(id => {
            if (id) {
                this.createAppointmentTab(id);
                this.dialog.closeAll();
            }
        });
    }

    onSearch(value: any){}

    onSearchReset(value: boolean){}
}