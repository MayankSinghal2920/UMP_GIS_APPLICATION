import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { Api } from './api';

@Injectable({
  providedIn: 'root',
})
export class Auth {
  constructor(private api: Api) {}

  /**
   * STEP 1:
   * Validate username/password and send OTP to registered email.
   * Backend: POST /api/auth/request-otp  { user_id, password }
   */
  requestOtp(username: string, password: string): Observable<any> {
    return this.api.requestOtp(username, password).pipe(
      tap((res: any) => {
        console.log('REQUEST OTP RESPONSE FROM SERVER:', res);
        // Do NOT store user here because login is not complete until OTP verified
      })
    );
  }

  /**
   * STEP 2:
   * Verify OTP (stored in DB) and complete login.
   * Backend: POST /api/auth/verify-otp  { user_id, otp }
   */
verifyOtp(user_id: string, otp: string) {
  return this.api.verifyOtp(user_id, otp).pipe(
    tap((res: any) => {
      if (res?.success) {
        const u = res.user || {};
        localStorage.setItem('user_id', u.user_id || '');
        localStorage.setItem('user_name', u.user_name || '');
        localStorage.setItem('railway', u.railway || '');
        localStorage.setItem('division', u.division || '');
        localStorage.setItem('department', u.department || '');
      }
    })
  );
}


  /**
   * OPTIONAL:
   * Resend OTP (new OTP stored in DB and mailed)
   * Backend: POST /api/auth/resend-otp  { user_id }
   */
  resendOtp(username: string): Observable<any> {
    return this.api.resendOtp(username).pipe(
      tap((res: any) => {
        console.log('RESEND OTP RESPONSE FROM SERVER:', res);
      })
    );
  }

  logout(): void {
    localStorage.clear();
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('user_id');
  }
}
