import { DateTime } from "luxon";
import { Component, OnInit, signal, ViewChild } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { MatTableDataSource } from "@angular/material/table";
import { MatDialog } from "@angular/material/dialog";
import { trigger, state, style, transition, animate } from "@angular/animations";
import { AppGraphQLService } from "../../../shared/services/app-graphql.service";
import { RecordComponent } from "../record.component";
import { AlertComponent } from "../../../shared/components/app-alert/app-alert.component";
import { AppTableComponent } from "../../../shared/components/app-table/app-table.component";
import { AdvancedSearchInput, AppSearchInput, RecordDataSource } from "../../../shared/types";
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
    displayedColumns: Array<{ columnDef: string, header: string }> = [];
    readonly panelOpenState = signal(false);
    records: Record[] = [];
    drafts: Record[] = [];
    draftsLength: number = 0;
    recordsLength: number = 0;
    
    recordDataSource: RecordDataSource[] | undefined;
    draftDataSource: RecordDataSource[] | undefined;
    
    countRecords: number | undefined;
    countDrafts: number | undefined;

    userRole!: string;
    pageIndex: number = 0;
    pageLimit: number = 10;
    sortDirection: string | null = null;
    sortActive: string | null = 'createdAt';
    filterInput: string | null = null;
    advancedSearchInput: AdvancedSearchInput | null = null;
    isLoading: boolean = true;
    showTable: boolean = false;

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
                this.countRecords = response.data.countRecords;
                if (this.userRole === 'doctor') {
                    this.countDrafts = response.data.countDrafts;
                }
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

        this.pageIndex = 0;
        this.sortDirection = null;
        this.sortActive = 'createdAt';
        this.filterInput = null;
        this.displayedColumns = [];
        
        await this.loadData();

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
        if (value.active === 'title') {
            this.sortActive = 'title';
        } else if (value.active === 'name') {
            this.sortActive = 'firstName'
        } else if (value.active === 'updatedAt'){
            this.sortActive = 'updatedAt';
        }
        if (value.direction)
        this.sortDirection = value.direction.toUpperCase();
        await this.loadData();
    }
    async onFilterValueChange(value: string){
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
            $filterInput: String,
            $advancedSearchInput: AdvancedSearchInput
        ){ 
            records (
                pageIndex: $pageIndex, 
                pageLimit: $pageLimit,
                sortDirection: $sortDirection,
                sortActive: $sortActive,
                filterInput: $filterInput,
                advancedSearchInput: $advancedSearchInput
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
                            doctor {
                                firstName
                                lastName
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
            filterInput: this.filterInput,
            advancedSearchInput: this.advancedSearchInput
        }

        try {
            const response = await this.graphQLService.send(query, variables);
            if (response.data) {
                this.records = response.data.records.slice;
                this.recordsLength = response.data.records.length;
                this.formatDataSource("records");

                if (this.recordDataSource && this.displayedColumns) {
                    this.dataSource = new MatTableDataSource<RecordDataSource>(this.recordDataSource);
                }
                this.isLoading = false;
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
            $filterInput: String,
            $advancedSearchInput: AdvancedSearchInput
        ){ 
            drafts (
                pageIndex: $pageIndex, 
                pageLimit: $pageLimit,
                sortDirection: $sortDirection,
                sortActive: $sortActive,
                filterInput: $filterInput,
                advancedSearchInput: $advancedSearchInput
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
            filterInput: this.filterInput,
            advancedSearchInput: this.advancedSearchInput
        }

        try {
            const response = await this.graphQLService.send(query, variables);
            if (response.data) {
                this.drafts = response.data.drafts.slice;
                this.draftsLength = response.data.drafts.length;
                this.formatDataSource("drafts");

                if (this.draftDataSource && this.displayedColumns) {
                    this.dataSource = new MatTableDataSource<RecordDataSource>(this.draftDataSource);
                }
                this.isLoading = false;
            }
        } catch (error) {
            this.dialog.open(AlertComponent, {data: {message: "Unexpected error loading drafts: "+error}})
        }
    }
    onRecordClick(value: {id: number, title?:string}){
        const recordId = value.id;
        const dialogRef = this.dialog.open(RecordComponent, {data: {recordId, width: "45rem"}});
        dialogRef.componentInstance.reload.subscribe(async subscription => {
            if (subscription) await this.ngOnInit();
        })
    }

    formatDataSource(view: string) {
        let createdAt: string;
        let updatedAt: string;
        switch (view) {
            case "records":
                this.recordDataSource = this.records.map(row => {
                    const patientDob = DateTime.fromISO(row.appointment.patient.dob,  {setZone: true}).toFormat('MMM dd, yyyy');
                    
                    const createdDate = DateTime.fromISO(row.createdAt, { setZone: true });
                    const updatedDate = DateTime.fromISO(row.updatedAt, { setZone: true });
                    const today = DateTime.now().setZone(createdDate.zone);
                    const yesterday = today.minus({ days: 1 });
                    
                    if (createdDate.hasSame(today, 'day')) {
                        createdAt = 'Today';
                    } else if (createdDate.hasSame(yesterday, 'day')) {
                        createdAt = 'Yesterday';
                    } else {
                        createdAt = createdDate.toFormat('MMM dd, yyyy'); 
                    } 

                    if (updatedDate.hasSame(today, 'day')) {
                        updatedAt = 'Today';
                    } else if (createdDate.hasSame(yesterday, 'day')) {
                        updatedAt = 'Yesterday';
                    } else {
                        updatedAt = createdDate.toFormat('MMM dd, yyyy'); 
                    } 

                    return {
                        id: row.id,
                        createdAt: createdAt+`, ${createdDate.toFormat('HH:mm a')}`,
                        title: row.title,
                        updatedAt: updatedAt+`, ${updatedDate.toFormat('HH:mm a')}`,
                        name: this.userRole === 'doctor' ? row.appointment.patient.firstName+" "+row.appointment.patient.lastName : row.appointment.doctor?.firstName+" "+row.appointment.doctor?.lastName,
                        patientDob
                    } 
                });
                if (this.userRole === 'doctor') {
                    this.displayedColumns = [ 
                        {header: 'Title', columnDef: 'title'},
                        {header: `Patient's name`, columnDef: 'name'},
                        {header: 'First created', columnDef: 'createdAt'},
                        {header: 'Final save', columnDef: 'updatedAt'}
                    ]

                } else {
                    this.displayedColumns = [ 
                        {header: 'Title', columnDef: 'title'},
                        {header: `Doctor's name`, columnDef: 'name'},
                        {header: 'Date', columnDef: 'updatedAt'}
                    ]
                }
                break;
            case "drafts":
                this.draftDataSource = this.drafts.map(row => {
                    const patientDob = DateTime.fromISO(row.appointment.patient.dob,  {setZone: true}).toFormat('MMM dd, yyyy');
                       
                    const createdDate = DateTime.fromISO(row.createdAt, { setZone: true });
                    const updatedDate = DateTime.fromISO(row.updatedAt, { setZone: true });
                    const today = DateTime.now().setZone(createdDate.zone);
                    const yesterday = today.minus({ days: 1 });
                    
                    if (createdDate.hasSame(today, 'day')) {
                        createdAt = 'Today';
                    } else if (createdDate.hasSame(yesterday, 'day')) {
                        createdAt = 'Yesterday';
                    } else {
                        createdAt = createdDate.toFormat('MMM dd, yyyy'); 
                    } 

                    if (updatedDate.hasSame(today, 'day')) {
                        updatedAt = 'Today';
                    } else if (createdDate.hasSame(yesterday, 'day')) {
                        updatedAt = 'Yesterday';
                    } else {
                        updatedAt = createdDate.toFormat('MMM dd, yyyy'); 
                    } 
                    return {
                        id: row.id,
                        createdAt: createdAt+`, ${createdDate.toFormat('HH:mm a')}`,
                        title: row.title,
                        updatedAt: updatedAt+`, ${updatedDate.toFormat('HH:mm a')}`,
                        name: row.appointment.patient.firstName+" "+row.appointment.patient.lastName,
                        patientDob   
                    } 
                });
                this.displayedColumns = [ 
                    {header: 'Title', columnDef: 'title'},
                    {header: `Patient's name`, columnDef: 'name'},
                    {header: 'First created', columnDef: 'createdAt'},
                    {header: 'Last updated', columnDef: 'updatedAt'}
                ]
                break;
            default:
                break;
        }
    }
    async onReload(){
        await this.loadData();
    }

    async onSearch(value: AppSearchInput) {
        this.filterInput = value.searchInput;   
        this.advancedSearchInput = value.advancedSearchInput;
        await this.loadData();
    }
    async onSearchReset(isResetting: boolean) {
        if (isResetting) {
            this.pageIndex = 0;
            this.sortDirection = null;
            this.sortActive = 'createdAt';
            this.filterInput = null;
            this.advancedSearchInput = null;
            await this.loadData();
        };
    }
}