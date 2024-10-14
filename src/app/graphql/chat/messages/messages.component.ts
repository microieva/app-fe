import { Component, OnInit, QueryList, ViewChild, ViewChildren, ViewContainerRef } from "@angular/core";
import { MatTableDataSource } from "@angular/material/table";
import { AppGraphQLService } from "../../../shared/services/app-graphql.service";
import { ActivatedRoute, Router } from "@angular/router";
import { trigger, state, style, transition, animate } from "@angular/animations";
import { MatTabGroup } from "@angular/material/tabs";
import { MatDialog } from "@angular/material/dialog";
import { environment } from "../../../../environments/environment";
import { AppSocketService } from "../../../shared/services/app-socket.service";
import { AppTabsService } from "../../../shared/services/app-tabs.service";
import { AlertComponent } from "../../../shared/components/app-alert/app-alert.component";
import { ChatComponent } from "../chat.component";
import { User } from "../../user/user";

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
export class MessagesComponent implements OnInit {
    selectedIndex: number = 0;
    userRole!: string;
    me!: Partial<User>;
    dataSource: MatTableDataSource<any> | null = null;
    onlineDoctors: any[] | undefined;
    chatId: number | undefined = 0;
    receiverId: number | undefined;
    doctors: User[] = [];
    doctorsLength: number = 0;

    pageIndex: number = 0;
    pageLimit: number = 10;
    sortDirection: string | null = null;
    sortActive: string | null = 'firstName';
    filterInput: string | null = null;

    @ViewChildren('tabContent', { read: ViewContainerRef }) tabContents!: QueryList<ViewContainerRef>;
    chats: any[] = [];
    @ViewChild('tabGroup', { static: true }) tabGroup!: MatTabGroup;

    constructor(
        private graphQLService: AppGraphQLService,
        private router: Router,
        private activatedRoute: ActivatedRoute,
        private socketService: AppSocketService,
        private tabsService: AppTabsService,
        private dialog: MatDialog
    ){}

    async ngOnInit() {
        await this.loadMe();
        if (this.userRole === 'admin') {
            await this.loadDoctors();
            this.chats = this.tabsService.getChatTabs();
            this.socketService.getOnlineUsers().subscribe(async (users) => {
                this.onlineDoctors = users.filter(user => user.userRole === 'doctor') || [];
                await this.loadDoctors();
                this.formatDataSource();
            });
          
            this.socketService.requestOnlineUsers();
        } else { 
            this.receiverId = environment.adminId;
            this.chatId = await this.loadChatId();
        }
        this.activatedRoute.queryParams.subscribe(params => {
            const tab = params['tab'];
            this.selectedIndex = tab ? +tab : 0; 
        });
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
                    }
                }
            }
        }`
        const variables = {
            pageIndex: this.pageIndex,
            pageLimit: this.pageLimit,
            sortActive: this.sortActive,
            sortDirection: this.sortDirection || 'DESC',
            filterInput: this.filterInput
        }
        try {
            const response = await this.graphQLService.send(query, variables);
            if (response.data.doctors) {
                this.doctors = response.data.doctors.slice;
                this.doctorsLength = response.data.doctors.length;
                const formatted = this.formatDataSource()

                this.dataSource = new MatTableDataSource<any>(formatted);
            }
        } catch (error) {
            this.dialog.open(AlertComponent, {data: {message: "Unexpected error loading requests: "+error}})
        }
    }
    formatDataSource() {
        if (this.onlineDoctors && this.onlineDoctors.length > 0) {
            const formatted = this.doctors.map((doctor) => {
                const isOnline = this.onlineDoctors?.some(onlineDoctor => doctor.id === onlineDoctor.id);
                return {
                    ...doctor,
                    online: isOnline || false 
                };
            });
            return formatted;
        } else {
            return this.doctors.map(doctor => {
                return {
                    ...doctor,
                    online: false
                }
            });
        }
    }
    
    onTabChange(value: any){
        this.selectedIndex = value;

        this.chats = this.tabsService.getChatTabs();
        const chat = this.chats[value-1]
        const receiverId = this.doctors.find(doctor => {
            const receiverName = doctor.firstName+' '+doctor.lastName;
            return chat && chat.title === receiverName
        })?.id;
        this.router.navigate([], {
            relativeTo: this.activatedRoute,
            queryParams: { tab: value, id: receiverId },
            queryParamsHandling: 'merge' 
        });
    }

    onOpenChat(receiverId: number) {
        this.receiverId = receiverId;
        const chatReceiver = this.dataSource?.data.find(row => row.id === receiverId);
        this.createChatTab(chatReceiver);
    }

    onChatClose(id: number){
        this.tabsService.closeChatTab(id);
        this.chats = this.tabsService.getChatTabs();
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
}