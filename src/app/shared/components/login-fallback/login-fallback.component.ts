import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login-fallback',
  templateUrl: './login-fallback.component.html',
  styleUrls: ['./login-fallback.component.scss']
})
export class LoginFallbackComponent {
  constructor(private router: Router) {}

  retry() {
    this.router.navigate(['/login']);
  }
}
