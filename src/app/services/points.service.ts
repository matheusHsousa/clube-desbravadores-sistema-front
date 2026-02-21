import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class PointsService {
  private base = 'http://localhost:3000/points';

  constructor(private http: HttpClient) {}

  getByDesbravador(desbravadorId: number): Observable<any> {
    if (!desbravadorId) return of(null);
    return this.http.get<any>(`${this.base}/${desbravadorId}`).pipe(catchError(() => of(null)));
  }

  adjust(payload: { desbravadorId: number; amount: number; reason?: string; authorId?: number }) {
    return this.http.post(`${this.base}/adjust`, payload);
  }
}
