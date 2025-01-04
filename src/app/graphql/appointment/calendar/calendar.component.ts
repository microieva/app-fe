import { Subscription } from "rxjs";
import { Component, OnDestroy, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { Location } from '@angular/common';
import { MatDialog } from "@angular/material/dialog";
import { AppGraphQLService } from "../../../shared/services/app-graphql.service";
import { AlertComponent } from "../../../shared/components/app-alert/app-alert.component";
import { AppointmentInput } from "../appointment.input";
import { User } from "../../user/user";
import { AppAppointmentService } from "../../../shared/services/app-appointment.service";

@Component({
    selector: 'calendar-component',
    templateUrl: './calendar.component.html',
    styleUrls: ['calendar.component.scss']
})
export class CalendarComponent implements OnInit, OnDestroy{
    userRole!: string;
    patient: User | undefined;
    subscription: Subscription | undefined;

    constructor(
        private router: Router,
        private graphQLService: AppGraphQLService,
        private dialog: MatDialog,
        private activatedRoute: ActivatedRoute,
        private location: Location
    ){}

    async ngOnInit() {
        await this.loadUserRole();
        if (this.userRole === 'admin') {
            this.subscription = this.activatedRoute.queryParams.subscribe(async params => {
                const patientId = +params['id']; 
                if (patientId) await this.loadPatient(patientId);
            });
        }
    }

    ngOnDestroy(): void {
        this.subscription?.unsubscribe();
    }

    async loadUserRole() {
        const query = `query { me { userRole }}`
        try {
            const response = await this.graphQLService.send(query);
            if (response.data.me) {
                this.userRole = response.data.me.userRole;
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

    cancel(){
        this.location.back()
    }
}