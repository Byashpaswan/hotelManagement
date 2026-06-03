import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) {
    router.navigate(['/auth/login'], { queryParams: { returnUrl: route.url.toString() } });
    return false;
  }

  const requiredRoles: string[] = route.data?.['roles'] || [];
  if (requiredRoles.length && !auth.hasRole(...requiredRoles)) {
    router.navigate(['/dashboard']);
    return false;
  }

  return true;
};

export const publicGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) {
    router.navigate(['/dashboard']);
    return false;
  }
  return true;
};