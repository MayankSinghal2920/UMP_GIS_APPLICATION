import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

type ViewScope = 'common' | 'civil_engineering_assets';

@Injectable({
  providedIn: 'root',
})
export class Api {
  private readonly BASE_URL = 'http://127.0.0.1:4000';

  constructor(private http: HttpClient) {}

  /* ===================== COMMON HELPERS ===================== */

  private getDivision(): string {
    return (localStorage.getItem('division') || '').trim();
  }


  getViewLayer(scope: ViewScope, layer: string, params: Record<string, any>): Observable<any> {
    const division = this.getDivision();

    // Always send division (your backend expects it everywhere)
    let httpParams = new HttpParams().set('division', division);

    // Add rest params
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '') return;
      httpParams = httpParams.set(k, String(v));
    });

    return this.http.get<any>(
      `${this.BASE_URL}/api/${scope}/view/layers/${encodeURIComponent(layer)}`,
      { params: httpParams }
    );
  }

  /* ===================== VIEW LAYERS (WRAPPERS - OPTIONAL) ===================== */
  // You can keep these so existing layer files (station.ts, track.ts, etc.) won't break.

  // ---- COMMON ----
  getStations(bbox: string) {
    return this.getViewLayer('common', 'station', { bbox });
  }

  getTracks(bbox: string) {
    return this.getViewLayer('common', 'railwayTrack', { bbox });
  }

  getkmposts(bbox: string) {
    return this.getViewLayer('common', 'kmPost', { bbox });
  }

  getIndiaBoundary(bbox: string) {
    return this.getViewLayer('common', 'indiaBoundary', { bbox });
  }

  // ---- civil_engineering_assets ----
  getDivisionBuffer() {
    return this.getViewLayer('civil_engineering_assets', 'divisionBuffer', {});
  }

  getDivisionBufferKey(z: number) {
    return `division=${this.getDivision()}|z=${z}`;
  }

  getlandboundary(bbox: string) {
    return this.getViewLayer('civil_engineering_assets', 'landBoundary', { bbox });
  }

  getLandOffset(bbox: string) {
    return this.getViewLayer('civil_engineering_assets', 'landOffset', { bbox });
  }

  getLandPlanOntrack(z: number) {
    return this.getViewLayer('civil_engineering_assets', 'landPlanOnTrack', { z });
  }

  /* ===================== STATION EDIT (unchanged) ===================== */

  getStationTable(page: number, pageSize: number, search: string) {
    const params: any = {
      page,
      pageSize,
      division: this.getDivision(),
    };
    if (search) params.q = search;

    return this.http.get<any>(`${this.BASE_URL}/api/civil_engineering_assets/edit/station/table`, { params });
  }

  updateStation(id: number, payload: any) {
    return this.http.put(`${this.BASE_URL}/api/civil_engineering_assets/edit/station/${id}`, payload, {
      params: { division: this.getDivision() },
    });
  }

  deleteStation(id: number) {
    return this.http.delete(`${this.BASE_URL}/api/civil_engineering_assets/edit/station/${id}`, {
      params: { division: this.getDivision() },
    });
  }

  createStation(payload: any) {
    return this.http.post(`${this.BASE_URL}/api/civil_engineering_assets/edit/station`, payload, {
      params: { division: this.getDivision() },
    });
  }

  getStationById(id: number) {
    const params = new HttpParams().set('division', this.getDivision());
    return this.http.get<any>(`${this.BASE_URL}/api/civil_engineering_assets/edit/station/${id}`, { params });
  }

  getStationByCode(code: string): Observable<any> {
    const c = String(code || '').trim().toUpperCase();
    return this.http.get<any>(`${this.BASE_URL}/api/station_codes/${encodeURIComponent(c)}`);
  }

  validateStationCode(code: string): Observable<any> {
    const station_code = String(code || '').trim().toUpperCase();
    return this.http.post<any>(`${this.BASE_URL}/api/civil_engineering_assets/edit/station/validate`, {
      station_code,
    });
  }

  /* ===================== AUTH (unchanged) ===================== */

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

  getNewCaptcha(): Observable<any> {
    return this.http.get<any>(`${this.BASE_URL}/api/auth/captcha/new`);
  }

  validateCaptcha(captchaId: string, captchaValue: string): Observable<any> {
    const params = new HttpParams()
      .set('captchaId', captchaId)
      .set('captchaValue', captchaValue);

    return this.http.get<any>(`${this.BASE_URL}/api/auth/captcha/validate`, { params });
  }

  login(username: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.BASE_URL}/api/auth/login`, {
      user_id: username,
      password,
    });
  }

  /* ===================== civil_engineering_assets DASHBOARD (unchanged) ===================== */

  private getDashboardCount(asset: string, type: string) {
    return this.http.get<any>(`${this.BASE_URL}/api/civil_engineering_assets/view/dashboard/${asset}/count`, {
      params: { division: this.getDivision(), type },
    });
  }

  getStationCount(type: string) {
    return this.getDashboardCount('station', type);
  }
  getBridgeStartCount(type: string) {
    return this.getDashboardCount('bridgeStart', type);
  }
  getBridgeStopCount(type: string) {
    return this.getDashboardCount('bridgeEnd', type);
  }
  getBridgeMinorCount(type: string) {
    return this.getDashboardCount('bridgeMinor', type);
  }
  getLevelXingCount(type: string) {
    return this.getDashboardCount('levelXing', type);
  }
  getRoadOverBridgeCount(type: string) {
    return this.getDashboardCount('roadOverBridge', type);
  }
  getRubLhsCount(type: string) {
    return this.getDashboardCount('rubLhs', type);
  }
  getRorCount(type: string) {
    return this.getDashboardCount('ror', type);
  }
  getKmPostCount(type: string) {
    return this.getDashboardCount('kmPost', type);
  }
  getLandPlanCount(type: string) {
    return this.getDashboardCount('landPlan', type);
  }

  /* ===================== FEEDBACK ===================== */

  addFeedBack(obj: any): Observable<any> {
    return this.http.post<any>(`${this.BASE_URL}/api/feedback/create`, obj);
  }



/* ===================== USER MANAGEMENT ===================== */

getUsers(): Observable<any> {

  const params = new HttpParams()
    .set('division', this.getDivision());

  return this.http.get<any>(
    `${this.BASE_URL}/api/user-management/view/users`,
    { params }
  );

}

























}
