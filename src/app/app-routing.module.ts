import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AppAuthGuard } from './shared/services/app-auth.guard';
import { UserComponent } from './graphql/user/user.component';
import { AppointmentsComponent } from './graphql/appointment/appointments/appointments.component';
import { CalendarComponent } from './graphql/appointment/calendar/calendar.component';
import { RecordsComponent } from './graphql/record/records/records.component';
import { DoctorsComponent } from './graphql/user/doctors/doctors.component';
import { PatientsComponent } from './graphql/user/patients/patients.component';
import { AppLandingComponent } from './shared/components/app-landing/app-landing.component';
import { AppHomeComponent } from './shared/components/app-home/app-home.component';
import { MessagesComponent } from './graphql/chat/messages/messages.component';


const routes: Routes = [
    { path: '', component: AppLandingComponent },
    { path: 'home', component: AppHomeComponent, canActivate: [AppAuthGuard], children: [
        { path: 'user', component: UserComponent },
        { path: 'users', component: DoctorsComponent },
        { path: 'user/:id', component: UserComponent },
        { path: 'calendar', component: CalendarComponent },
        { path: 'appointments', component: AppointmentsComponent },
        { path: 'appointments/calendar', component: CalendarComponent },
        { path: 'records', component: RecordsComponent },
        { path: 'patients', component: PatientsComponent },
        { path: 'messages', component: MessagesComponent }
    ]},
    { path: '**', redirectTo: '', pathMatch: 'full' }
]

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule]
})
export class AppRoutingModule { }
