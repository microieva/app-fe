import { Component, Input } from "@angular/core";
import { Appointment } from "../../../graphql/appointment/appointment";
import { ActivatedRoute, Router } from "@angular/router";
import { AppTabsService } from "../../services/app-tabs.service";

@Component({
    selector: 'app-sidenav',
    templateUrl: './app-sidenav.component.html',
    styleUrls: ['./app-sidenav.component.scss']
})
export class AppSidenavComponent {

    @Input() isUserUpdated: string | null = null;
    @Input() userRole: string | null = null;
    @Input() isRecords: boolean = false;
    @Input() isNowAppointment: Appointment | null = null;

    constructor(
        private activatedRoute: ActivatedRoute,
        private router: Router
    ){}

    onAppointmentsClick(){
        if (this.isNowAppointment && this.userRole === 'doctor') {
            this.router.navigate(['appointments'], {
                relativeTo: this.activatedRoute,
                queryParams: { tab: 3},
                queryParamsHandling: 'merge' 
            });
        }
        this.isNowAppointment = null;
    }
}