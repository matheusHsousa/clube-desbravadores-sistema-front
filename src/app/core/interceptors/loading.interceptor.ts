import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { LoadingService } from '../../services/loading.service';

@Injectable()
export class LoadingInterceptor implements HttpInterceptor {
  constructor(private loading: LoadingService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Allow skipping the global loading by adding header 'x-skip-loading'
    if (req.headers.has('x-skip-loading')) {
      const cloned = req.clone({ headers: req.headers.delete('x-skip-loading') });
      return next.handle(cloned);
    }

    this.loading.show();
    return next.handle(req).pipe(finalize(() => this.loading.hide()));
  }
}
