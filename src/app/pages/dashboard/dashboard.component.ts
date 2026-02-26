import { Component } from '@angular/core';
import { AuthService } from 'src/app/auth/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent {
  currentUser: any = null;
  availableTabs: Array<{ key: string; label: string; role: string }> = [];
  selectedTab: string | null = null;

  constructor(private authService: AuthService, private router: Router) {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.updateTabs();
    });
  }

  private updateTabs(): void {
    const tabs = [
      { key: 'instrutor', label: 'Inst', role: 'INSTRUTOR' },
      { key: 'conselheiro', label: 'Cons', role: 'CONSELHEIRO' },
      { key: 'admin', label: 'Adm', role: 'ADMIN' }
    ];

    this.availableTabs = tabs.filter(tab => this.hasRole(tab.role));

    if (!this.selectedTab || !this.availableTabs.find(tab => tab.key === this.selectedTab)) {
      this.selectedTab = this.availableTabs[0]?.key ?? null;
    }
  }

  selectTab(key: string): void {
    this.selectedTab = key;
  }

  get showTabs(): boolean {
    return this.availableTabs.length > 1;
  }

  logout() {
    this.authService.logout();
  }

  hasRole(role: string): boolean {
    return this.authService.hasRole(role);
  }

  goToUnidades() {
    // checa novamente a role antes de navegar
    if (this.hasRole('CONSELHEIRO')) {
      this.router.navigate(['/cantinho-unidade']);
    }
  }

  goToClasses() {
    if (this.hasRole('INSTRUTOR')) {
      this.router.navigate(['/cartoes-classes']);
    }
  }
  goToUsers() {
    if (this.hasRole('ADMIN')) {
      this.router.navigate(['/users']);
    }
  }

  goToAtrasados() {
    if (this.hasRole('ADMIN')) {
      this.router.navigate(['/atrasados']);
    }
  }

  goToTextosBiblicos() {
    if (this.hasRole('ADMIN') || this.hasRole('CONSELHEIRO')) {
      this.router.navigate(['/textos-biblicos']);
    }
  }

  goToDesafioUnidades() {
    if (this.hasRole('ADMIN') || this.hasRole('CONSELHEIRO')) {
      this.router.navigate(['/desafio-unidades']);
    }
  }

  goToMerito() {
    if (this.hasRole('ADMIN')) {
      this.router.navigate(['/merito']);
    }
  }

  goToCadastroDesbravadores() {
    if (this.hasRole('ADMIN') || this.hasRole('SECRETARIA')) {
      this.router.navigate(['/cadastro-desbravadores']);
    }
  }

  goToProfile() {
    this.router.navigate(['/user-profile']);
  }
}

