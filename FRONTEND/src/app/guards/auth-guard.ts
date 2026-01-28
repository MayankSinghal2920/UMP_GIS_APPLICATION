import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../services/auth';

export const authGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);

  const isLoggedIn = auth.isLoggedIn();
  const division = localStorage.getItem('division');

  // ✅ Allow dashboard ONLY when full user context exists
  if (isLoggedIn && division) {
    return true;
  }

  // ❌ Missing context → force re-login
  router.navigateByUrl('/login');
  return false;
};
