import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { forkJoin, Observable, of } from 'rxjs';
import { map, switchMap, take } from 'rxjs/operators';
import { AuthService } from 'src/app/auth/auth.service';
import { environment } from 'src/environments/environments';

@Injectable({ providedIn: 'root' })
export class DesbravadoresService {
  private base = `${environment.apiBase}/desbravadores`;

  constructor(private http: HttpClient, private auth: AuthService) { }

  getForCurrentUser(): Observable<any[]> {
    return this.auth.currentUser$.pipe(
      take(1),
      switchMap(user => {
        if (!user) return of([]);

        const requests: Observable<any[]>[] = [];

        if (user.roles.includes('CONSELHEIRO') && user.unidade) {
          requests.push(
            this.http.get<any[]>(this.base, {
              params: new HttpParams().set('unidade', user.unidade)
            })
          );
        }

        if (user.roles.includes('INSTRUTOR') && user.classe) {
          requests.push(
            this.http.get<any[]>(this.base, {
              params: new HttpParams().set('classe', user.classe)
            })
          );
        }

        if (!requests.length) return of([]);

        return forkJoin(requests).pipe(
          map(results => {
            // junta e remove duplicados
            const mapById = new Map<number, any>();
            results.flat().forEach(d => mapById.set(d.id, d));
            return Array.from(mapById.values());
          })
        );
      })
    );
  }

  list(filter?: { unidade?: string; classe?: string }): Observable<any[]> {
    let params = new HttpParams();
    if (filter?.unidade) params = params.set('unidade', filter.unidade);
    if (filter?.classe) params = params.set('classe', filter.classe);
    return this.http.get<any[]>(this.base, { params });
  }

  create(payload: { name: string; birthDate?: string; unidade: string; classe: string }) {
    return this.http.post(this.base, payload);
  }

  import(payloads: any[]) {
    return this.http.post(`${this.base}/import`, payloads);
  }

  update(id: number, payload: Partial<{ name: string; birthDate?: string; unidade?: string; classe?: string }>) {
    return this.http.put(`${this.base}/${id}`, payload);
  }

  remove(id: number) {
    return this.http.delete(`${this.base}/${id}`);
  }
}
