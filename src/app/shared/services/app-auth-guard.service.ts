import { Injectable } from "@angular/core";
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from "@angular/router";
import { Observable, map, tap } from "rxjs";

@Injectable({
    providedIn: 'root'
  })
  export class AuthGuardService {
  
    constructor(
      private router: Router
    ) {}
  
    // canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    //   return this.socialAuthService.authState.pipe(
    //     map((socialUser: SocialUser) => !!socialUser),
    //     tap((isLoggedIn: boolean) => {
    //       if (!isLoggedIn) {
    //         this.router.navigate(['/']);
    //       }
    //     })
    //   );
    // }
  }
  //[() => inject(myGuard).canActivate()]