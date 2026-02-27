import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';

export const adminGuard: CanActivateFn = (_route, _state): boolean | UrlTree => {
  const router = inject(Router);

  const userType = (localStorage.getItem('user_type') || '').trim();

  // Adjust this if your backend returns different case
  if (userType === 'Admin') {
    return true;
  }

  // If not admin → redirect to dashboard home
  return router.createUrlTree(['/dashboard']);
};
