import { Component, OnInit, OnDestroy, HostListener, ViewChild, ViewChildren, QueryList, ElementRef, TemplateRef } from '@angular/core';
import { MatDrawer } from '@angular/material/sidenav';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from 'src/app/auth/auth.service';
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil, map, catchError } from 'rxjs/operators';
import { DesbravadoresService } from 'src/app/services/desbravadores.service';
import { PointsService } from 'src/app/services/points.service';
import { TextosBiblicosService } from 'src/app/services/textos-biblicos.service';
import { AtrasadosService } from 'src/app/services/atrasados.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { PushService } from 'src/app/services/push.service';
import { Router, NavigationEnd } from '@angular/router';
import { EditTransactionSheetComponent } from './edit-modal/edit-transaction-sheet.component';

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

	@ViewChildren('stepFirstInput', { read: ElementRef }) stepFirstInputs?: QueryList<ElementRef>;
	@ViewChild('stepperContainer', { read: ElementRef }) stepperHeaderElement?: ElementRef;
	@ViewChild('debtorsDialog') debtorsDialog!: TemplateRef<any>;
	@ViewChild('transactionsDialog') transactionsDialog!: TemplateRef<any>;
	@ViewChild('editDialog') editDialog!: TemplateRef<any>;
	@ViewChild('drawer') drawer!: MatDrawer;

	activeStepIndex = 0;
	transactions: any[] = [];
	editForm: FormGroup;
	editingTransactionId: number | null = null;
	tabIndex: number = 0;

	constructor(
		private fb: FormBuilder,
		private authService: AuthService,
		private desbravadoresService: DesbravadoresService,
		private pointsService: PointsService,
		private snackBar: MatSnackBar,
		private textosBiblicosService: TextosBiblicosService,
		private atrasadosService: AtrasadosService,
		private pushService: PushService,
		private dialog: MatDialog,
		private bottomSheet: MatBottomSheet,
		private host: ElementRef,
		private router: Router
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
			textoBiblico: [{ value: null, disabled: true }, Validators.required]
		});

		this.editForm = this.fb.group({
			reason: [null, Validators.required],
			sundayDate: [null, Validators.required],
			presence: [0],
			pontualidade: [0],
			uniforme: [0],
			material: [0],
			classe: [0],
			espEquipe: [0],
			disciplina: [0],
			textoBiblico: [{ value: 0, disabled: true }]
		});
	}

	private updateTabFromUrl(url?: string) {
		const u = url ?? this.router.url;
		if (u.endsWith('/tabela')) {
			this.tabIndex = 1;
			// se já temos a lista de desbravadores carregada, carregar pontos agora
			try { if (Array.isArray(this.desbravadores) && this.desbravadores.length) this.loadPointsForDesbravadores(this.desbravadores); } catch (e) { }
		} 
		else if (u.endsWith('/marcacao')) this.tabIndex = 2;
		else if (u.endsWith('/historico')) this.tabIndex = 3;
		else this.tabIndex = 0;
	}

	goToTab(i: number) {
		this.tabIndex = i;
		try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) { /* ignore */ }
	}

	get presentDesbravadores(): any[] {
		if (!this.desbravadores) return [];
		return this.desbravadores.filter(d => !this.absentMap?.[d.id]);
	}

	openTransactionsDialog() {
		const desId = Number(this.form.value.desbravadorId) || null;
		const sunday = this.form.value.sundayDate ? (this.form.value.sundayDate instanceof Date ? this.form.value.sundayDate.toISOString() : new Date(this.form.value.sundayDate).toISOString()) : null;
		const unidade = this.currentUser?.unidade ? Number(this.currentUser.unidade) : undefined;
		this.pointsService
			.listTransactions({ desbravadorId: desId || undefined, sundayDate: sunday || undefined, unidade: desId ? undefined : unidade })
			.pipe(takeUntil(this.destroy$))
			.subscribe(
				list => { this.transactions = Array.isArray(list) ? list : []; },
				err => { console.error('Erro ao listar transações', err); this.transactions = []; }
			);

		// Chamar /atrasados/historico somente quando houver filtro (desbravadorId ou data)
		const historicoFiltro: any = {};
		if (desId) historicoFiltro.desbravadorId = desId;
		if (sunday) historicoFiltro.data = new Date(sunday);
		if (Object.keys(historicoFiltro).length) {
			this.atrasadosService.listarHistorico(historicoFiltro).pipe(takeUntil(this.destroy$)).subscribe(rows => {
				const deve = Array.isArray(rows) && rows.length > 0;
				this.textoBiblicoDevedor = deve;
				this.form.controls['textoBiblico'].setValue(deve ? -20 : 0, { emitEvent: false });
				this.form.controls['textoBiblico'].disable({ emitEvent: false });
			}, err => {
				this.textoBiblicoDevedor = false;
				this.form.controls['textoBiblico'].setValue(0, { emitEvent: false });
				this.form.controls['textoBiblico'].disable({ emitEvent: false });
			});
		}
	}

	openEditDialog(tx: any) {
		try {
			const isMobile = (window && window.innerWidth && window.innerWidth < 600);
			if (isMobile) {
				try { this.bottomSheet.open(EditTransactionSheetComponent, { data: { tx } }); }
				catch (e) { this.dialog.open(this.editDialog, { data: { tx }, width: '100%', maxWidth: '100%' }); }
				return;
			}

			this.editForm.patchValue({
				reason: tx.reason || '',
				sundayDate: tx.sundayDate ? new Date(tx.sundayDate) : null,
				presence: tx.presence ?? 0,
				pontualidade: tx.pontualidade ?? 0,
				uniforme: tx.uniforme ?? 0,
				material: tx.material ?? 0,
				classe: tx.classe ?? 0,
				espEquipe: tx.espEquipe ?? 0,
				disciplina: tx.disciplina ?? 0,
				textoBiblico: tx.textoBiblico ?? 0
			});
			this.editingTransactionId = tx.id;
			try { this.drawer.open(); } catch (e) { /* ignore */ }
			for (const k of ['presence', 'pontualidade', 'uniforme', 'material', 'classe', 'espEquipe', 'disciplina', 'textoBiblico']) {
				const c = this.editForm.get(k);
				if (c) c.enable({ emitEvent: false });
			}
			try { this.editForm.controls['textoBiblico'].disable({ emitEvent: false }); } catch (e) { /* ignore */ }
		} catch (e) { console.error(e); }
	}

	async saveEditedTransaction() {
		if (this.editForm.invalid) return;
		const txId = this.editingTransactionId;
		if (!txId) return;
		const values = this.editForm.getRawValue();
		const payload: any = {
			reason: values.reason,
			sundayDate: values.sundayDate ? (values.sundayDate instanceof Date ? values.sundayDate.toISOString() : new Date(values.sundayDate).toISOString()) : null,
			presence: Number(values.presence) || 0,
			pontualidade: Number(values.pontualidade) || 0,
			uniforme: Number(values.uniforme) || 0,
			material: Number(values.material) || 0,
			classe: Number(values.classe) || 0,
			espEquipe: Number(values.espEquipe) || 0,
			disciplina: Number(values.disciplina) || 0,
			textoBiblico: Number(values.textoBiblico) || 0
		};
		try {
			this.submitting = true;
			await this.pointsService.editTransaction(txId, payload).toPromise();
			this.snackBar.open('Transação atualizada', 'OK', { duration: 2000 });
			try { this.drawer.close(); } catch (e) { /* ignore */ }
			this.editingTransactionId = null;
			this.openTransactionsDialog();
			this.refreshPoints();
		} catch (e) {
			console.error('Erro ao salvar transação', e);
			this.snackBar.open('Erro ao salvar', 'OK', { duration: 3000 });
		} finally { this.submitting = false; }
	}

	setAbsent(id: number, value: boolean) { try { this.absentMap = { ...this.absentMap, [Number(id)]: !!value }; } catch (e) { /* ignore */ } }

	ngOnInit(): void {
		this.updateStepperOrientation();
		const year = new Date().getFullYear();
		this.sundays = this.getSundaysOfYear(year);
		try { this.updateTabFromUrl(); } catch (e) { /* ignore */ }
		this.router.events.subscribe(ev => { if (ev instanceof NavigationEnd) this.updateTabFromUrl(ev.urlAfterRedirects); });

		this.authService.currentUser$.pipe(takeUntil(this.destroy$)).subscribe(user => {
			this.currentUser = user;
			try {
				const roles = user?.roles;
				if (Array.isArray(roles) && roles.includes('CONSELHEIRO')) {
					const userId = user?.id != null ? String(user.id) : null;
					this.pushService.subscribe(userId, 'CONSELHEIRO');
				}
			} catch (e) { console.warn('Push subscribe attempt failed', e); }
			if (!user?.unidade) { this.desbravadores = []; return; }

			this.desbravadoresService.list({ unidade: user.unidade }).pipe(takeUntil(this.destroy$)).subscribe({
				next: list => {
					this.desbravadores = list;
					this.initQuickScores(list);
					// carregar pontos apenas se estivermos na aba 'tabela'
					if (this.tabIndex === 1) this.loadPointsForDesbravadores(list);
					this.loadDebtorsForUnit(list);
				},
				error: err => { console.error(err); this.desbravadores = []; }
			});
		});

		this.form.get('desbravadorId')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((id: number) => {
			this.currentPoints = null;
			if (!id) return;
			const cached = this.pointsMap?.[Number(id)];
			this.currentPoints = { total: cached ?? 0 };
			// Não buscar histórico automaticamente para evitar muitas requisições.
			// O histórico de atrasados será consultado apenas quando o usuário clicar em 'Buscar marcações'.
			this.textoBiblicoDevedor = false;
			try { this.form.controls['textoBiblico'].setValue(0, { emitEvent: false }); this.form.controls['textoBiblico'].disable({ emitEvent: false }); } catch (e) { }
		});
	}

	loadDebtorsForUnit(list: any[]) {
		try {
			if (!this.currentUser || !this.currentUser.id) { this.debtors = []; return; }

			// Request only debtors relevant to the current user (conselheiro) on the server
			this.textosBiblicosService.buscarMeusAtrasados(this.currentUser.id).pipe(takeUntil(this.destroy$)).subscribe(all => {
				const ids = new Set((list || []).map(d => Number(d.id)));
				this.debtors = Array.isArray(all) ? all.filter(a => a && a.tipo === 'desbravador' && ids.has(Number(a.pessoa?.id))) : [];

				// Update quickScores for textoBiblico: mark -20 for debtors, 0 otherwise
				try {
					if (!this.quickScores) this.quickScores = {};
					if (!this.quickScores['textoBiblico']) this.quickScores['textoBiblico'] = {};
					const debtorIds = new Set((this.debtors || []).map(d => Number(d.pessoa?.id)));
					for (const d of list || []) {
						const id = Number(d.id);
						this.quickScores['textoBiblico'][id] = debtorIds.has(id) ? -20 : 0;
						this.textoBiblicoDisabled[id] = true;
					}
				} catch (e) { /* ignore */ }
			}, err => { this.debtors = []; });
		} catch (e) { this.debtors = []; }
	}

	openDebtorsDialog() { try { if (!this.debtors || !this.debtors.length) return; this.dialog.open(this.debtorsDialog, { width: '360px' }); } catch (e) { /* ignore */ } }

	@HostListener('window:resize')
	updateStepperOrientation() { try { this.stepperOrientation = (window && window.innerWidth && window.innerWidth < 600) ? 'vertical' : 'horizontal'; } catch (e) { this.stepperOrientation = 'horizontal'; } }

	nextStep() { try { const max = (this.quickItems?.length ?? 0); if (this.activeStepIndex < max) this.activeStepIndex++; setTimeout(() => this.scrollToActiveStepHeader(), 0); setTimeout(() => { try { const el = document.querySelector('.stepper-headers') as HTMLElement | null; if (el && typeof el.scrollIntoView === 'function') { el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' }); } } catch (e) { /* ignore */ } }, 50); setTimeout(() => { this.scrollToActiveStepContent(); this.focusFirstInActiveStep(); }, 180); } catch (e) { console.warn(e); } }

	previousStep() { try { if (this.activeStepIndex > 0) this.activeStepIndex--; setTimeout(() => this.scrollToActiveStepHeader(), 0); setTimeout(() => { try { const el = document.querySelector('.stepper-headers') as HTMLElement | null; if (el && typeof el.scrollIntoView === 'function') { el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' }); } } catch (e) { /* ignore */ } }, 50); setTimeout(() => { this.scrollToActiveStepContent(); this.focusFirstInActiveStep(); }, 180); } catch (e) { console.warn(e); } }

	onStepChange(event: any) { }

	goToStep(i: number) { const max = (this.quickItems?.length ?? 0); if (i < 0) i = 0; if (i > max) i = max; this.activeStepIndex = i; setTimeout(() => this.scrollToActiveStepHeader(), 0); setTimeout(() => { this.scrollToActiveStepContent(); this.focusFirstInActiveStep(); }, 180); }

	private scrollToActiveStepContent() { try { const idx = this.activeStepIndex ?? 0; const host = this.host?.nativeElement as HTMLElement | null; const panels = host ? host.querySelectorAll('.step-panel') as NodeListOf<HTMLElement> : document.querySelectorAll('.step-panel') as NodeListOf<HTMLElement>; const panel = panels?.[idx] as HTMLElement | undefined; if (panel) { const rect = panel.getBoundingClientRect(); const headerOffset = 72; const target = rect.top + window.pageYOffset - headerOffset - 8; window.scrollTo({ top: target, behavior: 'smooth' }); } } catch (e) { /* ignore */ } }

	private scrollToActiveStepHeader() { try { const idx = this.activeStepIndex ?? 0; const headerContainer = (this.stepperHeaderElement?.nativeElement as HTMLElement | null) || (this.host?.nativeElement && (this.host.nativeElement.querySelector('.stepper-headers, .mat-horizontal-stepper-header, .mat-mdc-stepper-header, .mat-stepper-header') as HTMLElement)) || document.querySelector('.stepper-headers, .mat-horizontal-stepper-header, .mat-mdc-stepper-header, .mat-stepper-header') as HTMLElement; if (!headerContainer) return; const selector = `[data-step="${idx}"]`; const header = headerContainer.querySelector(selector) as HTMLElement | null; if (header) { try { const container = headerContainer as HTMLElement; const headerCenter = header.offsetLeft + (header.offsetWidth / 2); const targetScrollLeft = Math.max(0, headerCenter - (container.clientWidth / 2)); if (typeof container.scrollTo === 'function') { container.scrollTo({ left: targetScrollLeft, behavior: 'smooth' }); return; } if (typeof header.scrollIntoView === 'function') { header.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }); } } catch (e) { /* ignore */ } } } catch (e) { } }

	private focusFirstInActiveStep() { try { const idx = this.activeStepIndex ?? 0; const arr = this.stepFirstInputs?.toArray() ?? []; const elRef = arr[idx]; if (elRef && elRef.nativeElement) { try { const el = elRef.nativeElement as HTMLElement; if (typeof el.focus === 'function') { el.focus(); return; } const inner = el.querySelector<HTMLElement>('select, input, button, [tabindex]'); if (inner && typeof inner.focus === 'function') { inner.focus(); return; } } catch (e) { /* ignore */ } } try { const host = this.host?.nativeElement as HTMLElement | null; if (host) { const steps = host.querySelectorAll('.step-panel, .mat-step, .mat-stepper-content'); const panel = steps?.[idx] as HTMLElement | undefined; const root = panel ?? host.querySelector('.stepper-content') ?? host; if (root) { const first = root.querySelector<HTMLElement>('select, input, textarea, button, [tabindex]'); if (first && typeof first.focus === 'function') { first.focus(); return; } } } } catch (e) { } } catch (e) { } }

	getQuickTotal(desbId: number): number { if (!this.quickScores || !this.desbravadores) return 0; if (this.absentMap?.[Number(desbId)]) return 0; let sum = 0; for (const key of Object.keys(this.quickScores)) { sum += Number(this.quickScores[key]?.[Number(desbId)] ?? 0); } return sum; }

	getDesbravadorName(tx: any): string { try { const name = tx?.points?.desbravador?.name; if (name) return name; const id = tx?.points?.desbravadorId ?? tx?.points?.desbravadorId; if (!id) return '-'; const d = (this.desbravadores || []).find((x: any) => Number(x.id) === Number(id)); return d?.name || String(id); } catch (e) { return '-'; } }


    

	private loadPointsForDesbravadores(list: any[]) {
		if (!list || !list.length) { this.pointsMap = {}; return; }
		this.pointsLoading = true;
		const ids = list.map(d => Number(d.id)).filter(Boolean);
		this.pointsService.getByDesbravadorBatch(ids).pipe(takeUntil(this.destroy$)).subscribe(resultMap => {
			try {
				const map: Record<number, number> = {};
				for (const id of ids) {
					const p = resultMap && resultMap[String(id)];
					map[id] = (p && typeof p.total === 'number') ? p.total : 0;
				}
				this.pointsMap = map;
			} catch (e) {
				this.pointsMap = {};
			}
			this.pointsLoading = false;
		}, err => {
			console.error('Erro ao carregar pontos (batch):', err);
			this.pointsMap = {};
			this.pointsLoading = false;
		});
	}

	refreshPoints() { if (!this.desbravadores || !this.desbravadores.length) return; this.loadPointsForDesbravadores(this.desbravadores); }

	private initQuickScores(list: any[]) {
		this.quickScores = {};
		this.textoBiblicoDisabled = {};
		this.absentMap = {};

		for (const item of this.quickItems) {
			this.quickScores[item.key] = {};
			const defaultOption = (this.getOptions(item.key) || [0])[0] ?? 0;
			for (const d of list) {
				const id = Number(d.id);
				this.quickScores[item.key][id] = Number(defaultOption) || 0;
				if (item.key === 'textoBiblico') this.textoBiblicoDisabled[id] = true;
				this.absentMap[id] = false;
			}
		}

		try {
			const isAdmin = Array.isArray(this.currentUser?.roles) && this.currentUser.roles.includes('ADMIN');
			const observables = list.map(d => {
				const id = Number(d.id);
				// Não chamar /atrasados/historico automaticamente para evitar muitas requisições.
				// Assumir inicialmente que não há débito e preencher depois quando o usuário solicitar.
				return of({ id, deve: false });
			});

			forkJoin(observables).pipe(takeUntil(this.destroy$)).subscribe((results: any[]) => {
				for (const r of results) {
					const id = Number(r.id);
					const deve = !!r.deve;
					if (!this.quickScores['textoBiblico']) this.quickScores['textoBiblico'] = {};
					this.quickScores['textoBiblico'][id] = deve ? -20 : 0;
					this.textoBiblicoDisabled[id] = true;
				}
			}, err => {
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

		// If presence set to 0, mark as absent: remove from other steppers and prevent sending
		if (itemKey === 'presence') {
			const isAbsent = Number(value) === 0;
			this.absentMap = { ...this.absentMap, [Number(desbId)]: !!isAbsent };
			try {
				if (isAbsent) {
					for (const k of Object.keys(this.quickScores)) {
						if (k === 'presence') continue;
						if (!this.quickScores[k]) this.quickScores[k] = {};
						this.quickScores[k][Number(desbId)] = 0;
					}
					this.textoBiblicoDisabled[Number(desbId)] = true;
				} else {
					// when re-enabling presence, keep other scores at 0 but clear absent flag
					this.textoBiblicoDisabled[Number(desbId)] = true;
				}
			} catch (e) { /* ignore */ }
		}
	}

	getOptions(itemKey: string): number[] {
		switch (itemKey) {
			case 'presence': return this.presenceOptions;
			case 'pontualidade': return this.pontualidadeOptions;
			case 'uniforme': return this.uniformeOptions;
			case 'material': return this.materialOptions;
			case 'classe': return this.classeOptions;
			case 'espEquipe': return this.espEquipeOptions;
			case 'disciplina': return this.disciplinaOptions;
			case 'textoBiblico': return this.textoBiblicoOptions;
			default: return [10, 5, 0];
		}
	}

	async saveQuickMarks() {
		if (!this.desbravadores || !this.desbravadores.length) return;
		if (!this.form?.value?.sundayDate) {
			this.snackBar.open('Selecione uma data (domingo) antes de salvar', 'OK', { duration: 3000 });
			return;
		}
		this.submittingQuick = true;
		this.successMessage = '';
		try {
			const payloads: any[] = [];
			for (const d of this.desbravadores) {
				if (this.absentMap?.[Number(d.id)]) continue;
				const id = Number(d.id);
				let total = 0;
				for (const item of this.quickItems) {
					total += Number(this.getQuickScore(item.key, id) || 0);
				}
				if (total === 0) continue;
				const sunday = this.form?.value?.sundayDate;
				const sundayIso = sunday ? (sunday instanceof Date ? sunday.toISOString() : new Date(sunday).toISOString()) : undefined;
				const payload: any = { desbravadorId: id, reason: `Marcação rápida - Cantinho da Unidade`, authorId: this.currentUser?.id, sundayDate: sundayIso };
				for (const key of Object.keys(this.quickScores)) { payload[key] = Number(this.getQuickScore(key, id) || 0); }
				payloads.push(payload);
			}
			if (payloads.length) await this.pointsService.adjustBatch(payloads).toPromise();
			this.successMessage = 'Marcações salvas com sucesso.';
			this.refreshPoints();
			try {
				this.initQuickScores(this.desbravadores || []);
				this.activeStepIndex = 0;
				this.absentMap = {};
				setTimeout(() => {
					try { this.scrollToActiveStepHeader(); } catch (e) { }
					try { this.scrollToActiveStepContent(); } catch (e) { }
					try { this.focusFirstInActiveStep(); } catch (e) { }
				}, 50);
			} catch (e) { }
		} catch (err) {
			console.error('Erro ao salvar marcações rápidas', err);
		} finally { this.submittingQuick = false; }
	}

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

	public setSundayByOffset(offsetWeeks: number) {
		const currentVal: Date | null = this.form.value.sundayDate;
		let d = currentVal ? new Date(currentVal) : new Date();
		if (d.getDay() !== 0) { d.setDate(d.getDate() - ((d.getDay() + 7) % 7)); }
		d.setDate(d.getDate() + offsetWeeks * 7);
		if (this.sundays && this.sundays.length) {
			const first = this.sundays[0];
			const last = this.sundays[this.sundays.length - 1];
			if (d < first) { this.form.controls['sundayDate'].setValue(first); return; }
			if (d > last) { this.form.controls['sundayDate'].setValue(last); return; }
		}
		this.form.controls['sundayDate'].setValue(d);
		this.form.controls['sundayDate'].setErrors(null);
	}

	ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

	private getSundaysOfYear(year: number): Date[] { const dates: Date[] = []; let d = new Date(year, 0, 1); const day = d.getDay(); if (day !== 0) { d.setDate(d.getDate() + ((7 - day) % 7)); } while (d.getFullYear() === year) { dates.push(new Date(d)); d = new Date(d); d.setDate(d.getDate() + 7); } return dates; }

	onlySundays = (d: Date | null): boolean => { if (!d) return true; return d.getDay() === 0; }

	async onSubmit() {
		if (this.form.invalid) return;
		this.submitting = true;
		this.successMessage = '';
		try {
			const payload = this.form.getRawValue();
			payload.total = this.total;
			const desbravadorId = Number(payload.desbravadorId);
			const sunday = payload.sundayDate;
			const sundayIso = sunday ? (sunday instanceof Date ? sunday.toISOString() : new Date(sunday).toISOString()) : undefined;
			const adjustPayload: any = { desbravadorId, reason: `Cantinho da Unidade - ${payload.sundayDate}`, authorId: this.currentUser?.id, sundayDate: sundayIso };
			const keys = ['presence', 'pontualidade', 'uniforme', 'material', 'classe', 'espEquipe', 'disciplina', 'textoBiblico'];
			for (const k of keys) adjustPayload[k] = Number(payload[k]) || 0;
			await this.pointsService.adjust(adjustPayload).toPromise();
			this.successMessage = 'Pontuação registrada com sucesso.';
			this.pointsService.getByDesbravador(desbravadorId).pipe(takeUntil(this.destroy$)).subscribe(p => {
				this.currentPoints = p;
				const totalSaldo = p?.total ?? (this.pointsMap[desbravadorId] ?? 0) + payload.total;
				this.pointsMap = { ...this.pointsMap, [desbravadorId]: totalSaldo };
				this.rowUpdatedId = desbravadorId;
				setTimeout(() => this.rowUpdatedId = null, 2500);
				this.refreshPoints();
			});
			this.form.reset();
			try { this.form.controls['textoBiblico'].enable({ emitEvent: false }); this.form.controls['textoBiblico'].setValue(0, { emitEvent: false }); } catch (e) { }
		} catch (err) { console.error(err); } finally { this.submitting = false; }
	}

	get total(): number {
		const v = (this.form.getRawValue && this.form.getRawValue()) || this.form.value || {};
		const keys = ['presence', 'pontualidade', 'uniforme', 'material', 'classe', 'espEquipe', 'disciplina', 'textoBiblico'];
		return keys.reduce((acc, k) => {
			const val = Number(v[k]);
			return acc + (Number.isFinite(val) ? val : 0);
		}, 0);
	}
}


