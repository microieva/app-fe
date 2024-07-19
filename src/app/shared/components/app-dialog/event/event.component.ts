import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { FormBuilder, FormGroup } from "@angular/forms";
import { Router } from "@angular/router";
import { AppDialogService } from "../../../services/app-dialog.service";
import { AppGraphQLService } from "../../../services/app-graphql.service";

@Component({
    selector: 'app-event',
    templateUrl: './event.component.html',
    styleUrls: ['event.component.scss']
})
export class EventComponent implements OnInit{
    form!: FormGroup;
    showInput: boolean = false;
    userRole!: string;

    @Output() submit = new EventEmitter<{input: string}>();
    @Output() delete = new EventEmitter<number>();
    @Output() message = new EventEmitter<string>();
    @Output() deleteMessage = new EventEmitter<number>();

    @Input() createdAt: string | undefined;
    @Input() eventTitle: string | undefined;
    @Input() patientName: string | undefined;
    @Input() patientDob:  string | undefined;
    @Input() doctorName: string | undefined;
    @Input() eventDate:  string | undefined;
    @Input() eventStartTime:  string | undefined;
    @Input() eventEndTime:  string | undefined;
    @Input() eventId:  number | null = null;
    @Input() patientMessage:  string | null = null;
    @Input() doctorMessage:  string | null = null;

    
    constructor(
        private formBuilder: FormBuilder,
        private router: Router,
        private dialog: AppDialogService,
        private graphQLService: AppGraphQLService
    ){}

    async ngOnInit() {
        this.form = this.formBuilder.group({
            input: this.formBuilder.control<string>(' ')
        })
        await this.loadUserRole();
    }
    async loadUserRole() {
        const query = `query { me { userRole }}`
        try {
            const response = await this.graphQLService.send(query);
            if (response.data.me.userRole) {
                this.userRole =response.data.me.userRole;
            }
        } catch (error) {
            this.dialog.close();
        }
    }
    async onSaveMessage(message: string){
        const mutation = `mutation (
            $appointmentMessage: String!, 
            $appointmentId: Int!
        ) {
            saveAppointmentMessage (
                appointmentMessage: $appointmentMessage, 
                appointmentId: $appointmentId
            ) {
                success
                message
            }
        }`

        try {
            const response = await this.graphQLService.mutate(
                mutation, 
                { appointmentId: this.eventId, appointmentMessage: message }
            );
            if (response.data.saveAppointmentMessage.success) {
                await this.loadAppointment();
            }
        } catch (error) {
            this.dialog.open({ data: { message: "Error saving appointment message: "+ error}})
        }
        this.showInput = false;

    }
    async onDeleteMessage(){
        const dialogRef = this.dialog.open({data: {isDeleting: true}});
        dialogRef.componentInstance.ok.subscribe(async value => {
            if (value) {
                const mutation = `mutation ($appointmentId: Int!) {
                    deleteAppointmentMessage (appointmentId: $appointmentId) {
                        success
                        message
                    }
                }`
        
                try {
                    const response = await this.graphQLService.mutate(
                        mutation, { appointmentId: this.eventId }
                    );
                    if (response.data.deleteAppointmentMessage.success) {
                        await this.loadAppointment();
                    }
                } catch (error) {
                    this.dialog.open({ data: { message: "Error saving appointment message: "+ error}})
                }
            }
        })
    }
    async loadAppointment() {
        const query = `query ($appointmentId: Int!){ 
            appointment (appointmentId: $appointmentId){ 
                patientMessage
                doctorMessage
            }
        }`
        try {
            const response = await this.graphQLService.send(query, {appointmentId: this.eventId});
            if (response.data.appointment) {
                this.doctorMessage = response.data.appointment.doctorMessage;
                this.patientMessage = response.data.appointment.patientMessage;
            }
        } catch (error) {
            this.dialog.open({data: {message: "Unexpected error fetching appointment: "+error}});
            this.router.navigate(['/appointments']);
        }
    }

    onSubmit(){
        this.submit.emit(this.form.value);
    }
    onDelete(){
        this.eventId && this.delete.emit(this.eventId);
    }
    onLinkClick(id: number) {
        this.dialog.close();

        switch (this.eventTitle) {
            case 'Pending':
                this.router.navigate(['/appointments'], { queryParams: { tab: 0, id } }); 
                break;
            case 'Upcoming':
                this.router.navigate(['/appointments'], { queryParams: { tab: 1, id } }); 
                break;
            case 'Past':
                this.router.navigate(['/appointments'], { queryParams: { tab: 2, id } });
                break;
            default:
                break; 
        }

    }
}