import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { Location } from '@angular/common';
import { MatDialog } from "@angular/material/dialog";
import { AppGraphQLService } from "../../../shared/services/app-graphql.service";
import { AlertComponent } from "../../../shared/components/app-alert/app-alert.component";
import { AppointmentInput } from "../appointment.input";
import { User } from "../../user/user";
import { AppSnackbarService } from "../../../shared/services/app-snackbar.service";

@Component({
    selector: 'calendar-component',
    templateUrl: './calendar.component.html',
    styleUrls: ['calendar.component.scss']
})
export class CalendarComponent implements OnInit{
    userRole!: string;
    patient: User | undefined;

    constructor(
        private router: Router,
        private graphQLService: AppGraphQLService,
        private dialog: MatDialog,
        private activatedRoute: ActivatedRoute,
        private location: Location,
        private snackbarService: AppSnackbarService
    ){}

    async ngOnInit() {
        await this.loadUserRole();
        if (this.userRole === 'admin') {
            this.activatedRoute.queryParams.subscribe(async params => {
                const patientId = +params['id']; 
                await this.loadPatient(patientId);
            });
        }
    }

    async loadUserRole() {
        const query = `query { me { userRole }}`
        try {
            const response = await this.graphQLService.send(query);
            if (response.data) {
                this.userRole =response.data.me.userRole;
            }
        } catch (error) {
            this.router.navigate(['/'])
            this.dialog.open(AlertComponent, {data: {message: "No user, must login"}})
        }
    }

    async loadPatient(id: number){
        const query = `query ($userId: Int!) {
            user (userId: $userId) {
                id
                firstName
                lastName
            }
        }`
        try {
            const response = await this.graphQLService.send(query, {userId: id});
            if (response.data) {
                this.patient = response.data.user;
            }
        } catch (error) {
            this.dialog.open(AlertComponent, {data: {message: "Patient not found "+error}})
        }
    }

    async saveAppointment(appointmentInput: AppointmentInput){
        const mutation = `
            mutation ($appointmentInput: AppointmentInput!) {
                saveAppointment (appointmentInput: $appointmentInput) {
                    success
                    message
                }
            }
        `  
        try {
            await this.graphQLService.mutate(mutation, {appointmentInput});
        } catch (error) {
            this.dialog.open(AlertComponent, {data: {message: "Error saving appointment: "+error}});
        }
    }

    cancel(){
        this.location.back()
    }
}