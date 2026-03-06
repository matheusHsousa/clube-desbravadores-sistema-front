import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from 'src/environments/environments';

@Injectable({ providedIn: 'root' })
export class PointsService {
  private base = `${environment.apiBase}/points`;

  constructor(private http: HttpClient) {}

  getByDesbravador(desbravadorId: number): Observable<any> {
    if (!desbravadorId) return of(null);
    return this.http.get<any>(`${this.base}/${desbravadorId}`).pipe(catchError(() => of(null)));
  }

  adjust(payload: {
    desbravadorId: number;
    amount?: number;
    presence?: number;
    pontualidade?: number;
    uniforme?: number;
    material?: number;
    classe?: number;
    espEquipe?: number;
    disciplina?: number;
    textoBiblico?: number;
    reason?: string;
    authorId?: number;
    sundayDate?: string;
  }) {
    return this.http.post(`${this.base}/adjust`, payload);
  }

  listTransactions(params: { desbravadorId?: number; sundayDate?: string; unidade?: number }) {
    const parts: string[] = [];
    if (params.desbravadorId) parts.push(`desbravadorId=${params.desbravadorId}`);
    if (params.sundayDate) parts.push(`sundayDate=${encodeURIComponent(params.sundayDate)}`);
    if (params.unidade) parts.push(`unidade=${params.unidade}`);
    const qs = parts.length ? `?${parts.join('&')}` : '';
    return this.http.get<any[]>(`${this.base}/transactions${qs}`);
  }

  editTransaction(id: number, payload: any) {
    return this.http.patch(`${this.base}/transaction/${id}`, payload);
  }

  getByDesbravadorBatch(ids: number[]) {
    if (!ids || !ids.length) return of({});
    const qs = `?ids=${ids.join(',')}`;
    return this.http.get<any>(`${this.base}/batch${qs}`).pipe(catchError(() => of({})));
  }

  adjustBatch(payloads: any[]) {
    return this.http.post(`${this.base}/adjust/batch`, payloads);
  }
}
