import { Component, Input, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { AppAuthService } from "../../services/app-auth.service";

@Component({
    selector: 'app-sidenav',
    templateUrl: './app-sidenav.component.html',
    styleUrls: ['./app-sidenav.component.scss']
})
export class AppSidenavComponent {

    @Input() isUserUpdated: string | null = null;
    @Input() isAuth: boolean = false;

    constructor(
        public router: Router,
        private authService: AppAuthService
    ){}
}