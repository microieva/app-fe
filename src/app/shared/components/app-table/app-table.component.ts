import { Component, Input, OnInit } from "@angular/core";
import { MatTableDataSource } from "@angular/material/table";
import { filter } from "rxjs";

@Component({
    selector: 'app-table',
    templateUrl: './app-table.component.html',
    styleUrls: ['app-table.component.scss']
})
export class AppTableComponent implements OnInit{
    //dataSource = [];
    displayedColumns: string[] = ['status', 'createdAt', 'button'];
    @Input() dataSource = new MatTableDataSource();

    constructor(){}

    ngOnInit() {
        console.log('table comp data: ', this.dataSource)
    }

    applyFilter(event: Event) {
        const filterValue = (event.target as HTMLInputElement).value;
        //this.dataSource.filter = filterValue.trim().toLowerCase();
        console.log('filter value: ', filterValue)
    }
}