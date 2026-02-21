import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { switchMap, take } from 'rxjs/operators';
import { Auth, authState } from '@angular/fire/auth';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private auth: Auth) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const shouldAttach = req.url.startsWith('http://localhost:3000');
    if (!shouldAttach) return next.handle(req);

    return authState(this.auth).pipe(
      take(1),
      switchMap(user => {
        if (!user) {
          return next.handle(req);
        }

        return from(user.getIdToken()).pipe(
          switchMap(token => {
            const cloned = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
            return next.handle(cloned);
          })
        );
      })
    );
  }
}
