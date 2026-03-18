import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BASE_URL } from '../shared/api-utils';

@Injectable({ providedIn: 'root' })
export class FeedbackApi {
  constructor(private http: HttpClient) {}

  addFeedBack(obj: any): Observable<any> {
    return this.http.post<any>(`${BASE_URL}/api/feedback/create`, obj);
  }
}
