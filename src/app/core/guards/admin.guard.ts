import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { firstValueFrom } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import { AuthService } from 'src/app/auth/auth.service';

@Injectable({ providedIn: 'root' })
export class AdminGuard implements CanActivate {

  constructor(private authService: AuthService, private router: Router) {}

  async canActivate(): Promise<boolean> {
      // aguarda o carregamento do backend caso esteja em andamento
      await firstValueFrom(this.authService.authInitialized$.pipe(filter(v => v === true), take(1)));
      const user = await firstValueFrom(this.authService.currentUser$);
      const allowed = !!user?.roles?.includes('ADMIN');
      if (!allowed) {
        // opcional: redireciona para dashboard
        this.router.navigate(['/dashboard']);
      }
      return allowed;
    }
}
