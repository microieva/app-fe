import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { AppGraphQLService } from "../../../shared/services/app-graphql.service";
//import { AppDialogService } from "../../../shared/services/app-dialog.service";
import { AppointmentInput } from "../appointment.input";
import { AlertComponent } from "../../../shared/components/app-alert/app-alert.component";
import { MatDialog } from "@angular/material/dialog";

@Component({
    selector: 'calendar-component',
    templateUrl: './calendar.component.html',
    styleUrls: ['calendar.component.scss']
})
export class CalendarComponent implements OnInit{
    constructor(
        private router: Router,
        private graphQLService: AppGraphQLService,
        private dialog: MatDialog
    ){}

    ngOnInit(): void {}

    async saveAppointment(appointment: AppointmentInput){
        const mutation = `
            mutation ($appointmentInput: AppointmentInput!) {
                saveAppointment (appointmentInput: $appointmentInput) {
                    success
                    message
                }
            }
        `  

        const variables = { appointmentInput: appointment };
        try {
            await this.graphQLService.mutate(mutation, variables);
        } catch (error) {
            this.dialog.open(AlertComponent, {data: {message: "Error saving appointment: "+error}});
        }
    }

    cancel(){
        this.router.navigate(['appointments'])
    }
}