import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { AppGraphQLService } from "../../shared/services/app-graphql.service";
import { AppDialogService } from "../../shared/services/app-dialog.service";
import { AppointmentInput } from "./appointment.input";

@Component({
    selector: 'app-appointment',
    templateUrl: './appointment.component.html',
    styleUrls: ['appointment.component.scss']
})
export class AppointmentComponent implements OnInit{
    constructor(
        private router: Router,
        private graphQLService: AppGraphQLService,
        private dialog: AppDialogService
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
            this.dialog.open({data: {message: "Error saving appointment: "+error}});
        }
    }

    cancel(){
        this.router.navigate(['appointments'])
    }
}