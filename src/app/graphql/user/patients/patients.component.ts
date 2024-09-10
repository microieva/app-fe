import { Component, OnInit } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { MatTableDataSource } from "@angular/material/table";
import { animate, state, style, transition, trigger } from "@angular/animations";
import { DateTime } from "luxon";
import { AppGraphQLService } from "../../../shared/services/app-graphql.service";
import { AlertComponent } from "../../../shared/components/app-alert/app-alert.component";
import { UserComponent } from "../user.component";
import { UserDataSource } from "../../../shared/types";
import { User } from "../user";

@Component({
    selector: 'app-patients',
    templateUrl: './patients.component.html',
    styleUrls: ['./patients.component.scss'],
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
export class PatientsComponent implements OnInit {
    dataSource: MatTableDataSource<UserDataSource> | null = null;
    userRole: string = 'admin'
    length: number = 0;
    patients: User[] = [];
    countPatients: number = 0;

    pageIndex: number = 0;
    pageLimit: number = 10;
    sortDirection: string | null = null;
    sortActive: string  = 'createdAt';
    filterInput: string = '';

    constructor(
        private graphQLService: AppGraphQLService,
        private dialog: MatDialog
    ){}

    async ngOnInit() {
        await this.loadCountPatients();
        if (this.countPatients > 0) {
            await this.loadData();
        }
    }

    async loadCountPatients(){
        const query = `query { countPatients }`
        const response = await this.graphQLService.send(query);
        this.countPatients = response.data.countPatients;
    }

    async onPageChange(value: any) {
        this.pageIndex = value.pageIndex;
        this.pageLimit = value.pageLimit;
        await this.loadData();
    }
    async onSortChange(value: any) {
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
    onPatientClick(id: number) {
        this.dialog.open(UserComponent, {data: {userId: id}});
    }

    async loadData(){
        const query = `query (
            $pageIndex: Int!, 
            $pageLimit: Int!, 
            $sortDirection: String, 
            $sortActive: String,
            $filterInput: String
        ){
            patients (
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
                this.patients = response.data.patients.slice;
                this.length = response.data.patients.length;

                this.formatDataSource()
            }
        } catch (error) {
            this.dialog.open(AlertComponent, {data: {message: "Unexpected error loading requests: "+error}})
        }

    }
    formatDataSource(){
        const data = this.patients && this.patients.map((row: UserDataSource) => {
            const createdAt = DateTime.fromJSDate(new Date(row.createdAt)).toFormat('MMM dd, yyyy');
            const updatedAt = DateTime.fromJSDate(new Date(row.updatedAt)).toFormat('MMM dd, yyyy');

            return {
                id: row.id,
                createdAt,
                email: row.email,
                firstName: row.firstName,
                lastName: row.lastName,
                updatedAt: updatedAt.includes('1970') ? '-' : updatedAt    
            } 
        });
        this.dataSource = new MatTableDataSource<UserDataSource>(data);
    }
}