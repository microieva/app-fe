import { Component, OnInit } from "@angular/core";
import { AppGraphQLService } from "../../../shared/services/app-graphql.service";
import { take } from "rxjs";
import { Paged } from "../../../shared/types";
import { Appointment } from "../appointment";

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
        private graphQLService: AppGraphQLService
    ){}

    ngOnInit(): void {
        this.loadStatic()
    }

    
    async loadStatic() {
        const query = `query {
            me {
                id
                userRole
                countAppointments
            }
        }`
        this.graphQLService
            .send(query)
            .pipe(take(1))
            .subscribe(async (res) => {
                this.id = await res.data.me.id;
                this.count = await res.data.countAppointments;
        });
    }
    newTab(){
        console.log('NEW TAB CLICK')
        console.log('countAppointments: ', this.count)
    }

    createAppointment() {

    }
}