import { Component, OnInit } from "@angular/core";
import { AppDialogService } from "../../services/app-dialog.service";
import { Router } from "@angular/router";
import { AppAuthService } from "../../services/app-auth.service";

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['home.component.scss']
})
export class HomeComponent implements OnInit {
    me: any;

    constructor (
        private dialog: AppDialogService,
        private router: Router,
        private authService: AppAuthService
    ) {
        this.authService.getMe().subscribe(res => {
            this.me = res    
        });
    }

    ngOnInit() {
    
    }

    logIn() {
        this.dialog.open({data: {isLoggingIn: true}})
    }

    logOut() {
        this.authService.logOut(); 
        window.location.reload();
        this.router.navigate(['/']); // doesnt work
    }
}