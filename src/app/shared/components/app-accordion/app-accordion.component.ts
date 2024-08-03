import { Component, EventEmitter, Inject, Input, OnInit, Output } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { AppDataSource } from "../../types";
import { AppGraphQLService } from "../../services/app-graphql.service";
//import { AppDialogService } from "../../services/app-dialog.service";
import { Record } from "../../../graphql/record/record";
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from "@angular/material/dialog";
import { RecordComponent } from "../../../graphql/record/record.component";
import { AlertComponent } from "../app-alert/app-alert.component";

@Component({
    selector: 'app-accordion',
    templateUrl: './app-accordion.component.html',
    styleUrls: ['./app-accordion.component.scss']
})
export class AppAccordionComponent implements OnInit{
    record: Record | undefined;
    patientName: string | undefined;

    @Input() dataSource: AppDataSource[] | undefined;
    @Input() userRole: string | undefined;
    @Input() markAppointmentId: number| null = null;
    @Output() buttonClick = new EventEmitter<{id: number, text: string}>();
    @Output() appointmentClick = new EventEmitter<{id: number, title: string}>();
    @Output() recordId = new EventEmitter<number>();
    @Output() reload = new EventEmitter<boolean>();

    constructor(
        private activatedRoute: ActivatedRoute,
        private router: Router,
        private graphQLService: AppGraphQLService,
        private dialog: MatDialog
    ){}

    async ngOnInit() {
    }

    
    async onButtonClick(id: number, text: string | undefined){
        if (text) {
            this.buttonClick.emit({id, text});
        }
    }
    async onAccordionClick(id: number) {
        await this.loadRecord(id);
    }

    async loadRecord(id: number){
        const query = `query ($recordId: Int!) {
            record (recordId: $recordId) {
                id
                title
                text
                createdAt
                draft
                appointment {
                    id
                    patient {
                        firstName
                        lastName
                        dob
                    }
                }
            }
        }`

        try {
            const response = await this.graphQLService.send(query, {recordId: id});
            if (response.data) {
                this.record = response.data.record;
                this.patientName = this.record?.appointment.patient.firstName+' '+this.record?.appointment.patient.lastName
                console.log('RECORD WITH PATIENT ??? ', this.record)
            }
        } catch (error) {
            this.dialog.open(AlertComponent, {data: {message: "Unexpected error loading medical record: "+error}})
        }   
    }

    onAppointmentClick(id: number, title: string){
        const eventInfo = { id, title }
        this.appointmentClick.emit(eventInfo);
    }
    onRecordClick(id: number){
        if (this.record?.id === id) {
            const ref = this.dialog.open(RecordComponent, {data: {recordId: id, appointmentId: this.record.appointment.id}});
            ref.componentInstance.reload.subscribe(subsription => {
                if (subsription) {
                    this.reload.emit(true);
                    //this.dialog.closeAll();
                }
            })
        }
    }
    resetRoute(){
        this.markAppointmentId = null;
        this.activatedRoute.queryParams.subscribe(params => {
            const updatedParams = { ...params };
            delete updatedParams['id'];

            this.router.navigate([], {
                relativeTo: this.activatedRoute,
                queryParams: updatedParams,
                queryParamsHandling: 'merge' 
            });
        })
    }
}