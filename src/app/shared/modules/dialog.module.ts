import { NgModule } from "@angular/core";
import { AppDialogComponent } from "../components/app-dialog/app-dialog.component";
import { CommonModule } from "@angular/common";
import { MatDialogModule } from "@angular/material/dialog";
import { ConfirmComponent } from "../components/app-dialog/confirm/confirm.component";
import { LoadingComponent } from "../components/app-dialog/loading/loading.component";
import { MatButtonModule } from "@angular/material/button";
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import { LoginComponent } from "../components/app-dialog/login/login.componnet";
import { MatInputModule } from "@angular/material/input";

@NgModule({
    declarations: [
        AppDialogComponent,
        ConfirmComponent,
        LoadingComponent,
        LoginComponent
    ],
    imports: [
        CommonModule,
        MatDialogModule,
        MatButtonModule,
        MatProgressSpinnerModule,
        MatInputModule
    ]
})
export class DialogModule {};