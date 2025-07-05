import { Subscription, switchMap } from "rxjs";
import { AfterViewInit, Component, OnDestroy, OnInit, QueryList, ViewChild, ViewChildren, ViewContainerRef } from "@angular/core";
import { MatTableDataSource } from "@angular/material/table";
import { AppGraphQLService } from "../../../shared/services/app-graphql.service";
import { ActivatedRoute, Router } from "@angular/router";
import { trigger, state, style, transition, animate } from "@angular/animations";
import { MatTabGroup } from "@angular/material/tabs";
import { MatDialog } from "@angular/material/dialog";
import { environment } from "../../../../environments/environment";
import { getLastLogOutStr } from "../../../shared/utils";
import { AppTabsService } from "../../../shared/services/app-tabs.service";
import { AppCountUnreadMessagesService } from "../../../shared/services/app-count-unread.service";
import { AppUserRoomService } from "../../../shared/services/socket/app-user-room.service";
import { AppUiSyncService } from "../../../shared/services/app-ui-sync.service";
import { AlertComponent } from "../../../shared/components/app-alert/app-alert.component";
import { ChatComponent } from "../chat.component";
import { User } from "../../user/user";
import { AppTableDisplayedColumns, UserDataSource } from "../../../shared/types";
import { MESSAGE_CREATED } from "../../../shared/constants";

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
export class MessagesComponent implements OnInit, OnDestroy, AfterViewInit {
    selectedIndex: number = 0;
    isLoading: boolean = false;
    userRole!: string;
    me!: Partial<User>;
    dataSource: MatTableDataSource<any> | null = null;
    displayedColumns: AppTableDisplayedColumns[] = []
    formatted: UserDataSource[] | undefined;
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

    private subscriptions: Subscription[] = [];
    countOnlineDoctors: number = 0;
    onlineDoctorIds: number[] = [];


    constructor(
        private graphQLService: AppGraphQLService,
        private router: Router,
        private activatedRoute: ActivatedRoute,
        private roomService: AppUserRoomService,
        private tabsService: AppTabsService,
        private dialog: MatDialog,
        private countService: AppCountUnreadMessagesService,
        private uiSyncService: AppUiSyncService
    ){}

    async ngOnInit() {
        this.subscriptions.push(this.activatedRoute.queryParams.subscribe(params => {
            const tab = params['tab'];
            this.selectedIndex = tab ? +tab : 0; 
        }));

        await this.loadMe();
        if (this.userRole === 'admin') {
            await this.countUnreadMessages();
            await this.loadDoctors();
            this.chats = this.tabsService.getChatTabs();
            this.roomService.requestDoctorsRoom();   
        } else { 
            this.isLoading = true;
            this.receiverId = Number(environment.adminId);
            this.chatId = await this.loadChatId();
        }   
    }

    ngAfterViewInit(): void {
        this.setupSubscriptions();
    }

    setupSubscriptions(){
        const doctorsRoom = this.roomService.onDoctorRoomActivity()
            .subscribe(async (room:{doctorIds:number[]}) => {
                this.countOnlineDoctors = room.doctorIds.length;
                this.onlineDoctorIds = room.doctorIds;
                await this.countUnreadMessages();
                await this.loadDoctors();
            });
        const uiSync =  this.uiSyncService.sync(MESSAGE_CREATED)
            .pipe(
                switchMap(async () => await this.countUnreadMessages()))
            .subscribe({
                error: (err) => console.error('Sync failed:', err)
            })
        this.subscriptions.push(doctorsRoom, uiSync);
    }

    ngOnDestroy(){
        this.subscriptions.forEach(sub => sub.unsubscribe());
    }

    async countUnreadMessages(){
        const query = `query { countAllUnreadMessages { senderId count }}`

        try {
            const response = await this.graphQLService.send(query);
            this.unreadMessages = response.data.countAllUnreadMessages;
            this.formatDataSource();
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
                this.formatDataSource();
            }
        } catch (error) {
            this.dialog.open(AlertComponent, {data: {message: "Unexpected error loading requests: "+error}})
        }
    }
    formatDataSource() {
        if (this.onlineDoctorIds.length > 0) {
            let isUnread: boolean = false;
            this.formatted = this.doctors.map((doctor) => {
                const isOnline = this.onlineDoctorIds.some(id => doctor.id === id);
                const lastOnline = getLastLogOutStr(doctor.lastLogOutAt)
                let count: number | null = null;

                if (this.unreadMessages && this.unreadMessages.length> 0) {
                    count = this.unreadMessages?.find(obj => obj.senderId === doctor.id)?.count || null;
                    isUnread = this.unreadMessages?.some(obj => obj.senderId === doctor.id && obj.count !== null)
                }

                return {
                    ...doctor,
                    name: doctor.firstName+' '+doctor.lastName,
                    online: isOnline, 
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
            this.setTableData();
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
            this.setTableData();
        }
        
    }
    setTableData() {
        this.dataSource = new MatTableDataSource<UserDataSource>(this.formatted);
        this.displayedColumns = [ 
            {header: 'Status', columnDef: 'online', sort:true},
            {header: 'Name', columnDef: 'name', sort:true},
            {header: 'Last online', columnDef: 'lastLogOutAt', sort:true},
            {header: 'Unread', columnDef: 'unreadMessages', sort:true}
        ] 
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
            this.countUnreadMessages();
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

    async onOpenChat(value:{id: number, title?:string}) {
        this.receiverId = value.id;
        const chatReceiver = this.dataSource?.data.find(row => row.id === this.receiverId);
        await this.createChatTab(chatReceiver);
        this.countService.countUnreadMessages(); 
        //this.headerService.notifyUnreadCountUpdate(); uiSyncService
        await this.countUnreadMessages();
    }

    async onChatClose(id: number){
        this.tabsService.closeChatTab(id);
        this.chats = this.tabsService.getChatTabs();
        this.countService.countUnreadMessages();
        await this.countUnreadMessages();
    }
    
    async createChatTab(chatReceiver: any) {
        const receiverName = chatReceiver.firstName+' '+chatReceiver.lastName;

        const chatId = await this.loadChatId(chatReceiver.id);
        if (chatId && !this.chats.some(chat => chat.id === chatId)) {
            this.chatId = chatId;
            const title = receiverName;
            const component = ChatComponent;    
            this.tabsService.addChatTab(title, component, chatId, this.tabGroup);

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
                this.isLoading = false;
                return response.data.chatId;
            }
        } catch (error) {
            this.isLoading = false;
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