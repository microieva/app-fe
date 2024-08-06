import { Component, OnInit } from "@angular/core";

@Component({
    selector: 'app-users',
    templateUrl: './users.component.html',
    styleUrls: ['./users.component.scss']
})
export class UsersComponent implements OnInit {
    selectedIndex: number = 0;
    length: number = 0;
    dataSource: any;

    constructor(){}
    ngOnInit(): void {
        
    }

    onTabChange(value: any){}

    onPageChange(value: any){}

    onSortChange(value: any){}

    onFilterValueChange(value: any){}

    onUserClick(value: any){}

    onButtonClick(value: any){}
}