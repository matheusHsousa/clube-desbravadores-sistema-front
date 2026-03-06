import { Component } from '@angular/core';
import { CantinhoUnidadeComponent } from '../cantinho-unidade.component';

@Component({
  selector: 'app-cantinho-tabela',
  templateUrl: './tabela.component.html',
  styleUrls: ['./tabela.component.scss']
})
export class TabelaComponent {
  constructor(public parent: CantinhoUnidadeComponent) {}

  get desbravadores() { return this.parent.desbravadores; }
  get pointsMap() { return this.parent.pointsMap; }
}
