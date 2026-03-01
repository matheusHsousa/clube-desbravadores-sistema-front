import { Injectable } from '@angular/core';
import { Auth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, User } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, BehaviorSubject, Observable } from 'rxjs';
import { environment } from 'src/environments/environments';


@Injectable({ providedIn: 'root' })
export class AuthService {
  private isAwaitingBackend = false;
  private awaitingBackendSubject = new BehaviorSubject<boolean>(false);
  public awaitingBackend$: Observable<boolean> = this.awaitingBackendSubject.asObservable();
  private authInitializedSubject = new BehaviorSubject<boolean>(false);
  public authInitialized$: Observable<boolean> = this.authInitializedSubject.asObservable();
  private currentUserSubject = new BehaviorSubject<{ id?: number; name?: string; email: string; roles: string[]; unidade?: string; classe?: string } | null>(null);
  public currentUser$: Observable<{ id?: number; name?: string; email: string; roles: string[]; unidade?: string; classe?: string } | null> = this.currentUserSubject.asObservable();

  constructor(
    private auth: Auth,
    private router: Router,
    private http: HttpClient
  ) {
    this.listenAuth();
  }

  private listenAuth(): void {
    onAuthStateChanged(this.auth, async (user: User | null) => {
      if (user) {
        // Se ainda não temos o usuário do backend, busca-o
        if (!this.currentUserSubject.value) {
          try {
            this.isAwaitingBackend = true;
            this.awaitingBackendSubject.next(true);
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
            this.awaitingBackendSubject.next(false);
          }
        // sinaliza que o evento inicial de auth já foi processado
        if (!this.authInitializedSubject.value) this.authInitializedSubject.next(true);
        }

        // não realiza redirecionamento automático aqui para preservar a rota atual ao recarregar
      } else {
        this.currentUserSubject.next(null);
        this.router.navigate(['/login']);
        if (!this.authInitializedSubject.value) this.authInitializedSubject.next(true);
      }
    });
  }

  async loginGoogle() {
    const provider = new GoogleAuthProvider();

    try {
      const credential = await signInWithPopup(this.auth, provider);

      const token = await credential.user.getIdToken();

      this.isAwaitingBackend = true;
      this.awaitingBackendSubject.next(true);

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
      this.awaitingBackendSubject.next(false);
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
