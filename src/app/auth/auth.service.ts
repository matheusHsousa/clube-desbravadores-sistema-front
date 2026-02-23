import { Injectable } from '@angular/core';
import { Auth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, User } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, BehaviorSubject, Observable } from 'rxjs';
import { environment } from 'src/environments/environments';


@Injectable({ providedIn: 'root' })
export class AuthService {
  private isAwaitingBackend = false;
  private currentUserSubject = new BehaviorSubject<{ id?: number; name?: string; email: string; roles: string[]; unidade?: string; classe?: string } | null>(null);
  public currentUser$: Observable<{ id?: number; name?: string; email: string; roles: string[]; unidade?: string; classe?: string } | null> = this.currentUserSubject.asObservable();

  constructor(
    private auth: Auth,
    private router: Router,
    private http: HttpClient
  ) {
    console.log('🔥 Auth instance:', this.auth);
    this.listenAuth();
  }

  private listenAuth(): void {
    onAuthStateChanged(this.auth, async (user: User | null) => {
      if (user) {
        console.log('🔥 USUÁRIO LOGADO:', user);
        // Se ainda não temos o usuário do backend, busca-o
        if (!this.currentUserSubject.value) {
          try {
            this.isAwaitingBackend = true;
            const token = await user.getIdToken();
            const base = (environment.apiBase || '').replace(/\/+$/, '');
            const backendUser = await firstValueFrom(
              this.http.post<{ id?: number; name?: string; email: string; roles: string[]; unidade?: string; classe?: string }>(
                `${base}/auth/login`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
              )
            );
            this.currentUserSubject.next(backendUser);
          } catch (err) {
            console.error('Erro ao buscar usuário no backend em onAuthStateChanged:', err);
          } finally {
            this.isAwaitingBackend = false;
          }
        }

        // evita redirecionamento caso estejamos aguardando a validação no backend
        if (!this.isAwaitingBackend) {
          this.router.navigate(['/dashboard']);
        }
      } else {
        console.log('❌ USUÁRIO DESLOGADO');
        this.currentUserSubject.next(null);
        this.router.navigate(['/login']);
      }
    });
  }

  async loginGoogle() {
    const provider = new GoogleAuthProvider();

    try {
      const credential = await signInWithPopup(this.auth, provider);

      const token = await credential.user.getIdToken();

      this.isAwaitingBackend = true;

      const base = (environment.apiBase || '').replace(/\/+$/, '');
      const user = await firstValueFrom(
        this.http.post<{ id?: number; name?: string; email: string; roles: string[]; unidade?: string; classe?: string }>(
          `${base}/auth/login`,
          {}, // body vazio
          { headers: { Authorization: `Bearer ${token}` } }
        )
      );

      console.log('Usuário do backend:', user);
      // atualiza estado local
      this.currentUserSubject.next(user);

      this.router.navigate(['/dashboard']);
    } catch (err) {
      console.error('Erro no login/validação backend:', err);
    } finally {
      this.isAwaitingBackend = false;
    }
  }

  logout(): Promise<void> {
    return this.auth.signOut().then(() => {
      this.currentUserSubject.next(null);
      this.router.navigate(['/login']);
    });
  }
  
  hasRole(role: string): boolean {
    return !!this.currentUserSubject.value?.roles?.includes(role);
  }
}
