import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class TextosBiblicosService {
  private base = 'http://localhost:3000/textos-biblicos';

  constructor(private http: HttpClient) {}

  listarDevedores(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/devedores`);
  }

  listarTextosPendentes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/pendentes`);
  }

  buscarMeusAtrasados(userId?: number, desbravadorId?: number): Observable<any[]> {
    let url = `${this.base}/meus-atrasados`;
    const params = new URLSearchParams();

    if (userId) {
      params.append('userId', String(userId));
    }
    if (desbravadorId) {
      params.append('desbravadorId', String(desbravadorId));
    }

    if (params.toString()) {
      url += '?' + params.toString();
    }

    return this.http.get<any[]>(url);
  }

  enviarTexto(atrasadoId: number, imagemUrl: string): Observable<any> {
    return this.http.post(`${this.base}/enviar`, {
      atrasadoId,
      imagemUrl,
    });
  }

  aprovarTexto(textoId: number): Observable<any> {
    return this.http.post(`${this.base}/aprovar/${textoId}`, {});
  }

  rejeitarTexto(textoId: number): Observable<any> {
    return this.http.delete(`${this.base}/rejeitar/${textoId}`);
  }
}
