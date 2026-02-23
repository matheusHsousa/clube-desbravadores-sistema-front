import { Injectable, Optional } from '@angular/core';
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
    @Optional() private auth: Auth | null,
    private router: Router,
    private http: HttpClient
  ) {
    console.log('🔥 Auth instance:', this.auth ?? 'NO-FIREBASE-AUTH');
    if (this.auth) this.listenAuth();
  }

  private listenAuth(): void {
    const auth = this.auth;
    if (!auth) return;

    onAuthStateChanged(auth, async (user: User | null) => {
      if (user) {
        console.log('🔥 USUÁRIO LOGADO:', user);
        // Se ainda não temos o usuário do backend, busca-o
        if (!this.currentUserSubject.value) {
          try {
            this.isAwaitingBackend = true;
            const token = await user.getIdToken();
            const backendUser = await firstValueFrom(
              this.http.post<{ id?: number; name?: string; email: string; roles: string[]; unidade?: string; classe?: string }>(
                `${environment.apiBase}/auth/login`,
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
    if (!this.auth) {
      console.error('Firebase Auth não está configurado no frontend.');
      throw new Error('Firebase Auth não disponível');
    }

    const auth = this.auth;
    const provider = new GoogleAuthProvider();

    try {
      const credential = await signInWithPopup(auth, provider);

      const token = await credential.user.getIdToken();

      this.isAwaitingBackend = true;

      const user = await firstValueFrom(
        this.http.post<{ id?: number; name?: string; email: string; roles: string[]; unidade?: string; classe?: string }>(
          `${environment.apiBase}/auth/login`,
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
    if (this.auth) {
      const auth = this.auth;
      return auth.signOut().then(() => {
        this.currentUserSubject.next(null);
        this.router.navigate(['/login']);
      });
    }

    // Fallback quando Auth não estiver presente
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
    return Promise.resolve();
  }
  
  hasRole(role: string): boolean {
    return !!this.currentUserSubject.value?.roles?.includes(role);
  }
}
