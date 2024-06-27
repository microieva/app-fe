import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TestAppComponent } from './graphql/test-app/test-app.component';
import { TestAppsComponent } from './graphql/test-app/test-apps/test-apps.component';
import { HomeComponent } from './shared/components/home/home.component';
import { AuthGuardService } from './shared/services/app-auth-guard.service';

const routes: Routes = [
  {path:'', redirectTo: '', pathMatch: 'full'},
  { path: 'home', component: HomeComponent, canActivate: [AuthGuardService]},
  { path: 'test-apps', component: TestAppsComponent},
  { path: 'test-apps/new', component: TestAppComponent},
  { path: 'test-apps/:id', component: TestAppComponent}
  //{ path: '**', component: NotFoundComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
