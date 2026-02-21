import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DesbravadoresService } from 'src/app/services/desbravadores.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-cadastro-desbravadores',
  templateUrl: './cadastro-desbravadores.component.html',
  styleUrls: ['./cadastro-desbravadores.component.scss']
})
export class CadastroDesbravadoresComponent implements OnInit {
  form: FormGroup;
  loading = false;
  desbravadores: any[] = [];
  unidades = ['DA','ASER','MANASSES','JUDA','BENJAMIN','RUBEN'];
  classes = ['AMIGO','COMPANHEIRO','PESQUISADOR','PIONEIRO','EXCURSIONISTA','GUIA'];

  constructor(
    private fb: FormBuilder,
    private service: DesbravadoresService,
    private snack: MatSnackBar
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      birthDate: [''],
      unidade: [null, Validators.required],
      classe: [null, Validators.required]
    });
  }

  ngOnInit(): void {
    this.load();
  }

  load() {
    this.loading = true;
    this.service.list().subscribe(ds => {
      this.desbravadores = ds || [];
      this.loading = false;
    }, () => {
      this.desbravadores = [];
      this.loading = false;
    });
  }

  toggleEdit(d: any) {
    d._editing = true;
    d._editCopy = { name: d.name, birthDate: d.birthDate, unidade: d.unidade, classe: d.classe };
  }

  cancelEdit(d: any) {
    delete d._editing;
    delete d._editCopy;
  }

  updateEdit(d: any, key: string, value: any) {
    if (!d || !d._editCopy) return;
    d._editCopy[key] = value;
  }

  initials(name?: string) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    return parts.map(p => p[0]).slice(0,2).join('').toUpperCase();
  }

  // filtro simples por nome (client-side)
  filterName = '';

  setFilter(value: string) {
    this.filterName = (value || '').trim();
  }

  get filteredDesbravadores() {
    const q = (this.filterName || '').toLowerCase();
    if (!q) return this.desbravadores;
    return this.desbravadores.filter(d => (d.name || '').toLowerCase().includes(q));
  }

  save(d: any) {
    if (!d || !d.id) return;
    const payload = { ...d._editCopy };
    this.service.update(d.id, payload).subscribe(() => {
      Object.assign(d, payload);
      delete d._editing;
      delete d._editCopy;
      this.snack.open('Desbravador atualizado', 'Fechar', { duration: 3000 });
    }, err => {
      console.error(err);
      this.snack.open('Erro ao atualizar desbravador', 'Fechar', { duration: 5000 });
    });
  }

  remove(d: any) {
    if (!d || !d.id) return;
    if (!confirm('Remover desbravador?')) return;
    this.service.remove(d.id).subscribe(() => {
      this.snack.open('Desbravador removido', 'Fechar', { duration: 3000 });
      this.load();
    }, err => {
      console.error(err);
      this.snack.open('Erro ao remover desbravador', 'Fechar', { duration: 5000 });
    });
  }

  submit() {
    if (this.form.invalid) return;
    const payload = { ...this.form.value };
    this.service.create(payload).subscribe(() => {
      this.snack.open('Desbravador cadastrado', 'Fechar', { duration: 3000 });
      this.form.reset();
      this.load();
    }, err => {
      console.error(err);
      this.snack.open('Erro ao cadastrar desbravador', 'Fechar', { duration: 5000 });
    });
  }
}
