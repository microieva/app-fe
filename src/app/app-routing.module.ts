import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { UserComponent } from './graphql/user/user.component';
import { AppointmentsComponent } from './graphql/appointment/appointments/appointments.component';
import { CalendarComponent } from './graphql/appointment/calendar/calendar.component';
import { RecordsComponent } from './graphql/record/records/records.component';

const routes: Routes = [
  { path:'', redirectTo: '', pathMatch: 'full' },
  { path: 'user', component: UserComponent },
  { path: 'user/:id', component: UserComponent },
  { path: 'appointments', component: AppointmentsComponent },
  { path: 'appointments/calendar', component: CalendarComponent },
  { path: 'records', component: RecordsComponent }
  //{ path: '**', component: NotFoundComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
