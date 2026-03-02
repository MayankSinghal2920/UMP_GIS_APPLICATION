import { HttpParams } from '@angular/common/http';

export const BASE_URL = 'http://127.0.0.1:4000';

export function getDivision(): string {
  return (localStorage.getItem('division') || '').trim();
}

export function withDivision(params: Record<string, any>): HttpParams {
  let httpParams = new HttpParams().set('division', getDivision());
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    httpParams = httpParams.set(k, String(v));
  });
  return httpParams;
}

