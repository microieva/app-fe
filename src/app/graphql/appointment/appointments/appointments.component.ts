import { Component, ElementRef, EventEmitter, OnDestroy, OnInit, Output, QueryList, ViewChild, ViewChildren, ViewContainerRef, signal } from "@angular/core";
import { trigger, state, style, transition, animate } from "@angular/animations";
import { ActivatedRoute, Router } from "@angular/router";
import { MatTableDataSource } from "@angular/material/table";
import { MatTabGroup } from "@angular/material/tabs";
import { MatDialog } from "@angular/material/dialog";
import { DateTime } from "luxon";
import { Subscription } from "rxjs";
import { environment } from '../../../../environments/environment';
import { AppGraphQLService } from "../../../shared/services/app-graphql.service";
import { AppAppointmentService } from "../../../shared/services/app-appointment.service";
import { AppDialogService } from "../../../shared/services/app-dialog.service";
import { AppTimerService } from "../../../shared/services/app-timer.service";
import { AppTabsService } from "../../../shared/services/app-tabs.service";
import { AppSocketService } from "../../../shared/services/app-socket.service";
import { AppointmentComponent } from "../appointment.component";
import { AppointmentMessageComponent } from "../../../shared/components/app-appointment-message/app-appointment-message.component";
import { AlertComponent } from "../../../shared/components/app-alert/app-alert.component";
import { ConfirmComponent } from "../../../shared/components/app-confirm/app-confirm.component";
import { EventComponent } from "../../../shared/components/app-event/app-event.component";
import { AppointmentDataSource, AppTableDisplayedColumns } from "../../../shared/types";
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
    actions: any[] | null = null;

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
    displayedColumns: AppTableDisplayedColumns[] = [];

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

        const subRouterParamsId = this.activatedRoute.queryParams.subscribe((params)=> {
            const id = params['id']; 
            if (id) this.routedAppointmentId = +id;
        });
        
        const subRouterParamsTab = this.activatedRoute.queryParams.subscribe(params => {
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

    async onActionClick(event: {text:string, ids:number[]}){
        switch (event.text) {
            case 'Accept':
                await this.acceptAppointmentsByIds(event.ids);    
                break;
            case 'Cancel':
                await this.unacceptAppointmentsByIds(event.ids);
                break;
            case 'Delete':
                await this.deleteAppointmentsByIds(event.ids);
                break;
            case 'Add message':
                await this.addMessageToAppointmentsByIds(event.ids);
                break;
            case 'Delete messages':
                await this.deleteMessagesFromAppointmentsByIds(event.ids);
                break;
            default:
                break;
        }
    }
    async deleteMessagesFromAppointmentsByIds(ids:number[]){
        let appointmentsWithMessages:number[];

        if (this.selectedIndex === 1) {
            if (this.userRole === 'doctor') {
                appointmentsWithMessages = this.upcomingAppointments
                    .filter(apt => apt.doctorMessage && ids.includes(apt.id))
                    .map(apt => apt.id); 
            } 
                appointmentsWithMessages = this.upcomingAppointments
                    .filter(apt => apt.patientMessage && ids.includes(apt.id))
                    .map(apt => apt.id); 
        } else {
            appointmentsWithMessages = this.pendingAppointments
                .filter(apt => apt.patientMessage && ids.includes(apt.id))
                .map(apt => apt.id);    
        } 

        const message = `${appointmentsWithMessages.length} / ${ids.length} selected have added message. Delete message(s)?`
        
        const ref = this.dialog.open(ConfirmComponent, {width: "30rem", data: {message}});
        
        ref.componentInstance.isConfirming.subscribe(async ()=> {
            const mutation = `mutation ($appointmentIds: [Int!]) {
                deleteMessagesFromAppointmentsByIds(appointmentIds: $appointmentIds) {
                    success
                    message   
                }
            }`
            const response = await this.graphQLService.mutate(mutation, {appointmentIds:ids});
                if (response.data.deleteMessagesFromAppointmentsByIds.success) {
                    this.dialog.open(AlertComponent, {data: {message:response.data.deleteMessagesFromAppointmentsByIds.message}})
                    this.ngOnDestroy();
                    await this.ngOnInit();
                } else {
                    this.dialog.open(AlertComponent, {data: {message:response.data.deleteMessagesFromAppointmentsByIds.message}});
                }
        });
        ref.componentInstance.isCancelling.subscribe(async ()=> {
            this.ngOnDestroy();
            await this.ngOnInit();
        })

    }
    async addMessageToAppointmentsByIds(ids:number[]) {
        let appointmentsWithMessages:number[];

        if (this.selectedIndex === 1) {
            if (this.userRole === 'doctor') {
                appointmentsWithMessages = this.upcomingAppointments
                    .filter(apt => apt.doctorMessage && ids.includes(apt.id))
                    .map(apt => apt.id); 
            } 
                appointmentsWithMessages = this.upcomingAppointments
                    .filter(apt => apt.patientMessage && ids.includes(apt.id))
                    .map(apt => apt.id); 
        } else {
            appointmentsWithMessages = this.pendingAppointments
                .filter(apt => apt.patientMessage && ids.includes(apt.id))
                .map(apt => apt.id);    
        } 

        if (appointmentsWithMessages.length === 0) {
            await this.addMessage(ids);
        } else {
            const message = `<p>${appointmentsWithMessages.length} / ${ids.length} selected already have messages. <br>Proceed to add new or overwrite?</p>`;
            const ref = this.dialog.open(ConfirmComponent, {width:"34rem", data:{message}});

            ref.componentInstance.isConfirming.subscribe(async () => {
                let message:string;
                if (appointmentsWithMessages.length !== ids.length) {
                    const title = "Overwrite with new message?"
                    message = `<p><strong>Confirm:</strong> will overwrite existing messages in ${appointmentsWithMessages.length} appointment(s);<span style="margin-bottom:10px;"><br></span><br><strong>Cancel:</strong> will add new message only in empty appointments (${ids.length - appointmentsWithMessages.length});</p>`;
                     const ref = this.dialog.open(ConfirmComponent, {width:"34rem", data:{message, title}});
                    ref.componentInstance.isConfirming.subscribe(async ()=> {
                        await this.addMessage(ids);
                    });
                    ref.componentInstance.isCancelling.subscribe(async () => {
                        const validIds = ids.filter(id => !appointmentsWithMessages.includes(id));
                        await  this.addMessage(validIds);
                    })
                } else {
                    await this.addMessage(ids);
                }
            });
            ref.componentInstance.isCancelling.subscribe(async ()=> {
                this.ngOnDestroy();
                await this.ngOnInit();
            })
        }
    }
    async addMessage(ids:number[]) {
        const msgRef = this.dialog.open(AppointmentMessageComponent, {
                disableClose: true, 
                width:"35rem",
            });
        
        msgRef.componentInstance.isSaving.subscribe(message => {
            const mutation = `mutation ($appointmentIds: [Int!], $message: String!) {
                addMessageToAppointmentsByIds(appointmentIds: $appointmentIds, message: $message) {
                    success
                    message   
                }
            }`
    
            const ref = this.dialog.open(ConfirmComponent, {
                disableClose: true, 
                width:"30rem",
                data: {
                    message: `<p>Message "${message}" will be added to ${ids.length} appointment(s)</p>`
                }});
    
            ref.componentInstance.isConfirming.subscribe(async () => {
                const response = await this.graphQLService.mutate(mutation, {appointmentIds:ids, message});
    
                if (response.data.addMessageToAppointmentsByIds.success) {
                    this.ngOnDestroy();
                    await this.ngOnInit();
                    this.dialog.open(AlertComponent, {data: {message:response.data.addMessageToAppointmentsByIds.message}})    
                } else {
                    this.dialog.open(AlertComponent, {data: {message:response.data.addMessageToAppointmentsByIds.message}});
                }
    
            });
            ref.componentInstance.isCancelling.subscribe(async () => {
                this.ngOnDestroy();
                await this.ngOnInit();
            });

        });
        msgRef.componentInstance.isCancelling.subscribe(async ()=> {
            this.ngOnDestroy();
            await this.ngOnInit();
        })
    }
    async deleteAppointmentsByIds(ids: number[]) {
        let appointmentsToDelete:number[];
        let message:string;

        if (this.selectedIndex === 2) {
            appointmentsToDelete = this.pastAppointments
                .filter(apt => apt.record && ids.includes(apt.id))
                .map(apt => apt.id);    
        } else {
            appointmentsToDelete = ids;   
        }  

        if (appointmentsToDelete.length === 0) {
            if (this.userRole==='doctor') {
                message = ids.length === 1 ? "Selected appointment has no record yet, and cannot be deleted" : "Selected appointments have no records yet, and cannot be deleted";
            } else {
                message = ids.length === 1 ? "Selected appointment cannot be deleted at this time" : "Selected appointments cannot be deleted at this time";
            }
            this.dialog.open(AlertComponent, {data: {message}, width:"30rem"});
        } else {
            const isAllValidForDeletion = ids.length === appointmentsToDelete.length;
            const str = isAllValidForDeletion ? '' : ` ${ids.length-appointmentsToDelete.length} / ${ids.length} selected, do not have medical record created yet, therefor will not be deleted at this time`
            
            if (this.userRole==='patient' && appointmentsToDelete.length === 1) {
                if (this.selectedIndex === 1) {
                    message = 'Cancel appointment?'
                } else if (this.selectedIndex === 2){
                    message = 'Delete appointment?'
                } else {
                    message = 'Cancel appointment request?'
                }
            } else if (this.userRole==='patient' && appointmentsToDelete.length >1) {
                if (this.selectedIndex === 1) {
                    message = `Cancel ${appointmentsToDelete.length} appointments?`
                } else if (this.selectedIndex === 2){
                    message = `Delete ${appointmentsToDelete.length} appointments?`
                } else {
                    message = `Cancel ${appointmentsToDelete.length} appointment requests?`

                }
               
            } else {
                message = `${appointmentsToDelete.length} appointment(s) will be deleted`
            }

            const ref = this.dialog.open(ConfirmComponent, {
                disableClose: true, 
                width:"30rem",
                data: {
                    message: `<p>${message+str}</p>`
                }});
    
            ref.componentInstance.isConfirming.subscribe(async () => {
                const mutation = `mutation ($appointmentIds: [Int!]) {
                    deleteAppointmentsByIds(appointmentIds: $appointmentIds) {
                        success
                        message   
                    }
                }`
                const response = await this.graphQLService.mutate(mutation, {appointmentIds:ids});
    
                if (response.data.deleteAppointmentsByIds.success) {
                    this.closeTabs(ids);
                    this.ngOnDestroy();
                    await this.ngOnInit();
                    if (this.selectedIndex===2) {
                        await this.loadPastAppointments();
                    }
                } else {
                    this.dialog.open(AlertComponent, {width:"30rem", data: {message:response.data.deleteAppointmentsByIds.message}});
                }
    
            });
            ref.componentInstance.isCancelling.subscribe(async () => {
                this.ngOnDestroy();
                await this.ngOnInit();
            })
        }
        
    }
    async unacceptAppointmentsByIds(ids: number[]) {
        const mutation = `mutation ($appointmentIds: [Int!]) {
            unacceptAppointmentsByIds(appointmentIds: $appointmentIds) {
                success
                message   
            }
        }`
        const ref = this.dialog.open(ConfirmComponent, {disableClose: true, data: {message: `${ids.length} Appointment(s) will be removed from your calendar`}});
        ref.componentInstance.isConfirming.subscribe(async () => {
            this.dialog.closeAll();
            try {   
                const response = await this.graphQLService.mutate(mutation, {appointmentIds:ids});
                if (response.data.unacceptAppointmentsByIds.success) {
                    this.ngOnDestroy();
                    this.appointmentService.pollNextAppointment();
                    await this.ngOnInit();
                    
                } else {
                    this.dialog.open(AlertComponent, {data: {message:response.data.unacceptAppointmentsByIds.message}, width:"30rem"});
                }
            } catch (error) {
                this.dialog.open(AlertComponent, {width:"30rem", data: {message: `Unexpected error: ${error}`}});
            }
        });
        ref.componentInstance.isCancelling.subscribe(async () => {
            this.ngOnDestroy();
            await this.ngOnInit();
        })
    }

    closeTabs(ids:number[]) {
        this.tabs?.map(tab => {
            if (ids.includes(tab.id)){
                this.tabsService.closeTab(tab.id)
            }})
    }

    async acceptAppointmentsByIds(appointmentIds: number[]) {
        const mutation = `mutation ($appointmentIds: [Int!]) {
            acceptAppointmentsByIds(appointmentIds: $appointmentIds) {
                success
                message
               
            }
        }`
        const ref = this.dialog.open(ConfirmComponent, {disableClose: true, data: {message: `${appointmentIds.length} Appointment(s) will be added to your calendar`}});
        ref.componentInstance.isConfirming.subscribe(async () => {
            this.dialog.closeAll();
            try {   
                const response = await this.graphQLService.mutate(mutation, {appointmentIds});
                if (response.data.acceptAppointmentsByIds.success) {
                    this.ngOnDestroy();
                    this.appointmentService.pollNextAppointment();
                    await this.ngOnInit();
                }  else {
                    this.dialog.open(AlertComponent, {data: {message:response.data.acceptAppointmentsByIds.message}, width:"30rem"});
                }
            } catch (error) {
                this.dialog.open(AlertComponent, {data: {message: `Unexpected error: ${error}`}});
            }

        });
        ref.componentInstance.isCancelling.subscribe(async () => {
            this.ngOnDestroy();
            await this.ngOnInit();
        })
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
                    const doctorActions = [
                        {
                            text: "Accept"
                        }
                    ]
                    const patientActions = [
                        {
                            text: "Delete"
                        },
                        {
                            text: "Add message"
                        },
                        {
                            text: "Delete messages"
                        }
                    ]

                    if (this.userRole === 'doctor') {
                        this.actions = doctorActions
                    } else if (this.userRole === 'patient') {
                        this.actions = patientActions
                    }

                    return {
                        id: row.id,
                        howLongAgoStr,
                        title: this.userRole === 'patient' ? "Pending doctor confirmation" : "",
                        date: DateTime.fromISO(row.start, {setZone: true}).toFormat('MMM dd, yyyy'),
                        start: date+`, ${DateTime.fromISO(row.start, {zone: 'utc'}).setZone('utc').toFormat('HH:mm a')}`,
                        end: DateTime.fromISO(row.end, {zone: 'utc'}).setZone('utc').toFormat('HH:mm a'),
                        name: this.userRole==='doctor' ? `${row.patient.firstName} ${row.patient.lastName}` : undefined,
                        message: this.userRole==='doctor' ? row.patientMessage : undefined,
                        actions:this.actions
                    } 
                });
                if (this.userRole === 'patient') {
                    this.displayedColumns = [ 
                        {header: 'checkbox', columnDef: 'checkbox', sort: false},
                        {header: 'Actions', columnDef: 'actions',  sort: false},
                        {header: 'Appointment time', columnDef: 'start', sort:true},
                        {header: 'Request created', columnDef: 'howLongAgoStr', sort:true}
                    ]
                } else {
                    this.displayedColumns = [ 
                        {header: 'checkbox', columnDef: 'checkbox', sort: false},
                        {header: 'Actions', columnDef: 'actions',  sort: false},
                        {header: 'Appointment time', columnDef: 'start',  sort: true},
                        {header: `Patient's name`, columnDef: 'name',  sort: true},
                        {header: 'Request created', columnDef: 'howLongAgoStr',  sort: true}
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

                    const doctorActions = [
                        {
                            text: "Cancel"
                        },
                        {
                            text: "Add message"
                        },
                        {
                            text: "Delete messages"
                        }
                    ]
                    const patientActions = [
                        {
                            text: "Delete"
                        },
                        {
                            text: "Add message"
                        },
                        {
                            text: "Delete messages"
                        }
                    ]

                    if (this.userRole === 'doctor') {
                        this.actions = doctorActions
                    } else if (this.userRole === 'patient') {
                        this.actions = patientActions
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
                        actions: this.actions
                    };
                });

                this.displayedColumns = [ 
                    {header: 'checkbox', columnDef: 'checkbox', sort: false},
                    {header: 'Actions', columnDef: 'actions',  sort: false},
                    {header: 'Appointment time', columnDef: 'start', sort:true},
                    {header: this.userRole==='doctor' ? `Patient's name`:`Doctor's name`, columnDef: 'name', sort:true},
                    {header: 'Starts', columnDef: 'howSoonStr', sort:true},
                    {header: 'Record', columnDef: this.userRole==='doctor' ? 'draft': 'record', sort:true}
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

                    this.actions = [
                        {
                            text: "Delete"
                        }
                    ]

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
                        actions: this.actions
                    };
                });

                this.displayedColumns = [ 
                    {header: 'checkbox', columnDef: 'checkbox', sort: false},
                    {header: 'Actions', columnDef: 'actions',  sort: false},
                    {header: 'Appointment time', columnDef: 'start', sort:true},
                    {header: this.userRole==='doctor' ? `Patient's name`:`Doctor's name`, columnDef: 'name',sort:true},
                    {header: 'Ended', columnDef: 'pastDate',sort:true},
                    {header: 'Record', columnDef: this.userRole==='doctor' ? 'draft': 'record',sort:true}
                ]
                break;
            default:
                break;
        }
    }

    openCalendar() {
        this.router.navigate(['home/appointments/calendar'])
    }

    async deleteAppointment(id: number) {
        const dialogRef = this.dialog.open(ConfirmComponent, {data: {message: "This appointment booking will be deleted"}})

        dialogRef.componentInstance.isConfirming.subscribe(async ()=> {
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
        });  
    }

    onAppointmentClick(eventInfo: {id: string, title: string}){
        if (!eventInfo.title && this.userRole === 'doctor') {
            eventInfo.title = 'Appointment Info'
        }
        const eventRef = this.dialog.open(EventComponent, {data: {eventInfo, samePatient: true}});
        eventRef.componentInstance.isMessageSaved.subscribe(async ()=> {
            this.ngOnDestroy();
            await this.ngOnInit();
        })
        eventRef.componentInstance.isMessageDeleted.subscribe(async ()=> {
            this.ngOnDestroy();
            await this.ngOnInit();
        })
        eventRef.componentInstance.isDeleting.subscribe(async id => {
            if (id) {
                await this.deleteAppointmentsByIds([id]);
            }
        })
        eventRef.componentInstance.isAccepting.subscribe(async id => {
            if (id) {
                await this.acceptAppointmentsByIds([id]);
                this.appointmentService.pollNextAppointment();
            }
        })
        eventRef.componentInstance.isUnaccepting.subscribe(async id => {
            if (id) {
                await this.unacceptAppointmentsByIds([id]);
                this.appointmentService.pollNextAppointment();
            }
        })
        eventRef.componentInstance.isOpeningTab.subscribe(id => {
            if (id) {
                this.createAppointmentTab(id);
                this.dialog.closeAll();
            }
        });
    }

    onSearch(value: any){}

    onSearchReset(value: boolean){}
}