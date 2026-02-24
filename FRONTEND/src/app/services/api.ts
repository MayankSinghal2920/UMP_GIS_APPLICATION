import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class Api {
  private readonly BASE_URL = 'http://127.0.0.1:4000';

  constructor(private http: HttpClient) {}

  /* ===================== COMMON ===================== */

  private getDivision(): string {
    return (localStorage.getItem('division') || '').trim();
  }

  /* ===================== MAP DATA ===================== */

  getStations(bbox: string) {
    return this.http.get<any>(`${this.BASE_URL}/api/common/station`, {
      params: {
        bbox,
        division: this.getDivision(),
      },
    });
  }

  getTracks(bbox: string) {
    return this.http.get<any>(`${this.BASE_URL}/api/common/railwayTrack`, {
      params: {
        bbox,
        division: this.getDivision(),
      },
    });
  }

  getkmposts(bbox: string) {
    return this.http.get<any>(`${this.BASE_URL}/api/common/kmPost`, {
      params: {
        bbox,
        division: this.getDivision(),
      },
    });
  }

  getlandboundary(bbox: string) {
    return this.http.get<any>(`${this.BASE_URL}/api/land_boundary`, {
      params: {
        bbox,
        division: this.getDivision(),
      },
    });
  }

  getLandPlanOntrack(z: number) {
    return this.http.get<any>(`${this.BASE_URL}/api/land_plan_on_track`, {
      params: {
        division: this.getDivision(),
        z: z.toString(),
      },
    });
  }

  getLandOffset(bbox: string) {
    return this.http.get<any>(`${this.BASE_URL}/api/land_offset`, {
      params: {
        bbox,
        division: this.getDivision(),
      },
    });
  }

  /* ===================== DIVISION BUFFER ===================== */

  getDivisionBuffer(z: number) {
    return this.http.get<any>(`${this.BASE_URL}/api/division_buffer`, {
      params: {
        division: this.getDivision(),
        z: z.toString(),
      },
    });
  }

  /** ✅ cache/reload key (division stays inside Api only) */
  getDivisionBufferKey(z: number) {
    return `division=${this.getDivision()}|z=${z}`;
  }

  /* ===================== INDIA BOUNDARY ===================== */

  getIndiaBoundary(bbox: string, z: number) {
    return this.http.get<any>(`${this.BASE_URL}/api/india_boundary`, {
      params: { bbox, z },
    });
  }

  /* ===================== STATION ADMIN ===================== */

  getStationTable(page: number, pageSize: number, q: string, division: string) {
    const params: any = { page, pageSize, q, division };
    return this.http.get<any>(`${this.BASE_URL}/api/stations/table`, { params });
  }

  getStationById(id: number) {
    const params = new HttpParams().set('division', this.getDivision());
    return this.http.get<any>(`${this.BASE_URL}/api/stations/${id}`, { params });
  }

  getStationByCode(code: string): Observable<any> {
    const c = String(code || '').trim().toUpperCase();
    return this.http.get<any>(
      `${this.BASE_URL}/api/station_codes/${encodeURIComponent(c)}`
    );
  }

  /* ===================== UPDATE / DELETE / CREATE STATION ===================== */

  updateStation(id: number, payload: any) {
    return this.http.put(`${this.BASE_URL}/api/stations/${id}`, payload, {
      params: { division: this.getDivision() },
    });
  }

  deleteStation(id: number) {
    return this.http.delete(`${this.BASE_URL}/api/stations/${id}`, {
      params: { division: this.getDivision() },
    });
  }

  createStation(payload: any) {
    return this.http.post(`${this.BASE_URL}/api/stations`, payload, {
      params: { division: this.getDivision() },
    });
  }

  /* ===================== AUTH (OTP FLOW) ===================== */

  requestOtp(username: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.BASE_URL}/api/auth/request-otp`, {
      user_id: username,
      password,
    });
  }

  verifyOtp(username: string, otp: string): Observable<any> {
    return this.http.post<any>(`${this.BASE_URL}/api/auth/verify-otp`, {
      user_id: username,
      otp,
    });
  }

  resendOtp(username: string): Observable<any> {
    return this.http.post<any>(`${this.BASE_URL}/api/auth/resend-otp`, {
      user_id: username,
    });
  }

  /* ===================== AUTH (Captcha FLOW) ===================== */

  getNewCaptcha(): Observable<any> {
    return this.http.get<any>(`${this.BASE_URL}/api/auth/captcha/new`);
  }

  validateCaptcha(captchaId: string, captchaValue: string): Observable<any> {
    const params = new HttpParams()
      .set('captchaId', captchaId)
      .set('captchaValue', captchaValue);

    return this.http.get<any>(`${this.BASE_URL}/api/auth/captcha/validate`, { params });
  }

  /* OPTIONAL: legacy login */
  login(username: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.BASE_URL}/api/auth/login`, {
      user_id: username,
      password,
    });
  }

  /* ===================== DASHBOARD ===================== */

  getStationCount(type: string) {
    return this.http.get<any>(`${this.BASE_URL}/api/dashboard/stations/count`, {
      params: {
        division: this.getDivision(),
        type,
      },
    });
  }

  getBridgeStartCount(type: string) {
    return this.http.get<any>(`${this.BASE_URL}/api/dashboard/bridge-start/count`, {
      params: { division: this.getDivision(), type },
    });
  }

  getBridgeStopCount(type: string) {
    return this.http.get<any>(`${this.BASE_URL}/api/dashboard/bridge-end/count`, {
      params: { division: this.getDivision(), type },
    });
  }

  getBridgeMinorCount(type: string) {
    return this.http.get<any>(`${this.BASE_URL}/api/dashboard/bridge-minor/count`, {
      params: { division: this.getDivision(), type },
    });
  }

  getLevelXingCount(type: string) {
    return this.http.get<any>(`${this.BASE_URL}/api/dashboard/level-xing/count`, {
      params: { division: this.getDivision(), type },
    });
  }

  getRoadOverBridgeCount(type: string) {
    return this.http.get<any>(`${this.BASE_URL}/api/dashboard/road-over-bridge/count`, {
      params: { division: this.getDivision(), type },
    });
  }

  getRubLhsCount(type: string) {
    return this.http.get<any>(`${this.BASE_URL}/api/dashboard/rub-lhs/count`, {
      params: { division: this.getDivision(), type },
    });
  }

  getRorCount(type: string) {
    return this.http.get<any>(`${this.BASE_URL}/api/dashboard/ror/count`, {
      params: { division: this.getDivision(), type },
    });
  }

  getKmPostCount(type: string) {
    return this.http.get<any>(`${this.BASE_URL}/api/dashboard/km-post/count`, {
      params: { division: this.getDivision(), type },
    });
  }

  getLandPlanCount(type: string) {
    return this.http.get<any>(`${this.BASE_URL}/api/dashboard/land-plan/count`, {
      params: { division: this.getDivision(), type },
    });
  }
}