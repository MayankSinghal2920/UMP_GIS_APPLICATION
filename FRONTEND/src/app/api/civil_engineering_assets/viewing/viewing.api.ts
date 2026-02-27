import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BASE_URL, withDivision } from '../../shared/api-utils';

@Injectable({ providedIn: 'root' })
export class CivilEngineeringAssetsViewingApi {
  constructor(private http: HttpClient) {}

  getLandBoundary(bbox: string) {
    return this.http.get<any>(`${BASE_URL}/api/civil_engineering_assets/view/layers/landBoundary`, {
      params: withDivision({ bbox }),
    });
  }

  getLandOffset(bbox: string) {
    return this.http.get<any>(`${BASE_URL}/api/civil_engineering_assets/view/layers/landOffset`, {
      params: withDivision({ bbox }),
    });
  }

  getLandPlanOnTrack(z: number) {
    return this.http.get<any>(`${BASE_URL}/api/civil_engineering_assets/view/layers/landPlanOnTrack`, {
      params: withDivision({ z }),
    });
  }
}
