import { Injectable } from '@angular/core';
import { AuthApi } from './auth/auth.api';
import { CommonDashboardApi } from './common/dashboard/dashboard.api';
import { CommonViewingApi } from './common/viewing/common-viewing.api';
import { CivilEngineeringAssetsViewingApi } from './civil_engineering_assets/viewing/viewing.api';
import { CivilEngineeringAssetsEditingApi } from './civil_engineering_assets/editing/editing.api';
import { RatingApi } from './rating/rating.api';

@Injectable({ providedIn: 'root' })
export class Api {
  constructor(
    private authApi: AuthApi,
    private commonViewingApi: CommonViewingApi,
    private commonDashboardApi: CommonDashboardApi,
    private ceaViewingApi: CivilEngineeringAssetsViewingApi,
    private ceaEditingApi: CivilEngineeringAssetsEditingApi,
    private ratingApi: RatingApi
  ) {}

  // common layers
  getStations(bbox: string) {
    return this.commonViewingApi.getStations(bbox);
  }
  getTracks(bbox: string) {
    return this.commonViewingApi.getTracks(bbox);
  }
  getkmposts(bbox: string) {
    return this.commonViewingApi.getKmPosts(bbox);
  }
  getIndiaBoundary(bbox: string) {
    return this.commonViewingApi.getIndiaBoundary(bbox);
  }

  // civil engineering assets - viewing
  getDivisionBuffer() {
    return this.commonViewingApi.getDivisionBuffer();
  }
  getDivisionBufferKey(z: number) {
    return this.commonViewingApi.getDivisionBufferKey(z);
  }
  getlandboundary(bbox: string) {
    return this.ceaViewingApi.getLandBoundary(bbox);
  }
  getLandOffset(bbox: string) {
    return this.ceaViewingApi.getLandOffset(bbox);
  }
  getLandPlanOntrack(z: number) {
    return this.ceaViewingApi.getLandPlanOnTrack(z);
  }

  // civil engineering assets - editing
  getStationTable(page: number, pageSize: number, search: string) {
    return this.ceaEditingApi.getStationTable(page, pageSize, search);
  }
  updateStation(id: number, payload: any) {
    return this.ceaEditingApi.updateStation(id, payload);
  }
  deleteStation(id: number) {
    return this.ceaEditingApi.deleteStation(id);
  }
  createStation(payload: any) {
    return this.ceaEditingApi.createStation(payload);
  }
  getStationById(id: number) {
    return this.ceaEditingApi.getStationById(id);
  }
  getStationByCode(code: string) {
    return this.ceaEditingApi.getStationByCode(code);
  }

  // auth
  requestOtp(username: string, password: string) {
    return this.authApi.requestOtp(username, password);
  }
  verifyOtp(username: string, otp: string) {
    return this.authApi.verifyOtp(username, otp);
  }
  resendOtp(username: string) {
    return this.authApi.resendOtp(username);
  }
  getNewCaptcha() {
    return this.authApi.getNewCaptcha();
  }
  validateCaptcha(captchaId: string, captchaValue: string) {
    return this.authApi.validateCaptcha(captchaId, captchaValue);
  }
  login(username: string, password: string) {
    return this.authApi.login(username, password);
  }

  // common dashboard
  getStationCount(type: string) {
    return this.commonDashboardApi.getStationCount(type);
  }
  getBridgeStartCount(type: string) {
    return this.commonDashboardApi.getBridgeStartCount(type);
  }
  getBridgeStopCount(type: string) {
    return this.commonDashboardApi.getBridgeStopCount(type);
  }
  getBridgeMinorCount(type: string) {
    return this.commonDashboardApi.getBridgeMinorCount(type);
  }
  getLevelXingCount(type: string) {
    return this.commonDashboardApi.getLevelXingCount(type);
  }
  getRoadOverBridgeCount(type: string) {
    return this.commonDashboardApi.getRoadOverBridgeCount(type);
  }
  getRubLhsCount(type: string) {
    return this.commonDashboardApi.getRubLhsCount(type);
  }
  getRorCount(type: string) {
    return this.commonDashboardApi.getRorCount(type);
  }
  getKmPostCount(type: string) {
    return this.commonDashboardApi.getKmPostCount(type);
  }
  getLandPlanCount(type: string) {
    return this.commonDashboardApi.getLandPlanCount(type);
  }

  // rating
  rating(obj: any) {
    return this.ratingApi.rating(obj);
  }
  getRating(obj: any) {
    return this.ratingApi.getRating(obj);
  }
}
