import { ChangeDetectorRef, Component, ElementRef, EventEmitter, OnInit, Output, ViewChild, signal } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { MatTableDataSource } from "@angular/material/table";
import { DateTime } from "luxon";
import { AppGraphQLService } from "../../../shared/services/app-graphql.service";
import { AppDialogService } from "../../../shared/services/app-dialog.service";
import { AppDataSource } from "../../../shared/types";
import { Appointment } from "../appointment";

@Component({
    selector: 'test-apps',
    templateUrl: './appointments.component.html',
    styleUrls: ['./appointments.component.scss']
})
export class AppointmentsComponent implements OnInit {
    selectedIndex: number = 0;
    id!: number;
    routedAppointmentId: number | undefined;
    length: number = 0;
    readonly totalLength: number;

    countPendingAppointments: number = 0;
    countUpcomingAppointments: number = 0;
    countPastAppointments: number = 0;

    pendingDataSource: AppDataSource[] | undefined;
    upcomingDataSource: AppDataSource[] | undefined;
    pastDataSource: AppDataSource[] | undefined;

    pendingAppointments: Appointment[] = [];
    upcomingAppointments: Appointment[] = [];
    pastAppointments: Appointment[] = [];
    isReservedDay: boolean = false;
    dataSource: MatTableDataSource<AppDataSource> | null = null;

    @Output() activeTab = new EventEmitter<string>();
    @ViewChild('scrollView') scrollView!: ElementRef;
    readonly panelOpenState = signal(false);

    userRole!: string;
    pageIndex: number = 0;
    pageLimit: number = 10;
    sortDirection: string | null = 'DESC';
    sortActive: string | null = 'start';
    filterInput: string | null = null;

    constructor(
        private graphQLService: AppGraphQLService,
        private router: Router,
        private dialog: AppDialogService,
        private activatedRoute: ActivatedRoute,
        private cdr: ChangeDetectorRef
    ){
        this.totalLength = this.length;
    }
    
    async ngOnInit() {
        await this.loadStatic();
        this.activatedRoute.queryParams.subscribe(async (params)=> {
            const id = params['id']; 
            if (id) this.routedAppointmentId = +id;
          });
        this.activatedRoute.queryParams.subscribe(async params => {
            const tab = params['tab'];
            this.selectedIndex = tab ? +tab : 0;
            await this.loadData();
        });   
    }
    async loadData() {
        switch (this.selectedIndex) {
            case 0:
                await this.loadPendingAppointments();
                break;
            case 1:
                await this.loadUpcomingAppointments();
                break;
            case 2:
                await this.loadPastAppointments();
                break;
            default:
                break;

        }
    }

