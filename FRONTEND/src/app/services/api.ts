import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class Api {

  private BASE_URL = 'http://localhost:4000';

  constructor(private http: HttpClient) {}

  /* ===================== COMMON ===================== */

  private getDivision() {
    return localStorage.getItem('division') || '';
  }

  /* ===================== MAP DATA ===================== */

  getStations(bbox: string) {
    return this.http.get<any>(`${this.BASE_URL}/api/stations`, {
      params: {
        bbox,
        division: this.getDivision(),
      }
    });
  }

  getTracks(bbox: string) {
    return this.http.get<any>(`${this.BASE_URL}/api/tracks`, {
      params: {
        bbox,
        division: this.getDivision(),
      }
    });
  }

  getkmposts(bbox: string) {
    return this.http.get<any>(`${this.BASE_URL}/api/km_posts`, {
      params: {
        bbox,
        division: this.getDivision(),
      }
    });
  }

  /* ===================== DIVISION BUFFER ===================== */

  getDivisionBuffer(z: number) {
    return this.http.get<any>(`${this.BASE_URL}/api/division_buffer`, {
      params: {
        division: this.getDivision(),
        z: z.toString(),
      }
    });
  }

  /* ===================== INDIA BOUNDARY ===================== */

  getIndiaBoundary(bbox: string, z: number) {
    return this.http.get<any>(`${this.BASE_URL}/api/india_boundary`, {
      params: { bbox, z }
    });
  }

  /* ===================== STATION ADMIN ===================== */

  getStationTable(page: number, pageSize: number, search: string) {
    const params: any = { page, pageSize };

    if (search) {
      params.q = search;
    }

    return this.http.get<any>(
      `${this.BASE_URL}/api/edit/stations`,
      { params }
    );
  }

  updateStation(id: number, payload: any) {
    return this.http.put(
      `${this.BASE_URL}/api/edit/stations/${id}`,
      payload
    );
  }

  deleteStation(id: number) {
    return this.http.delete(
      `${this.BASE_URL}/api/edit/stations/${id}`
    );
  }

  /* ===================== AUTH ===================== */

  login(username: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.BASE_URL}/api/login`, {
      user_id: username,   // TL’s required key
      password,
    });
  }
}
