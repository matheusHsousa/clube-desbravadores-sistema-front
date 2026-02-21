import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DesbravadoresService } from 'src/app/services/desbravadores.service';

@Component({
  selector: 'app-desbravador-classe-card',
  templateUrl: './desbravador-classe-card.component.html',
  styleUrls: ['./desbravador-classe-card.component.scss']
})
export class DesbravadorClasseCardComponent {
  @Input() desbravador: any;
  @Output() updated = new EventEmitter<any>();
  editing = false;

  form: any = {};

  unidades = ['DA', 'ASER', 'MANASSES', 'JUDA', 'BENJAMIN', 'RUBEN'];
  classes = ['AMIGO', 'COMPANHEIRO', 'PESQUISADOR', 'PIONEIRO', 'EXCURSIONISTA', 'GUIA'];


  constructor(private service: DesbravadoresService) { }

  ngOnInit() {
    this.form = {
      name: this.desbravador.name,
      unidade: this.desbravador.unidade,
      classe: this.desbravador.classe
    };
  }

  cancel() {
    this.editing = false;
    this.form = {
      name: this.desbravador.name,
      unidade: this.desbravador.unidade,
      classe: this.desbravador.classe
    };
  }

  save() {
    this.service.update(this.desbravador.id, this.form).subscribe(() => {
      Object.assign(this.desbravador, this.form);
      this.editing = false;
      this.updated.emit(this.desbravador);
    });
  }
}
