import { inject } from '@angular/core';
import { Router, UrlTree } from '@angular/router';
import { AppAuthService } from './app-auth.service';

export const authGuard = (): boolean | UrlTree => {
  const authService = inject(AppAuthService);
  const router = inject(Router);

  return authService.isLoggedIn() ? true : router.parseUrl('/');
};

