import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { GraphQLModule } from './modules/graphql.module';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { TestAppComponent } from './graphql/test-app/test-app.component';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { TestAppsComponent } from './graphql/test-apps/test-apps.component';
import { HomeComponent } from './graphql/home/home.component';

@NgModule({ 
    declarations: [
        AppComponent,
        HomeComponent,
        TestAppsComponent,
        TestAppComponent
    ],
    bootstrap: [AppComponent], 
    imports: [
        MatCheckboxModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        FormsModule,
        ReactiveFormsModule,
        BrowserModule,
        AppRoutingModule,
        GraphQLModule
    ], 
    providers: [
        provideHttpClient(withInterceptorsFromDi()), 
        provideAnimationsAsync(),
        //{provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: {appearance: 'outline'}}
    ] 
})

export class AppModule { }
