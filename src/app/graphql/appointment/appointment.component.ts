import _ from "lodash-es";
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
        const input = _.omit(appointment, 'title', 'id');

        const mutation = `
            mutation ($appointmentInput: AppointmentInput!) {
                saveAppointment (appointmentInput: $appointmentInput) {
                    success
                    message
                }
            }
        `  

        const variables = { appointmentInput: input };
        console.log('INPUT: ', input)
        try {
            const response = await this.graphQLService.mutate(mutation, variables);
            if (response.data.saveAppointment.success) {
                // implement snackbar - this.snackbarService.open({message: response.data.saveAppointment.message})
            } else {
                this.dialog.open({data: {message: response.data.saveAppointment.message}});
            }
            console.log("RESPONSE FROM SAVE: ", response);
        } catch (error) {
            this.dialog.open({data: {message: error}});
        }
    }

    cancel(){
        this.router.navigate(['appointments'])
    }
}