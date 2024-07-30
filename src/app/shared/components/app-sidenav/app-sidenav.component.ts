import { Component, Input, OnInit } from "@angular/core";

@Component({
    selector: 'app-sidenav',
    templateUrl: './app-sidenav.component.html',
    styleUrls: ['./app-sidenav.component.scss']
})
export class AppSidenavComponent implements OnInit{

    @Input() isUserUpdated!: string | null;
    @Input() isAuth: boolean = false;
    @Input() isRecords: boolean = false;

    constructor(){}
    ngOnInit(): void {
        console.log('SIDENAV INIT: ', this.isRecords)
    }
}