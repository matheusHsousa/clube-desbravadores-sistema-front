import { OnInit, OnDestroy, HostListener, ViewChild, TemplateRef, Directive } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from 'src/app/auth/auth.service';
import { DesbravadoresService } from 'src/app/services/desbravadores.service';
import { PointsService } from 'src/app/services/points.service';
import { TextosBiblicosService } from 'src/app/services/textos-biblicos.service';
import { AtrasadosService } from 'src/app/services/atrasados.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { PushService } from 'src/app/services/push.service';

@Directive()
export class CantinhoUnidadeBase implements OnInit, OnDestroy {
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
  public textoBiblicoMessage = 'Por dever texto bíblico deduzirá 20 pontos';
  presenceOptions = [10, 0];
  pontualidadeOptions = [5, 0];
  uniformeOptions = [10, 5, 0];
  materialOptions = [10, 5, 0];
  classeOptions = [10, 5, 0];
  espEquipeOptions = [10, 5, 0];
  disciplinaOptions = [10, 5, 0];
  textoBiblicoOptions = [0, -20];

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
  absentMap: Record<number, boolean> = {};
  debtors: any[] = [];
  submittingQuick = false;
  stepperOrientation: 'horizontal' | 'vertical' = 'horizontal';
  @ViewChild('debtorsDialog') debtorsDialog!: TemplateRef<any>;
  @ViewChild('transactionsDialog') transactionsDialog!: TemplateRef<any>;
  activeStepIndex = 0;
  transactions: any[] = [];
  // editForm and editingTransactionId removed — edit handled by EditTransactionSheetComponent
  tabIndex = 0;

  constructor(
    protected fb: FormBuilder,
    protected authService: AuthService,
    protected desbravadoresService: DesbravadoresService,
    protected pointsService: PointsService,
    protected snackBar: MatSnackBar,
    protected textosBiblicosService: TextosBiblicosService,
    protected atrasadosService: AtrasadosService,
    protected pushService: PushService,
    protected dialog: MatDialog,
    protected bottomSheet: MatBottomSheet,
    
  ) {
    this.form = this.fb.group({
      sundayDate: [null, Validators.required],
      desbravadorId: [null, Validators.required],
      presence: [null, Validators.required],
      pontualidade: [null, Validators.required],
      uniforme: [null, Validators.required],
      material: [null, Validators.required],
      classe: [null, Validators.required],
      espEquipe: [null, Validators.required],
      disciplina: [null, Validators.required],
      textoBiblico: [null, Validators.required]
    });

    // edit form is now managed inside EditTransactionSheetComponent
  }

  ngOnInit(): void {}
  ngOnDestroy(): void { try { this.destroy$.next(); this.destroy$.complete(); } catch (e) { } }

  goToTab(i: number) { this.tabIndex = i; try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) { } }
}
