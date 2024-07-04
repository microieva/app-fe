import { Component, OnInit } from "@angular/core";
import { AppDialogService } from "../../services/app-dialog.service";
import { Router } from "@angular/router";
import { AppAuthService } from "../../services/app-auth.service";
import { AppGraphQLService } from "../../services/app-graphql.service";
import { take } from "rxjs";

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['home.component.scss']
})
export class HomeComponent implements OnInit{
    me: any;
    updatedAt: string | null = null;
    isAuth: boolean = false;

    constructor (
        private dialog: AppDialogService,
        private router: Router,
        private authService: AppAuthService,
        private graphQLService: AppGraphQLService
    ) {}

    async ngOnInit() {
        if (localStorage.getItem('authToken')) {
            await this.loadMe();
        } else {
            this.me = null;
            this.updatedAt = null;
            this.isAuth = false;
        }
    }

    async loadMe() {
        const query = `query {
            me {
                userRole
                updatedAt
            }
        }`
        this.graphQLService
            .send(query)
            .pipe(take(1))
            .subscribe(async (res) => {
                this.me = await res.data.me;
                this.updatedAt = this.me.updatedAt;
                this.isAuth = true;
        });
    }

    logIn() {
        this.dialog.open({data: {isLoggingIn: true}})
    }

    async logOut() {
        this.authService.logOut(); 
        await this.ngOnInit();
    }
}