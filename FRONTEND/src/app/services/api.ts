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
    return this.http.get<any>(`${this.BASE_URL}/api/cea/view/landBoundary`, {
      params: {
        bbox,
        division: this.getDivision(),
      },
    });
  }

  getLandPlanOntrack(z: number) {
    return this.http.get<any>(`${this.BASE_URL}/api/cea/view/landPlanOnTrack`, {
      params: {
        division: this.getDivision(),
        z: z.toString(),
      },
    });
  }

  getLandOffset(bbox: string) {
    return this.http.get<any>(`${this.BASE_URL}/api/cea/view/landOffset`, {
      params: {
        bbox,
        division: this.getDivision(),
      },
    });
  }

  /* ===================== DIVISION BUFFER ===================== */




getDivisionBuffer() {
  return this.http.get<any>(`${this.BASE_URL}/api/cea/view/divisionBuffer`, {
    params: {
      division: this.getDivision()
    }
  });
}




  /** ✅ cache/reload key (division stays inside Api only) */
  getDivisionBufferKey(z: number) {
    return `division=${this.getDivision()}|z=${z}`;
  }

  /* ===================== INDIA BOUNDARY ===================== */

  // getIndiaBoundary(bbox: string, z: number) {
  //   return this.http.get<any>(`${this.BASE_URL}/api/india_boundary`, {
  //     params: { bbox, z },
  //   });
  // }
  getIndiaBoundary(bbox: string) {
  return this.http.get<any>(`${this.BASE_URL}/api/common/indiaBoundary`, {
    params: { bbox }
  });
}


  /* ===================== STATION ADMIN ===================== */

  // getStationTable(page: number, pageSize: number, q: string, division: string) {
  //   const params: any = { page, pageSize, q, division };
  //   return this.http.get<any>(`${this.BASE_URL}/api/stations/table`, { params });
  // }


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
    `${this.BASE_URL}/api/cea/edit/station/table`
,
    { params }
  );

}



/* ===================== UPDATE STATION ===================== */
updateStation(id: number, payload: any) {
  return this.http.put(
    `${this.BASE_URL}/api/cea/edit/station/${id}`
,
    payload,
    { params: { division: this.getDivision() } }
  );
}

deleteStation(id: number) {
  return this.http.delete(
    `${this.BASE_URL}/api/cea/edit/station/${id}`
,
    { params: { division: this.getDivision() } }
  );
}

/* ===================== CREATE STATION ===================== */
createStation(payload: any) {
  return this.http.post(
    `${this.BASE_URL}/api/cea/edit/station`
,
    payload,
    { params: { division: this.getDivision() } }
  );
}






/* ===================== GET STATUS COUNT ===================== */
  getStationById(id: number) {
    const params = new HttpParams().set('division', this.getDivision());
    return this.http.get<any>(`${this.BASE_URL}/api/cea/edit/station/${id}`
, { params });
  }

  getStationByCode(code: string): Observable<any> {
    const c = String(code || '').trim().toUpperCase();
    return this.http.get<any>(
      `${this.BASE_URL}/api/station_codes/${encodeURIComponent(c)}`
    );
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






/* ===================== CEA DASHBOARD (Dynamic) ===================== */

private getDashboardCount(asset: string, type: string) {
  return this.http.get<any>(
    `${this.BASE_URL}/api/cea/view/dashboard/${asset}/count`,
    {

      params: {
        division: this.getDivision(),
        type,
      },
    });
  }


/* ---- Station ---- */
getStationCount(type: string) {
  return this.getDashboardCount('station', type);
}

/* ---- Bridges ---- */
getBridgeStartCount(type: string) {
  return this.getDashboardCount('bridgeStart', type);
}

getBridgeStopCount(type: string) {
  return this.getDashboardCount('bridgeEnd', type);
}

getBridgeMinorCount(type: string) {
  return this.getDashboardCount('bridgeMinor', type);
}

/* ---- Other Assets ---- */
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



}

