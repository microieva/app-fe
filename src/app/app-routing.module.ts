import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { authGuard } from './shared/services/app-auth-guard.service';
import { UserComponent } from './graphql/user/user.component';
import { AppointmentsComponent } from './graphql/appointment/appointments/appointments.component';
import { CalendarComponent } from './graphql/appointment/calendar/calendar.component';
import { RecordsComponent } from './graphql/record/records/records.component';
import { DoctorsComponent } from './graphql/user/doctors/doctors.component';
import { PatientsComponent } from './graphql/user/patients/patients.component';
import { AppHomeComponent } from './shared/components/app-home/app-home.component';
import { AppLandingComponent } from './shared/components/app-landing/app-landing.component';


const routes: Routes = [
    { path: '', component: AppHomeComponent},
    { path: 'home', component: AppLandingComponent, canActivate: [authGuard], children: [
        { path: 'user', component: UserComponent },
        { path: 'users', component: DoctorsComponent },
        { path: 'user/:id', component: UserComponent },
        { path: 'appointments', component: AppointmentsComponent },
        { path: 'appointments/calendar', component: CalendarComponent },
        { path: 'records', component: RecordsComponent },
        { path: 'patients', component: PatientsComponent },
    ]},
    { path: '**', redirectTo: '', pathMatch: 'full' }
]

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule]
})
export class AppRoutingModule { }
