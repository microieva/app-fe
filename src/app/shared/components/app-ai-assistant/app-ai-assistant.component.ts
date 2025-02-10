import { trigger, state, style, transition, animate } from "@angular/animations";
import { Component, OnDestroy, OnInit } from "@angular/core";
import { FormControl, FormGroup } from "@angular/forms";
import { MatDialog } from "@angular/material/dialog";
import { Subscription } from "rxjs";
import { DateTime } from "luxon";
import { AppAiService } from "../../services/app-ai.service";
import { AppGraphQLService } from "../../services/app-graphql.service";
import { AppSocketService } from "../../services/app-socket.service";
import { AlertComponent } from "../app-alert/app-alert.component";
import { AppAiResponse } from "../../types";
import { getNextAppointmentTodayTomorrowStartStr } from "../../utils";

@Component({
    selector: 'app-ai-assistant',
    templateUrl: 'app-ai-assistant.component.html',
    styleUrls: ['app-ai-assistant.component.scss'],
    animations: [
        trigger('growFromBottom', [
          state('hidden', style({ transform: 'scaleY(0)', opacity: 0, transformOrigin: 'bottom' })),
          state('visible', style({ transform: 'scaleY(1)', opacity: 1 })),
          transition('hidden => visible', [
            animate('300ms ease-out')
          ]),
          transition('visible => hidden', [
            animate('200ms ease-in')
          ])
        ])
      ]
})
export class AppAiAssistantComponent implements OnInit, OnDestroy {
    form = new FormGroup({
        message: new FormControl<string>('')
    });
    chat: {sender: 'ai' | 'user', text: string}[] = [{sender: 'ai', text: 'Hello! How can I help you today?'}];
    isLoading: boolean = false;
    subscription: Subscription = new Subscription();
    isMinimized:boolean = false;
    isHovering: boolean = false;
    isVisible:boolean = false;

    constructor(
        private aiService: AppAiService,
        private graphQLService: AppGraphQLService,
        private dialog: MatDialog,
        private socketService: AppSocketService
    ){}
    ngOnInit() {
        setTimeout(() => {
          this.isVisible = true; 
        }, 3000);
      }
    ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }
    onDeleteMessage(){
        this.form.reset();
    }
    onMouseEnter(e:any){
        this.isHovering = true;
    }
    onMouseLeave(e:any){
        this.isHovering = false;
    }
    toggle(){
        this.isMinimized = !this.isMinimized;
        if (this.isMinimized) {
            this.isHovering = false;
        }
    }
    onSendMessage(){
        const message = this.form.value.message;
        if (message) {
            this.chat.push({ sender: 'user', text: message });
            this.form.reset();
            this.isLoading = true;
            this.subscription = this.aiService.sendMessage(message).subscribe({
                next: async (res) => {
                    if (res && res.response) {
                        console.log('AI RESPONSE:', res.response);
                        await this.updateChat(res.response);
                    }
                },
                error: (error) => {
                    this.isLoading = false;
                    console.error('Request Error:', error);
                }
            });
        }
    }
    async updateChat(response: AppAiResponse){
        if (response.content) {
            this.isLoading = false;
            this.chat.push({ sender: 'ai', text: response.content });
        } else {
            const toolCalls = response.tool_calls;
            if (toolCalls) {
                for (const tool of toolCalls) {
                    const args = JSON.parse(tool.function.arguments);
                    const appointmentStart = args.start;
                    if (tool.function.name === 'create_appointment') {
                        const patientMessage = args.patientMessage || null; 

                        if (appointmentStart) {
                            const appointmentSaved = await this.saveAppointment(appointmentStart, patientMessage);
                            this.isLoading = false;
                            if (!appointmentSaved)  {
                                this.chat.push({ sender: 'ai', text: 'unexpected issue, please start over..' });
                            }
                            if (appointmentSaved && appointmentSaved.success) {
                                this.socketService.notifyDoctors({
                                    message: "New appointment request",
                                    appointmentId: appointmentSaved.data.id
                                });
                                const dateStr = getNextAppointmentTodayTomorrowStartStr(appointmentStart)
                                this.chat.push({ sender: 'ai', text: `Appointment saved for ${dateStr}` });
                                setTimeout(() => {
                                    this.chat.splice(1); 
                                }, 3000);
                                this.ngOnInit();
                                this.chat.push({ sender: 'ai', text: 'Is there anything else I can help you with?'})
                            } else {
                                this.chat.push({ sender: 'ai', text: 'Failed to save appointment '+appointmentSaved.message });
                            }
                        } else {
                            this.chat.push({ sender: 'ai', text: 'Please provide date and time of the appointment' });
                        }

                    } else if (tool.function.name === 'delete_appointment') {
                        if (appointmentStart) {
                            const appointmentDeleted = await this.deleteAppointment(appointmentStart);
                            this.isLoading = false;
                            if (!appointmentDeleted)  {
                                this.chat.push({ sender: 'ai', text: 'Unexpected issue, please start over..'+appointmentDeleted.message });
                            }
                            if (appointmentDeleted && appointmentDeleted.success) {
                                const dateStr = getNextAppointmentTodayTomorrowStartStr(appointmentStart)
                                this.chat.push({ sender: 'ai', text: `Appointment for ${dateStr} has been successfuly cancelled` });
                                setTimeout(() => {
                                    this.chat.pop(); 
                                    this.chat.push({ sender: 'ai', text: 'Is there anything else I can help you with?' 
                                })}, 5000);
                            } else {
                                this.chat.push({ sender: 'ai', text: 'Failed to delete the appointment '+appointmentDeleted.message });
                            }
                        } else {
                            this.chat.push({ sender: 'ai', text: 'Unexpected issue, please start over..' });
                            setTimeout(() => {
                                this.chat.splice(1); 
                            }, 5000);
                        }
                        this.ngOnInit();
                    }
                }
            } else {
                this.isLoading = false;
                this.chat.push({ sender: 'ai', text: 'Unexpected error, please refresh the page and start again.' });
            }
        }
    }
    async saveAppointment(appointmentStart: any, patientMessage: string | null){
        const start = DateTime.fromISO(appointmentStart);
        const end = start.plus({ hours: 2, minutes: 30 }).toISO();

        const appointmentInput = {
            allDay: false,
            end,
            start: start.plus({hours:2}).toISO(),
            patientMessage
        }
        const mutation = `
            mutation ($appointmentInput: AppointmentInput!) {
                saveAppointment (appointmentInput: $appointmentInput) {
                    success
                    message
                    data { id }
                }
            }
        `  
        try {
            const response = await this.graphQLService.mutate(mutation, {appointmentInput});

            return response.data.saveAppointment;
        } catch (error) {
            this.dialog.open(AlertComponent, {data: {message: "Error saving appointment: "+error}});
        }
    }
    async deleteAppointment(start: string){
        const appointmentStart = DateTime.fromISO(start).plus({hours:2}).toISO();

        const mutation = `
            mutation ($appointmentStart: String!) {
                deleteAppointmentFromAi (appointmentStart: $appointmentStart) {
                    success
                    message
                }
            }
        `  
        try {
            const response = await this.graphQLService.mutate(mutation, {appointmentStart});

            return response.data.deleteAppointmentFromAi;
        } catch (error) {
            this.dialog.open(AlertComponent, {data: {message: "Error deleting appointment: "+error}});
        }
    }

    onKeyDown(event:any){}

    adjustHeight(event:any){}

    get characterCount(): number {
        const message = this.form.get('message')?.value || '';
        return message.replace(/\n/g, '').length; 
    }
    onMinimize(){

    }
}