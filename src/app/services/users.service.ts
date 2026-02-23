import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from 'src/environments/environments';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private base = `${environment.apiBase}/users`;
  private desbBase = `${environment.apiBase}/desbravadores`;

  constructor(private http: HttpClient) {}

  getAllUsers(): Observable<any[]> {
    // O interceptor global já anexa o token no header Authorization.
    return this.http.get<any[]>(this.base).pipe(catchError(() => of([])));
  }

  getDesbravadores(): Observable<any[]> {
    return this.http.get<any[]>(this.desbBase).pipe(catchError(() => of([])));
  }

  getInstrutores(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/instrutores`).pipe(catchError(() => of([])));
  }

  getConselheiros(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/conselheiros`).pipe(catchError(() => of([])));
  }

  updateUser(id: number, payload: Partial<{ name: string; roles: string[]; unidade: string | null; classe: string | null }>) {
    return this.http.put(`${this.base}/${id}`, payload);
  }

  updateProfile(id: number, payload: Partial<Record<string, any>>) {
    return this.http.put(`${this.base}/me`, payload);
  }
}
