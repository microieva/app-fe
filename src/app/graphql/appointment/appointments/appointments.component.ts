import { Component, EventEmitter, OnInit, Output, signal } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { DateTime } from "luxon";
import { AppGraphQLService } from "../../../shared/services/app-graphql.service";
import { AppDialogService } from "../../../shared/services/app-dialog.service";
import { Appointment } from "../appointment";
import { AppointmentInput } from "../appointment.input";
import { AppAccordionDataSource } from "../../../shared/types";

@Component({
    selector: 'test-apps',
    templateUrl: './appointments.component.html',
    styleUrls: ['./appointments.component.scss']
})
export class AppointmentsComponent implements OnInit {
    id!: number;
    routedAppointmentId: number | undefined;
    count: number = 0;
    pendingDataSource: AppAccordionDataSource[] | undefined;
    upcomingDataSource: AppAccordionDataSource[] | undefined;
    pastDataSource: AppAccordionDataSource[] | undefined;
    pendingAppointments: Appointment[] = [];
    upcomingAppointments: Appointment[] = [];
    pastAppointments: Appointment[] = [];
    @Output() activeTab = new EventEmitter<string>();
    readonly panelOpenState = signal(false);

    userRole!: string;

    constructor(
        private graphQLService: AppGraphQLService,
        private router: Router,
        private dialog: AppDialogService,
        private activatedRoute: ActivatedRoute
    ){}

    async ngOnInit() {
        await this.loadUserRole();
        this.activatedRoute.paramMap.subscribe(async (params)=> {
            const id = params.get('id'); 
            if (id) this.routedAppointmentId = +id;
          });
    }

    async loadUserRole() {
        const query = `query { me { userRole }}`
        try {
            const response = await this.graphQLService.send(query);
            if (response.data.me.userRole) {
                this.userRole =response.data.me.userRole;
                // if not checking length they could be loaded in static loader together
                await this.loadPendingAppointments();
                await this.loadUpcomingAppointments();
                await this.loadPastAppointments();
            }
        } catch (error) {
            this.router.navigate(['/'])
            //this.dialog.open({data: {message: "Unexpected error fetching user role: "+error}})
        }
    }
    async onTabChange(event: any){
    }

    async loadPastAppointments() {
        const query = `query {
            pastAppointments {
                id
                start
                end
                patientId
                doctorId
                createdAt
            }
        }`

        try {
            const response = await this.graphQLService.send(query);
            if (response.data.pastAppointments) {
                this.pastAppointments = response.data.pastAppointments;
                this.formatAppointments("past");
            }
        } catch (error){
            this.dialog.open({data: {message: "Unexpected error while getting past appointments: "+error}})
        }
    }
    
    async loadPendingAppointments() {
        const query = `query {
            pendingAppointments {
                id
                start
                end
                patientId
                doctorId
                createdAt
            }
        }`

        try {
            const response = await this.graphQLService.send(query);
            if (response.data.pendingAppointments) {
                this.pendingAppointments = response.data.pendingAppointments;
                this.formatAppointments("pending");
            }
        } catch (error){
            this.dialog.open({data: {message: "Unexpected error while getting upcoming appointments: "+error}})
        }
    }
    async loadUpcomingAppointments() {
        const query = `query {
            upcomingAppointments {
                id
                start
                end
                patientId
                doctorId
                createdAt
                allDay
            }
        }`

        try {
            const response = await this.graphQLService.send(query);
            if (response.data.upcomingAppointments) {
                this.upcomingAppointments = response.data.upcomingAppointments;
                this.formatAppointments("upcoming");
            }
        } catch (error){
            this.dialog.open({data: {message: "Unexpected error while getting upcoming appointments: "+error}})
        }
    }

