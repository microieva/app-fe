import { Component, Input, OnInit } from "@angular/core";
import { Appointment } from "../../../graphql/appointment/appointment";
import { ActivatedRoute, Router } from "@angular/router";

@Component({
    selector: 'app-sidenav',
    templateUrl: './app-sidenav.component.html',
    styleUrls: ['./app-sidenav.component.scss']
})
export class AppSidenavComponent implements OnInit {

    @Input() isUserUpdated!: boolean;
    @Input() userRole: string | null = null;
    @Input() isRecords: boolean = false;
    @Input() isRequests: boolean = false;
    @Input() isNowAppointment: Appointment | null = null;

    constructor(
        private activatedRoute: ActivatedRoute,
        private router: Router
    ){}

    ngOnInit(): void {
        this.activatedRoute.queryParams.subscribe(async params => {
            if(params['updated']) {
                this.isUserUpdated = true;
            }
        });
    }

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

    onDoctorsClick(){
        this.isRequests = false;
    }
}