import { Subscription } from "rxjs";
import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, EventEmitter, HostListener, Inject, Input, OnDestroy, OnInit, Optional, Output, SimpleChanges, ViewChild } from "@angular/core";
import { animate, state, style, transition, trigger } from "@angular/animations";
import { MatTableDataSource } from "@angular/material/table";
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from "@angular/material/dialog";
import { MatPaginator } from "@angular/material/paginator";
import { MatSort } from "@angular/material/sort";
import { SelectionModel } from "@angular/cdk/collections";
import { DateTime } from "luxon";
import { AppTimerService } from "../../services/app-timer.service";
import { AppGraphQLService } from "../../services/app-graphql.service";
import { RecordComponent } from "../../../graphql/record/record.component";
import { AlertComponent } from "../app-alert/app-alert.component";
import { Record } from "../../../graphql/record/record";
import { AdvancedSearchInput, AppDataSource, AppTableDisplayedColumns, UserDataSource } from "../../types";
import { BreakpointObserver } from "@angular/cdk/layout";


@Component({
    selector: 'app-table',
    templateUrl: './app-table.component.html',
    styleUrls: ['app-table.component.scss'],
    animations: [
        trigger('detailExpand', [
            state('collapsed,void', style({height: '0px', minHeight: '0'})),
            state('expanded', style({height: '*'})),
            transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
        ]),
    ],
})
export class AppTableComponent implements OnInit, AfterViewInit, OnDestroy {
    isLoading: boolean = false;
    isActionsDisabled:boolean = false;
    isMobile:boolean = false;
    checkedCount: number = 0;

    @Output() pageChange = new EventEmitter<{pageIndex: number, pageLimit: number}>();
    @Output() sortChange = new EventEmitter<{active: string, direction: string}>();
    @Output() rowClick= new EventEmitter<{id: number, title?: string}>();
    @Output() action = new EventEmitter<{ids: number[], text: string, message?:string}>();

    columnNames: string[] = [];
    @Input() dataSource!: MatTableDataSource<AppDataSource>;
    @Input() displayedColumns: AppTableDisplayedColumns[] = []
    @Input() buttons: any[] | null = null;

    @Input() length: number = 0;
    @Input() userRole!: string;
    @Input() markAppointmentId: number | null = null;
    senders: any[] =[];
    recordIds: number[] | undefined;
    injectedData: any[] | undefined;

    @ViewChild(MatPaginator, {read: true}) paginator!: MatPaginator;
    @ViewChild(MatSort) sort!: MatSort;
    @ViewChild('input', { static: false }) input!: ElementRef;
    selection = new SelectionModel<any>(true, []);

    pageLimit: number = 10;
    pageIndex: number = 0;
    advancedSearchInput: AdvancedSearchInput | null = null;
    filterValue: string | null = null;

    
    @HostListener('matSortChange', ['$event'])
    onSortChange(event: any) {
        this.sortChange.emit({active: event.active, direction: event.direction.toUpperCase()})  
        this.dataSource.sort = this.sort;  
        if (event.active === 'online') {
            this.sortOnline(event.direction);
        } else if (event.active = 'unreadMessages'){
            this.sortUnread(event.direction);
        } 
    }
    subscription: Subscription | undefined;

    constructor(
        public timerService: AppTimerService,
        private graphQLService: AppGraphQLService,
        private dialog: MatDialog,
        private cd: ChangeDetectorRef,
        private breakpointObserver: BreakpointObserver,

        @Optional() public dialogRef: MatDialogRef<AppTableComponent>,
        @Optional() @Inject(MAT_DIALOG_DATA) public data: { recordIds: number[], userRole: string}  
    ){        
        if (this.data) {
            this.recordIds = this.data.recordIds;
            this.userRole = this.data.userRole;
        }
        if (this.recordIds) {
            this.isLoading = true;
            this.loadMedicalRecords()
        }
    }
    ngOnInit() { 
        this.columnNames = [];
        if (this.dataSource && this.displayedColumns) {
           this.columnNames = this.displayedColumns.map(column => column.columnDef);
        }
        // this.subscription = this.socketService.receiveNotification().subscribe((subscription: any)=> {
        //     if (subscription && subscription.chatId) {
        //         if (!this.senders.find(sender => sender === subscription.sender)) {
        //             this.senders.push(subscription.sender);
        //         }
        //     }
        // });
        this.breakpointObserver.observe(['(max-width: 767px)',]).subscribe(result => {
            this.isMobile = result.matches;
        });
    }