    async loadStatic() {
        const query = `query { 
            me { userRole }
            countPendingAppointments
            countUpcomingAppointments
            countPastAppointments
        }`

        try {
            const response = await this.graphQLService.send(query);
            if (response.data.me.userRole) {
                this.userRole =response.data.me.userRole;
                this.countPendingAppointments = response.data.countPendingAppointments
                this.countUpcomingAppointments = response.data.countUpcomingAppointments
                this.countPastAppointments = response.data.countPastAppointments
            }
        } catch (error) {
            this.router.navigate(['/'])
        }
    }
    onTabChange(value: any) {
        this.selectedIndex = value;

        this.router.navigate([], {
          relativeTo: this.activatedRoute,
          queryParams: { tab: value }
        });
    }
    async onPageChange(value: any) {
        this.pageIndex = value.pageIndex;
        this.pageLimit = value.pageLimit;
        await this.loadData();
    }
    async onSortChange(value: any) {
        if (value.active === 'howLongAgoStr') {
            this.sortActive = 'createdAt'
        } else if (value.active === 'howSoonStr') {
            this.sortActive = 'start'
        } else if (value.active === 'pastDate'){
            this.sortActive = 'end';
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
                    }    
                }
            }
        }`
        const variables = {
            pageIndex: this.pageIndex,
            pageLimit: this.pageLimit,
            sortActive: this.sortActive,
            sortDirection: this.sortDirection,
            filterInput: this.filterInput
        }
        
        try {
            const response = await this.graphQLService.send(query, variables);
            if (response.data.pendingAppointments) {
                this.pendingAppointments = response.data.pendingAppointments.slice;
                this.length = response.data.pendingAppointments.length;
                this.formatAppointments("pending");

                if (this.countPendingAppointments > 9) {
                    this.dataSource = new MatTableDataSource<AppDataSource>(this.pendingDataSource);
                }
            }
        } catch (error){
            this.dialog.open({data: {message: "Unexpected error while getting pending appointments: "+error}})
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
                        doctor {
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
            sortDirection: this.sortDirection,
            filterInput: this.filterInput
        }

        try {
            const response = await this.graphQLService.send(query, variables);
            if (response.data.upcomingAppointments) {
                this.upcomingAppointments = response.data.upcomingAppointments.slice;
                this.length = response.data.upcomingAppointments.length;
                this.formatAppointments("upcoming");

                if (this.countUpcomingAppointments > 9) {
                    this.dataSource = new MatTableDataSource<AppDataSource>(this.upcomingDataSource);
                }
            }
        } catch (error){
            this.dialog.open({data: {message: "Unexpected error while getting upcoming appointments: "+error}})
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
                        doctor {
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
            sortDirection: this.sortDirection,
            filterInput: this.filterInput
        }

        try {
            const response = await this.graphQLService.send(query, variables);
            if (response.data.pastAppointments) {
                this.pastAppointments = response.data.pastAppointments.slice;
                this.length = response.data.pastAppointments.length;
                this.cdr.detectChanges();
                this.formatAppointments("past");

                if (this.countPastAppointments > 9) {
                    this.dataSource = new MatTableDataSource<AppDataSource>(this.pastDataSource);
                }
            }
        } catch (error){
            this.dialog.open({data: {message: "Unexpected error while getting past appointments: "+error}})
        }
    }
    async checkIsReservedDay(date: string) {
        const query = `query ($date: Date!) { isReservedDay (date: $date)}`
        
        try {
            this.isReservedDay = await this.graphQLService.send(query, {date: DateTime.fromISO(date).toJSDate()});
        } catch (error) {
            //this.dialog.open({data: {message: "Error checking for reserved days: "+error}})
            //FIX RESERVED DAYS !! throws error here
        }
    }

    formatAppointments(appointments: string) {
        const allActions = [
            {
                text: 'Cancel Appointment',
                disabled: this.isReservedDay
            }, {
                text: 'Accept Appointment',
                disabled: this.isReservedDay
            }, {
                text: 'View In Calendar',
                disabled: false
            }];
        const cancelAction = [
            {
                text: 'Cancel Appointment',
                disabled: false
            }
        ]
        const deleteAction = [
            {
                text: 'Delete Appointment',
                disabled: false
            }
        ]
        switch (appointments) {
            case "pending":
                return this.pendingDataSource = this.pendingAppointments.map(row => {
                    const created = DateTime.fromJSDate(new Date(row.createdAt)).toISO();
                    const howLongAgoStr = this.getHowLongAgo(created);
                    this.checkIsReservedDay(row.start);

                    return {
                        id: row.id,
                        howLongAgoStr: howLongAgoStr,
                        title: this.userRole === 'patient' ? "Pending doctor confirmation" : "View details",
                        buttons: this.userRole === 'doctor' ? allActions : cancelAction,
                        date: DateTime.fromJSDate(new Date(row.start)).toFormat('MMM dd, yyyy'),
                        start: DateTime.fromJSDate(new Date(row.start)).toFormat('hh:mm'),
                        end: DateTime.fromJSDate(new Date(row.end)).toFormat('hh:mm')
                    } 
                });
                
            case "upcoming":
                return this.upcomingDataSource = this.upcomingAppointments.map(row => {
                    const startT = DateTime.fromJSDate(new Date(row.start)).toISO();
                    const howSoonStr = this.getHowSoonUpcoming(startT);

                    return {
                        id: row.id,
                        howSoonStr: howSoonStr,
                        title: this.userRole === 'patient' ? "Confirmed appointment" : "Upcoming appointment",
                        buttons: cancelAction,
                        date: DateTime.fromJSDate(new Date(row.start)).toFormat('MMM dd, yyyy'),
                        start: DateTime.fromJSDate(new Date(row.start)).toFormat('hh:mm'),
                        end: DateTime.fromJSDate(new Date(row.end)).toFormat('hh:mm')
                    };
                });

            case "past":
                return this.pastDataSource = this.pastAppointments.map(row => {
                    const startT = DateTime.fromJSDate(new Date(row.start)).toISO();
                    const howLongAgoStr = this.getHowLongAgo(startT);

                    return {
                        id: row.id,
                        pastDate: howLongAgoStr,
                        title: "View details",
                        buttons: deleteAction,
                        date: DateTime.fromJSDate(new Date(row.start)).toFormat('MMM dd, yyyy'),
                        start: DateTime.fromJSDate(new Date(row.start)).toFormat('hh:mm'),
                        end: DateTime.fromJSDate(new Date(row.end)).toFormat('hh:mm')
                    };
                });
            default:
                return [];
        }
    }

    getHowSoonUpcoming(datetime: any){
        const inputDate = DateTime.fromISO(datetime);
        const now = DateTime.now();
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
    
        if (!howSoonStr) {
            howSoonStr = 'now';
        }
    
        return howSoonStr;
    }

    getHowLongAgo(datetime: any) {
        const inputDate = DateTime.fromISO(datetime);
        const now = DateTime.now();
        const diff = now.diff(inputDate, ['years', 'months', 'days', 'hours', 'minutes', 'seconds']);
        let howLongAgoStr = '';

        if (diff.years > 0) {
            howLongAgoStr += `${diff.years} year${diff.years === 1 ? '' : 's'} `;
        }
        if (diff.months > 0) {
            howLongAgoStr += `${diff.months} month${diff.months === 1 ? '' : 's'} `;
        }
        if (diff.days > 0) {
            howLongAgoStr += `${diff.days} day${diff.days === 1 ? '' : 's'} `;
        }
        if (diff.days < 1 && diff.hours > 0) {
            howLongAgoStr += `${diff.hours} hour${diff.hours === 1 ? '' : 's'} `;
        }
        if (diff.days < 1 && diff.minutes > 0) {
            howLongAgoStr += `${diff.minutes} minute${diff.minutes === 1 ? '' : 's'} `;
        }

        howLongAgoStr = howLongAgoStr.trim();

        if (howLongAgoStr) {
            howLongAgoStr += ' ago';
        } else {
            howLongAgoStr = 'just now';
        }
        return howLongAgoStr;
    }

    openCalendar() {
        this.router.navigate(['appointments', 'calendar'])
    }

    deleteAppointment(id: number) {
        const dialogRef = this.dialog.open({ data: { isDeleting: true }})
        
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
                        this.ngOnInit();
                    }
                } catch (error) {
                    this.dialog.open({data: {message: "Unexpected error while deleting appointment: "+error}})
                }
            }
        })  
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
                this.acceptAppointment(id);
                break;
            case 'View In Calendar':
                this.router.navigate(['appointments', 'calendar']);
                break;
            default:
                break;
        }
    }

    onAppointmentClick(eventInfo: {id: string, title: string}){
        this.dialog.open({data: {eventInfo}});
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
                    this.dialog.open({data: {message: "Appointment added to your calendar"}});
                    this.loadUpcomingAppointments();
                    this.ngOnInit();
                }
            } catch (error) {
                this.dialog.open({data: {message: `Unexpected error: ${error}`}})
            }
        }
    } 
}