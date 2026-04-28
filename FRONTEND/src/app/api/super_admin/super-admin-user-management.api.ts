import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BASE_URL } from '../shared/api-utils';

@Injectable({ providedIn: 'root' })
export class SuperAdminUserManagementApi {
  constructor(private http: HttpClient) {}

  getAllUsers() {
    return this.http.get<any>(`${BASE_URL}/api/super-admin/users`);
  }

  getUser(objectid: number | string) {
    return this.http.get<any>(
      `${BASE_URL}/api/super-admin/users/${encodeURIComponent(String(objectid))}`,
    );
  }

  createUser(data: any) {
    return this.http.post<any>(`${BASE_URL}/api/super-admin/users`, data);
  }

  updateUser(objectid: number | string, data: any) {
    return this.http.put<any>(
      `${BASE_URL}/api/super-admin/users/${encodeURIComponent(String(objectid))}`,
      data,
    );
  }

  deleteUser(objectid: number | string) {
    return this.http.delete<any>(
      `${BASE_URL}/api/super-admin/users/${encodeURIComponent(String(objectid))}`,
    );
  }
}