    isDisabled(btn:any): boolean {
        if (this.isMobile) {
            return !this.selection?.hasValue() || btn.disabled;
        }
        return !this.selection?.hasValue() || this.checkedCount < 2 || btn.disabled;
    }
    
    getButtonStyle(btn:any) {
        return {
           backgroundColor: this.isDisabled(btn) ? '' : 'rgba(115, 72, 114, 0.4)'
        };
    }

    async loadMedicalRecords(){
        const query = `query (
                $ids: [Int!]!
                $pageIndex: Int!, 
                $pageLimit: Int!, 
                $sortDirection: String, 
                $sortActive: String,
                $filterInput: String,
                $advancedSearchInput: AdvancedSearchInput
            ) {
            medicalRecordsFromIds (
                ids: $ids
                pageIndex: $pageIndex, 
                pageLimit: $pageLimit,
                sortDirection: $sortDirection,
                sortActive: $sortActive,
                filterInput: $filterInput,
                advancedSearchInput: $advancedSearchInput
            ) {
                slice {
                    ... on Record {
                        id
                        title
                        text
                        draft
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
                length
            }
        }`
        const variables = {
            pageIndex: this.pageIndex,
            pageLimit: this.pageLimit,
            sortDirection: 'DESC',
            sortActive: 'createdAt',
            ids: this.recordIds,
            filterInput: this.filterValue,
            advancedSearchInput: this.advancedSearchInput
        }
        try {
            const response = await this.graphQLService.send(query, variables);
            if (response.data) {
                const records = response.data.medicalRecordsFromIds.slice;
                this.length = response.data.medicalRecordsFromIds.length;
                this.formatDataSourceAndColumnsForRecords(records);
                this.isLoading = false;
            }
        } catch(error) {
            this.dialog.open(AlertComponent, {data: {message: error}});
        }

    }

    isAllSelected() {
        const numSelected = this.selection.selected.length;
        this.checkedCount = numSelected;
        const numRows = this.dataSource.data.length;
        if (!this.selection.hasValue() || this.checkedCount < 2) {
            this.isActionsDisabled = true;
        } else {
            this.isActionsDisabled = false;
        }
        return numSelected === numRows;
    }
    isChecked(element: any): void {
        if (this.selection.isSelected(element)) {
          this.selection.deselect(element);
          this.checkedCount--;
        } else {
          this.selection.select(element);
          this.checkedCount++;
        }
    }

    toggleAllRows() {
        if (this.isAllSelected()) {
        this.cd.detectChanges(); 
        this.selection.clear();
        return;
        }

        this.selection.select(...this.dataSource.data);
    }

    formatDataSourceAndColumnsForRecords(records: any[]) {
        this.injectedData = records.map((record: Record) => {
            let createdAt: string;
            let updatedAt: string;
            const patientDob = DateTime.fromISO(record.appointment.patient.dob,  {setZone: true}).toFormat('MMM dd, yyyy');    
            const createdDate = DateTime.fromISO(record.createdAt, { setZone: true });
            const updatedDate = DateTime.fromISO(record.updatedAt, { setZone: true });
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
                id: record.id,
                createdAt: createdAt+`, ${createdDate.toFormat('HH:mm a')}`,
                title: record.title,
                updatedAt: updatedAt+`, ${updatedDate.toFormat('HH:mm a')}`,
                name: record.appointment.doctor?.firstName+" "+record.appointment.doctor?.lastName,
                patientDob
            } 
        });
                
