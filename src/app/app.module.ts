import { NgModule } from '@angular/core';
import { FullCalendarModule } from '@fullcalendar/angular';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { GraphQLModule } from './shared/modules/graphql.module';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { TestAppComponent } from './graphql/test-app/test-app.component';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS, MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTreeModule } from '@angular/material/tree';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatDatepickerModule } from '@angular/material/datepicker';
import {MatTabsModule} from '@angular/material/tabs';
import {MatTableModule} from '@angular/material/table';
import {MatAccordion, MatExpansionModule} from '@angular/material/expansion';
import { MAT_DATE_FORMATS, MAT_DATE_LOCALE, provideNativeDateAdapter } from '@angular/material/core';
import { TestAppsComponent } from './graphql/test-app/test-apps/test-apps.component';
import { HomeComponent } from './shared/components/home/home.component';
import { AppSidenavComponent } from './shared/components/app-sidenav/app-sidenav.component';
import { MatDialogContent, MatDialogModule } from '@angular/material/dialog';
import { AppDialogService } from './shared/services/app-dialog.service';
import { DialogModule } from './shared/modules/dialog.module';
import { UserComponent } from './graphql/user/user.component';
import { LUXON_DATE_FORMATS } from './shared/constants';
import { AppTimerService } from './shared/services/app-timer.service';
import { AppointmentsComponent } from './graphql/appointment/appointments/appointments.component';
import { AppointmentComponent } from './graphql/appointment/appointment.component';
import { AppCalendarComponent } from './shared/components/app-calendar/app-calendar.component';
import { AppTableComponent } from './shared/components/app-table/app-table.component';

@NgModule({ 
    declarations: [
        AppComponent,
        HomeComponent,
        TestAppsComponent,
        TestAppComponent,
        AppSidenavComponent,
        AppCalendarComponent,
        AppTableComponent,
        UserComponent,
        AppointmentsComponent,
        AppointmentComponent
    ],
    bootstrap: [AppComponent], 
    imports: [
        MatCheckboxModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatToolbarModule,
        MatTreeModule,
        MatSidenavModule,
        MatListModule,
        MatDialogModule,
        MatDialogContent,
        MatDatepickerModule,
        MatTabsModule,
        MatTableModule,
        FormsModule,
        ReactiveFormsModule,
        BrowserModule,
        AppRoutingModule,
        GraphQLModule,
        DialogModule,
        FullCalendarModule,
        MatExpansionModule,
        MatAccordion
    ], 
    providers: [
        AppDialogService,
        AppTimerService,
        provideNativeDateAdapter(),
        provideHttpClient(withInterceptorsFromDi()), 
        provideAnimationsAsync(),
        { provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: { appearance: 'outline' }},
        { provide: MAT_DATE_FORMATS, useValue: LUXON_DATE_FORMATS },
        { provide: MAT_DATE_LOCALE, useValue: 'fi-FI' } 
        //AuthGuardService
    ],
})

export class AppModule { }
