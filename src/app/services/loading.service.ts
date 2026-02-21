import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private counter = 0;
  private _loading$ = new BehaviorSubject<boolean>(false);

  get loading$(): Observable<boolean> {
    return this._loading$.asObservable();
  }

  show() {
    this.counter++;
    if (this.counter > 0) {
      this._loading$.next(true);
    }
  }

  hide() {
    this.counter = Math.max(0, this.counter - 1);
    if (this.counter === 0) {
      this._loading$.next(false);
    }
  }

  reset() {
    this.counter = 0;
    this._loading$.next(false);
  }
}
