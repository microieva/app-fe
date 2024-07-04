import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AppAuthService } from './app-auth.service';


export const authGuard: CanActivateFn = () => {
  const authService = inject(AppAuthService);
  const router = inject(Router);

  const isAuth = authService.getAuthStatus();
  console.log('IS AUTH FROM GUARD: ', isAuth)
  if (!isAuth) {
    router.navigate(['/']);
  }
  return isAuth;
};
