import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CantinhoUnidadeComponent } from './components/cantinho-unidade.component';
import { TabelaComponent } from './components/tabela/tabela.component';
import { MarcacaoComponent } from './components/marcacao/marcacao.component';
import { HistoricoComponent } from './components/historico/historico.component';

const routes: Routes = [
  {
    path: '',
    component: CantinhoUnidadeComponent,
    children: [
      { path: '', redirectTo: 'cantinho-unidade', pathMatch: 'full' },
      { path: 'tabela', component: TabelaComponent },
      { path: 'marcacao', component: MarcacaoComponent },
      { path: 'historico', component: HistoricoComponent }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CantinhoUnidadeRoutingModule {}
