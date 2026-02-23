import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/auth/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {

  loading = false;
  error = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  async loginGoogle() {
    try {
      this.loading = true;
      this.error = '';
      // Inicia fluxo OAuth server-side via AuthService
      this.authService.loginGoogle();

    } catch (err) {
      this.error = 'Erro ao fazer login com Google';
      console.error(err);
    } finally {
      this.loading = false;
    }
  }
}
