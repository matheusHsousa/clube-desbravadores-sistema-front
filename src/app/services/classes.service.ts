import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environments';
import { ApiCacheService } from '../core/api-cache.service';

@Injectable({ providedIn: 'root' })
export class ClassesService {
  private base = environment.apiBase;

  constructor(private http: HttpClient, private cache: ApiCacheService) {}

  listClasses(): Observable<any[]> {
    return this.cache.getOrLoad('classes:list', () => this.http.get<any[]>(`${this.base}/classes`));
  }

  getRequisitos(classeId: number, desbravadorId?: number) {
    const key = `classes:${classeId}:requisitos${desbravadorId ? `:d${desbravadorId}` : ''}`;
    let params = new HttpParams();
    if (desbravadorId) params = params.set('desbravadorId', String(desbravadorId));
    return this.cache.getOrLoad(key, () => this.http.get<any[]>(`${this.base}/classes/${classeId}/requisitos`, { params }));
  }

  marcarRequisito(payload: { requisitoId: number; desbravadores: number[]; instrutorId?: number; data?: string; observacao?: string }) {
    return this.http.post(`${this.base}/requisitos/marca`, payload);
  }

  desmarcarRequisito(payload: { requisitoId: number; desbravadores?: number[] }) {
    return this.http.post(`${this.base}/requisitos/desmarcar`, payload);
  }
}
