import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BASE_URL } from '../shared/api-utils';

@Injectable({ providedIn: 'root' })
export class RatingApi {
  constructor(private http: HttpClient) {}

  rating(obj: any): Observable<any> {
    return this.http.post<any>(`${BASE_URL}/api/rating`, obj);
  }

  getRating(obj: any): Observable<any> {
    return this.http.post<any>(`${BASE_URL}/api/rating/last`, obj);
  }
}

