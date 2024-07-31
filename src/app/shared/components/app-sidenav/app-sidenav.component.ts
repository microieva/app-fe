import { Component, Input } from "@angular/core";

@Component({
    selector: 'app-sidenav',
    templateUrl: './app-sidenav.component.html',
    styleUrls: ['./app-sidenav.component.scss']
})
export class AppSidenavComponent {

    @Input() isUserUpdated!: string | null;
    @Input() isAuth: boolean = false;
    @Input() isRecords: boolean = false;

    constructor(){}
}