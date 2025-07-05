import { Subscription, switchMap } from "rxjs";
import { AfterViewInit, Component, OnDestroy, OnInit } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { ActivatedRoute, Router } from "@angular/router";
import { trigger, state, style, transition, animate } from "@angular/animations";
import { MatTableDataSource } from "@angular/material/table";
import { DateTime } from "luxon";
import { AppGraphQLService } from "../../../shared/services/app-graphql.service";
import { AppUiSyncService } from "../../../shared/services/app-ui-sync.service";
import { AlertComponent } from "../../../shared/components/app-alert/app-alert.component";
import { ConfirmComponent } from "../../../shared/components/app-confirm/app-confirm.component";
import { UserComponent } from "../user.component";
import { AppTableDisplayedColumns, UserDataSource } from "../../../shared/types";
import { User } from "../user";
import { LoadingComponent } from "../../../shared/components/app-loading/loading.component";
import { DOCTOR_REQUEST_CREATED } from "../../../shared/constants";

@Component({
    selector: 'app-doctors',
    templateUrl: './doctors.component.html',
    styleUrls: ['./doctors.component.scss'],
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
export class DoctorsComponent implements OnInit, AfterViewInit, OnDestroy {
    isLoading: boolean = true;
    selectedIndex: number = 0;
    dataSource: MatTableDataSource<UserDataSource> | null = null;
    displayedColumns: AppTableDisplayedColumns[] = []
    actions: any[] | null= null;

    requests: User[] = [];
    requestsLength: number = 0;
    doctors: User[] = [];
    doctorsLength: number = 0;

    countRequests: number = 0;
    countDoctors: number = 0;
    requestsDataSource: UserDataSource[] | undefined;
    doctorsDataSource: UserDataSource[] | undefined;

    pageIndex: number = 0;
    pageLimit: number = 10;
    sortDirection: string = 'ASC';
    sortActive: string = 'firstName';
    filterInput: string | null = null;

    private subscription: Subscription = new Subscription();

    constructor(
        private activatedRoute: ActivatedRoute,
        private dialog: MatDialog,
        private graphQLService: AppGraphQLService,
        private router: Router,
        private uiSyncService: AppUiSyncService
    ){}

    async ngOnInit() {
        await this.loadData();
        const sub = this.activatedRoute.queryParams.subscribe(async params => {
            const tab = params['tab'];
            this.selectedIndex = tab ? +tab : 0;
            await this.loadData();
        });  
        this.subscription.add(sub); 
    }

    ngAfterViewInit(): void {
        this.subscription.add(this.uiSyncService.sync(DOCTOR_REQUEST_CREATED)
            .pipe(
                switchMap(async () => await this.loadRequests()))
            .subscribe({
                error: (err) => console.error('Sync failed:', err)
            }));
    }

    async loadStatic() {
        const query = `query {
            countDoctorRequests
            countDoctors
        }`
        try {
            const response = await this.graphQLService.send(query);
            this.countRequests = response.data.countDoctorRequests;
            this.countDoctors = response.data.countDoctors;
        } catch (error) {
            this.dialog.open(AlertComponent, {width:"35rem", data:{message:error}})
        }
    }

    async loadData() {
        this.isLoading = true;
        await this.loadStatic();
        switch (this.selectedIndex) {
            case 0:
                await this.loadRequests();
                break;
            case 1:
                await this.loadDoctors();
                break;
            default:
                break;
        }
    }

    async loadRequests(){
        const query = `query (
            $pageIndex: Int!, 
            $pageLimit: Int!, 
            $sortDirection: String, 
            $sortActive: String,
            $filterInput: String
        ){ 
            requests (
                pageIndex: $pageIndex, 
                pageLimit: $pageLimit,
                sortDirection: $sortDirection,
                sortActive: $sortActive,
                filterInput: $filterInput
            ){
                length
                slice {
                    ... on DoctorRequest {
                        id
                        email
                        firstName
                        lastName
                        createdAt
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
            
            if (response.data) {
                this.requests = response.data.requests.slice;
                this.requestsLength = response.data.requests.length;
                this.countRequests = this.requestsLength;
                this.formatDataSource("requests");
                this.isLoading = false;
            }
        } catch (error) {
            this.isLoading = false;
            this.dialog.open(AlertComponent, {data: {message: "Unexpected error loading requests: "+error}})
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
            if (response.data) {
                this.doctors = response.data.doctors.slice;
                this.doctorsLength = response.data.doctors.length;
                this.formatDataSource("doctors")
                this.isLoading = false;
            }
        } catch (error) {
            this.dialog.open(AlertComponent, {data: {message: "Unexpected error loading requests: "+error}})
        }
    }

    formatDataSource(view: string){
        switch (view) {
            case "requests":
                this.requestsDataSource = this.requests.map((row) => {
                    const createdAt = DateTime.fromISO(row.createdAt,  {setZone: true}).toFormat('MMM dd, yyyy');

                    return {
                        id: row.id,
                        createdAt,
                        email: row.email,
                        name: row.firstName+' '+row.lastName,
                        actions: this.actions,
                        updatedAt: '-',
                        isRequest: true
                    } 
                });

                this.actions = [
                    {
                        text: "Activate account",
                    },
                    {
                        text: "Cancel request",
                    }
                ]

                this.displayedColumns = [ 
                    {header: 'checkbox', columnDef: 'checkbox', sort: false},
                    {header: 'Actions', columnDef: 'actions',  sort: false},
                    {header: 'Name', columnDef: 'name', sort:true},
                    {header: 'Email', columnDef: 'email', sort:true},
                    {header: 'Request created', columnDef: 'createdAt', sort:true},
                ]

                this.dataSource = new MatTableDataSource<UserDataSource>(this.requestsDataSource);
                break;
            case "doctors":
                this.doctorsDataSource = this.doctors.map((row) => {
                    const createdAt = DateTime.fromISO(row.createdAt, {setZone: true}).toFormat('MMM dd, yyyy');
                    const updatedAt = DateTime.fromISO(row.updatedAt, {setZone: true}).toFormat('MMM dd, yyyy');
                    this.actions = [
                        {
                            text: "Deactivate account",
                        }
                    ]
                    return {
                        id: row.id,
                        createdAt,
                        email: row.email,
                        name: row.firstName+' '+row.lastName,
                        updatedAt: updatedAt.includes('1970') ? '-' : updatedAt,
                        isRequest: false,
                        actions:this.actions  
                    } 
                });
                this.displayedColumns = [ 
                    {header: 'checkbox', columnDef: 'checkbox', sort: false},
                    {header: 'Actions', columnDef: 'actions',  sort: false},
                    {header: 'Name', columnDef: 'name', sort:true},
                    {header: 'Email', columnDef: 'email', sort:true},
                    {header: 'Account activated', columnDef: 'createdAt', sort:true}
                ];
                this.dataSource = new MatTableDataSource<UserDataSource>(this.doctorsDataSource);  
                break;
            default:
                break;
        }
    }

    async onTabChange(value: any) {
        this.selectedIndex = value;
        this.pageIndex = 0;
        this.sortActive = 'firstName';
        this.filterInput = null;
        this.displayedColumns = [];

        this.router.navigate([], {
            relativeTo: this.activatedRoute,
            queryParams: { tab: value }
        });
        await this.loadData();
    }

    async onPageChange(value: any){
        this.pageIndex = value.pageIndex;
        this.pageLimit = value.pageLimit;
        await this.loadData();
    }

    async onSortChange(value: any){
        switch (value.active) {
            case 'name':
                this.sortActive = 'firstName';
                break;
            case 'created':
                this.sortActive = 'createdAt';
                break;
            default:
                this.sortActive = value.active;
                break;
        }  

        if (value.direction)
        this.sortDirection = value.direction.toUpperCase();
        await this.loadData();
    }
    ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }

    async onFilterValueChange(value: any){
        this.filterInput = value;
        await this.loadData();
    }

    async onUserClick(value:{id: number, title?:string}){
        const userId = value.id;
        const dialogRef = this.dialog.open(UserComponent, {data: {userId}});

        this.subscription.add(dialogRef.componentInstance.isDeletingUser.subscribe(async subscription => {
            if (subscription) {
                await this.deleteUser(userId);
            }
        }));
    }

    async deleteUser(id: number){
        const mutation = `mutation ($userId: Int!) {
            deleteUser(userId: $userId) {
                success
                message
            }
        }`
        try {
            const response = await this.graphQLService.mutate(mutation, { userId: id});
            if (response.data.deleteUser.success) {
                this.dialog.closeAll();
                await this.loadData();
            }
            this.dialog.open(AlertComponent, {data: {message: "User account deleted"}});
        } catch (error) {
            this.dialog.open(AlertComponent, { data: {message: "Error deleting user: "+ error}});
        }
    }
    async onActionClick(event: {text: string, ids: number[]}) {
        switch (event.text) {
            case 'Deactivate account':
                await this.deactivateDoctorAccountsByIds(event.ids);
                break;
            case 'Activate account':
                await this.activateDoctorAccountsByIds(event.ids);
                break;
            case 'Cancel request':
                await this.deleteDoctorRequestsByIds(event.ids);
                break;
            default: 
                break;
        }
    }
    async deleteDoctorRequestsByIds(ids:number[]) {
        let message:string;
        if (ids.length === 1) {
            message = "Permanently delete this doctor account activation request?"
        } else {
            message = `${ids.length} doctor account activation requests will be permanently deleted`
        }
        const ref = this.dialog.open(ConfirmComponent, {disableClose:true, width:"34rem", data:{message}});
        ref.componentInstance.isConfirming.subscribe(async ()=> {
            const mutation = `mutation ($userIds: [Int!]) {
                deleteDoctorRequestsByIds(userIds: $userIds) {
                    success
                    message
                }
            }`
            try {
                const response = await this.graphQLService.mutate(mutation, {userIds:ids})
                if (response.data.deleteDoctorRequestsByIds.success) {
                    await this.loadData();
                    this.dialog.open(AlertComponent, {data: {message:response.data.deleteDoctorRequestsByIds.message}})    
                } else {
                    const ref = this.dialog.open(AlertComponent, {data: {message:response.data.deleteDoctorRequestsByIds.message}});
                    ref.componentInstance.ok.subscribe(async ()=> {
                        await this.loadData();
                    })
                }
            } catch (error) {
                const ref = this.dialog.open(AlertComponent, {data: {message:error}});
                ref.componentInstance.ok.subscribe(async ()=> {
                    await this.loadData();
                })
            }
        });
        ref.componentInstance.isCancelling.subscribe(async () => {
            await this.loadData();
        })
    }
    async activateDoctorAccountsByIds(ids:number[]) {
        let message:string;
        if (ids.length === 1) {
            message = "Activate this account request?"
        } else {
            message = `${ids.length} accounts will be activated`
        }
        const ref = this.dialog.open(ConfirmComponent, {disableClose:true, width:"34rem", data:{message}});
        ref.componentInstance.isConfirming.subscribe(async ()=> {
            const loading = this.dialog.open(LoadingComponent);
            const mutation = `mutation ($userIds: [Int!]) {
                saveDoctorsByIds(userIds: $userIds) {
                    success
                    message
                }
            }`
            try {
                const response = await this.graphQLService.mutate(mutation, {userIds:ids});
                loading.close();
                await this.loadData();
                if (response.data.saveDoctorsByIds.success) {
                    await this.loadData();
                    this.dialog.open(AlertComponent, {data: {message:response.data.saveDoctorsByIds.message}})    
                } else {
                    const ref = this.dialog.open(AlertComponent, {data: {message:response.data.saveDoctorsByIds.message}});
                    ref.componentInstance.ok.subscribe(async ()=> {
                        await this.loadData();
                    })
                }
            } catch (error) {
                const ref = this.dialog.open(AlertComponent, {data: {message:error}});
                ref.componentInstance.ok.subscribe(async ()=> {
                    await this.loadData();
                })
            }
        });
        ref.componentInstance.isCancelling.subscribe(async () => {
            await this.loadData();
        });
    }
    async deactivateDoctorAccountsByIds(ids:number[]){
        let message:string;
        if (ids.length === 1) {
            message = "The account will be deactivated and moved into account request list"
        } else {
            message = `${ids.length} accounts will be deactivated and moved to request list`
        }
        const ref = this.dialog.open(ConfirmComponent, {disableClose:true, width:"34rem", data:{message}});
        ref.componentInstance.isConfirming.subscribe(async ()=> {
            const mutation = `mutation ($userIds: [Int!]) {
                deactivateDoctorAccountsByIds(userIds: $userIds) {
                    success
                    message
                }
            }`
            try {
                const response = await this.graphQLService.mutate(mutation, {userIds:ids})
                if (response.data.deactivateDoctorAccountsByIds.success) {
                    await this.loadData();
                    this.dialog.open(AlertComponent, {data: {message:response.data.deactivateDoctorAccountsByIds.message}})    
                } else {
                    const ref = this.dialog.open(AlertComponent, {data: {message:response.data.deactivateDoctorAccountsByIds.message}});
                    ref.componentInstance.ok.subscribe(async ()=> {
                        await this.loadData();
                    })
                }
            } catch (error) {
                const ref = this.dialog.open(AlertComponent, {data: {message:error}});
                ref.componentInstance.ok.subscribe(async ()=> {
                    await this.loadData();
                })
            }
        });
        ref.componentInstance.isCancelling.subscribe(async () => {
            await this.loadData();
        })
    }

    async onSearchReset(isResetting: boolean){
        if (isResetting) {
            this.pageIndex = 0;
            this.sortDirection = 'ASC';
            this.sortActive = 'createdAt';
            this.filterInput = null;
            await this.loadData();
        };
    }
}