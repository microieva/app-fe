import { Component, OnInit, ViewChild } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { ActivatedRoute, Router } from "@angular/router";
import { trigger, state, style, transition, animate } from "@angular/animations";
import { MatTableDataSource } from "@angular/material/table";
import { DateTime } from "luxon";
import { AppGraphQLService } from "../../../shared/services/app-graphql.service";
import { AlertComponent } from "../../../shared/components/app-alert/app-alert.component";
import { ConfirmComponent } from "../../../shared/components/app-confirm/app-confirm.component";
import { AppTableComponent } from "../../../shared/components/app-table/app-table.component";
import { UserComponent } from "../user.component";
import { UserDataSource } from "../../../shared/types";
import { User } from "../user";

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
export class DoctorsComponent implements OnInit {
    selectedIndex: number = 0;
    dataSource: MatTableDataSource<UserDataSource> | null = null;
    displayedColumns: Array<{ columnDef: string, header: string }> = [];

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
    sortDirection: string | null = null;
    sortActive: string = 'firstName';
    filterInput: string | null = null;

    @ViewChild('appTable') appTable!: AppTableComponent;

    constructor(
        private activatedRoute: ActivatedRoute,
        private dialog: MatDialog,
        private graphQLService: AppGraphQLService,
        private router: Router
    ){}

    async ngOnInit() {
        await this.loadStatic();
        await this.loadData();
        this.activatedRoute.queryParams.subscribe(async params => {
            const tab = params['tab'];
            this.selectedIndex = tab ? +tab : 0;
            await this.loadData();
        });   
    }

    async loadStatic() {
        const query = `query {
            countDoctorRequests
            countDoctors
        }`
        const response = await this.graphQLService.send(query);
        this.countRequests = response.data.countDoctorRequests;
        this.countDoctors = response.data.countDoctors;
    }

    async loadData() {
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
            sortDirection: this.sortDirection || 'DESC',
            filterInput: this.filterInput
        }

