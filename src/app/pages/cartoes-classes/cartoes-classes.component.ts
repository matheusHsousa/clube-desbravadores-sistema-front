import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, takeUntil, forkJoin, of } from 'rxjs';
import { Location } from '@angular/common';
import { AuthService } from 'src/app/auth/auth.service';
import { DesbravadoresService } from 'src/app/services/desbravadores.service';
import { ClassesService } from 'src/app/services/classes.service';

@Component({
  selector: 'app-cartoes-classes',
  templateUrl: './cartoes-classes.component.html',
  styleUrls: ['./cartoes-classes.component.scss']
})
export class CartoesClassesComponent implements OnInit, OnDestroy {
  desbravadores: any[] = [];
  classes: any[] = [];
  selectedClassId?: number;
  requisitos: any[] = [];
  showingFormForReq: { [reqId: number]: boolean } = {};
  selectedDesbravadoresForReq: { [reqId: number]: Set<number> } = {};
  currentUser?: any;
  isProcessingForReq: { [reqId: number]: boolean } = {};
  messageForReq: { [reqId: number]: string } = {};
  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private desbravadoresService: DesbravadoresService
    , private classesService: ClassesService,
    private location: Location
  ) {}

  goBack() {
    this.location.back();
  }

  ngOnInit(): void {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
        if (!user?.classe) {
          this.desbravadores = [];
          return;
        }

        this.desbravadoresService
          .list({ classe: user.classe })
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: list => {
              this.desbravadores = list;
              console.log('Desbravadores da classe:', list);
              list.forEach(d => {
              });
              // carregar lista de classes e selecionar automaticamente a classe do usuário
              this.classesService.listClasses().pipe(takeUntil(this.destroy$)).subscribe({
                next: cs => {
                  this.classes = cs;
                  const matched = cs.find(c => (c.nome || '').toLowerCase() === (user.classe || '').toLowerCase());
                  if (matched) {
                    this.selectedClassId = matched.id;
                    this.loadRequisitos(this.selectedClassId as number);
                  } else if (cs.length) {
                    this.selectedClassId = cs[0].id;
                    this.loadRequisitos(this.selectedClassId as number);
                  }
                },
                error: e => console.error(e)
              });
            },
            error: err => {
              console.error(err);
              this.desbravadores = [];
            }
          });
      });
  }


  loadRequisitos(classId?: number) {
    if (!classId) return;
    this.classesService.getRequisitos(classId).pipe(takeUntil(this.destroy$)).subscribe({
      next: r => {
        this.requisitos = r;
      },
      error: e => {
        console.error(e);
        this.requisitos = [];
      }
    });
  }

  get selectedClassName(): string {
    const found = this.classes.find(c => c.id === this.selectedClassId);
    return found?.nome || this.currentUser?.classe || this.classes[0]?.nome || '';
  }

  toggleForm(reqId: number) {
    this.showingFormForReq[reqId] = !this.showingFormForReq[reqId];
    if (!this.selectedDesbravadoresForReq[reqId]) this.selectedDesbravadoresForReq[reqId] = new Set<number>();
    if (this.showingFormForReq[reqId]) {
      this.messageForReq[reqId] = '';
      // prefill selected set when editing an already-marked requisito
      const req = this.requisitos.find(r => r.id === reqId);
      if (req?.progresso?.length) {
        const set = new Set<number>();
        req.progresso.forEach((p: any) => {
          const desId = p.desbravador?.id || p.desbravadorId;
          if (desId) set.add(desId);
        });
        this.selectedDesbravadoresForReq[reqId] = set;
      }
    }
  }

  private getCurrentMarkedIds(reqId: number): number[] {
    const req = this.requisitos.find(r => r.id === reqId);
    if (!req?.progresso?.length) return [];
    return req.progresso.map((p: any) => p.desbravador?.id || p.desbravadorId).filter(Boolean);
  }

  saveChanges(reqId: number) {
    const selected = Array.from(this.selectedDesbravadoresForReq[reqId] || []);
    const current = this.getCurrentMarkedIds(reqId);

    const toAdd = selected.filter(id => !current.includes(id));
    const toRemove = current.filter(id => !selected.includes(id));

    const calls: any[] = [];
    if (toAdd.length) {
      const payload: any = { requisitoId: reqId, desbravadores: toAdd };
      if (this.currentUser?.id) payload.instrutorId = this.currentUser.id;
      calls.push(this.classesService.marcarRequisito(payload));
    }
    if (toRemove.length) {
      calls.push(this.classesService.desmarcarRequisito({ requisitoId: reqId, desbravadores: toRemove }));
    }

    if (!calls.length) {
      // nada mudou
      this.showingFormForReq[reqId] = false;
      this.messageForReq[reqId] = 'Nenhuma alteração.';
      return;
    }

    this.isProcessingForReq[reqId] = true;
    this.messageForReq[reqId] = '';

    forkJoin(calls.length ? calls : [of(null)]).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.isProcessingForReq[reqId] = false;
        this.showingFormForReq[reqId] = false;
        this.selectedDesbravadoresForReq[reqId] = new Set<number>();
        if (this.selectedClassId) this.loadRequisitos(this.selectedClassId);
        this.messageForReq[reqId] = 'Alterações salvas.';
      },
      error: e => {
        console.error(e);
        this.isProcessingForReq[reqId] = false;
        this.messageForReq[reqId] = 'Erro ao salvar alterações.';
      }
    });
  }

  toggleDesbravadorSelection(reqId: number, desId: number) {
    const s = this.selectedDesbravadoresForReq[reqId];
    if (!s) return;
    if (s.has(desId)) s.delete(desId);
    else s.add(desId);
  }

  marcar(reqId: number) {
    const selected = Array.from(this.selectedDesbravadoresForReq[reqId] || []);
    if (!selected.length) {
      this.messageForReq[reqId] = 'Selecione ao menos um desbravador.';
      return;
    }

    const payload: any = { requisitoId: reqId, desbravadores: selected };
    if (this.currentUser?.id) payload.instrutorId = this.currentUser.id;
    this.isProcessingForReq[reqId] = true;
    this.messageForReq[reqId] = '';

    this.classesService.marcarRequisito(payload).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.isProcessingForReq[reqId] = false;
        this.showingFormForReq[reqId] = false;
        this.selectedDesbravadoresForReq[reqId] = new Set<number>();
        if (this.selectedClassId) this.loadRequisitos(this.selectedClassId);
        this.messageForReq[reqId] = 'Requisito marcado com sucesso.';
      },
      error: e => {
        console.error(e);
        this.isProcessingForReq[reqId] = false;
        this.messageForReq[reqId] = 'Erro ao marcar requisito.';
      }
    });
  }
  
  desmarcar(reqId: number) {
    // se o usuário não selecionou ninguém, remove todos que cumpriram
    const selected = Array.from(this.selectedDesbravadoresForReq[reqId] || []);
    let toRemove: number[] = selected;
    if (!toRemove.length) {
      // pega todos os desbravadores que constam no progresso
      const req = this.requisitos.find(r => r.id === reqId);
      if (req?.progresso?.length) {
        toRemove = req.progresso.map((p: any) => p.desbravador?.id || p.desbravadorId).filter(Boolean);
      }
    }

    if (!toRemove.length) {
      this.messageForReq[reqId] = 'Nenhum desbravador selecionado para desmarcar.';
      return;
    }

    const payload = { requisitoId: reqId, desbravadores: toRemove };
    this.isProcessingForReq[reqId] = true;
    this.messageForReq[reqId] = '';
    this.classesService.desmarcarRequisito(payload).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.isProcessingForReq[reqId] = false;
        this.showingFormForReq[reqId] = false;
        this.selectedDesbravadoresForReq[reqId] = new Set<number>();
        if (this.selectedClassId) this.loadRequisitos(this.selectedClassId);
        this.messageForReq[reqId] = 'Requisito desmarcado com sucesso.';
      },
      error: e => {
        console.error(e);
        this.isProcessingForReq[reqId] = false;
        this.messageForReq[reqId] = 'Erro ao desmarcar requisito.';
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
