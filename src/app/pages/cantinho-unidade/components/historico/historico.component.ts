import { Component } from '@angular/core';
import { CantinhoUnidadeComponent } from '../cantinho-unidade.component';

@Component({
  selector: 'app-cantinho-historico',
  templateUrl: './historico.component.html',
  styleUrls: ['./historico.component.scss']

})
export class HistoricoComponent {
  constructor(public parent: CantinhoUnidadeComponent) {}

  get desbravadores() { return this.parent.desbravadores; }
  get transactions() { return this.parent.transactions; }
  get canSearch() {
    const des = this.parent.form?.controls?.['desbravadorId']?.value;
    const sunday = this.parent.form?.controls?.['sundayDate']?.value;
    return !!(des || sunday);
  }
  openTransactionsDialog() { return this.parent.openTransactionsDialog(); }
  openEditDialog(tx: any) { return this.parent.openEditDialog(tx); }
  getDesbravadorName(t: any) { return this.parent.getDesbravadorName(t); }
}
