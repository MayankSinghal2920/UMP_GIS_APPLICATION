import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BASE_URL } from '../shared/api-utils';

@Injectable({ providedIn: 'root' })
export class AuthApi {
  constructor(private http: HttpClient) {}

  requestOtp(username: string, password: string): Observable<any> {
    return this.http.post<any>(`${BASE_URL}/api/auth/request-otp`, {
      user_id: username,
      password,
    });
  }

  verifyOtp(username: string, otp: string): Observable<any> {
    return this.http.post<any>(`${BASE_URL}/api/auth/verify-otp`, {
      user_id: username,
      otp,
    });
  }

  resendOtp(username: string): Observable<any> {
    return this.http.post<any>(`${BASE_URL}/api/auth/resend-otp`, {
      user_id: username,
    });
  }

  getNewCaptcha(): Observable<any> {
    return this.http.get<any>(`${BASE_URL}/api/auth/captcha/new`);
  }

  validateCaptcha(captchaId: string, captchaValue: string): Observable<any> {
    const params = new HttpParams()
      .set('captchaId', captchaId)
      .set('captchaValue', captchaValue);

    return this.http.get<any>(`${BASE_URL}/api/auth/captcha/validate`, { params });
  }

  login(username: string, password: string): Observable<any> {
    return this.http.post<any>(`${BASE_URL}/api/auth/login`, {
      user_id: username,
      password,
    });
  }
}

