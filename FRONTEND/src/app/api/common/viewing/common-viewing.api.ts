import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BASE_URL, getDivision, withDivision } from '../../shared/api-utils';

@Injectable({ providedIn: 'root' })
export class CommonViewingApi {
  constructor(private http: HttpClient) {}

  getStations(bbox: string) {
    return this.http.get<any>(`${BASE_URL}/api/common/view/layers/station`, {
      params: withDivision({ bbox }),
    });
  }

  getTracks(bbox: string) {
    return this.http.get<any>(`${BASE_URL}/api/common/view/layers/railwayTrack`, {
      params: withDivision({ bbox }),
    });
  }

  getKmPosts(bbox: string) {
    return this.http.get<any>(`${BASE_URL}/api/common/view/layers/kmPost`, {
      params: withDivision({ bbox }),
    });
  }

  getIndiaBoundary(bbox: string) {
    return this.http.get<any>(`${BASE_URL}/api/common/view/layers/indiaBoundary`, {
      params: withDivision({ bbox }),
    });
  }

  getDivisionBuffer() {
    return this.http.get<any>(`${BASE_URL}/api/civil_engineering_assets/view/layers/divisionBuffer`, {
      params: withDivision({}),
    });
  }

  getDivisionBufferKey(z: number) {
    return `division=${getDivision()}|z=${z}`;
  }
}
