import { Component, OnInit, signal } from "@angular/core";
import { Router } from "@angular/router";
import { DateTime } from "luxon";
import { AppGraphQLService } from "../../../shared/services/app-graphql.service";
import { AppDialogService } from "../../../shared/services/app-dialog.service";
import { Appointment } from "../appointment";
import { AppointmentInput } from "../appointment.input";

@Component({
    selector: 'test-apps',
    templateUrl: './appointments.component.html',
    styleUrls: ['./appointments.component.scss']
})
export class AppointmentsComponent implements OnInit {
    id!: number;
    count: number = 0;
    pendingDataSource: any[] = [];
    upcomingDataSource: any[] = [];
    pendingAppointments: Appointment[] = [];
    upcomingAppointments: Appointment[] = [];
    readonly panelOpenState = signal(false);

    userRole: string = '';

    constructor(
        private graphQLService: AppGraphQLService,
        private router: Router,
        private dialog: AppDialogService
    ){}

    async ngOnInit() {
        await this.loadUserRole();
    }

    async loadUserRole() {
        const query = `query { me { userRole }}`
        try {
            const response = await this.graphQLService.send(query);
            if (response.data.me.userRole) {
                this.userRole =response.data.me.userRole && response.data.me.userRole !== "admin"
                await this.loadPendingAppointments();
                await this.loadUpcomingAppointments();
            }
        } catch (error) {
            this.dialog.open({data: {message: error}})
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
            this.dialog.open({data: {message: error}})
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
                console.log('coming: ', this.upcomingAppointments)
            }
        } catch (error){
            this.dialog.open({data: {message: error}})
        }
    }

    formatAppointments(appointments: string) {
        switch (appointments) {
            case "pending":
                return this.pendingDataSource = this.pendingAppointments.map(row => {
                    const created = DateTime.fromJSDate(new Date(row.createdAt)).toISO();
                    const howLongAgoStr = this.getHowLongAgo(created);
        
                    return {
                        id: row.id,
                        createdAt: DateTime.fromJSDate(new Date(row.createdAt)).toFormat('yyyy-MM-dd'),
                        howLongAgoStr: howLongAgoStr,
                        title: "Pending doctor confirmation",
                        button: "Cancel Appointment",
                        date: DateTime.fromJSDate(new Date(row.start)).toFormat('yyyy-MM-dd'),
                        start: DateTime.fromJSDate(new Date(row.start)).toFormat('hh:mm'),
                        end: DateTime.fromJSDate(new Date(row.end)).toFormat('hh:mm')
                    };
                })
                
            case "upcoming":
                return this.upcomingDataSource = this.pendingAppointments.map(row => {
                    const created = DateTime.fromJSDate(new Date(row.createdAt)).toISO();
                    const howLongAgoStr = this.getHowLongAgo(created);
        
                    return {
                        id: row.id,
                        createdAt: DateTime.fromJSDate(new Date(row.createdAt)).toFormat('yyyy-MM-dd'),
                        howLongAgoStr: howLongAgoStr,
                        title: "Upcoming appointment",
                        button: "Cancel Appointment",
                        date: DateTime.fromJSDate(new Date(row.start)).toFormat('yyyy-MM-dd'),
                        start: DateTime.fromJSDate(new Date(row.start)).toFormat('hh:mm'),
                        end: DateTime.fromJSDate(new Date(row.end)).toFormat('hh:mm')
                    };
                })
            default:
                return;
        }
    }

    getHowLongAgo(datetime: any) {
        const inputDate = DateTime.fromISO(datetime);

        const now = DateTime.now();

        const diff = now.diff(inputDate, ['years', 'months', 'days', 'hours', 'minutes', 'seconds']);

        let result = '';
        if (diff.years > 0) {
            result += `${diff.years} year${diff.years === 1 ? '' : 's'} `;
        }
        if (diff.months > 0) {
            result += `${diff.months} month${diff.months === 1 ? '' : 's'} `;
        }
        if (diff.days > 0) {
            result += `${diff.days} day${diff.days === 1 ? '' : 's'} `;
        }
        if (diff.hours > 0) {
            result += `${diff.hours} hour${diff.hours === 1 ? '' : 's'} `;
        }
        if (diff.minutes > 0) {
            result += `${diff.minutes} minute${diff.minutes === 1 ? '' : 's'} `;
        }

        result = result.trim();
        if (result) {
            result += ' ago';
        } else {
            result = 'just now';
        }

        return result;
    }
    newTab(){
        console.log('NEW TAB CLICK')
        console.log('countAppointments: ', this.count)
    }

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
                    await this.graphQLService.mutate(mutation, {appointmentId: id});
                } catch (error) {
                    //snackbar
                }
            }
        })  
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