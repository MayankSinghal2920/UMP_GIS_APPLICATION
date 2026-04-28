import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BASE_URL, getDivision } from '../../shared/api-utils';

@Injectable({ providedIn: 'root' })
export class CommonDashboardApi {
  constructor(private http: HttpClient) {}

  private getDashboardCount(asset: string, type: string, allIndia = false) {
    return this.http.get<any>(`${BASE_URL}/api/civil_engineering_assets/view/dashboard/${asset}/count`, {
      params: allIndia ? { allIndia: 'true', type } : { division: getDivision(), type },
    });
  }

  getStationCount(type: string, allIndia = false) {
    return this.getDashboardCount('station', type, allIndia);
  }
  getBridgeStartCount(type: string, allIndia = false) {
    return this.getDashboardCount('bridgeStart', type, allIndia);
  }
  getBridgeStopCount(type: string, allIndia = false) {
    return this.getDashboardCount('bridgeEnd', type, allIndia);
  }
  getBridgeMinorCount(type: string, allIndia = false) {
    return this.getDashboardCount('bridgeMinor', type, allIndia);
  }
  getLevelXingCount(type: string, allIndia = false) {
    return this.getDashboardCount('levelXing', type, allIndia);
  }
  getRoadOverBridgeCount(type: string, allIndia = false) {
    return this.getDashboardCount('roadOverBridge', type, allIndia);
  }
  getRubLhsCount(type: string, allIndia = false) {
    return this.getDashboardCount('rubLhs', type, allIndia);
  }
  getRorCount(type: string, allIndia = false) {
    return this.getDashboardCount('ror', type, allIndia);
  }
  getKmPostCount(type: string, allIndia = false) {
    return this.getDashboardCount('kmPost', type, allIndia);
  }
  getLandPlanCount(type: string, allIndia = false) {
    return this.getDashboardCount('landPlan', type, allIndia);
  }
}
