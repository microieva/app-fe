import { Component, OnInit } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { ActivatedRoute, Router } from "@angular/router";
import { trigger, state, style, transition, animate } from "@angular/animations";
import { MatTableDataSource } from "@angular/material/table";
import { DateTime } from "luxon";
import { AppGraphQLService } from "../../../shared/services/app-graphql.service";
import { AlertComponent } from "../../../shared/components/app-alert/app-alert.component";
import { ConfirmComponent } from "../../../shared/components/app-confirm/app-confirm.component";
import { UserComponent } from "../user.component";
import { UserDataSource } from "../../../shared/types";
import { User } from "../user";

@Component({
    selector: 'app-users',
    templateUrl: './users.component.html',
    styleUrls: ['./users.component.scss'],
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
export class UsersComponent implements OnInit {
    selectedIndex: number = 0;
    dataSource: any;

    requests: User[] | undefined;
    requestsLength: number = 0;
    doctors: User[] | undefined;
    doctorsLength: number = 0;

    countRequests: number = 0;
    countDoctors: number = 0;

    pageIndex: number = 0;
    pageLimit: number = 10;
    sortDirection: string | null = null;
    sortActive: string = 'firstName';
    filterInput: string | null = null;

    constructor(
        private activatedRoute: ActivatedRoute,
        private dialog: MatDialog,
        private graphQLService: AppGraphQLService,
        private router: Router
    ){}

    async ngOnInit() {
        await this.loadStatic();
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
                if (this.countRequests>0) {
                    await this.loadRequests();
                }
                break;
            case 1:
                if (this.countDoctors>0) {
                    await this.loadDoctors();
                }
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
                const formatted = this.formatDataSource("requests");

                this.dataSource = new MatTableDataSource<UserDataSource>(formatted);
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
                const formatted = this.formatDataSource("doctors")

                this.dataSource = new MatTableDataSource<UserDataSource>(formatted);
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
        let formatted: UserDataSource[] = [];

        switch (view) {
            case "requests":
                if (this.requests) {
                    formatted = this.requests.map((row) => {
                        const createdAt = DateTime.fromISO(row.createdAt,  {setZone: true}).toFormat('MMM dd, yyyy');

                        return {
                            id: row.id,
                            createdAt,
                            email: row.email,
                            firstName: row.firstName,
                            lastName: row.lastName,
                            buttons: requestsButtons,
                            updatedAt: '-',
                            isRequest: true
                        } 
                    });
                }
                break;
            case "doctors":
                if (this.doctors) {
                    formatted = this.doctors.map((row: UserDataSource) => {
                        const createdAt = DateTime.fromISO(row.createdAt, {setZone: true}).toFormat('MMM dd, yyyy');
                        const updatedAt = DateTime.fromISO(row.updatedAt, {setZone: true}).toFormat('MMM dd, yyyy');
    
                        return {
                            id: row.id,
                            createdAt,
                            email: row.email,
                            firstName: row.firstName,
                            lastName: row.lastName,
                            updatedAt: updatedAt.includes('1970') ? '-' : updatedAt,
                            isRequest: false   
                        } 
                    });
                }
                break;
            default:
                break;
        }
        return formatted;
    }

    onTabChange(value: any) {
        this.selectedIndex = value;

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

    async onUserClick(id: number){
        const dialogRef = this.dialog.open(UserComponent, {data: {userId: id}});

        dialogRef.componentInstance.isDeletingUser.subscribe(async subscription => {
            if (subscription) {
                await this.deleteUser(id);
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
}