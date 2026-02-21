import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from 'src/app/auth/auth.service';
import { firstValueFrom, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class InstrutorGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  async canActivate(): Promise<boolean> {
    const user = await firstValueFrom(this.authService.currentUser$);
    const allowed = !!user?.roles?.includes('INSTRUTOR');
    if (!allowed) {
      this.router.navigate(['/dashboard']);
    }
    return allowed;
  }
}
