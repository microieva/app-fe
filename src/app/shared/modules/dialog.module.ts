import { NgModule } from "@angular/core";
import { AppDialogComponent } from "../components/app-dialog/app-dialog.component";
import { CommonModule } from "@angular/common";
import { MatDialogModule } from "@angular/material/dialog";
import { ConfirmComponent } from "../components/confirm/confirm.component";
import { LoadingComponent } from "../components/loading/loading.component";
import { MatButtonModule } from "@angular/material/button";
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import { LoginComponent } from "../components/login/login.componnet";

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
        MatProgressSpinnerModule
    ]
})
export class DialogModule {};