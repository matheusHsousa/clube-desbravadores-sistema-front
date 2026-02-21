import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environments';

@Injectable({ providedIn: 'root' })
export class MeritoService {
  constructor(private http: HttpClient) {}

  top(n: number) {
    return this.http.get<any[]>(`${environment.apiBase}/merito/top/${n}`);
  }

  all() {
    return this.http.get<any[]>(`${environment.apiBase}/merito`);
  }
}
