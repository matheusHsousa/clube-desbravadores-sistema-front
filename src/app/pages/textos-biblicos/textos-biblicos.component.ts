import { Component, OnInit } from '@angular/core';
import { TextosBiblicosService } from 'src/app/services/textos-biblicos.service';
import { AuthService } from 'src/app/auth/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { createClient } from '@supabase/supabase-js';
import { environment } from 'src/environments/environments';

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
  // Desativa refresh automático de token para evitar uso do Navigator Lock (problemas em alguns navegadores)
  private supabase = createClient(environment.supabase.url, environment.supabase.anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
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
    const file = event.target.files[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      this.snackBar.open('Por favor, selecione uma imagem', 'Fechar', { duration: 3000 });
      event.target.value = '';
      return;
    }

    // Validar tamanho (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      this.snackBar.open('Imagem muito grande. Máximo 5MB', 'Fechar', { duration: 3000 });
      event.target.value = '';
      return;
    }

    this.uploading = true;

    try {
      // Upload para Supabase Storage
      const timestamp = Date.now();
      const safeName = file.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9._-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase();
      const filePath = `${timestamp}_${safeName}`;

      const { error: uploadError } = await this.supabase
        .storage
        .from('textos-biblicos')
        .upload(filePath, file, {
          contentType: file.type,
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      // Se o bucket for privado, gere uma URL assinada (rota /sign)
      const expiresIn = 60 * 60; // 1 hora
      const { data: signedData, error: signError } = await this.supabase
        .storage
        .from('textos-biblicos')
        .createSignedUrl(filePath, expiresIn);

      if (signError) {
        throw signError;
      }

      const downloadURL = signedData.signedUrl;

      // Enviar para o backend
      this.textosBiblicosService.enviarTexto(atrasadoId, downloadURL).subscribe(
        () => {
          this.uploading = false;
          event.target.value = ''; // Limpar input
          this.snackBar.open('Texto enviado com sucesso! Aguarde aprovação.', 'Fechar', { duration: 3000 });
          this.loadAll();
        },
        () => {
          this.uploading = false;
          event.target.value = ''; // Limpar input
          this.snackBar.open('Erro ao enviar texto', 'Fechar', { duration: 3000 });
        }
      );
    } catch (error) {
      this.uploading = false;
      event.target.value = ''; // Limpar input
      this.snackBar.open('Erro ao fazer upload da imagem', 'Fechar', { duration: 3000 });
      console.error('Upload error:', error);
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
