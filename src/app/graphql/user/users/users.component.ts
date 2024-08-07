import { Component, OnInit } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { ActivatedRoute, Router } from "@angular/router";
import { AppGraphQLService } from "../../../shared/services/app-graphql.service";
import { AlertComponent } from "../../../shared/components/app-alert/app-alert.component";
import { User } from "../user";
import { MatTableDataSource } from "@angular/material/table";
import { UserDataSource } from "../../../shared/types";
import { DateTime } from "luxon";
import { ConfirmComponent } from "../../../shared/components/app-confirm/app-confirm.component";

@Component({
    selector: 'app-users',
    templateUrl: './users.component.html',
    styleUrls: ['./users.component.scss']
})
export class UsersComponent implements OnInit {
    selectedIndex: number = 0;
    length: number = 0;
    dataSource: any;

    requests: any;
    requestsLength: number = 0;
    doctors: User[] | undefined;
    doctorsLength: number = 0;

    pageIndex: number = 0;
    pageLimit: number = 10;
    sortDirection: string | null = null;
    sortActive: string | null = 'firstName';
    filterInput: string | null = null;

    constructor(
        private activatedRoute: ActivatedRoute,
        private dialog: MatDialog,
        private graphQLService: AppGraphQLService,
        private router: Router
    ){}

    ngOnInit(): void {
        this.activatedRoute.queryParams.subscribe(async params => {
            const tab = params['tab'];
            this.selectedIndex = tab ? +tab : 0;
            await this.loadData();
        });   
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

                if (this.requestsLength > 9) {
                    this.dataSource = new MatTableDataSource<UserDataSource>(this.requests);
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

                if (this.doctorsLength > 9) {
                    this.dataSource = new MatTableDataSource<UserDataSource>(this.doctors);
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
                this.dataSource = this.requests.map((row: UserDataSource) => {
                    const createdAt = DateTime.fromJSDate(new Date(row.createdAt)).toFormat('MMM dd, yyyy');
                    const updatedAt = DateTime.fromJSDate(new Date(row.updatedAt)).toFormat('MMM dd, yyyy');

                    return {
                        id: row.id,
                        createdAt,
                        email: row.email,
                        firstName: row.firstName,
                        lastName: row.lastName,
                        buttons: requestsButtons
                        
                    } 
                });
                break;
            case "doctors":
                this.dataSource = this.doctors!.map((row: UserDataSource) => {
                    const createdAt = DateTime.fromJSDate(new Date(row.createdAt)).toFormat('MMM dd, yyyy');
                    const updatedAt = DateTime.fromJSDate(new Date(row.updatedAt)).toFormat('MMM dd, yyyy');

                    return {
                        id: row.id,
                        createdAt,
                        email: row.email,
                        firstName: row.firstName,
                        lastName: row.lastName,
                        updatedAt: updatedAt.includes('1970') ? ' - ' : updatedAt
                        //buttons: this.userRole === 'doctor' ? allActions : cancelAction,    
                    } 
                });
                break;
            default:
                break;
        }
    }

    onTabChange(value: any) {
        this.selectedIndex = value;

        this.router.navigate([], {
          relativeTo: this.activatedRoute,
          queryParams: { tab: value }
        });
    }

    onPageChange(value: any){}

    onSortChange(value: any){}

    onFilterValueChange(value: any){}

    onUserClick(value: any){}

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
    deleteUser(){

    }
}