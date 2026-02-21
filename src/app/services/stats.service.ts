import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class StatsService {
  private base = 'http://localhost:3000/stats';

  constructor(private http: HttpClient) {}

  getInstrutorRequisitos(instrutorId: number, start?: string, end?: string): Observable<any> {
    let url = `${this.base}/instrutor/requisitos?instrutorId=${instrutorId}`;
    if (start) url += `&start=${start}`;
    if (end) url += `&end=${end}`;
    return this.http.get(url);
  }

  getInstrutorClasseResumo(instrutorId: number): Observable<any> {
    return this.http.get(`${this.base}/instrutor/classe-resumo?instrutorId=${instrutorId}`);
  }

  getConselheiroPoints(unidade: string, start?: string, end?: string): Observable<any> {
    let url = `${this.base}/conselheiro/points?unidade=${unidade}`;
    if (start) url += `&start=${start}`;
    if (end) url += `&end=${end}`;
    return this.http.get(url);
  }

  getAdminOverview(start?: string, end?: string): Observable<any> {
    let url = `${this.base}/admin/overview`;
    if (start) url += `?start=${start}`;
    if (end) url += `${start ? '&' : '?'}end=${end}`;
    return this.http.get(url);
  }

  getAdminDesbravadoresUnidadeSemanal(weeks = 12): Observable<any> {
    return this.http.get(`${this.base}/admin/desbravadores-unidade-semanal?weeks=${weeks}`);
  }

  getAdminRequisitosPorClasse(): Observable<any> {
    return this.http.get(`${this.base}/admin/requisitos-por-classe`);
  }

  getAdminProgressoClasses(): Observable<any> {
    return this.http.get(`${this.base}/admin/progresso-classes`);
  }

  getConselheiropontuacaoSemanal(unidade: string, weeks = 12): Observable<any> {
    return this.http.get(`${this.base}/conselheiro/pontuacao-semanal?unidade=${unidade}&weeks=${weeks}`);
  }

  getConselheiroBestWorst(unidade: string, weeks = 12): Observable<any> {
    return this.http.get(`${this.base}/conselheiro/best-worst?unidade=${unidade}&weeks=${weeks}`);
  }

  getConselheiroAusencias(unidade: string, startDate?: string): Observable<any> {
    let url = `${this.base}/conselheiro/ausencias?unidade=${unidade}`;
    if (startDate) url += `&startDate=${startDate}`;
    return this.http.get(url);
  }
}
