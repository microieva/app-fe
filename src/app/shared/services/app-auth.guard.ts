import { inject, Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AppAuthService } from './app-auth.service';

// import { Injectable } from "@angular/core";
// import { CanActivate, Router } from "@angular/router";
// import { AppAuthService } from "./app-auth.service";

// export const authGuard = (): boolean | UrlTree => {
//   const authService = inject(AppAuthService);
//   const router = inject(Router);

//   return authService.isAuth() ? true : router.parseUrl('/');
// };

@Injectable({ providedIn: 'root' })

export class AppAuthGuard implements CanActivate {
  constructor(private authService: AppAuthService, private router: Router) {}

  canActivate(): boolean {
    if (!this.authService.isAuth()) {
      this.router.navigate(['/']);
      return false;
    }
    return true;
  }
}


