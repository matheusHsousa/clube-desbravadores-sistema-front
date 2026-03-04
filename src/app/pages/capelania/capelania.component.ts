import { Component, OnInit } from '@angular/core';
import { MatDatepickerInputEvent } from '@angular/material/datepicker';
import { DesbravadoresService } from 'src/app/services/desbravadores.service';
import { PointsService } from 'src/app/services/points.service';
import { AuthService } from 'src/app/auth/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-capelania',
  templateUrl: './capelania.component.html',
  styleUrls: ['./capelania.component.scss']
})
export class CapelaniaComponent implements OnInit {
  desbravadores: any[] = [];
  absentMap: Record<number, boolean> = {};
  scoreMap: Record<number, number> = {};
  selectedDate: Date | null = null;
  loading = false;
  submitting = false;
  currentUser: any = null;

  constructor(
    private desbravadoresService: DesbravadoresService,
    private pointsService: PointsService,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loading = true;
    this.authService.currentUser$.subscribe(u => (this.currentUser = u));

    this.desbravadoresService.list().subscribe({
      next: list => {
        this.desbravadores = Array.isArray(list) ? list : [];
        for (const d of this.desbravadores) {
          const id = Number(d.id);
          this.absentMap[id] = false;
          this.scoreMap[id] = 10;
        }
        this.loading = false;
      },
      error: () => { this.desbravadores = []; this.loading = false; }
    });
  }

  onMatDateChange(event: MatDatepickerInputEvent<Date>) {
    this.selectedDate = event.value ?? null;
  }

  // usado pelo MatDatepicker para permitir somente domingos
  onlySundays = (d: Date | null) => {
    if (!d) return true;
    return d.getDay() === 0;
  };

  toggleAbsent(id: number, event: Event) {
    const checked = !!((event.target as HTMLInputElement)?.checked);
    this.absentMap[id] = checked;
    if (checked) {
      // quando marcado ausente, garantir que não haja pontuação selecionada
      this.scoreMap[id] = 0;
    }
  }

  setScore(id: number, val: number) {
    if (this.submitting) return;
    if (this.absentMap[id]) return; // bloquear seleção quando ausente
    this.scoreMap[id] = Number(val);
  }

  async saveAll() {
    if (!this.selectedDate) {
      this.snackBar.open('Selecione a data de aplicação antes de salvar', 'Fechar', { duration: 3500 });
      return;
    }
    if (!this.desbravadores.length) return;
    this.submitting = true;
    try {
      const ops: Array<Promise<any>> = [];
      for (const d of this.desbravadores) {
        const id = Number(d.id);
        if (this.absentMap[id]) continue;
        const score = Number(this.scoreMap[id] ?? 0);
        if (!score && score !== 0) continue;
        const dateStr = new Date(this.selectedDate as Date).toISOString();
        ops.push(this.pointsService.adjust({ desbravadorId: id, amount: score, reason: `Capelania - Classe Bíblica (${dateStr})`, authorId: this.currentUser?.id }).toPromise());
      }
      await Promise.all(ops);
      this.snackBar.open('Notas de Classe Bíblica enviadas com sucesso', 'OK', { duration: 3500 });
    } catch (err) {
      console.error(err);
      this.snackBar.open('Erro ao enviar notas', 'Fechar', { duration: 4000 });
    } finally {
      this.submitting = false;
    }
  }
}
