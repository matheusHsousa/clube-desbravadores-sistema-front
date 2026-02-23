import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environments';

@Injectable({ providedIn: 'root' })
export class ClassesService {
  private base = environment.apiBase;

  constructor(private http: HttpClient) {}

  listClasses(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/classes`);
  }

  getRequisitos(classeId: number, desbravadorId?: number) {
    let params = new HttpParams();
    if (desbravadorId) params = params.set('desbravadorId', String(desbravadorId));
    return this.http.get<any[]>(`${this.base}/classes/${classeId}/requisitos`, { params });
  }

  marcarRequisito(payload: { requisitoId: number; desbravadores: number[]; instrutorId?: number; data?: string; observacao?: string }) {
    return this.http.post(`${this.base}/requisitos/marca`, payload);
  }

  desmarcarRequisito(payload: { requisitoId: number; desbravadores?: number[] }) {
    return this.http.post(`${this.base}/requisitos/desmarcar`, payload);
  }
}
