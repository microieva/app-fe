import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { GraphQLModule } from './graphql.module';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { TestAppComponent } from './graphql/test-app/test-app.component';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
//import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material'

@NgModule({ declarations: [
        AppComponent,
        TestAppComponent
    ],
    bootstrap: [AppComponent], 
    imports: [
        //MatLabelModule,
        FormsModule,
        ReactiveFormsModule,
        BrowserModule,
        AppRoutingModule,
        GraphQLModule
    ], 
    providers: [
        provideHttpClient(withInterceptorsFromDi()), 
        provideAnimationsAsync()
        //{provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: {appearance: 'outline'}}
    ] 
})

export class AppModule { }
