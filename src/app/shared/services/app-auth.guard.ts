import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AppAuthService } from './app-auth.service';

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


