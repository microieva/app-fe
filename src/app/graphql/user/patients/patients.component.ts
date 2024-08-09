import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { UserDataSource } from "../../../shared/types";
import { MatTableDataSource } from "@angular/material/table";
import { AppGraphQLService } from "../../../shared/services/app-graphql.service";
import { MatDialog } from "@angular/material/dialog";
import { AlertComponent } from "../../../shared/components/app-alert/app-alert.component";
import { User } from "../user";
import { DateTime } from "luxon";
import { UserComponent } from "../user.component";

@Component({
    selector: 'app-patients',
    templateUrl: './patients.component.html',
    styleUrls: ['./patients.component.scss']
})
export class PatientsComponent implements OnInit {
    dataSource: MatTableDataSource<UserDataSource> | { data: any[]} = {data: []};
    userRole: string = 'admin'
    length: number =0;
    patients: User[] | undefined;

    pageIndex: number = 0;
    pageLimit: number = 10;
    sortDirection: string | null = null;
    sortActive: string  = 'createdAt';
    filterInput: string = '';

    constructor(
        private router: Router,
        private graphQLService: AppGraphQLService,
        private dialog: MatDialog
    ){}

    async ngOnInit() {
        await this.loadData();
    }

    async onPageChange(value: any) {
        this.pageIndex = value.pageIndex;
        this.pageLimit = value.pageLimit;
        await this.loadData();
    }
    async onSortChange(value: any) {
        /*if (value.active === 'howLongAgoStr') {
            this.sortActive = 'createdAt'
        } else if (value.active === 'howSoonStr') {
            this.sortActive = 'start'
        } else if (value.active === 'pastDate'){
            this.sortActive = 'end';
        }*/
        if (value.direction)
        this.sortDirection = value.direction.toUpperCase();
        await this.loadData();
    }
    async onFilterValueChange(value: any){
        this.filterInput = value;
        await this.loadData();
    }
    onPatientClick(id: number) {
        const ref = this.dialog.open(UserComponent, {data: {userId: id}});
    }

    async loadData(){
        console.log('filter value ----------- ', this.filterInput)
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
                // if (this.length === 0) {
                //     this.length = -1
                // }
                this.formatDataSource()
                console.log('dataSource in patients: ', this.dataSource.data)
            }
        } catch (error) {
            this.dialog.open(AlertComponent, {data: {message: "Unexpected error loading requests: "+error}})
        }

    }
    formatDataSource(){
        const data = this.patients?.map((row: UserDataSource) => {
            const createdAt = DateTime.fromJSDate(new Date(row.createdAt)).toFormat('MMM dd, yyyy');
            const updatedAt = DateTime.fromJSDate(new Date(row.updatedAt)).toFormat('MMM dd, yyyy');

            return {
                id: row.id,
                createdAt,
                email: row.email,
                firstName: row.firstName,
                lastName: row.lastName,
                updatedAt    
            } 
        });
        this.dataSource = new MatTableDataSource<UserDataSource>(data || []);
    }
}