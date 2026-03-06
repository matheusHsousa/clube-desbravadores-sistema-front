import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatBottomSheetRef, MAT_BOTTOM_SHEET_DATA } from '@angular/material/bottom-sheet';
import { PointsService } from 'src/app/services/points.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-edit-transaction-sheet',
  templateUrl: './edit-transaction-sheet.component.html',
  styleUrls: ['../cantinho-unidade.component.scss']
})
export class EditTransactionSheetComponent {
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

  constructor(
    private fb: FormBuilder,
    private bottomSheetRef: MatBottomSheetRef<EditTransactionSheetComponent>,
    @Inject(MAT_BOTTOM_SHEET_DATA) public data: any,
    private pointsService: PointsService,
    private snackBar: MatSnackBar
  ) {
    const tx = data?.tx || {};
    this.editForm = this.fb.group({
      reason: [tx.reason || '', Validators.required],
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
      await this.pointsService.editTransaction(this.data.tx.id, payload).toPromise();
      this.snackBar.open('Transação atualizada', 'OK', { duration: 2000 });
      this.bottomSheetRef.dismiss(true);
    } catch (e) {
      console.error('Erro ao salvar transação (sheet)', e);
      this.snackBar.open('Erro ao salvar', 'OK', { duration: 3000 });
    } finally {
      this.submitting = false;
    }
  }

  cancel() {
    this.bottomSheetRef.dismiss(false);
  }
}
