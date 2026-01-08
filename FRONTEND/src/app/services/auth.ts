import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { Api } from './api';

@Injectable({
  providedIn: 'root',
})
export class Auth {
  constructor(private api: Api) {}

  login2(username: string, password: string): Observable<any> {
    return this.api.login(username, password).pipe(
      tap((res: any) => {
        console.log('LOGIN RESPONSE FROM SERVER:', res);

        // DO NOT THROW HERE
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

  logout(): void {
    localStorage.clear();
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('user_id');
  }
}
