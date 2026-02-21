import { Component, OnInit, OnDestroy } from '@angular/core';
import { Location } from '@angular/common';
import { AuthService } from 'src/app/auth/auth.service';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit, OnDestroy {
  currentUser: any = null;
  private sub?: Subscription;

  constructor(private location: Location, private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.sub = this.authService.currentUser$.subscribe(u => (this.currentUser = u));
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  goBack() {
    this.location.back();
  }

  goToProfile(): void {
    this.router.navigate(['/user-profile']);
  }

  logout(): void {
    this.authService.logout();
  }
}
