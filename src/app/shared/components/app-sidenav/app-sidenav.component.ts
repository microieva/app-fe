import { Component, Input } from "@angular/core";

@Component({
    selector: 'app-sidenav',
    templateUrl: './app-sidenav.component.html',
    styleUrls: ['./app-sidenav.component.scss']
})
export class AppSidenavComponent {

    @Input() isUserUpdated: string | null = null;
    @Input() userRole: string | null = null;
    @Input() isRecords: boolean = false;

    constructor(){}
}