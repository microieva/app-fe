import { AfterViewInit, Component, ElementRef, EventEmitter, HostListener, Input, OnInit, Output, ViewChild } from "@angular/core";
import { MatTableDataSource } from "@angular/material/table";
import { MatPaginator } from "@angular/material/paginator";
import { MatSort } from "@angular/material/sort";
import { animate, state, style, transition, trigger } from "@angular/animations";
import { Subject, debounceTime } from "rxjs";
import { AppDataSource } from "../../types";

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
    //displayedColumns: string[] = ['id', 'title', 'conditionalAppointmentColumns', 'conditionalRecordColumns'];
    displayedColumns: string[] = [];
    displayedColumnHeader: string | undefined;
    //columnsToDisplayWithExpand = [...this.displayedColumns, 'expandedDetail'];
    columnsToDisplayWithExpand: string[] = [];
    expandedElement: any | null;

    private searchSubject = new Subject<string>();

    @Output() pageChange = new EventEmitter<{pageIndex: number, pageLimit: number}>();
    @Output() sortChange = new EventEmitter<{active: string, direction: string}>();
    @Output() filterValue = new EventEmitter<string>();
    @Output() appointmentClick = new EventEmitter<{id: number, title: string}>();
    @Output() buttonClick = new EventEmitter<{id: number, text: string}>();

    @Input() dataSource: MatTableDataSource<AppDataSource> | undefined;
    //dataSource: MatTableDataSource<AppDataSource> | undefined;
    @Input() length: number = 0;
    @Input() userRole!: string;
    @Input() markAppointmentId: number| null = null;

    @ViewChild(MatPaginator) paginator!: MatPaginator;
    @ViewChild(MatSort) sort!: MatSort;
    @ViewChild('scrollView') scrollView: ElementRef | undefined;
    @ViewChild('input') input!: ElementRef;
    @ViewChild('expandedElementRef') expandedElementRef!: ElementRef;

    pageLimit: number = 10;
    pageIndex: number = 0;
    
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

    constructor(){
        this.searchSubject.pipe(
            debounceTime(300)
          ).subscribe(searchTerm => {
            this.filterValue.emit(searchTerm); 
          });
    }
    
    ngOnInit() {
        if (this.dataSource) {
            const firstElement = this.dataSource.data[0];

            if ('createdAt' in firstElement) {
                this.displayedColumns = ['title', 'created'];   
            } else {
                this.displayedColumns = ['id', 'status', 'time'];
            }
            this.columnsToDisplayWithExpand = [...this.displayedColumns, 'expandedDetail'];  
        }
    }
    ngAfterViewInit(): void {   
        if (this.paginator && this.dataSource) {
            this.paginator.length = this.length;
            this.dataSource.paginator = this.paginator;
            this.sort.disableClear = true;
            this.dataSource.sort = this.sort;
        }
        //console.log('PAG inside datasource: ', this.dataSource?.paginator?.length)
    }
    

    ngOnChanges(changes: any): void {
        if (changes['dataSource'] && changes['length']) {
          if (this.dataSource && this.paginator) {
                this.dataSource.paginator = this.paginator;
                this.dataSource.paginator.firstPage();
          }
        }
    }

    scrollToTop() {
        if (this.scrollView) {
          //this.scrollView.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
    }

    onSearch(event: KeyboardEvent) {
        const filterValue = (event.target as HTMLInputElement).value;

        if (this.dataSource) {
            this.searchSubject.next(filterValue);
            this.dataSource.filter = filterValue.trim().toLowerCase();
        }
    }

    onPageChange(event: any) {
        this.pageIndex = event.pageIndex;
        this.pageLimit = event.pageSize;
        const pageEvent = {pageIndex: event.pageIndex, pageLimit: event.pageSize}
        this.pageChange.emit(pageEvent);
        this.scrollToTop();
    }

    onAppointmentClick(id: number, title: string){
        this.appointmentClick.emit({id, title});
    }
    onButtonClick(id: number, text: string){
        this.buttonClick.emit({id, text});
    }
    onRowClick(){
        this.markAppointmentId = null;
    }
}