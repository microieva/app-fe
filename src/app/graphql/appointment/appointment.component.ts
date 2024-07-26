import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { Appointment } from "./appointment";
import { AppGraphQLService } from "../../shared/services/app-graphql.service";
import { AppDialogService } from "../../shared/services/app-dialog.service";
import { AppTabsService } from "../../shared/services/app-tabs.service";

@Component({
    selector: 'app-appointment',
    templateUrl: './appointment.component.html',
    styleUrls: ['./appointment.component.scss']
})
export class AppointmentComponent implements OnInit {
    @Input() id!: number;
    @Output() close = new EventEmitter<number>();
    appointment!: Appointment
    
    constructor(
        private graphQLService: AppGraphQLService,
        private dialog: AppDialogService,
        private tabsService: AppTabsService
    ){}

    ngOnInit(): void {
        this.loadAppointment()
    }
    closeTab(){
        const dialogref = this.dialog.open({data: {isConfirming: true, message: "All unsaved data will be lost"}});
        dialogref.componentInstance.ok.subscribe(subscription => {
            if (subscription) {
                this.close.emit(this.id)
            }
        })
    }
    async loadAppointment(){
        const query = `query ($appointmentId: Int!){ 
            appointment (appointmentId: $appointmentId) {
                id
                patient {
                    firstName
                    lastName
                    dob
                }
                doctor {
                    firstName
                    lastName
                }
                start
                end
                createdAt
            }
        }`
        try {
            const response = await this.graphQLService.send(query, {appointmentId: this.id});
            if (response.data.appointment) {
                this.appointment = response.data.appointment;
            }
        } catch (error) {
            this.dialog.open({data: {isAlert: true, message: "Unexpected error loading current appointment: "+error}})
        }
    }
}