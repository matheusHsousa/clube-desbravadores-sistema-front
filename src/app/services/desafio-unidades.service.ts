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

  update(id: number, payload: any): Observable<any> {
    return this.http.put(`${this.base}/${id}`, payload);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.base}/${id}`);
  }

  submit(challengeId: number, payload: any): Observable<any> {
    return this.http.post(`${this.base}/${challengeId}/submit`, payload);
  }

  pendingSubmissions(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/submissions/pending`);
  }
  
  rejectSubmission(submissionId: number): Observable<any> {
    return this.http.post(`${this.base}/submissions/${submissionId}/reject`, {});
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
