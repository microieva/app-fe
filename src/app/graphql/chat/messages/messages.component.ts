import { distinctUntilChanged, Subscription } from "rxjs";
import { Component, OnDestroy, OnInit, QueryList, ViewChild, ViewChildren, ViewContainerRef } from "@angular/core";
import { MatTableDataSource } from "@angular/material/table";
import { AppGraphQLService } from "../../../shared/services/app-graphql.service";
import { ActivatedRoute, Router } from "@angular/router";
import { trigger, state, style, transition, animate } from "@angular/animations";
import { MatTabGroup } from "@angular/material/tabs";
import { MatDialog } from "@angular/material/dialog";
import { environment } from "../../../../environments/environment";
import { getLastLogOutStr } from "../../../shared/utils";
import { AppSocketService } from "../../../shared/services/app-socket.service";
import { AppTabsService } from "../../../shared/services/app-tabs.service";
import { AppCountUnreadMessagesService } from "../../../shared/services/app-count-unread.service";
import { AlertComponent } from "../../../shared/components/app-alert/app-alert.component";
import { ChatComponent } from "../chat.component";
import { User } from "../../user/user";
import { UserDataSource } from "../../../shared/types";

@Component({
    selector: 'app-messages',
    templateUrl: './messages.component.html',
    styleUrls: ['./messages.component.scss'],
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
export class MessagesComponent implements OnInit, OnDestroy {
    selectedIndex: number = 0;
    userRole!: string;
    me!: Partial<User>;
    dataSource: MatTableDataSource<any> | null = null;
    displayedColumns: Array<{ columnDef: string, header: string }> = [];
    formatted: UserDataSource[] | undefined;
    onlineDoctors: any[] = [];
    chatId: number | undefined = 0;
    senders: string[] = [];
    receiverId: number | undefined;
    doctors: User[] = [];
    doctorsLength: number = 0;
    unreadMessages: { senderId: number, count: number}[] | undefined;

    pageIndex: number = 0;
    pageLimit: number = 10;
    sortDirection: string = 'DESC';
    sortActive: string = 'lastLogOutAt';
    filterInput: string | null = null;

    @ViewChildren('tabContent', { read: ViewContainerRef }) tabContents!: QueryList<ViewContainerRef>;
    chats: any[] = [];
    @ViewChild('tabGroup', { static: true }) tabGroup!: MatTabGroup;

    private subscriptions: Subscription = new Subscription();

    constructor(
        private graphQLService: AppGraphQLService,
        private router: Router,
        private activatedRoute: ActivatedRoute,
        private socketService: AppSocketService,
        private tabsService: AppTabsService,
        private dialog: MatDialog,
        private countService: AppCountUnreadMessagesService
    ){}

    async ngOnInit() {
        await this.loadMe();
        if (this.userRole === 'admin') {
            await this.loadUnreadMessages();
            await this.loadDoctors();
            this.chats = this.tabsService.getChatTabs();
            const subscriptionOnlineUsers = this.socketService.getOnlineUsers()
                .pipe(
                    distinctUntilChanged((prev, curr)=> JSON.stringify(prev) === JSON.stringify(curr))
                )
                .subscribe(async users => {
                    this.onlineDoctors = users.filter(user => user.userRole === 'doctor') || [];
                    await this.loadUnreadMessages();
                    await this.loadDoctors();
                });
            
            const subscriptionNotifications = this.socketService.receiveNotification().subscribe(async (subscription: any)=> {
                if (subscription && subscription.chatId) {
                    this.senders.push(subscription.sender);
                    await this.loadUnreadMessages();
                    await this.loadDoctors();
                }
            });
            this.subscriptions.add(subscriptionOnlineUsers);
            this.subscriptions.add(subscriptionNotifications);
        } else { 
            this.receiverId = environment.adminId;
            this.chatId = await this.loadChatId();
        }
        const subRouteParams = this.activatedRoute.queryParams.subscribe(async params => {
            const tab = params['tab'];
            this.selectedIndex = tab ? +tab : 0; 
        });
        this.subscriptions.add(subRouteParams);
    }

    ngOnDestroy(){
        this.subscriptions.unsubscribe();
    }

    async loadUnreadMessages(){
        const query = `query { countAllUnreadMessages { senderId count }}`

        try {
            const response = await this.graphQLService.send(query);
            if (response.data.countAllUnreadMessages) {
                this.unreadMessages = response.data.countAllUnreadMessages;
            }
        } catch (error) {
            this.dialog.open(AlertComponent, {data: {message: error}});
        }
    }
    
    async loadDoctors(){
        const query = `query (
            $pageIndex: Int!, 
            $pageLimit: Int!, 
            $sortDirection: String, 
            $sortActive: String,
            $filterInput: String
        ){ 
            doctors (
                pageIndex: $pageIndex, 
                pageLimit: $pageLimit,
                sortDirection: $sortDirection,
                sortActive: $sortActive,
                filterInput: $filterInput
            ){
                length
                slice {
                    ... on User {
                        id
                        email
                        firstName
                        lastName
                        createdAt
                        updatedAt
                        lastLogOutAt
                    }
                }
            }
        }`
        const variables = {
            pageIndex: this.pageIndex,
            pageLimit: this.pageLimit,
            sortActive: this.sortActive,
            sortDirection: this.sortDirection,
            filterInput: this.filterInput
        }

        try {
            const response = await this.graphQLService.send(query, variables);
            if (response.data.doctors) {
                this.doctors = response.data.doctors.slice;
                this.doctorsLength = response.data.doctors.length;
                this.socketService.requestOnlineUsers();
                this.formatDataSource();

                this.dataSource = new MatTableDataSource<UserDataSource>(this.formatted);
                this.displayedColumns = [ 
                    {header: 'Online', columnDef: 'online'},
                    {header: 'Name', columnDef: 'name'},
                    {header: 'Last online', columnDef: 'lastLogOutAt'},
                    {header: 'Unread', columnDef: 'unreadMessages'},
                ]  
            }
        } catch (error) {
            this.dialog.open(AlertComponent, {data: {message: "Unexpected error loading requests: "+error}})
        }
    }
    formatDataSource() {
        if (this.onlineDoctors && this.onlineDoctors.length > 0) {
            let isUnread: boolean = false;
            this.formatted = this.doctors.map((doctor) => {
                const isOnline = this.onlineDoctors?.some(onlineDoctor => doctor.id === onlineDoctor.id);
                const lastOnline = getLastLogOutStr(doctor.lastLogOutAt)
                let count: number | null = null;

                if (this.unreadMessages && this.unreadMessages.length> 0) {
                    count = this.unreadMessages?.find(obj => obj.senderId === doctor.id)?.count || null;
                    isUnread = this.unreadMessages?.some(obj => obj.senderId === doctor.id && obj.count !== null)
                }

                return {
                    ...doctor,
                    name: doctor.firstName+' '+doctor.lastName,
                    online: isOnline || false, 
                    lastLogOutAt:  !isOnline ? lastOnline : 'Currently online',
                    unreadMessages: count
                };
            })

            if (this.sortActive === 'lastLogOutAt' && this.sortDirection === 'DESC') {
                this.formatted
                    .sort((a, b) => {
                        if (a.lastLogOutAt === "Currently online" && b.lastLogOutAt !== "Currently online") {
                        return -1; 
                        }
                        if (b.lastLogOutAt === "Currently online" && a.lastLogOutAt !== "Currently online") {
                        return 1; 
                        }
                        return 0;
                    }
                );
            }
        } else {
            this.formatted = this.doctors.map(doctor => {
                let count: number | null = null;
                const lastOnline = getLastLogOutStr(doctor.lastLogOutAt)
                if (this.unreadMessages && this.unreadMessages.length> 0) {
                    count = this.unreadMessages?.find(obj => obj.senderId === doctor.id)?.count || null;
                }

                return {
                    ...doctor,
                    online: false,
                    name: doctor.firstName+' '+doctor.lastName,
                    lastLogOutAt: lastOnline,
                    unreadMessages: count
                }
            });
        }
    }
    
    async onTabChange(value: any){
        this.selectedIndex = value;

        this.chats = this.tabsService.getChatTabs();
        const chat = this.chats[value-1]
        const receiverId = this.doctors.find(doctor => {
            const receiverName = doctor.firstName+' '+doctor.lastName;
            return chat && chat.title === receiverName
        })?.id;
        this.countService.countUnreadMessages();
        if (this.selectedIndex === 0) {
            this.loadUnreadMessages();
            await this.loadDoctors();
            
            this.router.navigate([], {
                queryParams: { tab: value }
            });
        }
        this.senders = this.senders.filter((name: string) => name !== chat.sender);
        
        this.router.navigate([], {
            relativeTo: this.activatedRoute,
            queryParams: { tab: value, id: receiverId },
            queryParamsHandling: 'merge' 
        });
    }

    onOpenChat(value:{id: number, title?:string}) {
        this.receiverId = value.id;
        const chatReceiver = this.dataSource?.data.find(row => row.id === this.receiverId);
        this.createChatTab(chatReceiver);
        this.countService.countUnreadMessages();
        this.loadUnreadMessages();
    }

    onChatClose(id: number){
        this.tabsService.closeChatTab(id);
        this.chats = this.tabsService.getChatTabs();
        this.countService.countUnreadMessages();
        this.loadUnreadMessages();
    }
    
    async createChatTab(chatReceiver: any) {
        const receiverName = chatReceiver.firstName+' '+chatReceiver.lastName;

        const id = await this.loadChatId(chatReceiver.id);
        if (id && !this.chats.some(chat => chat.id === id)) {
            this.chatId = id;
            const title = receiverName;
            const component = ChatComponent;    
            this.tabsService.addChatTab(title, component, id, this.tabGroup);

            this.chats = this.tabsService.getChatTabs();
            this.router.navigate([], {
                relativeTo: this.activatedRoute,
                queryParams: { tab: 1 },
                queryParamsHandling: 'merge' 
            });
        } else {
            this.chats = this.tabsService.getChatTabs();
            const chat = this.chats.find((chat: any) => chat.title === receiverName);
            const index = this.chats.indexOf(chat);
            this.router.navigate([], {
                relativeTo: this.activatedRoute,
                queryParams: { tab: index+1 },
                queryParamsHandling: 'merge' 
            });
        }
    }

    async loadChatId(receiverId?: number): Promise<number | undefined>{
        const query = `query ($receiverId: Int) {
            chatId (receiverId: $receiverId)
        }`
        try {
            const response = await this.graphQLService.send(query, {receiverId});
            if (response.data) {
                return response.data.chatId;
            }
        } catch (error) {
            this.dialog.open(AlertComponent, {data: {message: error}});
        }
        return;
    }

    async loadMe() {
        const query = `query { 
            me { id userRole }
        }`

        try {
            const response = await this.graphQLService.send(query);
            if (response.data) {
                this.userRole = response.data.me.userRole;
                this.me = response.data.me;
            }
        } catch (error) {
            console.error(error);
            this.router.navigate(['/home'])
        }
    }

    async onPageChange(value: any) {
        this.pageIndex = value.pageIndex;
        this.pageLimit = value.pageLimit;
        await this.loadDoctors();
    }

    async onSortChange(value: any) {
        if (value.active === 'name') {
            this.sortActive = 'firstName'
        } else if (value.active === 'online'){
            this.sortActive === 'lastLogOutAt'
        } else {

            this.sortActive = value.active
        }   

        if (value.direction)
        this.sortDirection = value.direction.toUpperCase();
        await this.loadDoctors();
    }

    async onFilterValueChange(value: any){
        this.filterInput = value;
        await this.loadDoctors();
    }
}