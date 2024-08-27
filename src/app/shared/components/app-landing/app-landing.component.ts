import { Component, OnInit } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { DateTime } from "luxon";
import { AppGraphQLService } from "../../services/app-graphql.service";
import { AlertComponent } from "../app-alert/app-alert.component";
import { User } from "../../../graphql/user/user";

@Component({
    selector: 'app-landing',
    templateUrl: './app-landing.component.html',
    styleUrls: ['app-landing.component.scss']
})
export class AppLandingComponent implements OnInit {
    userRole!: string;
    me!: User;
    lastLogin: string = '';
    countDoctorRequests: number = 0;
    countDoctors: number = 0;
    countPatients: number = 0;
    countMissedAppointments: number = 0;
    countUpcomingAppointments: number = 0;
    countPendingAppointments: number = 0;
    countRecords: number = 0;

    constructor(
        private graphQLService: AppGraphQLService,
        private dialog: MatDialog
    ){}

    async ngOnInit() {
        await this.loadMe();

        switch (this.userRole && this.me.streetAddress) {
            case 'admin':
                await this.loadAdminStatic();
                break;
            case 'doctor':
                await this.loadDoctorStatic();
                break;
            case 'patient':
                await this.loadPatientStatic();
                break;
        }
    }

    async loadMe() {
        const query = `query { 
            me { 
                userRole 
                lastLogInAt
                streetAddress
            }
        }`
        try {
            const response = await this.graphQLService.send(query);
            if (response.data) {
                this.me = response.data.me;
                this.userRole = response.data.me.userRole;
                const time = DateTime.fromISO(response.data.me.lastLogInAt).toFormat('hh:mm a');
                const date = DateTime.fromISO(response.data.me.lastLogInAt).toFormat('MMM dd');
                this.lastLogin = time+', '+date;
            }
        } catch (error) {
            this.dialog.open(AlertComponent, {data: {message: "No user, "+error}})
        }
    }

    async loadAdminStatic(){
        const query = `query { 
            countDoctorRequests 
            countDoctors
            countPatients
            countMissedAppointments
        }`
        try {
            const response = await this.graphQLService.send(query);

            if (response.data) {
                this.countDoctorRequests = response.data.countDoctorRequests;
                this.countDoctors = response.data.countDoctors;
                this.countPatients = response.data.countPatients;
                this.countMissedAppointments = response.data.countMissedAppointments;
            }
        } catch (error) {
            this.dialog.open(AlertComponent, {data: {message: error}})
        }
    }

    async loadDoctorStatic(){
        const query = `query { 
            countPendingAppointments
            countUpcomingAppointments
            countPatients
            countMissedAppointments
        }`
        try {
            const response = await this.graphQLService.send(query);
            if (response.data) {
                this.countPendingAppointments = response.data.countPendingAppointments;
                this.countUpcomingAppointments = response.data.countUpcomingAppointments;
                this.countPatients = response.data.countPatients;
                this.countMissedAppointments = response.data.countMissedAppointments;
            }
        } catch (error) {
            this.dialog.open(AlertComponent, {data: {message: error}})
        }
    }

    async loadPatientStatic(){
        const query = `query { 
            countPendingAppointments
            countUpcomingAppointments
            countRecords
            countMissedAppointments
        }`
        try {
            const response = await this.graphQLService.send(query);
            if (response.data) {
                this.countPendingAppointments = response.data.countPendingAppointments;
                this.countUpcomingAppointments = response.data.countUpcomingAppointments;
                this.countRecords = response.data.countRecords;
                this.countMissedAppointments = response.data.countMissedAppointments;
            }
        } catch (error) {
            this.dialog.open(AlertComponent, {data: {message: error}})
        }
    }
}