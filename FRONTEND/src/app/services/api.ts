import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class Api {

   private BASE_URL = 'http://localhost:4000';

   constructor(private http: HttpClient) {}

   getStations(bbox: string, code?: string, division?: string) {
  let params: any = { bbox };

  if (code) params.code = code;
  if (division) params.division = division;

  return this.http.get<any>(`${this.BASE_URL}/api/stations`, { params });
}


  getTracks(bbox: string) {
  return this.http.get<any>(`${this.BASE_URL}/api/tracks`, {
    params: { bbox }
  });
}

updateStation(id: number, payload: any) {
  return this.http.put(
    `${this.BASE_URL}/api/edit/stations/${id}`,
    payload
  );
}

getStationTable(page: number, pageSize: number, search: string) {
  const params: any = {
    page,
    pageSize
  };

  if (search) {
    params.q = search;
  }

  return this.http.get<any>(
    `${this.BASE_URL}/api/edit/stations`,
    { params }
  );
}

deleteStation(id: number) {
  return this.http.delete(
    `${this.BASE_URL}/api/edit/stations/${id}`
  );
}




  
}
