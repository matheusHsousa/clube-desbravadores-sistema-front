import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { shareReplay } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class ApiCacheService {
  private inFlight: Map<string, Observable<any>> = new Map();
  private store: Map<string, any> = new Map();

  getOrLoad<T>(key: string, loader: () => Observable<T>, sessionCache = true): Observable<T> {
    if (sessionCache && this.store.has(key)) {
      return of(this.store.get(key) as T);
    }

    if (this.inFlight.has(key)) {
      return this.inFlight.get(key) as Observable<T>;
    }

    const obs$ = loader().pipe(
      shareReplay(1)
    );

    this.inFlight.set(key, obs$);

    obs$.subscribe({
      next: v => { if (sessionCache) this.store.set(key, v); },
      error: () => { /* keep store unchanged on error */ },
      complete: () => { this.inFlight.delete(key); }
    });

    return obs$;
  }

  clear(key?: string) {
    if (key) {
      this.inFlight.delete(key);
      this.store.delete(key);
      return;
    }
    this.inFlight.clear();
    this.store.clear();
  }
}
