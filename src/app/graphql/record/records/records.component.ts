import { DateTime } from "luxon";
import { Component, OnInit, signal } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { MatTableDataSource } from "@angular/material/table";
import { MatDialog } from "@angular/material/dialog";
import { trigger, state, style, transition, animate } from "@angular/animations";
import { AppGraphQLService } from "../../../shared/services/app-graphql.service";
import { RecordDataSource } from "../../../shared/types";
import { RecordComponent } from "../record.component";
import { AlertComponent } from "../../../shared/components/app-alert/app-alert.component";
import { Record } from "../record";

@Component({
    selector: 'app-records',
    templateUrl: './records.component.html',
    styleUrls: ['./records.component.scss'],
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
        await this.loadMe();
        await this.loadStatic();

        this.activatedRoute.queryParams.subscribe(async params => {
            const tab = params['tab'];
            this.selectedIndex = tab ? +tab : 0;
            await this.loadData();
        });   
    }

    async loadStatic(){
        let query = '';
        if (this.userRole === 'doctor') {
            query = `query { 
                countRecords
                countDrafts
            }`
        } else {
            query = `query {
                countRecords
            }`
        }

        try {
            const response = await this.graphQLService.send(query);
            if (response.data) {
                if (this.userRole === 'doctor') {
                    this.countDrafts = response.data.countDrafts;
                }
                this.countRecords = response.data.countRecords;
            }
        } catch (error) {
            console.error(error);
            this.router.navigate(['/home'])
        }
    }

    async loadMe() {
        const query = `query { 
            me { userRole }
        }`

        try {
            const response = await this.graphQLService.send(query);
            if (response.data) {
                this.userRole = response.data.me.userRole;
            }
        } catch (error) {
            console.error(error);
            this.router.navigate(['/home'])
        }
    }

    async onTabChange(value: any) {
        this.selectedIndex = value;

        this.router.navigate([], {
          relativeTo: this.activatedRoute,
          queryParams: { tab: value }
        });
        await this.loadData();
    }
    async onPageChange(value: any) {
        this.pageIndex = value.pageIndex;
        this.pageLimit = value.pageLimit;
        await this.loadData();
    }
    async onSortChange(value: any) {
        if (value.active === 'howLongAgoStr') {
            this.sortActive = 'createdAt';
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
                        appointment {
                            id
                            patient {
                                firstName
                                lastName
                                dob
                            }
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
                this.records = response.data.records.slice;
                this.recordsLength = response.data.records.length;
                this.formatDataSource("records");

                this.dataSource = new MatTableDataSource<RecordDataSource>(this.recordDataSource);
            }
        } catch (error) {
            this.dialog.open(AlertComponent, {data: {message: "Unexpected error loading records: "+error}});
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
                            patient {
                                firstName
                                lastName
                                dob
                            }
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
                this.formatDataSource("drafts");

                this.dataSource = new MatTableDataSource<RecordDataSource>(this.draftDataSource);
            }
        } catch (error) {
            this.dialog.open(AlertComponent, {data: {message: "Unexpected error loading drafts: "+error}})
        }
    }
    onRecordClick(recordId: any){
        const dialogRef = this.dialog.open(RecordComponent, {data: {recordId, width: "45rem"}});
        dialogRef.componentInstance.reload.subscribe(subscription => {
            if (subscription) this.loadData();
        })
    }
    onButtonClick(value: any) {

    }
    formatDataSource(view: string) {

        switch (view) {
            case "records":
                this.recordDataSource = this.records.map(row => {
                    const createdAt = DateTime.fromJSDate(new Date(row.createdAt)).toFormat('MMM dd, yyyy');
                    const updatedAt = DateTime.fromJSDate(new Date(row.updatedAt)).toFormat('MMM dd, yyyy');
                    const patientDob = DateTime.fromJSDate(new Date(row.appointment.patient.dob)).toFormat('MMM dd, yyyy');

                    return {
                        id: row.id,
                        createdAt,
                        title: row.title,
                        updatedAt,  
                        patientName: row.appointment.patient.firstName+" "+row.appointment.patient.lastName,
                        patientDob
                    } 
                });
                break;
            case "drafts":
                this.draftDataSource = this.drafts.map(row => {
                    const createdAt = DateTime.fromJSDate(new Date(row.createdAt)).toFormat('MMM dd, yyyy');
                    const updatedAt = DateTime.fromJSDate(new Date(row.updatedAt)).toFormat('MMM dd, yyyy');
                    const patientDob = DateTime.fromJSDate(new Date(row.appointment.patient.dob)).toFormat('MMM dd, yyyy');

                    return {
                        id: row.id,
                        createdAt,
                        title: row.title,
                        updatedAt,
                        patientName: row.appointment.patient.firstName+" "+row.appointment.patient.lastName,
                        patientDob   
                    } 
                });
                break;
            default:
                break;
        }
    }
    async onReload(){
        await this.loadData();
    }
}