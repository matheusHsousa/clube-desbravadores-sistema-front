import { Component, OnInit, OnDestroy, HostListener, ViewChild, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from 'src/app/auth/auth.service';
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil, map, catchError } from 'rxjs/operators';
import { DesbravadoresService } from 'src/app/services/desbravadores.service';
import { PointsService } from 'src/app/services/points.service';
import { TextosBiblicosService } from 'src/app/services/textos-biblicos.service';
import { AtrasadosService } from 'src/app/services/atrasados.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PushService } from 'src/app/services/push.service';

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
  pointsMap: Record<number, number | undefined> = {};
  pointsLoading = false;
  rowUpdatedId: number | null = null;
  public textoBiblicoDevedor: boolean = false;
  public textoBiblicoMessage: string = 'Por dever texto bíblico deduzirá 20 pontos';
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

  // marcação rápida: itens do dia e pontuações por desbravador
  quickItems: Array<{ key: string; title: string }> = [
    { key: 'presence', title: 'Presença' },
    { key: 'pontualidade', title: 'Pontualidade' },
    { key: 'uniforme', title: 'Uniforme' },
    { key: 'material', title: 'Material' },
    { key: 'classe', title: 'Classe' },
    { key: 'espEquipe', title: 'Espírito de Equipe' },
    { key: 'disciplina', title: 'Disciplina' },
    { key: 'textoBiblico', title: 'Texto Bíblico' }
  ];
  quickScores: Record<string, Record<number, number>> = {};
  textoBiblicoDisabled: Record<number, boolean> = {};
  submittingQuick = false;
  stepperOrientation: 'horizontal' | 'vertical' = 'horizontal';
  @ViewChildren('stepFirstInput', { read: ElementRef }) stepFirstInputs?: QueryList<ElementRef>;
  @ViewChild('stepperContainer', { read: ElementRef }) stepperHeaderElement?: ElementRef;
  activeStepIndex = 0;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private desbravadoresService: DesbravadoresService,
    private pointsService: PointsService,
    private snackBar: MatSnackBar,
    private textosBiblicosService: TextosBiblicosService,
    private atrasadosService: AtrasadosService,
    private pushService: PushService,
    private host: ElementRef
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
    this.updateStepperOrientation();
    const year = new Date().getFullYear();
    this.sundays = this.getSundaysOfYear(year);

    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
        // inscrever conselheiros para receber push notifications (PWA)
        try {
          const roles = user?.roles;
          if (Array.isArray(roles) && roles.includes('CONSELHEIRO')) {
            const userId = user?.id != null ? String(user.id) : null;
            this.pushService.subscribe(userId, 'CONSELHEIRO');
          }
        } catch (e) {
          console.warn('Push subscribe attempt failed', e);
        }
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
                  this.initQuickScores(list);
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

    // quando selecionar um desbravador, buscar saldo e verificar se deve Texto Bíblico
    this.form.get('desbravadorId')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((id: number) => {
      this.currentPoints = null;
      if (!id) return;
      this.pointsService.getByDesbravador(id).pipe(takeUntil(this.destroy$)).subscribe(p => {
        this.currentPoints = p;
      });

      
    
        // verificar se o desbravador está como devedor de texto bíblico
        const isAdmin = Array.isArray(this.currentUser?.roles) && this.currentUser.roles.includes('ADMIN');
        if (isAdmin) {
          // admins get full access to atrasados via atrasados/historico -> filtrar por desbravadorId
          this.atrasadosService.listarHistorico({ desbravadorId: id }).pipe(takeUntil(this.destroy$)).subscribe(rows => {
            const deve = Array.isArray(rows) && rows.length > 0;
            this.textoBiblicoDevedor = deve;
            this.form.controls['textoBiblico'].setValue(deve ? -20 : 0, { emitEvent: false });
            this.form.controls['textoBiblico'].disable({ emitEvent: false });
            if (deve) this.snackBar.open(this.textoBiblicoMessage, 'OK', { duration: 5000 });
          }, err => {
            this.textoBiblicoDevedor = false;
            this.form.controls['textoBiblico'].setValue(0, { emitEvent: false });
            this.form.controls['textoBiblico'].disable({ emitEvent: false });
          });
        } else {
          // non-admins: use meus-atrasados which respects unit/roles
          this.textosBiblicosService.buscarMeusAtrasados(this.currentUser?.id, id).pipe(takeUntil(this.destroy$)).subscribe(list => {
            const deve = Array.isArray(list) && list.length > 0;
            this.textoBiblicoDevedor = deve;
            this.form.controls['textoBiblico'].setValue(deve ? -20 : 0, { emitEvent: false });
            this.form.controls['textoBiblico'].disable({ emitEvent: false });
            if (deve) this.snackBar.open(this.textoBiblicoMessage, 'OK', { duration: 5000 });
          }, err => {
            this.textoBiblicoDevedor = false;
            this.form.controls['textoBiblico'].setValue(0, { emitEvent: false });
            this.form.controls['textoBiblico'].disable({ emitEvent: false });
          });
        }
    });
  }

  @HostListener('window:resize')
  updateStepperOrientation() {
    try {
      this.stepperOrientation = (window && window.innerWidth && window.innerWidth < 600) ? 'vertical' : 'horizontal';
    } catch (e) {
      this.stepperOrientation = 'horizontal';
    }
  }

  // navegação controlada para focar primeiro input do próximo passo
  nextStep() {
    try {
      const max = (this.quickItems?.length ?? 0);
      if (this.activeStepIndex < max) this.activeStepIndex++;
      // agendar o scroll do header após a view atualizar (microtask pode ser cedo)
      setTimeout(() => this.scrollToActiveStepHeader(), 0);
      // garantir também que o container geral dos headers esteja visível na viewport
      setTimeout(() => {
        try {
          const el = document.querySelector('.stepper-headers') as HTMLElement | null;
          if (el && typeof el.scrollIntoView === 'function') {
            el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
          }
        } catch (e) { /* ignore */ }
      }, 50);
      // scroll para o conteúdo e foco um pouco depois para deixar a animação do header visível
      setTimeout(() => {
        this.scrollToActiveStepContent();
        this.focusFirstInActiveStep();
      }, 180);
    } catch (e) { console.warn(e); }
  }

  previousStep() {
    try {
      if (this.activeStepIndex > 0) this.activeStepIndex--;
      // agendar scroll do header após mudança de view
      setTimeout(() => this.scrollToActiveStepHeader(), 0);
      // garantir também que o container geral dos headers esteja visível na viewport
      setTimeout(() => {
        try {
          const el = document.querySelector('.stepper-headers') as HTMLElement | null;
          if (el && typeof el.scrollIntoView === 'function') {
            el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
          }
        } catch (e) { /* ignore */ }
      }, 50);
      setTimeout(() => {
        this.scrollToActiveStepContent();
        this.focusFirstInActiveStep();
      }, 180);
    } catch (e) { console.warn(e); }
  }

  onStepChange(event: any) {
    // kept for compatibility (no-op with custom stepper)
  }

  goToStep(i: number) {
    const max = (this.quickItems?.length ?? 0);
    if (i < 0) i = 0;
    if (i > max) i = max;
    this.activeStepIndex = i;
    // agendar rolagem do header após a view atualizar e depois focar o conteúdo
    setTimeout(() => this.scrollToActiveStepHeader(), 0);
    setTimeout(() => {
      this.scrollToActiveStepContent();
      this.focusFirstInActiveStep();
    }, 180);
  }

  private scrollToActiveStepContent() {
    try {
      const idx = this.activeStepIndex ?? 0;
      const host = this.host?.nativeElement as HTMLElement | null;
      const panels = host ? host.querySelectorAll('.step-panel') as NodeListOf<HTMLElement> : document.querySelectorAll('.step-panel') as NodeListOf<HTMLElement>;
      const panel = panels?.[idx] as HTMLElement | undefined;
      if (panel) {
        const rect = panel.getBoundingClientRect();
        const headerOffset = 72; // main header height/padding
        const target = rect.top + window.pageYOffset - headerOffset - 8;
        window.scrollTo({ top: target, behavior: 'smooth' });
      }
    } catch (e) { /* ignore */ }
  }

  private scrollToActiveStepHeader() {
    try {
      const idx = this.activeStepIndex ?? 0;
      // usar o container de headers customizado quando disponível
      const headerContainer = (this.stepperHeaderElement?.nativeElement as HTMLElement | null)
        || (this.host?.nativeElement && (this.host.nativeElement.querySelector('.stepper-headers, .mat-horizontal-stepper-header, .mat-mdc-stepper-header, .mat-stepper-header') as HTMLElement))
        || document.querySelector('.stepper-headers, .mat-horizontal-stepper-header, .mat-mdc-stepper-header, .mat-stepper-header') as HTMLElement;

      if (!headerContainer) return;
      // procurar botão correspondente ao passo ativo através do atributo data-step
      const selector = `[data-step="${idx}"]`;
      const header = headerContainer.querySelector(selector) as HTMLElement | null;
      if (header) {
        try {
          const container = headerContainer as HTMLElement;
          const headerCenter = header.offsetLeft + (header.offsetWidth / 2);
          const targetScrollLeft = Math.max(0, headerCenter - (container.clientWidth / 2));
          if (typeof container.scrollTo === 'function') {
            container.scrollTo({ left: targetScrollLeft, behavior: 'smooth' });
            return;
          }
          if (typeof header.scrollIntoView === 'function') {
            header.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
          }
        } catch (e) { /* ignore */ }
      }
    } catch (e) {
      // ignore
    }
  }

  private focusFirstInActiveStep() {
    try {
      const idx = this.activeStepIndex ?? 0;
      const arr = this.stepFirstInputs?.toArray() ?? [];
      const elRef = arr[idx];
      if (elRef && elRef.nativeElement) {
        try {
          const el = elRef.nativeElement as HTMLElement;
          if (typeof el.focus === 'function') {
            el.focus();
            return;
          }
          // tentar focar o primeiro elemento interno
          const inner = el.querySelector<HTMLElement>('select, input, button, [tabindex]');
          if (inner && typeof inner.focus === 'function') {
            inner.focus();
            return;
          }
        } catch (e) { /* ignore */ }
      }

      // fallback genérico: buscar primeiro elemento focusable dentro do passo ativo
      try {
        const host = this.host?.nativeElement as HTMLElement | null;
        if (host) {
          const steps = host.querySelectorAll('.step-panel, .mat-step, .mat-stepper-content');
          const panel = steps?.[idx] as HTMLElement | undefined;
          const root = panel ?? host.querySelector('.stepper-content') ?? host;
          if (root) {
            const first = root.querySelector<HTMLElement>('select, input, textarea, button, [tabindex]');
            if (first && typeof first.focus === 'function') {
              first.focus();
              return;
            }
          }
        }
      } catch (e) { /* ignore */ }

    } catch (e) {
      // não bloquear execução por falha no foco
    }
  }

  // total calculado para um desbravador a partir das marcações rápidas
  getQuickTotal(desbId: number): number {
    if (!this.quickScores || !this.desbravadores) return 0;
    let sum = 0;
    for (const key of Object.keys(this.quickScores)) {
      sum += Number(this.quickScores[key]?.[Number(desbId)] ?? 0);
    }
    return sum;
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

  // inicializa estrutura para marcação rápida
  private initQuickScores(list: any[]) {
    this.quickScores = {};
    this.textoBiblicoDisabled = {};
    for (const item of this.quickItems) {
      this.quickScores[item.key] = {};
      for (const d of list) {
        const id = Number(d.id);
        this.quickScores[item.key][id] = 0;
        // default: textoBiblico selection will be controlled automatically
        if (item.key === 'textoBiblico') this.textoBiblicoDisabled[id] = true;
      }
    }

    // determine who owes texto bíblico and set -20/0 automatically
    try {
      const isAdmin = Array.isArray(this.currentUser?.roles) && this.currentUser.roles.includes('ADMIN');
      const observables = list.map(d => {
        const id = Number(d.id);
        if (isAdmin) {
          return this.atrasadosService.listarHistorico({ desbravadorId: id }).pipe(
            map((rows: any[]) => ({ id, deve: Array.isArray(rows) && rows.length > 0 })),
            catchError(() => of({ id, deve: false }))
          );
        }
        return this.textosBiblicosService.buscarMeusAtrasados(this.currentUser?.id, id).pipe(
          map((rows: any[]) => ({ id, deve: Array.isArray(rows) && rows.length > 0 })),
          catchError(() => of({ id, deve: false }))
        );
      });

      forkJoin(observables).pipe(takeUntil(this.destroy$)).subscribe((results: any[]) => {
        for (const r of results) {
          const id = Number(r.id);
          const deve = !!r.deve;
          if (!this.quickScores['textoBiblico']) this.quickScores['textoBiblico'] = {};
          this.quickScores['textoBiblico'][id] = deve ? -20 : 0;
          // ensure selection cannot be changed
          this.textoBiblicoDisabled[id] = true;
        }
      }, err => {
        // on error, fallback: set 0 and keep disabled
        for (const d of list) {
          const id = Number(d.id);
          if (!this.quickScores['textoBiblico']) this.quickScores['textoBiblico'] = {};
          this.quickScores['textoBiblico'][id] = 0;
          this.textoBiblicoDisabled[id] = true;
        }
      });
    } catch (e) {
      // ignore
    }
  }

  getQuickScore(itemKey: string, desbId: number): number {
    return this.quickScores?.[itemKey]?.[Number(desbId)] ?? 0;
  }

  setQuickScore(itemKey: string, desbId: number, value: number) {
    if (!this.quickScores[itemKey]) this.quickScores[itemKey] = {};
    this.quickScores[itemKey][Number(desbId)] = Number(value) || 0;
  }

  getOptions(itemKey: string): number[] {
    switch (itemKey) {
      case 'presence': return this.presenceOptions;
      case 'pontualidade': return this.pontualidadeOptions;
      case 'uniforme': return this.uniformeOptions;
      case 'material': return this.materialOptions;
      case 'classe': return this.classeOptions;
      case 'classeBiblica': return this.classeBiblicaOptions;
      case 'espEquipe': return this.espEquipeOptions;
      case 'disciplina': return this.disciplinaOptions;
      case 'textoBiblico': return this.textoBiblicoOptions;
      default: return [10, 5, 0];
    }
  }

  async saveQuickMarks() {
    if (!this.desbravadores || !this.desbravadores.length) return;
    this.submittingQuick = true;
    this.successMessage = '';
    try {
      const adjustments: Array<Promise<any>> = [];
      for (const d of this.desbravadores) {
        const id = Number(d.id);
        let total = 0;
        for (const item of this.quickItems) {
          total += Number(this.getQuickScore(item.key, id) || 0);
        }
        if (total === 0) continue;
        const p = this.pointsService.adjust({
          desbravadorId: id,
          amount: total,
          reason: `Marcação rápida - Cantinho da Unidade`,
          authorId: this.currentUser?.id
        }).toPromise();
        adjustments.push(p);
      }

      await Promise.all(adjustments);
      this.successMessage = 'Marcações salvas com sucesso.';
      this.refreshPoints();
    } catch (err) {
      console.error('Erro ao salvar marcações rápidas', err);
    } finally {
      this.submittingQuick = false;
    }
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
      const payload = this.form.getRawValue();
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
      // garantir que o campo textoBiblico volte a um estado padrão (habilitado e 0)
      try {
        this.form.controls['textoBiblico'].enable({ emitEvent: false });
        this.form.controls['textoBiblico'].setValue(0, { emitEvent: false });
      } catch (e) { /* ignore if control missing */ }
    } catch (err) {
      console.error(err);
    } finally {
      this.submitting = false;
    }
  }

  // calcula a soma atual com base nos valores do formulário
  get total(): number {
    const v = (this.form.getRawValue && this.form.getRawValue()) || this.form.value || {};
    const keys = ['presence','pontualidade','uniforme','material','classe','classeBiblica','espEquipe','disciplina','textoBiblico'];
    return keys.reduce((acc, k) => {
      const val = Number(v[k]);
      return acc + (Number.isFinite(val) ? val : 0);
    }, 0);
  }
}
