import { Component, OnInit } from "@angular/core";
import { AppDialogService } from "../../services/app-dialog.service";

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['home.component.scss']
})
export class HomeComponent implements OnInit {
    constructor (
        private dialog: AppDialogService
    ) {}
    ngOnInit(): void {
        
    }
    openLogIn(){
        this.dialog.open({data: {isLoggingIn: true}})
    }
}