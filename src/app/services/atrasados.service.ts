import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environments';

@Injectable({ providedIn: 'root' })
export class AtrasadosService {
  private base = `${environment.apiBase}/atrasados`;

  constructor(private http: HttpClient) {}

  marcarAtrasado(userId?: number, desbravadorId?: number, observacao?: string): Observable<any> {
    return this.http.post(`${this.base}/marcar`, {
      userId,
      desbravadorId,
      observacao,
    });
  }

  removerAtrasado(atrasadoId: number): Observable<any> {
    return this.http.delete(`${this.base}/${atrasadoId}`);
  }

  listarAtrasadosHoje(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/hoje`);
  }

  listarHistorico(filtro?: { data?: Date; userId?: number; desbravadorId?: number }): Observable<any[]> {
    let url = `${this.base}/historico`;
    const params = new URLSearchParams();

    if (filtro?.data) {
      params.append('data', filtro.data.toISOString());
    }
    if (filtro?.userId) {
      params.append('userId', String(filtro.userId));
    }
    if (filtro?.desbravadorId) {
      params.append('desbravadorId', String(filtro.desbravadorId));
    }

    if (params.toString()) {
      url += '?' + params.toString();
    }

    return this.http.get<any[]>(url);
  }

  listarUsuarios(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/usuarios`);
  }

  listarDesbravadores(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/desbravadores`);
  }
}