        try {
            const response = await this.graphQLService.send(query, variables);
            if (response.data) {
                this.requests = response.data.requests.slice;
                this.requestsLength = response.data.requests.length;
                this.formatDataSource("requests");

                if (this.requestsDataSource) {
                    this.dataSource = new MatTableDataSource<UserDataSource>(this.requestsDataSource);
                }

            }
        } catch (error) {
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

                if (this.doctorsDataSource) {
                    this.dataSource = new MatTableDataSource<UserDataSource>(this.doctorsDataSource);  
                }

            }
        } catch (error) {
            this.dialog.open(AlertComponent, {data: {message: "Unexpected error loading requests: "+error}})
        }
    }

    formatDataSource(view: string){
        const requestsButtons = [
            {
                text: "Activate Account",
                disabled: false
            },
            {
                text: "Cancel Request",
                disabled: false
            }
        ]

        switch (view) {
            case "requests":
                this.requestsDataSource = this.requests.map((row) => {
                    const createdAt = DateTime.fromISO(row.createdAt,  {setZone: true}).toFormat('MMM dd, yyyy');

                    return {
                        id: row.id,
                        createdAt,
                        email: row.email,
                        name: row.firstName+' '+row.lastName,
                        actions: requestsButtons,
                        updatedAt: '-',
                        isRequest: true
                    } 
                });

                this.displayedColumns = [ 
                    {header: 'Name', columnDef: 'name'},
                    {header: 'Email', columnDef: 'email'},
                    {header: 'Request created', columnDef: 'createdAt'},
                    {header: 'Actions', columnDef: 'actions'}
                ]
                break;
            case "doctors":
                this.doctorsDataSource = this.doctors.map((row) => {
                    const createdAt = DateTime.fromISO(row.createdAt, {setZone: true}).toFormat('MMM dd, yyyy');
                    const updatedAt = DateTime.fromISO(row.updatedAt, {setZone: true}).toFormat('MMM dd, yyyy');

                    return {
                        id: row.id,
                        createdAt,
                        email: row.email,
                        name: row.firstName+' '+row.lastName,
                        updatedAt: updatedAt.includes('1970') ? '-' : updatedAt,
                        isRequest: false   
                    } 
                });
                this.displayedColumns = [ 
                    {header: 'Name', columnDef: 'name'},
                    {header: 'Email', columnDef: 'email'},
                    {header: 'Account activated', columnDef: 'createdAt'}
                ]
                break;
            default:
                break;
        }
    }

    async onTabChange(value: any) {
        this.selectedIndex = value;

        this.pageIndex = 0;
        this.sortDirection = null;
        this.sortActive = 'firstName';
        this.filterInput = null;
        this.displayedColumns = [];
        if (this.appTable) {
            this.appTable.clearInputField();
        }

        await this.loadData();

        this.router.navigate([], {
            relativeTo: this.activatedRoute,
            queryParams: { tab: value }
        });
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

    async onFilterValueChange(value: any){
        this.filterInput = value;
        await this.loadData();
    }

    async onUserClick(value:{id: number, title?:string}){
        const userId = value.id;
        const dialogRef = this.dialog.open(UserComponent, {data: {userId}});

        dialogRef.componentInstance.isDeletingUser.subscribe(async subscription => {
            if (subscription) {
                await this.deleteUser(userId);
            }
        })
    }

    async onButtonClick(value: any){
        const { text, id } = value;
        switch (text) {
            case 'Activate Account':
                await this.activateAccount(id);
                break;
            case 'Cancel Request':
                this.deleteDoctorRequest(id);
                break;
            default:
                break;
        }
    }
    async activateAccount(doctorRequestId: number) {
        const dialogRef = this.dialog.open(ConfirmComponent, {data: {message: "The user details will be moved to active accounts (user db) and request deleted"}});

        dialogRef.componentInstance.ok.subscribe(async subscription => {
            if (subscription) {
                const mutation = `mutation ($doctorRequestId: Int!) {
                    saveDoctor(doctorRequestId: $doctorRequestId) {
                        success
                        message
                    }
                }`
        
                try {   
                    const response = await this.graphQLService.mutate(mutation, {doctorRequestId});
        
                    if (response.data.saveDoctor.success) {
                        this.dialog.open(AlertComponent, {data: {message: "Doctor account activated"}});
                        this.ngOnInit();
                    }
                } catch (error) {
                    this.dialog.open(AlertComponent, {data: {message: `Activating error: ${error}`}});
                }
            }
        })
    }
    deleteDoctorRequest(doctorRequestId: number){
        const dialogRef = this.dialog.open(ConfirmComponent, {data: {message: "Permanently deleting doctor request"}});

        dialogRef.componentInstance.ok.subscribe(async subscription => {
            if (subscription) {
                const mutation = `mutation ($doctorRequestId: Int!) {
                    deleteDoctorRequest(doctorRequestId: $doctorRequestId) {
                        success
                        message
                    }
                }`
        
                try {   
                    const response = await this.graphQLService.mutate(mutation, {doctorRequestId});
        
                    if (response.data.deleteDoctorRequest.success) {
                        this.dialog.open(AlertComponent, {data: {message: "Doctor request deleted"}});
                        this.ngOnInit();
                    }
                } catch (error) {
                    this.dialog.open(AlertComponent, {data: {message: error}});
                }

            }
        })
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
                this.ngOnInit();
            }
            this.dialog.open(AlertComponent, {data: {message: "User account deleted"}});
        } catch (error) {
            this.dialog.open(AlertComponent, { data: {message: "Error deleting user: "+ error}});
        }
    }
    async onActionClick(value: {text: string, id: number}) {
        switch (value.text) {
            case 'Activate Account':
                await this.activateAccount(value.id);
                break;
            case 'Cancel Request':
                this.deleteDoctorRequest(value.id);
                break;
        }
    }
}