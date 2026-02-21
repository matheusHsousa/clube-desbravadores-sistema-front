import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './shared/components/login/login.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { CantinhoUnidadeComponent } from './pages/cantinho-unidade/cantinho-unidade.component';
import { UsersComponent } from './pages/users/users.component';
import { AtrasadosComponent } from './pages/atrasados/atrasados.component';
import { AdminGuard } from './core/guards/admin.guard';
import { ConselheiroGuard } from './core/guards/conselheiro.guard';
import { AdminOrConselheiroGuard } from './core/guards/admin-or-conselheiro.guard';
import { AdminOrSecretariaGuard } from './core/guards/admin-or-secretaria.guard';
import { CartoesClassesComponent } from './pages/cartoes-classes/cartoes-classes.component';
import { UserProfileComponent } from './pages/user-profile/user-profile.component';
import { TextosBiblicosComponent } from './pages/textos-biblicos/textos-biblicos.component';
import { MeritoPageComponent } from './pages/merito/merito-page.component';
import { CadastroDesbravadoresComponent } from './pages/cadastro-desbravadores/cadastro-desbravadores.component';
import { InstrutorGuard } from './core/guards/instrutores.guard';


const routes: Routes = [
  { path: 'login', component: LoginComponent, data: { order: 0 } },
  { path: 'dashboard', component: DashboardComponent, data: { order: 1 } },
  { path: 'user-profile', component: UserProfileComponent, data: { order: 2 } },
  { path: 'cantinho-unidade', component: CantinhoUnidadeComponent, canActivate: [ConselheiroGuard], data: { order: 3 } },
  { path: 'cartoes-classes', component: CartoesClassesComponent, canActivate: [InstrutorGuard], data: { order: 4 } },
  { path: 'cadastro-desbravadores', component: CadastroDesbravadoresComponent, canActivate: [AdminOrSecretariaGuard], data: { order: 5 } },
  { path: 'merito', component: MeritoPageComponent, data: { order: 6 } },
  { path: 'atrasados', component: AtrasadosComponent, canActivate: [AdminGuard], data: { order: 7 } },
  { path: 'textos-biblicos', component: TextosBiblicosComponent, canActivate: [AdminOrConselheiroGuard], data: { order: 8 } },
  { path: 'users', component: UsersComponent, data: { order: 9 } },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
