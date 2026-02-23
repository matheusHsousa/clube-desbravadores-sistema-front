import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environments';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const shouldAttach = req.url.startsWith(environment.apiBase);
    if (!shouldAttach) return next.handle(req);

    // Usamos sessão cookie HttpOnly no backend — enviar credenciais (cookies)
    const cloned = req.clone({ withCredentials: true });
    return next.handle(cloned);
  }
}
