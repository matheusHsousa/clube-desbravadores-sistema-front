import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, BehaviorSubject, Observable } from 'rxjs';
import { environment } from 'src/environments/environments';


@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentUserSubject = new BehaviorSubject<{ id?: number; name?: string; email: string; roles: string[]; unidade?: string; classe?: string } | null>(null);
  public currentUser$: Observable<{ id?: number; name?: string; email: string; roles: string[]; unidade?: string; classe?: string } | null> = this.currentUserSubject.asObservable();

  constructor(
    private router: Router,
    private http: HttpClient
  ) {
    // Ao iniciar, tenta carregar o usuário atual do backend via cookie/session
    this.fetchCurrentUser().catch(() => {});
  }

  async fetchCurrentUser(): Promise<void> {
    try {
      const user = await firstValueFrom(this.http.get<any>(`http://localhost:4000/auth/me`, { withCredentials: true }));
      this.currentUserSubject.next(user ?? null);
    } catch (err) {
      this.currentUserSubject.next(null);
    }
  }

  // Inicia fluxo OAuth server-side
  loginGoogle() {
    window.location.href = `${environment.apiBase}/auth/google?redirect=${encodeURIComponent(window.location.origin)}`;
  }

  logout(): Promise<void> {
    // chama backend para limpar cookie de sessão
    return firstValueFrom(this.http.post(`${environment.apiBase}/auth/logout`, {}, { withCredentials: true }))
      .then(() => {
        this.currentUserSubject.next(null);
        this.router.navigate(['/login']);
      })
      .catch(() => {
        this.currentUserSubject.next(null);
        this.router.navigate(['/login']);
      });
  }

  hasRole(role: string): boolean {
    return !!this.currentUserSubject.value?.roles?.includes(role);
  }
}
