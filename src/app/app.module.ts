import { NgModule } from '@angular/core';
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
import { TestAppsComponent } from './graphql/test-app/test-apps/test-apps.component';
import { HomeComponent } from './shared/components/home/home.component';
import { AppTreeComponent } from './shared/components/app-tree/app-tree.component';
import { MatDialogContent, MatDialogModule } from '@angular/material/dialog';
import { AppDialogService } from './shared/services/app-dialog.service';
import { DialogModule } from './shared/modules/dialog.module';

@NgModule({ 
    declarations: [
        AppComponent,
        HomeComponent,
        TestAppsComponent,
        TestAppComponent,
        AppTreeComponent
    ],
    bootstrap: [AppComponent], 
    imports: [
        MatCheckboxModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatToolbarModule,
        MatTreeModule,
        MatDialogModule,
        MatDialogContent,
        FormsModule,
        ReactiveFormsModule,
        BrowserModule,
        AppRoutingModule,
        GraphQLModule,
        DialogModule
    ], 
    providers: [
        AppDialogService,
        provideHttpClient(withInterceptorsFromDi()), 
        provideAnimationsAsync(),
        {provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: { appearance: 'outline' }}
    ],
})

export class AppModule { }