        if (this.userRole === 'doctor') {
            this.displayedColumns = [ 
                {header: 'Title', columnDef: 'title', sort:true},
                {header: `Doctor's name`, columnDef: 'name', sort:true},
                {header: 'First created', columnDef: 'createdAt', sort:true},
                {header: 'Final save', columnDef: 'updatedAt', sort:true}
            ]

        } else {
            this.displayedColumns = [ 
                {header: 'Title', columnDef: 'title', sort:true},
                {header: `Doctor's name`, columnDef: 'name', sort:true},
                {header: 'Date', columnDef: 'updatedAt', sort:true}
            ]
        }
        this.dataSource = new MatTableDataSource<any>(this.injectedData);
        this.ngOnInit();
    }
    
    

    ngAfterViewInit(): void {  
        if (this.paginator && this.dataSource && this.displayedColumns) {
            this.columnNames = this.displayedColumns.map(column => column.columnDef);
            this.paginator.length = this.length;
            this.dataSource.paginator = this.paginator;
            this.sort.disableClear = true;
            this.dataSource.sort = this.sort;
        }    
    }

    ngOnChanges(changes: SimpleChanges): void { 
        if (changes['displayedColumns'] || changes['buttons']) {   
            const change = changes['displayedColumns'];
            if (!change.firstChange) {
                this.displayedColumns = [...change.currentValue];
                this.columnNames = this.displayedColumns.map(column => column.columnDef);          
            } 
        }
    
        if (changes['dataSource'] && changes['length'] ) {
            if (this.dataSource && this.paginator) {
                this.dataSource.paginator = this.paginator;
                this.dataSource.paginator.firstPage();   
            }
        }
        
        this.checkedCount = 0;
        this.selection.clear();
    } 
    ngOnDestroy(): void {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
    }
    sortOnline(direction: 'asc' | 'desc') {
        this.dataSource.data.sort((a: any, b: any) => {
            if (a.online === b.online) return 0;
            return direction === 'asc' ? (a.online ? -1 : 1) : (a.online ? 1 : -1);
        });
        this.dataSource._updateChangeSubscription(); 
    }

    sortUnread(direction: 'asc' | 'desc') {
        this.dataSource.data.sort((a: any, b: any) => {
            if (a.unreadMessages === b.unreadMessages) return 0;
            return direction === 'asc' ? (a.unreadMessages ? -1 : 1) : (a.unreadMessages ? 1 : -1);
        });
        this.dataSource._updateChangeSubscription(); 
    }

    onPageChange(event: any) {
        this.pageIndex = event.pageIndex;
        this.pageLimit = event.pageSize;
        const pageEvent = {pageIndex: event.pageIndex, pageLimit: event.pageSize}
        this.pageChange.emit(pageEvent);
    }

    onRowClick(id: number, title?: string){
        if (this.recordIds) {
            this.dialog.open(RecordComponent, {width: "45rem", data: {recordId: id, noDelete: true}});
        }
        this.markAppointmentId = null;
        if (id) {
            const newSender = this.dataSource.data.find(sender => sender.id === id) as UserDataSource;
            if (newSender && newSender.online !== undefined) {
                this.senders = this.senders.filter(sender => sender !== newSender.name);
            }
        }
        this.rowClick.emit({id, title});
    }
    isNewSender(element: any): boolean {
        if (element.unreadMessages !== undefined && element.unreadMessages === null) {
            return false;
        }
        return this.senders.some(sender => sender === `${element.firstName} ${element.lastName}`);
    }
    isUnreadChat(element: any){
        return element.unreadMessages !== undefined && element.unreadMessages !== null;
    }
    onActionClick(text: string, id?:number) {
        if (id) {
            this.action.emit({text, ids: [id]});
        } else {
            const ids:number[] = this.selection.selected.map(row=>row.id);
            this.action.emit({text, ids});
        }
        this.ngOnDestroy();
        this.ngOnInit();
    }
    onAdvancedSearch(value: any){
        this.filterValue = value.searchInput;
        this.advancedSearchInput = value.advancedSearchInput;
        this.loadMedicalRecords();
    }
    onFilterValueChange(input: string){
        this.filterValue = input;
        this.loadMedicalRecords();
    }
    onSearchReset(isResetting: boolean) {
        if (isResetting) {
            this.filterValue = null;
            this.advancedSearchInput = null;
            this.loadMedicalRecords();
        }
    }
    onHeaderCheckboxClick(){
        const showInfo = this.buttons?.some(btn => btn.disabled);
        if (showInfo && this.buttons?.length === 1) {
            const action = this.buttons[0].text;
            const ref = this.dialog.open(AlertComponent, {disableClose:true, data: {message:`Forbidden action: ${action}`}});
            ref.componentInstance.ok.subscribe(()=> {
                this.checkedCount = 0;
                this.selection.clear();
            })
        }
    }
}