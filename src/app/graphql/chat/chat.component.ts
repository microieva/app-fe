import { Subscription, switchMap } from "rxjs";
import { trigger, state, style, transition, animate } from "@angular/animations";
import { AfterViewChecked, AfterViewInit, Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from "@angular/core";
import { FormControl, FormGroup } from "@angular/forms";
import { MatDialog } from "@angular/material/dialog";
import { ActivatedRoute, Router } from "@angular/router";
import { AppGraphQLService } from "../../shared/services/app-graphql.service";
import { AppTabsService } from "../../shared/services/app-tabs.service";
import { AppUiSyncService } from "../../shared/services/app-ui-sync.service";
import { AppUserRoomService } from "../../shared/services/socket/app-user-room.service";
import { AppCountUnreadMessagesService } from "../../shared/services/app-count-unread.service";
import { AlertComponent } from "../../shared/components/app-alert/app-alert.component";
import { ConfirmComponent } from "../../shared/components/app-confirm/app-confirm.component";
import { MESSAGE_CREATED, MESSAGE_READ } from "../../shared/constants";

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
export class ChatComponent implements OnInit, AfterViewInit, OnDestroy, AfterViewChecked {

    @Input() chatId!: number;
    @Input() senderId!: number;
    @Input() receiverId: number | undefined;
    @Input() userRole: 'admin' | undefined;
    @Output() close = new EventEmitter<number>();
    @ViewChild('textarea') textarea: ElementRef | undefined;
    @ViewChild('messagesContainer') messagesContainer: ElementRef | undefined;

    form = new FormGroup({
        message: new FormControl<string>('')
    });
    minRows = 2; 
    lineHeight = 24; 
    textareaHeight = this.minRows * this.lineHeight; 

    messages: any[] = [];
    online: boolean = false;
    isLoading: boolean = true;
    isSending: boolean = false;
    private subscriptions: Subscription[] = [];

    constructor(
        private graphQLService: AppGraphQLService,
        private dialog: MatDialog,
        private activatedRoute: ActivatedRoute,
        private tabsService: AppTabsService,
        private router: Router,
        private countService: AppCountUnreadMessagesService,
        private roomService: AppUserRoomService,
        private uiSyncService: AppUiSyncService
    ){}
    
    async ngOnInit(){    
        this.subscriptions.push(this.activatedRoute.queryParams.subscribe(params => {
            const id = params['id']; 
            if (id) this.receiverId = +id;
        }));

        if (this.receiverId) {
            this.roomService.requestUserStatus(this.receiverId);   
        }
        await this.loadMessages();
        if (this.messages.length > 0 && this.messages.some(msg => !msg.isRead)) {
            await this.setIsReadToTrue();
            this.uiSyncService.triggerSync(MESSAGE_READ);
        }
    }

    async ngAfterViewInit(): Promise<void> {    
        this.setupSubscriptions();
    }

    ngAfterViewChecked() {
        if (this.messagesContainer) this.scrollToBottom();
        return;
    }

    scrollToBottom(): void {
        try {
            this.messagesContainer!.nativeElement.scrollTop = 
                this.messagesContainer!.nativeElement.scrollHeight;
        } catch(err) { 
            console.error(err); 
        }
    }

    setupSubscriptions() {
        const uiSync = this.uiSyncService.sync(MESSAGE_CREATED)
            .pipe( 
                switchMap(async () => await this.loadMessages()) 
            ).subscribe({
                error: (err) => console.error('Sync failed:', err)
            });

        const doctorsRoom = this.roomService.onUserStatus()
            .subscribe({
                next: (status) => {
                    this.online = status.online; 
                },
                error: (err) => console.error('Status sync error:', err)
            });
        this.subscriptions.push(doctorsRoom, uiSync);
    }

    ngOnDestroy(){
        this.subscriptions.forEach(sub => sub.unsubscribe());
    }

    get characterCount(): number {
        const message = this.form.get('message')?.value || '';
        return message.replace(/\n/g, '').length; 
    }

    async loadMessages(){
        const query = `query (
            $chatId: Int!,
            $pageIndex: Int!, 
            $pageLimit: Int!, 
            $sortDirection: String, 
            $sortActive: String
        ) {
            messages (
                chatId: $chatId,
                pageIndex: $pageIndex, 
                pageLimit: $pageLimit,
                sortDirection: $sortDirection,
                sortActive: $sortActive
            ) {
                length
                slice {
                    ... on Message {
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
                }
                
            }
        }`
        const variables = {
            chatId: this.chatId,
            pageIndex: 0, 
            pageLimit: 100, 
            sortDirection: 'DESC', 
            sortActive: 'createdAt'
        }
        try {
            const response = await this.graphQLService.send(query, variables);
            if (response.data) {
                this.messages = response.data.messages.slice;
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
        this.isSending = true;
            setTimeout(async () => {
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
        
            
            this.isSending = false;
        }, 3000); 
       
        
        this.form.get('message')?.reset(); 
        this.uiSyncService.triggerSync(MESSAGE_CREATED);
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