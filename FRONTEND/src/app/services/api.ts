import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class Api {

   private BASE_URL = 'http://localhost:4000';

   constructor(private http: HttpClient) {}

   private getDivision() {
    return localStorage.getItem('division') || '';
  }


  getStations(bbox: string) {
    return this.http.get<any>(`${this.BASE_URL}/api/stations`, {
      params: {
        bbox,
        division: this.getDivision(),   // ✅ added
      }
    });
  }


  getTracks(bbox: string) {
    return this.http.get<any>(`${this.BASE_URL}/api/tracks`, {
      params: {
        bbox,
        division: this.getDivision(),   // ✅ added
      }
    });
  }

  getkmposts(bbox: string) {
    return this.http.get<any>(`${this.BASE_URL}/api/km_posts`, {
      params: {
        bbox,
        division: this.getDivision(),   // ✅ added
      }
    });
  }

  /* ===================== DIVISION BUFFER ===================== */

getDivisionBuffer(z: number) {
  return this.http.get<any>(`${this.BASE_URL}/api/division_buffer`, {
    params: {
      division: this.getDivision(), // ✅ from localStorage
      z: z.toString(),              // zoom level
    }
  });
}

/* ===================== INDIA BOUNDARY ===================== */

getIndiaBoundary(bbox: string, z: number) {
  return this.http.get<any>(`${this.BASE_URL}/api/india_boundary`, {
    params: { bbox, z }
  });
}


updateStation(id: number, payload: any) {
  return this.http.put(
    `${this.BASE_URL}/api/edit/stations/${id}`,
    payload
  );
}

  /* ===================== AUTH APIs ===================== */

  login(username: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.BASE_URL}/api/login`, {
      user_id: username,   // ✅ KEY FIX
      password,
    });
  }
  

  
}
