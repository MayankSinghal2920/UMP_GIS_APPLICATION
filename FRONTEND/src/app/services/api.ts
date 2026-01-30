import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
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

  getlandboundary(bbox: string) {
    return this.http.get<any>(`${this.BASE_URL}/api/land_boundary`, {
      params: {
        bbox,
        division: this.getDivision(),   // ✅ added
      }
    });
  }

  getLandPlanOntrack(z: number) {
    return this.http.get<any>(`${this.BASE_URL}/api/land_plan_on_track`, {
      params: {
        division: this.getDivision(), // ✅ from localStorage
        z: z.toString(),              // zoom level
      }
    });
  }

  getLandOffset(bbox: string) {
    return this.http.get<any>(`${this.BASE_URL}/api/land_offset`, {
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
  const params: any = {
    page,
    pageSize,
    division: this.getDivision(),   // ✅ MANDATORY
  };

  if (search) {
    params.q = search;
  }

  return this.http.get<any>(
    `${this.BASE_URL}/api/edit/stations`,
    { params }
  );
}

/* ===================== UPDATE STATION ===================== */
updateStation(id: number, payload: any) {
  return this.http.put(
    `${this.BASE_URL}/api/edit/stations/${id}`,
    payload,
    { params: { division: this.getDivision() } }
  );
}

deleteStation(id: number) {
  return this.http.delete(
    `${this.BASE_URL}/api/edit/stations/${id}`,
    { params: { division: this.getDivision() } }
  );
}





  /* ===================== AUTH ===================== */

  login(username: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.BASE_URL}/api/login`, {
      user_id: username,   // TL’s required key
      password,
    });
  }



  getStationById(id: number) {
    const params = new HttpParams().set('division', this.getDivision());
    return this.http.get<any>(`${this.BASE_URL}/api/edit/stations/${id}`, { params });
  }

getStationByCode(code: string): Observable<any> {
    const c = String(code || '').trim().toUpperCase();
    return this.http.get<any>(`${this.BASE_URL}/api/station_codes/${encodeURIComponent(c)}`);
  }


  /* ===================== DASHBOARD ===================== */

getStationCount(type: string) {
  return this.http.get<any>(
    `${this.BASE_URL}/api/dashboard/stations/count`,
    {
      params: {
        division: this.getDivision(),  // ✅ from localStorage
        type: type                     // TOTAL / MAKER / CHECKER / etc.
      }
    }
  );
}

getBridgeStartCount(type: string) {
  return this.http.get<any>(
    `${this.BASE_URL}/api/dashboard/bridge-start/count`,
    {
      params: {
        division: this.getDivision(),
        type
      }
    }
  );
}

getBridgeStopCount(type: string) {
  return this.http.get<any>(
    `${this.BASE_URL}/api/dashboard/bridge-end/count`,
    {
      params: {
        division: this.getDivision(),
        type
      }
    }
  );
}

getBridgeMinorCount(type: string) {
  return this.http.get<any>(
    `${this.BASE_URL}/api/dashboard/bridge-minor/count`,
    {
      params: {
        division: this.getDivision(),
        type
      }
    }
  );
}

/* ===================== DASHBOARD – OTHER ASSETS ===================== */

getLevelXingCount(type: string) {
  return this.http.get<any>(
    `${this.BASE_URL}/api/dashboard/level-xing/count`,
    {
      params: {
        division: this.getDivision(),
        type
      }
    }
  );
}

getRoadOverBridgeCount(type: string) {
  return this.http.get<any>(
    `${this.BASE_URL}/api/dashboard/road-over-bridge/count`,
    {
      params: {
        division: this.getDivision(),
        type
      }
    }
  );
}

getRubLhsCount(type: string) {
  return this.http.get<any>(
    `${this.BASE_URL}/api/dashboard/rub-lhs/count`,
    {
      params: {
        division: this.getDivision(),
        type
      }
    }
  );
}

getRorCount(type: string) {
  return this.http.get<any>(
    `${this.BASE_URL}/api/dashboard/ror/count`,
    {
      params: {
        division: this.getDivision(),
        type
      }
    }
  );
}




}

