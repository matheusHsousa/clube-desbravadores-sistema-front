import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from 'src/app/auth/auth.service';
import { firstValueFrom } from 'rxjs';
import { filter, take } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class ConselheiroGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  async canActivate(): Promise<boolean> {
    // espera backend carregar usuário se necessário
    await firstValueFrom(this.authService.authInitialized$.pipe(filter(v => v === true), take(1)));
    const user = await firstValueFrom(this.authService.currentUser$);
    const allowed = !!user?.roles?.includes('CONSELHEIRO');
    if (!allowed) {
      // opcional: redireciona para dashboard
      this.router.navigate(['/dashboard']);
    }
    return allowed;
  }
}
