import { Subscription } from 'rxjs';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { environment } from '../environments/environment';
import { AppAuthService } from './shared/services/app-auth.service';
import { AppSnackbarService } from './shared/services/app-snackbar.service';
import { AppTimerService } from './shared/services/app-timer.service';
import { LoadingComponent } from './shared/components/app-loading/loading.component';


@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
    title = 'Health Center';

    private subscription!: Subscription;
    auth: Subscription = new Subscription();

    constructor (
        private dialog: MatDialog,
        private router: Router,
        private activatedRoute: ActivatedRoute,
        private authService: AppAuthService,
        private http: HttpClient,
        private timerService: AppTimerService,
        public snackbarService: AppSnackbarService
    ) {}

    ngOnInit(): void {
        this.subscription = this.activatedRoute.queryParams.subscribe(params => {
            const code = params['code'];
            const state = params['state'];
            const scope = params['scope']

            if (code && state) {
                this.exchangeCodeForToken(code, state, scope);
            } 
        });
        this.auth = this.authService.isLoggedIn$.subscribe(isLoggedIn => {
            if (isLoggedIn) {
                const tokenExpire = localStorage.getItem('tokenExpire');
                if (tokenExpire) this.timerService.startTokenTimer(tokenExpire);
            }
        })
    }

    ngOnDestroy() {
        this.subscription.unsubscribe();
    }

    exchangeCodeForToken(code: string, state: string, scope: any) {
        const tokenEndpoint = environment.tokenEndpoint;
        const clientId = environment.clientId
        const clientSecret =  environment.clientSecret;
        const redirectUri = environment.redirectUri;
      
        const headers = new HttpHeaders({
          'Content-Type': 'application/x-www-form-urlencoded',
        });
      
        const body = new URLSearchParams();
        body.set('grant_type', 'authorization_code'); 
        body.set('code', code);
        body.set('redirect_uri', redirectUri);
        body.set('client_id', clientId);
        body.set('client_secret', clientSecret);
        body.set('scope', scope);
        this.dialog.open(LoadingComponent);
        this.http.post(tokenEndpoint, body.toString(), { headers }).subscribe(
            {
                next: async (response: any) => await this.authService.loginWithSignicat(response.id_token),
                error: (error: any) => console.error('Token exchange failed', error),
                complete: ()=> this.router.navigate(['/'])
            }
        );
    }

}
