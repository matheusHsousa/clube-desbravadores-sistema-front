import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environments';

@Injectable({ providedIn: 'root' })
export class DesafioUnidadesService {
  private base = `${environment.apiBase}/desafios-unidades`;

  constructor(private http: HttpClient) {}

  all(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}`);
  }

  create(payload: any): Observable<any> {
    return this.http.post(`${this.base}`, payload);
  }

  submit(challengeId: number, payload: any): Observable<any> {
    return this.http.post(`${this.base}/${challengeId}/submit`, payload);
  }

  pendingSubmissions(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/submissions/pending`);
  }
  
  uploadMedia(form: FormData): Observable<any> {
    return this.http.post(`${environment.apiBase}/upload/desafio`, form);
  }

  mySubmissions(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/submissions/mine`);
  }

  available(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/available`);
  }

  approveSubmission(submissionId: number, nota: number): Observable<any> {
    return this.http.post(`${this.base}/submissions/${submissionId}/approve`, { nota });
  }
}
