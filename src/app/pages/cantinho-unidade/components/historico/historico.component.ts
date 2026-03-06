import { Component } from '@angular/core';
import { CantinhoUnidadeComponent } from '../cantinho-unidade.component';

@Component({
  selector: 'app-cantinho-historico',
  templateUrl: './historico.component.html',
  styleUrls: ['../cantinho-unidade.component.scss', '../cantinho-stepper.scss']

})
export class HistoricoComponent {
  constructor(public parent: CantinhoUnidadeComponent) {}

  get desbravadores() { return this.parent.desbravadores; }
  get transactions() { return this.parent.transactions; }
  openTransactionsDialog() { return this.parent.openTransactionsDialog(); }
  openEditDialog(tx: any) { return this.parent.openEditDialog(tx); }
  getDesbravadorName(t: any) { return this.parent.getDesbravadorName(t); }
}
