import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from 'src/app/auth/auth.service';
import { firstValueFrom, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ConselheiroGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  async canActivate(): Promise<boolean> {
    // pega o valor atual do usuário do backend (email + roles)
    const user = await firstValueFrom(this.authService.currentUser$);
    const allowed = !!user?.roles?.includes('CONSELHEIRO');
    if (!allowed) {
      // opcional: redireciona para dashboard
      this.router.navigate(['/dashboard']);
    }
    return allowed;
  }
}
