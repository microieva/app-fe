import { Component } from "@angular/core";
import { AppDialogService } from "../../../services/app-dialog.service";

@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['login.component.scss']
})
export class LoginComponent {
    title = "Log In"
    constructor (
        private dialog: AppDialogService
    ) {}

    onDirectLoginClick(){
        this.dialog.open({ data: { showDirectLoginForm: true, isLoggingIn: false }})
    }
}