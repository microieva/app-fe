import { NgModule } from '@angular/core';
import { FullCalendarModule } from '@fullcalendar/angular';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { GraphQLModule } from './shared/modules/graphql.module';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS, MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTreeModule } from '@angular/material/tree';
import { MatSidenavContainer, MatSidenavContent, MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatDatepickerModule } from '@angular/material/datepicker';
import {MatTabsModule} from '@angular/material/tabs';
import {MatTableModule} from '@angular/material/table';
import {MatAccordion, MatExpansionModule} from '@angular/material/expansion';
import {MatRadioModule} from '@angular/material/radio';
import { MAT_DATE_FORMATS, MAT_DATE_LOCALE, MatCommonModule, provideNativeDateAdapter } from '@angular/material/core';
import { AppHomeComponent } from './shared/components/app-home/app-home.component';
import { MatDialogContent, MatDialogModule } from '@angular/material/dialog';
import { UserComponent } from './graphql/user/user.component';
import { LUXON_DATE_FORMATS } from './shared/constants';
import { AppTimerService } from './shared/services/app-timer.service';
import { AppointmentsComponent } from './graphql/appointment/appointments/appointments.component';
import { CalendarComponent } from './graphql/appointment/calendar/calendar.component';
import { AppCalendarComponent } from './shared/components/app-calendar/app-calendar.component';
import { AppTableComponent } from './shared/components/app-table/app-table.component';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { AppAppointmentService } from './shared/services/app-appointment.service';
import { AppointmentComponent } from './graphql/appointment/appointment.component';
import { AppTabsService } from './shared/services/app-tabs.service';
import { AppEditorComponent } from './shared/components/app-editor/app-editor.component';
import { NgxEditorModule } from 'ngx-editor';
import { RecordsComponent } from './graphql/record/records/records.component';
import { RecordComponent } from './graphql/record/record.component';
import { AlertComponent } from './shared/components/app-alert/app-alert.component';
import { ConfirmComponent } from './shared/components/app-confirm/app-confirm.component';
import { EventComponent } from './shared/components/app-event/app-event.component';
import { LoadingComponent } from './shared/components/app-loading/loading.component';
import { LoginComponent } from './shared/components/app-login/app-login.componnet';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { DoctorsComponent } from './graphql/user/doctors/doctors.component';
import { PatientsComponent } from './graphql/user/patients/patients.component';
import { AppLandingComponent } from './shared/components/app-landing/app-landing.component';
import { LoginMenuComponent } from './shared/components/app-login-menu/app-login-menu.component';
import { AppSocketService } from './shared/services/app-socket.service';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { AppSnackbarService } from './shared/services/app-snackbar.service';
import { AppSnackbarContainerComponent } from './shared/components/app-snackbar/app-snackbar.component';
import { AppDialogService } from './shared/services/app-dialog.service';
import { MessagesComponent } from './graphql/chat/messages/messages.component';
import { ChatComponent } from './graphql/chat/chat.component';
import { TextFieldModule } from '@angular/cdk/text-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AppSearchComponent } from './shared/components/app-search/app-search.component';

@NgModule({ 
    declarations: [
        AppComponent,
        AppHomeComponent,
        AppLandingComponent,
        AppCalendarComponent,
        AppTableComponent,
        AppSearchComponent,
        AppEditorComponent,
        AppSnackbarContainerComponent,
        UserComponent,
        DoctorsComponent,
        PatientsComponent,
        AppointmentsComponent,
        AppointmentComponent,
        MessagesComponent,
        CalendarComponent,
        RecordsComponent,
        RecordComponent,
        ConfirmComponent,
        LoadingComponent,
        AlertComponent,
        LoginComponent,
        EventComponent,
        LoginMenuComponent,
        ChatComponent
    ],
    bootstrap: [AppComponent], 
    imports: [
        MatCommonModule,
        BrowserAnimationsModule,
        NgxEditorModule,
        MatCheckboxModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatToolbarModule,
        MatTreeModule,
        MatSidenavModule,
        MatSidenavContent,
        MatSidenavContainer,
        MatListModule,
        MatDialogModule,
        MatDialogContent,
        MatDatepickerModule,
        MatTabsModule,
        MatPaginatorModule,
        MatTableModule,
        MatRadioModule,
        MatSortModule,
        FormsModule,
        ReactiveFormsModule,
        BrowserModule,
        MatProgressSpinnerModule,
        AppRoutingModule,
        GraphQLModule,
        FullCalendarModule,
        MatExpansionModule,
        MatAccordion,
        MatDividerModule,
        NgxEditorModule,
        MatSnackBarModule,
        TextFieldModule,
        MatTooltipModule
    ], 
    providers: [
        AppTimerService,
        AppAppointmentService,
        AppTabsService,
        AppSocketService,
        AppSnackbarService,
        AppDialogService,
        provideNativeDateAdapter(),
        provideHttpClient(withInterceptorsFromDi()), 
        provideAnimationsAsync(),
        { provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: { appearance: 'outline' }},
        { provide: MAT_DATE_FORMATS, useValue: LUXON_DATE_FORMATS },
        { provide: MAT_DATE_LOCALE, useValue: 'fi-FI' } 
    ],
})

export class AppModule { }
