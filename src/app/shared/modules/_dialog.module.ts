import { NgModule } from "@angular/core";
import { AppDialogComponent } from "../components/app-dialog/app-dialog.component";
import { CommonModule } from "@angular/common";
import { MatDialogModule } from "@angular/material/dialog";
import { ConfirmComponent } from "../components/app-confirm/app-confirm.component";
import { LoadingComponent } from "../components/app-loading/loading.component";
import { MatButtonModule } from "@angular/material/button";
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import { LoginComponent } from "../components/app-login/app-login.componnet";
import { MatInputModule } from "@angular/material/input";
import { MatDividerModule } from "@angular/material/divider";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { AlertComponent } from "../components/app-alert/app-alert.component";
import { EventComponent } from "../components/app-event/event.component";
import { RecordComponent } from "../../graphql/record/record.component";
import { AppEditorComponent } from "../components/app-editor/app-editor.component";
import { NgxEditorModule } from 'ngx-editor';

@NgModule({
    /*declarations: [
        AppDialogComponent,
        ConfirmComponent,
        LoadingComponent,
        AlertComponent,
        LoginComponent,
        EventComponent,
        AppEditorComponent,
        RecordComponent,
    ],
    imports: [
        FormsModule,
        ReactiveFormsModule,
        CommonModule,
        MatDialogModule,
        MatButtonModule,
        MatProgressSpinnerModule,
        MatInputModule,
        MatDividerModule,
        NgxEditorModule
        
    ]*/
})
export class DialogModule {};