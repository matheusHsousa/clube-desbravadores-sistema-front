import { Component, OnInit } from '@angular/core';
import { TextosBiblicosService } from 'src/app/services/textos-biblicos.service';
import { AuthService } from 'src/app/auth/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { environment } from 'src/environments/environments';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-textos-biblicos',
  templateUrl: './textos-biblicos.component.html',
  styleUrls: ['./textos-biblicos.component.scss']
})
export class TextosBiblicosComponent implements OnInit {
  devedores: any[] = [];
  textosPendentes: any[] = [];
  loading = false;
  uploading = false;
  displayedColumns: string[] = ['pessoa', 'totalAtrasados', 'textosAprovados', 'textosPendentes', 'acoes'];
  displayedColumnsPendentes: string[] = ['pessoa', 'imagem', 'dataEnvio', 'acoes'];
  // Uploads agora são feitos pelo backend (/upload/texto)
  selectedImageUrl: string | null = null;
  isAdmin = false;
  isConselheiro = false;
  currentUserId: number | null = null;

  constructor(
    private textosBiblicosService: TextosBiblicosService,
    private snackBar: MatSnackBar,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.auth.currentUser$.subscribe(user => {
      this.isAdmin = !!(user && user.roles && user.roles.includes('ADMIN'));
      this.isConselheiro = !!(user && user.roles && user.roles.includes('CONSELHEIRO'));
      this.currentUserId = user?.id ?? null;
      this.loadAll();
    });
  }

  loadAll(): void {
    this.loading = true;

    // If conselheiro, load only devedores da sua unidade via endpoint 'meus-atrasados'
    if (this.isConselheiro && this.currentUserId) {
      this.textosBiblicosService.buscarMeusAtrasados(this.currentUserId).subscribe(
        devedores => {
          this.devedores = Array.isArray(devedores) ? devedores : [];
          this.loading = false;
        },
        () => {
          this.devedores = [];
          this.loading = false;
          this.snackBar.open('Erro ao carregar devedores', 'Fechar', { duration: 3000 });
        }
      );
    } else {
      // Admin or others: load all devedores
      this.textosBiblicosService.listarDevedores().subscribe(
        devedores => {
          this.devedores = Array.isArray(devedores) ? devedores : [];
          this.loading = false;
        },
        () => {
          this.devedores = [];
          this.loading = false;
          this.snackBar.open('Erro ao carregar devedores', 'Fechar', { duration: 3000 });
        }
      );
    }

    // Only admins see pending approvals
    if (this.isAdmin) {
      this.textosBiblicosService.listarTextosPendentes().subscribe(
        textos => {
          this.textosPendentes = Array.isArray(textos) ? textos : [];
        },
        () => {
          this.textosPendentes = [];
          this.snackBar.open('Erro ao carregar textos pendentes', 'Fechar', { duration: 3000 });
        }
      );
    } else {
      this.textosPendentes = [];
    }
  }

  async onFileSelected(event: any, atrasadoId: number): Promise<void> {
    const input = event?.target;
    if (!input) return;

    // Prevenir chamadas duplicadas se já estiver enviando
    if (this.uploading) {
      input.value = '';
      return;
    }

    const file: File | undefined = input.files && input.files[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      this.snackBar.open('Por favor, selecione uma imagem', 'Fechar', { duration: 3000 });
      input.value = '';
      return;
    }

    // Validar tamanho (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      this.snackBar.open('Imagem muito grande. Máximo 5MB', 'Fechar', { duration: 3000 });
      input.value = '';
      return;
    }

    this.uploading = true;
    input.disabled = true;

    try {
      const form = new FormData();
      form.append('file', file);
      form.append('atrasadoId', String(atrasadoId));

      const resp: any = await firstValueFrom(this.textosBiblicosService.uploadTexto(form));
      const downloadURL = resp?.url;
      if (!downloadURL) throw new Error('Upload retornou sem URL');

      await firstValueFrom(this.textosBiblicosService.enviarTexto(atrasadoId, downloadURL));

      this.snackBar.open('Texto enviado com sucesso! Aguarde aprovação.', 'Fechar', { duration: 3000 });
      this.loadAll();
    } catch (err) {
      console.error('Upload error (via backend):', err);
      this.snackBar.open('Erro ao enviar texto', 'Fechar', { duration: 3000 });
    } finally {
      this.uploading = false;
      try { input.value = ''; input.disabled = false; } catch(e) { /* ignore */ }
    }
  }

  aprovarTexto(textoId: number): void {
    if (!confirm('Deseja aprovar este texto bíblico?')) return;

    this.textosBiblicosService.aprovarTexto(textoId).subscribe(
      () => {
        this.snackBar.open('Texto aprovado!', 'Fechar', { duration: 3000 });
        this.loadAll();
      },
      () => {
        this.snackBar.open('Erro ao aprovar texto', 'Fechar', { duration: 3000 });
      }
    );
  }

  rejeitarTexto(textoId: number): void {
    if (!confirm('Deseja rejeitar este texto bíblico? A foto será excluída.')) return;

    this.textosBiblicosService.rejeitarTexto(textoId).subscribe(
      () => {
        this.snackBar.open('Texto rejeitado', 'Fechar', { duration: 3000 });
        this.loadAll();
      },
      () => {
        this.snackBar.open('Erro ao rejeitar texto', 'Fechar', { duration: 3000 });
      }
    );
  }

  getNomePessoa(item: any): string {
    if (item.atrasado?.user?.name) {
      return item.atrasado.user.name;
    }
    if (item.atrasado?.desbravador?.name) {
      return `${item.atrasado.desbravador.name} (Desbravador)`;
    }
    return 'Nome não disponível';
  }

  formatarData(data: string): string {
    const date = new Date(data);
    if (Number.isNaN(date.getTime())) {
      return 'Data inválida';
    }

    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  openImage(url: string): void {
    console.log('openImage called with url:', url);
    try {
      this.selectedImageUrl = encodeURI(url);
    } catch (e) {
      this.selectedImageUrl = url;
    }
    // prevent background scrolling
    document.body.style.overflow = 'hidden';
  }

  closeImage(): void {
    this.selectedImageUrl = null;
    document.body.style.overflow = '';
  }
}
