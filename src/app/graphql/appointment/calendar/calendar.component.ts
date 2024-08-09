import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { AppGraphQLService } from "../../../shared/services/app-graphql.service";
import { Location } from '@angular/common';
import { AppointmentInput } from "../appointment.input";
import { AlertComponent } from "../../../shared/components/app-alert/app-alert.component";
import { MatDialog } from "@angular/material/dialog";

@Component({
    selector: 'calendar-component',
    templateUrl: './calendar.component.html',
    styleUrls: ['calendar.component.scss']
})
export class CalendarComponent implements OnInit{
    patientId: number | undefined;

    constructor(
        private router: Router,
        private graphQLService: AppGraphQLService,
        private dialog: MatDialog,
        private activatedRoute: ActivatedRoute,
        private location: Location
    ){}

    ngOnInit(): void {
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