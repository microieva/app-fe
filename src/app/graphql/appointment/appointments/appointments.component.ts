import { Component, OnInit } from "@angular/core";
import { AppGraphQLService } from "../../../shared/services/app-graphql.service";
import { Paged } from "../../../shared/types";
import { Appointment } from "../appointment";
import { Router } from "@angular/router";
import { AppDialogService } from "../../../shared/services/app-dialog.service";

@Component({
    selector: 'test-apps',
    templateUrl: './appointments.component.html',
    styleUrls: ['./appointments.component.scss']
})
export class AppointmentsComponent implements OnInit {
    id!: number;
    appointments: {
        pending: Paged<Appointment>
        upcoming: Paged<Appointment>
        past: Paged<Appointment>
    } | undefined = undefined;
    count: number = 0;

    constructor(
        private graphQLService: AppGraphQLService,
        private router: Router,
        private dialog: AppDialogService
    ){}

    ngOnInit(): void {
        this.loadStatic()
    }

    
    async loadStatic() {
        const query = `query {
            me {
                id
                countAppointments
            }
        }`

        try {
            // const response = await this.graphQLService.send(query);
            // if (response.data) {
            //     this.id = response.data.me.id;
            //     this.count = response.data.countAppointments
            // }
        } catch (error){
            this.dialog.open({data: {message: error}})
        }
    }
    newTab(){
        console.log('NEW TAB CLICK')
        console.log('countAppointments: ', this.count)
    }

    createAppointment() {
        this.router.navigate(['appointments', 'new'])
    }
}