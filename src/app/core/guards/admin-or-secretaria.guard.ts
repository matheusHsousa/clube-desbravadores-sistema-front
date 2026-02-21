import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from 'src/app/auth/auth.service';

@Injectable({ providedIn: 'root' })
export class AdminOrSecretariaGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  async canActivate(): Promise<boolean> {
    const user = await firstValueFrom(this.authService.currentUser$);
    const isAdmin = !!user?.roles?.includes('ADMIN');
    const isSecretaria = !!user?.roles?.includes('SECRETARIA');
    const allowed = isAdmin || isSecretaria;
    if (!allowed) this.router.navigate(['/dashboard']);
    return allowed;
  }
}
