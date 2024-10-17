import { AfterViewInit, Component, ElementRef, EventEmitter, HostListener, Input, OnInit, Output, ViewChild } from "@angular/core";
import { animate, state, style, transition, trigger } from "@angular/animations";
import { MatTableDataSource } from "@angular/material/table";
import { MatPaginator } from "@angular/material/paginator";
import { MatSort } from "@angular/material/sort";
import { Subject, debounceTime } from "rxjs";
import { AppTimerService } from "../../services/app-timer.service";
import { AppSocketService } from "../../services/app-socket.service";
import { AppDataSource, UserDataSource } from "../../types";

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
export class AppTableComponent implements OnInit, AfterViewInit {
    displayedColumns: string[] = [];
    displayedColumnHeader: string | undefined;
    columnsToDisplayWithExpand: string[] = [];
    expandedElement: any | null;

    private searchSubject = new Subject<string>();

    @Output() pageChange = new EventEmitter<{pageIndex: number, pageLimit: number}>();
    @Output() sortChange = new EventEmitter<{active: string, direction: string}>();
    @Output() filterValue = new EventEmitter<string>();
    @Output() appointmentClick = new EventEmitter<{id: number, title: string}>();
    @Output() recordClick = new EventEmitter<number>();
    @Output() userClick = new EventEmitter<number>();
    @Output() buttonClick = new EventEmitter<{id: number, text: string}>();
    @Output() receiverId = new EventEmitter<number>();

    @Input() dataSource!: MatTableDataSource<AppDataSource>;
    @Input() length: number = 0;
    @Input() reset: boolean = false;
    @Input() userRole!: string;
    @Input() markAppointmentId: number | null = null;
    senders: any[] =[];

    @ViewChild(MatPaginator, {read: true}) paginator!: MatPaginator;
    @ViewChild(MatSort) sort!: MatSort;
    @ViewChild('input') input!: ElementRef;
    @ViewChild('expandedElementRef') expandedElementRef!: ElementRef;

    pageLimit: number = 10;
    pageIndex: number = 0;
    filter: string = ''

    howSoonStr: string | undefined;
    
    @HostListener('matSortChange', ['$event'])
    onSortChange(event: any) {
        this.sortChange.emit({active: event.active, direction: event.direction})   
    }

    @HostListener('document:click', ['$event'])
    clickout(event: Event) {
        if (
            this.expandedElement && 
            this.expandedElementRef && 
            !this.expandedElementRef.nativeElement.contains(event.target)
        ) {
            this.expandedElement = null;
        }
    }

    constructor(
        public timerService: AppTimerService,
        private socketService: AppSocketService
    ){
        this.searchSubject.pipe(
            debounceTime(300)
        ).subscribe(searchTerm => {
                this.filterValue.emit(searchTerm); 
        });
        
    }
    
    ngOnInit() {       
        if (this.dataSource) {
            const firstElement = this.dataSource.data[0];
            if (firstElement) {
                if ('online' in firstElement) {
                    this.displayedColumns = ['online', 'name', 'email'];
                } else if ('email' in firstElement) { // type UserDataSource
                    this.displayedColumns = ['name', 'email', 'created'];
                } else if ('date' in firstElement && this.userRole === 'patient') {
                    this.displayedColumns =['id', 'status', 'time'] // type AppointmentDataSource - patient view
                } else if ('date' in firstElement && this.userRole === 'doctor') { 
                        this.displayedColumns = ['id', 'patientName', 'time']  // type AppointmentDataSource - doctor / admin view
                } else if ('title' in firstElement && 'createdAt' in firstElement) {
                    this.displayedColumns = ['title', 'created']; 
                } 
            }
            
            this.columnsToDisplayWithExpand = [...this.displayedColumns, 'expandedDetail'];  
        }
        this.socketService.receiveNotification().subscribe((subscription: any)=> {
            if (subscription && subscription.chatId) {
                if (!this.senders.find(sender => sender === subscription.sender)) {
                    this.senders.push(subscription.sender);
                }
            }
        });
    }
    ngAfterViewInit(): void {   
        if (this.paginator && this.dataSource) {
            this.paginator.length = this.length;
            this.dataSource.paginator = this.paginator;
            this.sort.disableClear = true;
            this.dataSource.sort = this.sort;
        }
    }
    

    ngOnChanges(changes: any): void {
        if (changes['dataSource'] && changes['length']) {
            if (this.dataSource && this.paginator) {
                    this.dataSource.paginator = this.paginator;
                    this.dataSource.paginator.firstPage();
            }
        }
    }

    onSearch(event: KeyboardEvent) {
        const filterValue = (event.target as HTMLInputElement).value.trim().toLowerCase();

        if (this.dataSource) {
            this.dataSource.filter = filterValue;
            this.searchSubject.next(filterValue);
        }
    }

    onPageChange(event: any) {
        this.pageIndex = event.pageIndex;
        this.pageLimit = event.pageSize;
        const pageEvent = {pageIndex: event.pageIndex, pageLimit: event.pageSize}
        this.pageChange.emit(pageEvent);
    }

    onAppointmentClick(id: number, title: string){
        this.appointmentClick.emit({id, title});
    }
    onRecordClick(id: number){
        this.recordClick.emit(id);
    }
    onUserClick(id: number) {
        this.userClick.emit(id);
    }
    onButtonClick(id: number, text: string){
        this.buttonClick.emit({id, text});
    }
    onRowClick(id: number){
        this.markAppointmentId = null;
        if (id) {
            const newSender = this.dataSource.data.find(sender => sender.id === id) as UserDataSource;
            if (newSender && newSender.online !== undefined) {
                this.senders = this.senders.filter(sender => sender !== `${newSender.firstName} ${newSender.lastName}`);
            }
            this.receiverId.emit(id);
        }
    }
    isNewSender(element: any): boolean {
        return this.senders.some(sender => sender === `${element.firstName} ${element.lastName}`);
    }
      
}