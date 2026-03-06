import { Component, Inject, Optional, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatBottomSheetRef, MAT_BOTTOM_SHEET_DATA } from '@angular/material/bottom-sheet';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { PointsService } from 'src/app/services/points.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-edit-transaction-sheet',
  templateUrl: './edit-transaction-sheet.component.html',
  styleUrls: ['./edit-transaction-sheet.component.scss']
})
export class EditTransactionSheetComponent {
  @ViewChild('sheet', { static: true }) sheetRef!: ElementRef<HTMLDivElement>;
  editForm: FormGroup;
  submitting = false;
  presenceOptions = [10, 0];
  pontualidadeOptions = [5, 0];
  uniformeOptions = [10, 5, 0];
  materialOptions = [10, 5, 0];
  classeOptions = [10, 5, 0];
  espEquipeOptions = [10, 5, 0];
  disciplinaOptions = [10, 5, 0];
  textoBiblicoOptions = [0, -20];
  private txId: number | null = null;
  private dragging = false;
  private startY = 0;
  private currentY = 0;
  private boundPointerMove = (e: PointerEvent) => this.onPointerMove(e);
  private boundPointerUp = (e: PointerEvent) => this.onPointerUp(e);
  private closing = false;

  constructor(
    private fb: FormBuilder,
    @Optional() private bottomSheetRef: MatBottomSheetRef<EditTransactionSheetComponent>,
    @Optional() @Inject(MAT_BOTTOM_SHEET_DATA) public bottomData: any,
    @Optional() private dialogRef: MatDialogRef<EditTransactionSheetComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) public dialogData: any,
    private pointsService: PointsService,
    private snackBar: MatSnackBar
  ) {
    const data = this.bottomData || this.dialogData || {};
    const tx = data?.tx || {};
    this.txId = tx?.id ?? null;
    this.editForm = this.fb.group({
      sundayDate: [tx.sundayDate ? new Date(tx.sundayDate) : null, Validators.required],
      presence: [tx.presence ?? 0],
      pontualidade: [tx.pontualidade ?? 0],
      uniforme: [tx.uniforme ?? 0],
      material: [tx.material ?? 0],
      classe: [tx.classe ?? 0],
      espEquipe: [tx.espEquipe ?? 0],
      disciplina: [tx.disciplina ?? 0],
      textoBiblico: [{ value: tx.textoBiblico ?? 0, disabled: true }]
    });
  }

  startDrag(ev: PointerEvent) {
    if (this.closing) return;
    // Only enable dragging on mobile (small screens / touch devices)
    if (!this.isMobile()) return;
    this.dragging = true;
    this.startY = ev.clientY;
    this.currentY = 0;
    try { this.sheetRef.nativeElement.setPointerCapture?.(ev.pointerId); } catch {}
    window.addEventListener('pointermove', this.boundPointerMove);
    window.addEventListener('pointerup', this.boundPointerUp);
    this.sheetRef.nativeElement.style.transition = 'none';
  }

  private isMobile(): boolean {
    try {
      return typeof window !== 'undefined' && (window.matchMedia?.('(max-width: 680px)')?.matches ?? window.navigator.maxTouchPoints > 0);
    } catch {
      return false;
    }
  }

  private onPointerMove(ev: PointerEvent) {
    if (!this.dragging) return;
    const dy = ev.clientY - this.startY;
    if (dy <= 0) return; // only drag down
    this.currentY = dy;
    this.sheetRef.nativeElement.style.transform = `translateY(${dy}px)`;
    const dim = Math.min(1, dy / 400);
    this.sheetRef.nativeElement.style.opacity = `${Math.max(0.45, 1 - dim)}`;
  }

  private onPointerUp(_ev: PointerEvent) {
    if (!this.dragging) return;
    this.dragging = false;
    window.removeEventListener('pointermove', this.boundPointerMove);
    window.removeEventListener('pointerup', this.boundPointerUp);
    const dy = this.currentY;
    const threshold = 120; // px to close
    this.sheetRef.nativeElement.style.transition = 'transform 180ms ease, opacity 180ms ease';
    if (dy > threshold) {
      this.closing = true;
      this.sheetRef.nativeElement.style.transform = `translateY(100%)`;
      this.sheetRef.nativeElement.style.opacity = '0';
      setTimeout(() => {
        if (this.bottomSheetRef) this.bottomSheetRef.dismiss(false);
        if (this.dialogRef) this.dialogRef.close(false);
      }, 180);
    } else {
      // revert
      this.sheetRef.nativeElement.style.transform = `translateY(0)`;
      this.sheetRef.nativeElement.style.opacity = '1';
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

  onlySundays = (d: Date | null): boolean => { if (!d) return true; return d.getDay() === 0; }

  async save() {
    if (this.editForm.invalid) return;
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
      const id = this.txId;
      if (!id) throw new Error('transaction id missing');
      await this.pointsService.editTransaction(id, payload).toPromise();
      this.snackBar.open('Transação atualizada', 'OK', { duration: 2000 });
      if (this.bottomSheetRef) this.bottomSheetRef.dismiss(true);
      if (this.dialogRef) this.dialogRef.close(true);
    } catch (e) {
      console.error('Erro ao salvar transação (sheet)', e);
      this.snackBar.open('Erro ao salvar', 'OK', { duration: 3000 });
    } finally {
      this.submitting = false;
    }
  }

  cancel() {
    if (this.bottomSheetRef) this.bottomSheetRef.dismiss(false);
    if (this.dialogRef) this.dialogRef.close(false);
  }
}
