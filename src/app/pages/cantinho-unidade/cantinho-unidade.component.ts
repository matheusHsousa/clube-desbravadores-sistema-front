import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from 'src/app/auth/auth.service';
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DesbravadoresService } from 'src/app/services/desbravadores.service';
import { PointsService } from 'src/app/services/points.service';

@Component({
  selector: 'app-cantinho-unidade',
  templateUrl: './cantinho-unidade.component.html',
  styleUrls: ['./cantinho-unidade.component.scss']
})
export class CantinhoUnidadeComponent implements OnInit, OnDestroy {
  form: FormGroup;
  sundays: Date[] = [];
  submitting = false;
  successMessage = '';
  desbravadores: any[] = [];
  private destroy$ = new Subject<void>();
  currentPoints: any = null;
  currentUser: any = null;
  pointsMap: Record<number, number> = {};
  pointsLoading = false;
  rowUpdatedId: number | null = null;
  // opções de pontuação por critério
  presenceOptions = [10, 0];
  pontualidadeOptions = [5, 0];
  uniformeOptions = [10, 5, 0];
  materialOptions = [10, 5, 0];
  classeOptions = [10, 5, 0];
  classeBiblicaOptions = [10, 5, 0];
  espEquipeOptions = [10, 5, 0];
  disciplinaOptions = [10, 5, 0];
  textoBiblicoOptions = [0, -20];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private desbravadoresService: DesbravadoresService,
    private pointsService: PointsService
  ) {
    this.form = this.fb.group({
      sundayDate: [null, Validators.required],
      desbravadorId: [null, Validators.required],
      // critérios individuais
      presence: [null, Validators.required],
      pontualidade: [null, Validators.required],
      uniforme: [null, Validators.required],
      material: [null, Validators.required],
      classe: [null, Validators.required],
      classeBiblica: [null, Validators.required],
      espEquipe: [null, Validators.required],
      disciplina: [null, Validators.required],
      textoBiblico: [null, Validators.required]
    });
  }

  ngOnInit(): void {
    const year = new Date().getFullYear();
    this.sundays = this.getSundaysOfYear(year);

    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
        if (!user?.unidade) {
          this.desbravadores = [];
          return;
        }

        this.desbravadoresService
          .list({ unidade: user.unidade })
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: list => {
              this.desbravadores = list;
              console.log('Desbravadores da unidade:', list);
              // carregar pontos para a tabela
              this.loadPointsForDesbravadores(list);
            },
            error: err => {
              console.error(err);
              this.desbravadores = [];
            }
          });
      });

    // quando selecionar um desbravador, buscar saldo
    this.form.get('desbravadorId')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((id: number) => {
      this.currentPoints = null;
      if (!id) return;
      this.pointsService.getByDesbravador(id).pipe(takeUntil(this.destroy$)).subscribe(p => {
        this.currentPoints = p;
      });
    });
  }

  private loadPointsForDesbravadores(list: any[]) {
    if (!list || !list.length) {
      this.pointsMap = {};
      return;
    }

    this.pointsLoading = true;
    const requests = list.map(d => this.pointsService.getByDesbravador(d.id));
    forkJoin(requests).pipe(takeUntil(this.destroy$)).subscribe(results => {
      const map: Record<number, number> = {};
      results.forEach((p, i) => {
        const id = list[i]?.id;
        map[id] = p?.total ?? 0;
      });
      this.pointsMap = map;
      this.pointsLoading = false;
    }, err => {
      console.error('Erro ao carregar pontos:', err);
      this.pointsMap = {};
      this.pointsLoading = false;
    });
  }

  refreshPoints() {
    if (!this.desbravadores || !this.desbravadores.length) return;
    this.loadPointsForDesbravadores(this.desbravadores);
  }

  
  // valida seleção de domingo — rejeita datas que não sejam domingo
  onSundayChange(event: any) {
    const val: Date | null = event?.value ?? event?.target?.value ?? null;
    if (!val) return;
    const d = val instanceof Date ? val : new Date(val);
    if (isNaN(d.getTime()) || d.getDay() !== 0) {
      this.form.controls['sundayDate'].setValue(null);
      this.form.controls['sundayDate'].setErrors({ notSunday: true });
    } else {
      this.form.controls['sundayDate'].setErrors(null);
    }
  }

  private setSundayByOffset(offsetWeeks: number) {
    const currentVal: Date | null = this.form.value.sundayDate;
    let d = currentVal ? new Date(currentVal) : new Date();
    // ajustar para o domingo mais próximo (anterior) se não for domingo
    if (d.getDay() !== 0) {
      d.setDate(d.getDate() - ((d.getDay() + 7) % 7));
    }
    d.setDate(d.getDate() + offsetWeeks * 7);
    // garantir que a data esteja dentro do range de sundays gerado
    if (this.sundays && this.sundays.length) {
      const first = this.sundays[0];
      const last = this.sundays[this.sundays.length - 1];
      if (d < first) {
        this.form.controls['sundayDate'].setValue(first);
        return;
      }
      if (d > last) {
        this.form.controls['sundayDate'].setValue(last);
        return;
      }
    }
    this.form.controls['sundayDate'].setValue(d);
    this.form.controls['sundayDate'].setErrors(null);
  }


  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // legacy helper removed — use DesbravadoresService

  private getSundaysOfYear(year: number): Date[] {
    const dates: Date[] = [];
    let d = new Date(year, 0, 1);
    // move to first Sunday
    const day = d.getDay();
    if (day !== 0) {
      d.setDate(d.getDate() + ((7 - day) % 7));
    }

    while (d.getFullYear() === year) {
      dates.push(new Date(d));
      d = new Date(d);
      d.setDate(d.getDate() + 7);
    }

    return dates;
  }

  // usado pelo MatDatepicker para permitir somente domingos
  onlySundays = (d: Date | null): boolean => {
    if (!d) return false;
    return d.getDay() === 0;
  }

  async onSubmit() {
    if (this.form.invalid) return;
    this.submitting = true;
    this.successMessage = '';

    try {
      const payload = this.form.value;
      payload.total = this.total;
      // chamar backend de pontos para ajustar saldo
      const desbravadorId = Number(payload.desbravadorId);
      await this.pointsService.adjust({
        desbravadorId,
        amount: payload.total,
        reason: `Cantinho da Unidade - ${payload.sundayDate}`,
        authorId: this.currentUser?.id
      }).toPromise();

      console.log('Cantinho da unidade submission:', payload);
      this.successMessage = 'Pontuação registrada com sucesso.';
      // atualizar saldo exibido e a tabela
      this.pointsService.getByDesbravador(desbravadorId).pipe(takeUntil(this.destroy$)).subscribe(p => {
        this.currentPoints = p;
        const totalSaldo = p?.total ?? (this.pointsMap[desbravadorId] ?? 0) + payload.total;
        this.pointsMap = { ...this.pointsMap, [desbravadorId]: totalSaldo };
        this.rowUpdatedId = desbravadorId;
        setTimeout(() => this.rowUpdatedId = null, 2500);
        this.refreshPoints();
      });
      this.form.reset();
    } catch (err) {
      console.error(err);
    } finally {
      this.submitting = false;
    }
  }

  // calcula a soma atual com base nos valores do formulário
  get total(): number {
    const v = this.form.value || {};
    const keys = ['presence','pontualidade','uniforme','material','classe','classeBiblica','espEquipe','disciplina','textoBiblico'];
    return keys.reduce((acc, k) => {
      const val = Number(v[k]);
      return acc + (Number.isFinite(val) ? val : 0);
    }, 0);
  }
}
