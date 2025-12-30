import { Injectable } from '@angular/core';
import { Observable, map, tap, throwError } from 'rxjs';
import { Api } from './api';

type LoginResponse = {
  success: boolean;
  user?: {
    user_id?: string;
    user_name?: string;
    railway?: string;
    division?: string;
    department?: string;
  };
  error?: string;
};

@Injectable({
  providedIn: 'root',
})
export class Auth {
  constructor(private api: Api) {}

  /**
   * Login using backend API:
   * - Sends (user_id, password)
   * - Stores user fields in localStorage (same as old JS)
   * - Throws error if success=false so component can show message
   */
  // login(username: string, password: string): Observable<LoginResponse> {
  //   return this.api.login(username, password).pipe(
  //     map((res: LoginResponse) => {
  //       // backend explicitly tells success/failure
  //       if (!res?.success) {
  //         return throwError(() => new Error(res?.error || 'Login failed'));
  //       }
  //       return res;
  //     }),
  //     // flatten the throwError or value
  //     // (because map above can return Observable<never>)
  //     // simplest: use this pattern instead:
  //   ) as unknown as Observable<LoginResponse>;
  // }

  /**
   * Use this version instead (cleaner) — RECOMMENDED
   */
  login2(username: string, password: string): Observable<LoginResponse> {
    return this.api.login(username, password).pipe(
      tap((res: LoginResponse) => {
        if (!res?.success) {
          throw new Error(res?.error || 'Invalid user_id or password');
        }

        const u = res.user || {};

        localStorage.setItem('user_id', u.user_id || '');
        localStorage.setItem('user_name', u.user_name || '');
        localStorage.setItem('railway', u.railway || '');     // zone_code mapped by backend
        localStorage.setItem('division', u.division || '');   // division_code mapped by backend
        localStorage.setItem('department', u.department || '');
      })
    );
  }

  logout(): void {
    localStorage.removeItem('token'); // if ever used later
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_name');
    localStorage.removeItem('railway');
    localStorage.removeItem('division');
    localStorage.removeItem('department');
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('user_id');
  }

  getUserId(): string | null {
    return localStorage.getItem('user_id');
  }

  getUserName(): string | null {
    return localStorage.getItem('user_name');
  }

  getDivision(): string | null {
    return localStorage.getItem('division');
  }

  getRailway(): string | null {
    return localStorage.getItem('railway');
  }
}

