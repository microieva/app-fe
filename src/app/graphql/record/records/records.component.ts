import { Component, OnInit, signal } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { MatTableDataSource } from "@angular/material/table";
import { AppGraphQLService } from "../../../shared/services/app-graphql.service";
import { RecordDataSource } from "../../../shared/types";
import { Record } from "../record";
//import { AppDialogService } from "../../../shared/services/app-dialog.service";
import { DateTime } from "luxon";
import { RecordComponent } from "../record.component";
import { AlertComponent } from "../../../shared/components/app-alert/app-alert.component";
import { MatDialog } from "@angular/material/dialog";

@Component({
    selector: 'app-records',
    templateUrl: './records.component.html',
    styleUrls: ['./records.component.scss']
})
export class RecordsComponent implements OnInit {
    selectedIndex!: number;
    dataSource: MatTableDataSource<RecordDataSource> | null = null;
    readonly panelOpenState = signal(false);
    records: Record[] = [];
    drafts: Record[] = [];
    draftsLength: number = 0;
    recordsLength: number = 0;

    recordDataSource: RecordDataSource[] | undefined;
    draftDataSource: RecordDataSource[] | undefined;

    countRecords: number = 0;
    countDrafts: number = 0;

    userRole!: string;
    pageIndex: number = 0;
    pageLimit: number = 10;
    sortDirection: string | null = null;
    sortActive: string | null = 'createdAt';
    filterInput: string | null = null;

    constructor(
        private graphQLService: AppGraphQLService,
        private router: Router,
        private activatedRoute: ActivatedRoute,
        private dialog: MatDialog
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
            me { userRole }
            countUserRecords {
                countRecords
                countDrafts
            }
        }`

        try {
            const response = await this.graphQLService.send(query);
            if (response.data.me.userRole) {
                this.userRole =response.data.me.userRole;
                this.countRecords = response.data.countUserRecords.countRecords
                this.countDrafts = response.data.countUserRecords.countDrafts
            }
        } catch (error) {
            this.router.navigate(['/'])
        }
    }
    onTabChange(value: any) {
        this.selectedIndex = value;

        this.router.navigate([], {
          relativeTo: this.activatedRoute,
          queryParams: { tab: value }
        });
    }
    async onPageChange(value: any) {
        this.pageIndex = value.pageIndex;
        this.pageLimit = value.pageLimit;
        await this.loadData();
    }
    async onSortChange(value: any) {
        if (value.active === 'howLongAgoStr') {
            this.sortActive = 'createdAt'
        } else if (value.active === 'howSoonStr') {
            this.sortActive = 'start'
        } else if (value.active === 'pastDate'){
            this.sortActive = 'end';
        }
        if (value.direction)
        this.sortDirection = value.direction.toUpperCase();
        await this.loadData();
    }
    async onFilterValueChange(value: any){
        this.filterInput = value;
        await this.loadData();
    }
    async loadData() {
        switch (this.selectedIndex) {
            case 0:
                await this.loadRecords();
                break;
            case 1:
                await this.loadDrafts();
                break;
            default:
                break;
        }
    }
    async loadRecords(){
        const query = `query (
            $pageIndex: Int!, 
            $pageLimit: Int!, 
            $sortDirection: String, 
            $sortActive: String,
            $filterInput: String
        ){ 
            records (
                pageIndex: $pageIndex, 
                pageLimit: $pageLimit,
                sortDirection: $sortDirection,
                sortActive: $sortActive,
                filterInput: $filterInput
            ){
                length
                slice {
                    ... on Record {
                        id
                        title
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
                this.records = response.data.records.slice;
                this.recordsLength = response.data.records.length;
                this.formatDataSource("records")
            }
        } catch (error) {
            this.dialog.open(AlertComponent, {data: {message: "Unexpected error loading records: "+error}})
        }
    }
    async loadDrafts(){
        const query = `query (
            $pageIndex: Int!, 
            $pageLimit: Int!, 
            $sortDirection: String, 
            $sortActive: String,
            $filterInput: String
        ){ 
            drafts (
                pageIndex: $pageIndex, 
                pageLimit: $pageLimit,
                sortDirection: $sortDirection,
                sortActive: $sortActive,
                filterInput: $filterInput
            ){
                length
                slice {
                    ... on Record {
                        id
                        title
                        createdAt
                        updatedAt
                        appointment {
                            id
                        }
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
                this.drafts = response.data.drafts.slice;
                this.draftsLength = response.data.drafts.length;
                //this.appointmentId = response.data.drafts.slice
                this.formatDataSource("drafts")
            }
        } catch (error) {
            this.dialog.open(AlertComponent, {data: {message: "Unexpected error loading drafts: "+error}})
        }
    }
    onRecordClick(recordId: any){
        const dialogRef = this.dialog.open(RecordComponent, {data: {recordId}});
        dialogRef.componentInstance.reload.subscribe(subscription => {
            if (subscription) this.loadData();
        })
    }
    onButtonClick(value: any) {

    }
    formatDataSource(view: string) {
        /*const allActions = [
            {
                text: 'Cancel Appointment',
                disabled: this.isReservedDay
            }, {
                text: 'Accept Appointment',
                disabled: this.isReservedDay
            }, {
                text: 'View In Calendar',
                disabled: false
            }];
        const cancelAction = [
            {
                text: 'Cancel Appointment',
                disabled: false
            }
        ]
        const deleteAction = [
            {
                text: 'Delete Appointment',
                disabled: false
            }
        ]*/
        switch (view) {
            case "records":
                this.recordDataSource = this.records.map(row => {
                    const createdAt = DateTime.fromJSDate(new Date(row.createdAt)).toFormat('MMM dd, yyyy');
                    const updatedAt = DateTime.fromJSDate(new Date(row.updatedAt)).toFormat('MMM dd, yyyy');

                    return {
                        id: row.id,
                        createdAt,
                        title: row.title,
                        updatedAt
                        //buttons: this.userRole === 'doctor' ? allActions : cancelAction,
                        
                    } 
                });
                break;
            case "drafts":
                this.draftDataSource = this.drafts.map(row => {
                    const createdAt = DateTime.fromJSDate(new Date(row.createdAt)).toFormat('MMM dd, yyyy');
                    const updatedAt = DateTime.fromJSDate(new Date(row.updatedAt)).toFormat('MMM dd, yyyy');

                    return {
                        id: row.id,
                        createdAt,
                        title: row.title,
                        updatedAt
                        //buttons: this.userRole === 'doctor' ? allActions : cancelAction,    
                    } 
                });
                break;
            default:
                break;
        }
    }
    onReload(){
        this.loadData();
    }
}