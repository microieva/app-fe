import { DateTime } from "luxon";
import { Subscription, switchMap } from "rxjs";
import { AfterViewInit, Component, OnDestroy, OnInit, signal } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { MatTableDataSource } from "@angular/material/table";
import { MatDialog } from "@angular/material/dialog";
import { trigger, state, style, transition, animate } from "@angular/animations";
import { AppGraphQLService } from "../../../shared/services/app-graphql.service";
import { AppUiSyncService } from "../../../shared/services/app-ui-sync.service";
import { RecordComponent } from "../record.component";
import { AlertComponent } from "../../../shared/components/app-alert/app-alert.component";
import { ConfirmComponent } from "../../../shared/components/app-confirm/app-confirm.component";
import { AdvancedSearchInput, AppSearchInput, AppTableDisplayedColumns, RecordDataSource } from "../../../shared/types";
import { Record } from "../record";
import { RECORD_CREATED } from "../../../shared/constants";

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
        trigger('fadeIn', [
            state('visible', style({ opacity: 1 })),
            state('invisible', style({ opacity: 0 })),
            transition('invisible => visible', [
              animate('1s ease-in')
            ]),
            transition('visible => invisible', [
              animate('1s ease-out')
            ])
          ])
    ]
})
export class RecordsComponent implements OnInit, AfterViewInit, OnDestroy {
    selectedIndex!: number;
    dataSource: MatTableDataSource<RecordDataSource> | null = null;
    displayedColumns: AppTableDisplayedColumns[] = [];
    actions: any[] | null = null;
    readonly panelOpenState = signal(false);
    private subscriptions: Subscription[] = [];
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
        private dialog: MatDialog,
        private uiSyncService: AppUiSyncService
    ){}
    async ngOnInit() {  
        await this.loadMe();
        await this.loadStatic()

        this.subscriptions.push(
            this.activatedRoute.queryParams.subscribe(async params => {
            const tab = params['tab'];
            this.selectedIndex = tab ? +tab : 0;
            await this.loadData();
        })); 
    }

    ngAfterViewInit(): void {
        this.subscriptions.push(
           this.uiSyncService.sync(RECORD_CREATED)
            .pipe(
                switchMap(async () => await this.loadRecords()))
            .subscribe({
                error: (err) => console.error('Sync failed:', err)
            })
        );
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
            this.dialog.open(AlertComponent, {width:"35rem", data:{message:error}})
        }
    }

    async loadMe() {
        const query = `query { 
            me { id userRole }
        }`

        try {
            const response = await this.graphQLService.send(query, true);
            if (response.data) {
                this.userRole = response.data.me.userRole;
            }
        } catch (error) {
            this.dialog.open(AlertComponent, {width:"35rem", data:{message:error}})
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

    async onActionClick(event: {text:string, ids:number[]}){
        switch (event.text) {
            case 'Delete':
                await this.deleteRecordsByIds(event.ids);
                break;
            case 'Save as final':
                await this.saveRecordsAsFinalByIds(event.ids);
                break;
            default:
                break;
        }
    }
    async saveRecordsAsFinalByIds(ids:number[]) {
        const ref = this.dialog.open(ConfirmComponent, {width: "30rem", data: {message: `${ids.length} record(s) will be saved as final version. This cannot be reversed.`}});
            ref.componentInstance.isConfirming.subscribe(async ()=> {
                const mutation = `mutation ($recordIds: [Int!]) {
                    saveRecordsAsFinalByIds(recordIds: $recordIds) {
                        success
                        message   
                    }
                }`
                try {
                    const response = await this.graphQLService.mutate(mutation, {recordIds: ids});
                    if (response.data.saveRecordsAsFinalByIds.success) {
                        this.ngOnDestroy();
                        await this.ngOnInit();
                    } else {
                        this.dialog.open(AlertComponent, {data: {message:response.data.saveRecordsAsFinalByIds.message}});
                    }
                } catch (error) {
                    this.dialog.open(AlertComponent, {data: {message:error}});
                }
              
            });
            ref.componentInstance.isCancelling.subscribe(async ()=> {
                this.ngOnDestroy();
                await this.ngOnInit();
            })
    }
    async deleteRecordsByIds(ids:number[]) {
        let recordsWithAppointments: number[];
        if (this.selectedIndex === 1) {
            recordsWithAppointments= this.drafts
                .filter(apt => apt.appointmentId && ids.includes(apt.id))
                .map(apt => apt.id); 
        } else {
            recordsWithAppointments= this.records
            .filter(apt => apt.appointmentId && ids.includes(apt.id))
            .map(apt => apt.id); 
        }

        if (recordsWithAppointments.length === 0) {
            const ref = this.dialog.open(AlertComponent, {data: {message:"Selected records can be deleted only by the patient"}});
            ref.componentInstance.ok.subscribe(async ()=> {
                this.ngOnDestroy();
                await this.ngOnInit();
            })
        } else {
            const ref = this.dialog.open(ConfirmComponent, {width: "30rem", data: {message: `${recordsWithAppointments.length} / ${ids.length} record(s) can be deleted`}});
            ref.componentInstance.isConfirming.subscribe(async ()=> {
                const mutation = `mutation ($recordIds: [Int!]) {
                    deleteRecordsByIds(recordIds: $recordIds) {
                        success
                        message   
                    }
                }`
                const response = await this.graphQLService.mutate(mutation, {recordIds: recordsWithAppointments});
                if (response.data.deleteRecordsByIds.success) {
                    this.ngOnDestroy();
                    await this.ngOnInit();
                } else {
                    this.dialog.open(AlertComponent, {data: {message:response.data.deleteRecordsByIds.message}});
                }
            });
            ref.componentInstance.isCancelling.subscribe(async ()=> {
                this.ngOnDestroy();
                await this.ngOnInit();
            })
        }

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
                        appointmentId
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
                this.countRecords = this.recordsLength;
                this.formatDataSource("records");
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
                        appointmentId
                        patient {
                            firstName
                            lastName
                            dob
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
        const dialogRef = this.dialog.open(RecordComponent, {width: "45rem", data: {recordId}});
        const sub = dialogRef.componentInstance.reload.subscribe(async subscription => {
            if (subscription) await this.ngOnInit();
        });
        this.subscriptions.push(sub);
    }

    formatDataSource(view: string) { 
        switch (view) {
            case "records":
                let createdAt: string;
                let updatedAt: string;
                this.recordDataSource = this.records.map(row => {
                    const patientDob = DateTime.fromISO(row.patient.dob,  {setZone: true}).toFormat('MMM dd, yyyy');
                    
                    const createdDate = DateTime.fromISO(row.createdAt, {zone:'Europe/Helsinki'});
                    const updatedDate = DateTime.fromISO(row.updatedAt, {zone:'Europe/Helsinki'})
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

                    let name:string;
                    if (this.userRole === 'patient') {
                        name = row.doctor ? row.doctor.firstName+" "+row.doctor.lastName : 'Unknown'
                    } else {
                        name = row.patient.firstName+" "+row.patient.lastName 
                    }

                    this.actions = [
                        {
                            text: "Delete"
                        }
                    ]

                    return {
                        id: row.id,
                        createdAt: createdAt+`, ${createdDate.toFormat('HH:mm a')}`,
                        title: row.title,
                        updatedAt: updatedAt+`, ${updatedDate.toFormat('HH:mm a')}`,
                        name,
                        patientDob,
                        actions: this.actions
                    } 
                });
                this.dataSource = new MatTableDataSource<RecordDataSource>(this.recordDataSource);
                if (this.userRole === 'doctor') {
                    this.displayedColumns = [ 
                        {header: 'checkbox', columnDef: 'checkbox', sort: false},
                        {header: 'Actions', columnDef: 'actions',  sort: false},
                        {header: 'Title', columnDef: 'title', sort:true},
                        {header: `Patient's name`, columnDef: 'name',  sort:true},
                        {header: 'First created', columnDef: 'createdAt',  sort:true},
                        {header: 'Final save', columnDef: 'updatedAt',  sort:true}
                    ]

                } else {
                    this.displayedColumns = [ 
                        {header: 'Title', columnDef: 'title', sort:true},
                        {header: `Doctor's name`, columnDef: 'name', sort:true},
                        {header: 'Date', columnDef: 'updatedAt', sort:true}
                    ]
                }
                break;
            case "drafts":
                this.draftDataSource = this.drafts.map(row => {
                    let createdAt: string;
                    let updatedAt: string;
                    const patientDob = DateTime.fromISO(row.patient.dob,  {setZone: true}).toFormat('MMM dd, yyyy');
                       
                    const createdDate = DateTime.fromISO(row.createdAt);
                    const updatedDate = row.updatedAt ? DateTime.fromISO(row.updatedAt) : createdDate;
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

                    this.actions = [
                        {
                            text: "Save as final"
                        },
                        {
                            text: "Delete"
                        }
                    ]

                    return {
                        id: row.id,
                        createdAt: createdAt+`, ${createdDate.toFormat('HH:mm a')}`,
                        title: row.title,
                        updatedAt: updatedAt+`, ${updatedDate.toFormat('HH:mm a')}`,
                        name: row.patient.firstName+" "+row.patient.lastName,
                        patientDob,
                        actions:this.actions   
                    } 
                });
                this.displayedColumns = [ 
                    {header: 'checkbox', columnDef: 'checkbox', sort: false},
                    {header: 'Actions', columnDef: 'actions',  sort: false},
                    {header: 'Title', columnDef: 'title', sort:true},
                    {header: `Patient's name`, columnDef: 'name', sort:true},
                    {header: 'First created', columnDef: 'createdAt', sort:true},
                    {header: 'Last updated', columnDef: 'updatedAt', sort:true}
                ]
                break;
            default:
                break;
        }
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
    ngOnDestroy(): void {
        this.subscriptions.forEach(sub => sub.unsubscribe());
    }
}