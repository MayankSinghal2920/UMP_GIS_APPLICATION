import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';

/**
 * AuthGuard for OTP-based login.
 * Consider user logged-in if required user context exists in localStorage.
 */
export const authGuard: CanActivateFn = (_route, state): boolean | UrlTree => {
  const router = inject(Router);

  const userId = (localStorage.getItem('user_id') || '').trim();
  const division = (localStorage.getItem('division') || '').trim();
  const userType = (localStorage.getItem('user_type') || '').trim();

  const ok = !!userId && !!division && !!userType;

  if (ok) return true;

  // ✅ do NOT pass through panel/layer params; keep returnUrl clean
  const cleanReturnUrl = (state?.url || '').split('?')[0] || '/';

  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: cleanReturnUrl },
  });
};