    formatAppointments(appointments: string): AppAccordionDataSource[] {
        const doctorActions = ['Cancel Appointment', 'Accept Appointment', 'View In Calendar']
        switch (appointments) {
            case "pending":
                return this.pendingDataSource = this.pendingAppointments.map(row => {
                    const created = DateTime.fromJSDate(new Date(row.createdAt)).toISO();
                    const howLongAgoStr = this.getHowLongAgo(created);
        
                    return {
                        id: row.id,
                        howLongAgoStr: howLongAgoStr,
                        title: this.userRole === 'patient' ? "Pending doctor confirmation" : "View details",
                        buttons: this.userRole === 'doctor' ? doctorActions : ["Cancel Appointment"],
                        date: DateTime.fromJSDate(new Date(row.start)).toFormat('MMM dd, yyyy'),
                        start: DateTime.fromJSDate(new Date(row.start)).toFormat('hh:mm'),
                        end: DateTime.fromJSDate(new Date(row.end)).toFormat('hh:mm')
                    } 
                })
                
            case "upcoming":
                return this.upcomingDataSource = this.upcomingAppointments.map(row => {
                    const startT = DateTime.fromJSDate(new Date(row.start)).toISO();
                    const howSoonStr = this.getHowSoonUpcoming(startT);

                    return {
                        id: row.id,
                        howSoonStr: howSoonStr,
                        title: this.userRole === 'patient' ? "Confirmed appointment" : "Upcoming appointment",
                        buttons: ["Cancel Appointment"],
                        date: DateTime.fromJSDate(new Date(row.start)).toFormat('MMM dd, yyyy'),
                        start: DateTime.fromJSDate(new Date(row.start)).toFormat('hh:mm'),
                        end: DateTime.fromJSDate(new Date(row.end)).toFormat('hh:mm')
                    };
                })

            case "past":
                return this.pastDataSource = this.pastAppointments.map(row => {
                    const startT = DateTime.fromJSDate(new Date(row.start)).toISO();
                    const howLongAgoStr = this.getHowLongAgo(startT);

                    return {
                        id: row.id,
                        pastDate: howLongAgoStr,
                        title: "View details",
                        buttons: ["Delete Appointment"],
                        date: DateTime.fromJSDate(new Date(row.start)).toFormat('MMM dd, yyyy'),
                        start: DateTime.fromJSDate(new Date(row.start)).toFormat('hh:mm'),
                        end: DateTime.fromJSDate(new Date(row.end)).toFormat('hh:mm')
                    };
                })
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
    newTab(){
        console.log('NEW TAB CLICK')
        console.log('countAppointments: ', this.count)
    }
    // onTabChange(event: MatTabChangeEvent) {
    //     //this.activeTab = event.tab.textLabel;
    //     this.activeTab.emit(event.tab.textLabel);
    // }

    openCalendar() {
        this.router.navigate(['appointments', 'calendar'])
    }

    deleteAppointment(id: number) {
        // doctor's cancelled appointments could be archived
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
                    //snackbar
                }
            }
        })  
    }

    onButtonClick(accordionOutput: {id: number, text: string}) {
        switch (accordionOutput.text) {
            case 'Cancel Appointment':
                this.deleteAppointment(accordionOutput.id);
                break;
            case 'Delete Appointment':
                this.deleteAppointment(accordionOutput.id);
                break;
            case 'Accept Appointment':
                this.acceptAppointment(accordionOutput.id);
                break;
            case 'View In Calendar':
                //this.openViewInCalendar(accordionOutput.id)
                break;
            default:
                break;
        }
    }

    onAppointmentClick(eventInfo: {id: string, title: string}){
        this.dialog.open({data: {eventInfo}})
    }

    async acceptAppointment(id: number) {
        const appointment: Appointment | undefined = this.pendingAppointments.find(app => app.id);
        
        if (appointment) {
            const input: AppointmentInput = {
                id: id,
                start: appointment.start,
                end: appointment.end,
                allDay: false
            }
            const mutation = `mutation ($appointmentInput: AppointmentInput!) {
                saveAppointment(appointmentInput: $appointmentInput) {
                    success
                    message
                }
            }`
            try {   
                const response = await this.graphQLService.mutate(mutation, {appointmentInput: input});
                console.log('ACCEPT res: ', response)
                if (response.data.saveAppointment.success) {
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