import { NgModule, LOCALE_ID, APP_INITIALIZER } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { PullToRefreshDirective } from './shared/directives/pull-to-refresh.directive';

// Angular Material modules
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule, MAT_DATE_LOCALE } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatSelectModule } from '@angular/material/select';
import { MatListModule } from '@angular/material/list';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';


import { AppComponent } from './app.component';

import { AppRoutingModule } from './app-routing.module';

import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideStorage, getStorage } from '@angular/fire/storage';
import { environment } from 'src/environments/environments';
import { RuntimeConfigService } from './core/runtime-config.service';
// import { CommonModule } from '@angular/common';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { CantinhoUnidadeComponent } from './pages/cantinho-unidade/cantinho-unidade.component';
import { UsersComponent } from './pages/users/users.component';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';
import { LoadingInterceptor } from './core/interceptors/loading.interceptor';
import { DesbravadorCardComponent } from './pages/desbravador-card/desbravador-card.component';
import { DesbravadorClasseCardComponent } from './pages/desbravador-classe-card/desbravador-classe-card.component';

import { CartoesClassesComponent } from './pages/cartoes-classes/cartoes-classes.component';
import { AtrasadosComponent } from './pages/atrasados/atrasados.component';
import { HeaderComponent } from './shared/components/header/header.component';
import { AvatarUrlPipe } from './shared/pipes/avatar-url.pipe';
import { AdminGraficosComponent } from './pages/dashboard/admin-graficos/admin-graficos.component';
import { GoogleChartsModule } from 'angular-google-charts';
import { ConselheiroGraficosComponent } from './pages/dashboard/conselheiro-graficos/conselheiro-graficos.component';
import { InstrutorGraficosComponent } from './pages/dashboard/instrutor-graficos/instrutor-graficos.component';
import { UserProfileComponent } from './pages/user-profile/user-profile.component';
import { TextosBiblicosComponent } from './pages/textos-biblicos/textos-biblicos.component';
import { ConfirmDialogComponent } from './shared/confirm-dialog/confirm-dialog.component';
import { MeritoTopComponent } from './pages/merito/merito-top.component';
import { MeritoService } from './services/merito.service';
import { MeritoPageComponent } from './pages/merito/merito-page.component';
import { CadastroDesbravadoresComponent } from './pages/cadastro-desbravadores/cadastro-desbravadores.component';
import { DesafioUnidadesComponent } from './pages/desafio-unidades/desafio-unidades.component';

registerLocaleData(localePt, 'pt-BR');

// Inicializa providers do Firebase apenas se existir configuração no environment.
const firebaseConfig = (environment as any).firebase;
const firebaseProviders = firebaseConfig ? [
  provideFirebaseApp(() => initializeApp(firebaseConfig)),
  provideAuth(() => getAuth()),
  provideFirestore(() => getFirestore()),
  provideStorage(() => getStorage()),
] : [];

@NgModule({
  declarations: [
    AppComponent,
    DashboardComponent,
    CantinhoUnidadeComponent,
    UsersComponent, DesbravadorCardComponent, DesbravadorClasseCardComponent, CartoesClassesComponent,
    AtrasadosComponent, HeaderComponent, AdminGraficosComponent, ConselheiroGraficosComponent, InstrutorGraficosComponent, UserProfileComponent, TextosBiblicosComponent
    , ConfirmDialogComponent,
    MeritoPageComponent,
    CadastroDesbravadoresComponent,
    PullToRefreshDirective,
    AvatarUrlPipe,
    DesafioUnidadesComponent,
    MeritoTopComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    ReactiveFormsModule,
    FormsModule,
    HttpClientModule,
    BrowserAnimationsModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatNativeDateModule,
    MatDialogModule,
    MatButtonModule,
    MatRadioModule,
    MatCardModule,
    MatIconModule,
    MatDividerModule,
    MatSelectModule,
    MatListModule,
    MatToolbarModule,
    MatSnackBarModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatMenuModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    ...firebaseProviders,
    GoogleChartsModule
  ],
  providers: [
    MeritoService,
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: LoadingInterceptor, multi: true },
    { provide: LOCALE_ID, useValue: 'pt-BR' },
    { provide: MAT_DATE_LOCALE, useValue: 'pt-BR' }
    ,{ provide: APP_INITIALIZER, useFactory: (rc: RuntimeConfigService) => () => rc.load(), deps: [RuntimeConfigService], multi: true }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
