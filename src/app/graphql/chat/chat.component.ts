import { Subscription } from "rxjs";
import { trigger, state, style, transition, animate } from "@angular/animations";
import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from "@angular/core";
import { FormControl, FormGroup } from "@angular/forms";
import { MatDialog } from "@angular/material/dialog";
import { ActivatedRoute, Router } from "@angular/router";
import { DateTime } from "luxon";
import { AppGraphQLService } from "../../shared/services/app-graphql.service";
import { AppTabsService } from "../../shared/services/app-tabs.service";
import { AppUserRoomService } from "../../shared/services/socket/app-user-room.service";
import { AppCountUnreadMessagesService } from "../../shared/services/app-count-unread.service";
import { AlertComponent } from "../../shared/components/app-alert/app-alert.component";
import { ConfirmComponent } from "../../shared/components/app-confirm/app-confirm.component";

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
export class ChatComponent implements OnInit, AfterViewInit, OnDestroy {

    @Input() chatId!: number;
    @Input() senderId!: number;
    @Input() receiverId: number | undefined;
    @Input() userRole: 'admin' | undefined;
    @Output() close = new EventEmitter<number>();
    @ViewChild('textarea') textarea: ElementRef | undefined;

    form = new FormGroup({
        message: new FormControl<string>('')
    });
    minRows = 2; 
    lineHeight = 24; 
    textareaHeight = this.minRows * this.lineHeight; 

    messages: any[] = [];
    online: boolean = false;
    isLoading: boolean = true;
    private subscriptions: Subscription = new Subscription();
    private socketSubs: Subscription[] = [];


    constructor(
        private graphQLService: AppGraphQLService,
        private dialog: MatDialog,
        private activatedRoute: ActivatedRoute,
        private tabsService: AppTabsService,
        private router: Router,
        private countService: AppCountUnreadMessagesService,
        private roomService: AppUserRoomService
    ){}
    
    async ngOnInit(){    
        const subRouterParams = this.activatedRoute.queryParams.subscribe(params => {
            const id = params['id']; 
            if (id) this.receiverId = +id;
        });

        if (this.receiverId) {
            this.roomService.requestUserStatus(this.receiverId);   
        }
        await this.setIsReadToTrue();
        await this.loadMessages();

        if (this.form.touched) await this.setIsReadToTrue();

        this.subscriptions.add(subRouterParams);
    }

    ngAfterViewInit(): void {
        this.socketSubs.push(
            this.roomService.onUserStatus().subscribe((status:{online:boolean}) => {
                this.online = status.online;
            })
        )
    }

    ngOnDestroy(){
        this.subscriptions.unsubscribe();
        this.socketSubs.forEach(sub => sub.unsubscribe());
    }
    get characterCount(): number {
        const message = this.form.get('message')?.value || '';
        return message.replace(/\n/g, '').length; 
    }

    async loadMessages(){
        const query = `query ($chatId: Int!) {
            messages (chatId: $chatId) {
                id
                content
                createdAt
                isRead
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
                    const time = DateTime.fromISO(msg.createdAt).toFormat('HH:mm a, MMM dd')
                    return {
                        ...msg,
                        createdAt: time
                    }
                })

                this.isLoading = false;
            }
        } catch (error) {
            this.isLoading = false;
            this.dialog.open(AlertComponent, {data: {message: "Error loading messages: "+error}})
        }
    }

    async setIsReadToTrue(){
        const mutation = `mutation ($chatId: Int!) {
            setIsReadToTrue (chatId: $chatId) {
                success
                message
            }
        }`
        try {
            await this.graphQLService.mutate(mutation, {chatId: this.chatId});
        } catch (error) {
            console.error(error)
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
                    await this.setIsReadToTrue();
                    await this.loadMessages();
                }
            } catch (error) {
                this.dialog.open(AlertComponent, {data: {message: error}});
            }
        }

        this.form.get('message')?.reset(); 
        this.countService.countUnreadMessages();
    }
    onDeleteMessage(){
        this.form.get('message')?.reset(); 
        this.textareaHeight = this.minRows * this.lineHeight; 
    }
    onChatClose(){
        this.close.emit(this.chatId)
    }
    adjustHeight(event:any) {
        const textarea = event.target as HTMLTextAreaElement;
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
    }
    async onKeyDown(event: KeyboardEvent) {
        const textarea = event.target as HTMLTextAreaElement;
      
        if (event.key === 'Enter') {
            if (event.shiftKey || event.ctrlKey) {
                event.preventDefault(); 
                const cursorPosition = textarea.selectionStart;
                const textBeforeCursor = textarea.value.substring(0, cursorPosition);
                const textAfterCursor = textarea.value.substring(cursorPosition);
                textarea.value = `${textBeforeCursor}\n${textAfterCursor}`;
                textarea.selectionStart = textarea.selectionEnd = cursorPosition + 1;
                this.form.controls['message'].setValue(textarea.value); 
                this.adjustHeight({ target: textarea });
            } else {
                event.preventDefault();
                await this.onSendMessage();
            }
        }
    }
      
    onChatDelete(){
        const ref = this.dialog.open(ConfirmComponent, {data: {message: "Deleting all messages"}});
        ref.componentInstance.isConfirming.subscribe(async () => {
            await this.deleteChatForParticipant();
        })
    }
    async deleteChatForParticipant() {
        const mutation = `mutation ($chatId: Int!) {
            deleteChatForParticipant (chatId: $chatId) {
                success
                message
            }
        }`

        try {
            const response = await this.graphQLService.mutate(mutation, {chatId: this.chatId});
            if (response.data) {
                this.tabsService.closeChatTab(this.chatId);
                this.router.navigate(['/home/messages']);
                this.ngOnInit();
            }
        } catch (error) {
            this.dialog.open(AlertComponent, {data: {message: error}});
        }
    }
}