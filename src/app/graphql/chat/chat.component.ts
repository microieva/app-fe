import { trigger, state, style, transition, animate } from "@angular/animations";
import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { FormControl, FormGroup } from "@angular/forms";
import { AppGraphQLService } from "../../shared/services/app-graphql.service";
import { AlertComponent } from "../../shared/components/app-alert/app-alert.component";
import { MatDialog } from "@angular/material/dialog";
import { DateTime } from "luxon";
import { AppSocketService } from "../../shared/services/app-socket.service";

@Component({
    selector: 'app-chat',
    templateUrl: './chat.component.html',
    styleUrls: ['./chat.component.scss'],
    animations: [
        trigger('slideInOut', [
            state('in', style({ transform: 'translateY(0)', opacity: 1 })),
            transition(':enter', [
                style({ transform: 'translateY(80%)', opacity: 0.1 }),
                animate('600ms cubic-bezier(0.25, 0.8, 0.25, 1)', style({ transform: 'translateY(0)', opacity: 1 }))
            ]),
            transition(':leave', [
                animate('600ms cubic-bezier(0.25, 0.8, 0.25, 1)', style({ transform: 'translateY(100%)', opacity: 0.1 }))
            ])
        ]),
    ]
})
export class ChatComponent implements OnInit {

    @Input() chatId!: number;
    @Input() senderId!: number;
    @Input() receiverId!: number;
    @Input() userRole: 'admin' | undefined;
    @Output() close = new EventEmitter<number>();

    form = new FormGroup({
        message: new FormControl<string>('')
    });
    messages: any[] = [];
    online: boolean = false;

    constructor(
        private graphQLService: AppGraphQLService,
        private dialog: MatDialog,
        private socketService: AppSocketService
    ){}
    async ngOnInit(){

        await this.loadMessages();
        this.socketService.receiveNotification().subscribe(async (subscription: any)=> {
            if (subscription && subscription.chatId) {
                await this.loadMessages();
            }
        })
        this.socketService.getOneUserStatus(this.receiverId).subscribe(isOnline => {
            if (isOnline.userId && isOnline.userId === this.receiverId) {
                this.online = isOnline.online;
            } else {
                this.online = isOnline;
            }
        }); 
        this.socketService.requestOneUserStatus(this.receiverId);
    }

    async loadMessages(){
        const query = `query ($chatId: Int!) {
            messages (chatId: $chatId) {
                id
                content
                createdAt
                sender {
                    id
                    firstName
                    lastName
                    userRole
                }
            }
        }`
        try {
            const response = await this.graphQLService.send(query, {chatId: this.chatId});
            if (response.data) {
                this.messages = response.data.messages;
                this.messages = this.messages.map(msg => {
                    const time = DateTime.fromISO(msg.createdAt).plus({hours: 3}).toFormat('hh:mm a, MMM dd')
                    return {
                        ...msg,
                        createdAt: time
                    }
                })
            }
        } catch (error) {
            this.dialog.open(AlertComponent, {data: {message: "Error loading messages: "+error}})
        }
    }

    async onSendMessage() {
        const message = this.form.value.message;

        if (message) {
            const mutation = `mutation (
                $chatId: Int!,
                $content: String!
            ) {
                saveChatMessage (
                    chatId: $chatId,
                    content: $content
                ) {
                    id
                    content
                    createdAt
                    sender {
                        id
                        firstName
                        lastName
                    }
                }
            }`
            const variables = {
                content: message,
                chatId: this.chatId
            }
            try {
                const response = await this.graphQLService.mutate(mutation, variables);
                if (response.data) {
                    await this.loadMessages();
                }
            } catch (error) {
                this.dialog.open(AlertComponent, {data: {message: error}});
            }
        }

        this.form.get('message')?.reset(); 
    }
    onDeleteMessage(){
        this.form.get('message')?.reset(); 
    }
    onChatClose(){
        this.close.emit(this.chatId)
    }
}