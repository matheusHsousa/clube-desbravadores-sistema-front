import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatDialogModule } from '@angular/material/dialog';
import { MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { CantinhoUnidadeComponent } from './components/cantinho-unidade.component';
import { TabelaComponent } from './components/tabela/tabela.component';
import { MarcacaoComponent } from './components/marcacao/marcacao.component';
import { HistoricoComponent } from './components/historico/historico.component';
import { EditTransactionSheetComponent } from './components/edit-modal/edit-transaction-sheet.component';
import { CantinhoUnidadeRoutingModule } from './cantinho-unidade-routing.module';

@NgModule({
  declarations: [
    CantinhoUnidadeComponent,
    TabelaComponent,
    MarcacaoComponent,
    HistoricoComponent
    , EditTransactionSheetComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CantinhoUnidadeRoutingModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatNativeDateModule,
    MatButtonModule,
    MatRadioModule,
    MatCardModule,
    MatIconModule,
    MatSelectModule,
    MatListModule,
    MatSidenavModule,
    MatDialogModule,
    MatBottomSheetModule,
    MatTabsModule,
    MatTableModule
  ]
})
export class CantinhoUnidadeModule {}
