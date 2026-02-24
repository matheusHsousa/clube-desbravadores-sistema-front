import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DesbravadoresService } from 'src/app/services/desbravadores.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from 'src/app/shared/confirm-dialog/confirm-dialog.component';
import * as XLSX from 'xlsx';

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
  importUnidade: string | null = null;
  importClasse: string | null = null;
  previewRows: any[] = [];

  constructor(
    private fb: FormBuilder,
    private service: DesbravadoresService,
    private snack: MatSnackBar,
    private dialog: MatDialog
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      birthDate: [''],
      unidade: [null, Validators.required],
      classe: [null, Validators.required]
    });
  }

  private parseImportedDate(raw: any): string | null {
    if (raw === null || raw === undefined || raw === '') return null;
    // If already a Date
    if (raw instanceof Date) {
      if (!Number.isNaN(raw.getTime())) return raw.toISOString().slice(0, 10);
      return null;
    }

    // If numeric (Excel serial)
    if (typeof raw === 'number') {
      try {
        const ssf = (XLSX as any).SSF;
        if (ssf && typeof ssf.parse_date_code === 'function') {
          const dc = ssf.parse_date_code(raw);
          if (dc) {
            const d = new Date(dc.y, dc.m - 1, dc.d);
            if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
          }
        }
      } catch (err) {
        // fallback below
      }
      // Fallback conversion from Excel serial (days since 1899-12-31)
      const jsDate = new Date(Math.round((raw - 25569) * 86400 * 1000));
      if (!Number.isNaN(jsDate.getTime())) return jsDate.toISOString().slice(0, 10);
      return null;
    }

    // If string: try dd/mm/yyyy or ISO
    if (typeof raw === 'string') {
      const s = raw.trim();
      const br = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/;
      const m = s.match(br);
      if (m) {
        let day = parseInt(m[1], 10);
        let month = parseInt(m[2], 10);
        let year = parseInt(m[3], 10);
        if (year < 100) year += 2000;
        const d = new Date(year, month - 1, day);
        if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
      }

      // try Date parser for ISO or other formats
      const d2 = new Date(s);
      if (!Number.isNaN(d2.getTime())) return d2.toISOString().slice(0, 10);
      return null;
    }

    return null;
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
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Remover desbravador', message: `Confirma remoção de ${d.name}? Os dados relacionados serão apagados.` }
    });

    ref.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) return;
      this.service.remove(d.id).subscribe(() => {
        this.snack.open('Desbravador removido', 'Fechar', { duration: 3000 });
        this.load();
      }, err => {
        console.error(err);
        this.snack.open('Erro ao remover desbravador', 'Fechar', { duration: 5000 });
      });
    });
  }

  handleFile(event: any) {
    const file: File = (event.target && event.target.files && event.target.files[0]) || null;
    if (!file) return;
    const name = file.name.toLowerCase();
    const isXlsx = name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.xlsm');
    const isCsv = name.endsWith('.csv');
    if (!isXlsx && !isCsv) {
      this.snack.open('Apenas arquivos .xlsx ou .csv são aceitos', 'Fechar', { duration: 4000 });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        let wb: XLSX.WorkBook;
        if (isCsv) {
          const txt = e.target.result as string;
          wb = XLSX.read(txt, { type: 'string', cellDates: true });
        } else {
          const data = new Uint8Array(e.target.result);
          wb = XLSX.read(data, { type: 'array', cellDates: true });
        }
        const firstSheetName = wb.SheetNames[0];
        const ws = wb.Sheets[firstSheetName];
        const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

        // mapando colunas para pré-visualização (Nome -> name, Nascimento -> birthDate)
        const preview: any[] = [];
        for (const r of rows) {
          const name = (r['Nome'] || r['nome'] || r['Name'] || r['name'] || '')?.toString().trim();
          if (!name) continue;
          const rawDateCell = (r['Nascimento'] || r['nascimento'] || r['Birth'] || r['birthDate'] || r['birth'] || '');
          const birthDate = this.parseImportedDate(rawDateCell);

          const unidade = this.importUnidade || this.form.value.unidade || null;
          const classe = this.importClasse || this.form.value.classe || null;

          preview.push({ name, birthDate, unidade, classe, selected: true });
        }

        if (!preview.length) {
          this.snack.open('Nenhum registro válido encontrado no arquivo', 'Fechar', { duration: 3000 });
          return;
        }

        // armazenar pré-visualização para edição antes do envio
        this.previewRows = preview;
        this.snack.open(`Carregados ${preview.length} registros para revisão`, 'Fechar', { duration: 3000 });
      } catch (err) {
        console.error(err);
        this.snack.open('Erro ao processar arquivo', 'Fechar', { duration: 4000 });
      }
    };
    reader.readAsArrayBuffer(file);
  }

  updatePreviewField(row: any, key: string, value: any) {
    if (!row) return;
    row[key] = value;
  }

  toggleSelectAll(checked: boolean) {
    (this.previewRows || []).forEach(r => r.selected = checked);
  }

  importSelected() {
    const toImport = (this.previewRows || []).filter(r => r.selected).map(r => ({
      name: r.name,
      birthDate: r.birthDate || null,
      unidade: r.unidade,
      classe: r.classe
    }));

    if (!toImport.length) {
      this.snack.open('Nenhum registro selecionado para importação', 'Fechar', { duration: 3000 });
      return;
    }

    // validação rápida
    for (const it of toImport) {
      if (!it.name || !it.unidade || !it.classe) {
        this.snack.open('Cada registro precisa de Nome, Unidade e Classe antes da importação', 'Fechar', { duration: 4000 });
        return;
      }
    }

    this.service.import(toImport).subscribe(() => {
      this.snack.open(`Importados ${toImport.length} desbravadores`, 'Fechar', { duration: 4000 });
      this.previewRows = [];
      this.load();
    }, err => {
      console.error('Import error', err);
      this.snack.open('Erro ao importar arquivo: ' + (err?.error?.message || err?.message || ''), 'Fechar', { duration: 5000 });
    });
  }

  cancelPreview() {
    this.previewRows = [];
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
