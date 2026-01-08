import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../services/auth';

export const authGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);

  if (auth.isLoggedIn()) {
    return true; // ✅ allow access
  }

  // ❌ not logged in → redirect
  router.navigateByUrl('/login');
  return false;
};
