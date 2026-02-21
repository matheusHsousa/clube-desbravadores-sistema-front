import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { AtrasadosService } from 'src/app/services/atrasados.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from 'src/app/shared/confirm-dialog/confirm-dialog.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-atrasados',
  templateUrl: './atrasados.component.html',
  styleUrls: ['./atrasados.component.scss']
})
export class AtrasadosComponent implements OnInit, AfterViewInit {
  usuarios: any[] = [];
  desbravadores: any[] = [];
  filtroNome = '';
  pessoasCombinadas: Array<{ id: number; nome: string; tipo: 'Usuário' | 'Desbravador'; detalhe: string }> = [];
  pessoasFiltradas: Array<{ id: number; nome: string; tipo: 'Usuário' | 'Desbravador'; detalhe: string }> = [];
  selecionados = new Set<string>();
  atrasadosHoje: any[] = [];
  historico: any[] = [];
  loading = false;
  saving = false;
  showHistorico = true;
  filtroData: Date = new Date();

  displayedColumns: string[] = ['data', 'nome'];

  constructor(
    private atrasadosService: AtrasadosService,
    private snackBar: MatSnackBar,
    private router: Router,
    private dialog: MatDialog
  ) {}

  @ViewChild('pageHeader') pageHeader!: ElementRef<HTMLElement>;

  ngOnInit(): void {
    this.loadAll();
    this.carregarHistorico();
  }

  ngAfterViewInit(): void {
    // scroll to the header when the view is initialized
    setTimeout(() => {
      try {
        const rect = this.pageHeader?.nativeElement?.getBoundingClientRect();
        if (rect) {
          const headerTop = rect.top + window.scrollY;
          const offset = 24; // move a bit more up
          const target = Math.max(0, headerTop - offset);
          window.scrollTo({ top: target, behavior: 'smooth' });
        }
      } catch (e) {
        // ignore if element is not available
      }
    }, 0);
  }

  // Filtro para liberar apenas domingos no datepicker
  domingoFilter = (d: Date | null): boolean => {
    const day = (d || new Date()).getDay();
    // 0 = Domingo, 6 = Sábado
    return day === 0;
  };

  loadAll(): void {
    this.loading = true;
    let usuariosCarregados = false;
    let desbravadoresCarregados = false;
    let atrasadosCarregados = false;

    const verificarSeCarregouTudo = () => {
      if (usuariosCarregados && desbravadoresCarregados && atrasadosCarregados) {
        this.atualizarPessoasCombinadas();
        this.loading = false;
      }
    };

    this.atrasadosService.listarUsuarios().subscribe(
      users => {
        this.usuarios = Array.isArray(users) ? users : [];
        usuariosCarregados = true;
        verificarSeCarregouTudo();
      },
      () => {
        this.usuarios = [];
        usuariosCarregados = true;
        verificarSeCarregouTudo();
        this.snackBar.open('Erro ao carregar usuários', 'Fechar', { duration: 3000 });
      }
    );

    this.atrasadosService.listarDesbravadores().subscribe(
      desb => {
        this.desbravadores = Array.isArray(desb) ? desb : [];
        desbravadoresCarregados = true;
        verificarSeCarregouTudo();
      },
      () => {
        this.desbravadores = [];
        desbravadoresCarregados = true;
        verificarSeCarregouTudo();
        this.snackBar.open('Erro ao carregar desbravadores', 'Fechar', { duration: 3000 });
      }
    );

    this.atrasadosService.listarAtrasadosHoje().subscribe(
      atrasados => {
        this.atrasadosHoje = Array.isArray(atrasados) ? atrasados : [];
        atrasadosCarregados = true;
        verificarSeCarregouTudo();
      },
      () => {
        this.atrasadosHoje = [];
        atrasadosCarregados = true;
        verificarSeCarregouTudo();
        this.snackBar.open('Erro ao carregar atrasados de hoje', 'Fechar', { duration: 3000 });
      }
    );
  }

  private atualizarPessoasCombinadas(): void {
    const usuarios = (Array.isArray(this.usuarios) ? this.usuarios : []).map(user => ({
      id: Number(user?.id),
      nome: String(user?.name || 'Sem nome'),
      tipo: 'Usuário' as const,
      detalhe: Array.isArray(user?.roles) && user.roles.length > 0 ? user.roles.join(' • ') : 'Sem função'
    }));

    const desbravadores = (Array.isArray(this.desbravadores) ? this.desbravadores : []).map(desb => ({
      id: Number(desb?.id),
      nome: String(desb?.name || 'Sem nome'),
      tipo: 'Desbravador' as const,
      detalhe: [desb?.unidade, desb?.classe].filter(Boolean).join(' • ') || 'Sem detalhe'
    }));

    // Criar sets de IDs já marcados como atrasados hoje
    const usuariosAtrasados = new Set(
      this.atrasadosHoje
        .filter(a => a.userId && !a.desbravadorId)
        .map(a => a.userId)
    );
    const desbravadoresAtrasados = new Set(
      this.atrasadosHoje
        .filter(a => a.desbravadorId)
        .map(a => a.desbravadorId)
    );

    this.pessoasCombinadas = [...usuarios, ...desbravadores]
      .filter(item => Number.isFinite(item.id) && item.id > 0)
      .filter(item => {
        // Remover quem já está marcado como atrasado hoje
        if (item.tipo === 'Usuário') {
          return !usuariosAtrasados.has(item.id);
        }
        return !desbravadoresAtrasados.has(item.id);
      })
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    this.aplicarFiltroNome();
  }

  aplicarFiltroNome(): void {
    const termo = this.filtroNome.trim().toLowerCase();

    if (!termo) {
      this.pessoasFiltradas = [...this.pessoasCombinadas];
      return;
    }

    this.pessoasFiltradas = this.pessoasCombinadas.filter(item =>
      item.nome.toLowerCase().includes(termo)
    );
  }

  get totalSelecionados(): number {
    return this.selecionados.size;
  }

  isSelecionado(pessoa: { id: number; tipo: 'Usuário' | 'Desbravador' }): boolean {
    return this.selecionados.has(`${pessoa.tipo}:${pessoa.id}`);
  }

  toggleSelecionado(pessoa: { id: number; tipo: 'Usuário' | 'Desbravador' }): void {
    const key = `${pessoa.tipo}:${pessoa.id}`;
    if (this.selecionados.has(key)) {
      this.selecionados.delete(key);
      return;
    }

    this.selecionados.add(key);
  }

  marcarAtrasados(): void {
    if (this.totalSelecionados === 0) {
      this.snackBar.open('Selecione pelo menos um registro', 'Fechar', { duration: 3000 });
      return;
    }

    const pendentes: Array<{ userId?: number; desbravadorId?: number }> = [];

    this.selecionados.forEach(key => {
      const [tipo, idRaw] = key.split(':');
      const id = Number(idRaw);

      if (tipo === 'Usuário') {
        pendentes.push({ userId: id });
        return;
      }

      // É desbravador - enviar apenas desbravadorId
      pendentes.push({ desbravadorId: id });
    });

    if (pendentes.length === 0) {
      this.snackBar.open('Nenhum item selecionado pôde ser marcado', 'Fechar', { duration: 3500 });
      return;
    }

    this.saving = true;
    let concluidos = 0;

    pendentes.forEach(item => {
      this.atrasadosService.marcarAtrasado(item.userId, item.desbravadorId).subscribe(
        () => {
          concluidos++;
          if (concluidos === pendentes.length) {
            this.saving = false;
            this.selecionados.clear();
            this.loadAll();
            this.carregarHistorico();
            this.snackBar.open(`${pendentes.length} atrasado(s) marcado(s)!`, 'Fechar', { duration: 3000 });
          }
        },
        () => {
          concluidos++;
          if (concluidos === pendentes.length) {
            this.saving = false;
            this.snackBar.open('Erro ao marcar atrasados', 'Fechar', { duration: 3000 });
          }
        }
      );
    });
  }

  carregarHistorico(): void {
    const filtro = this.filtroData ? { data: this.filtroData } : undefined;

    this.atrasadosService.listarHistorico(filtro).subscribe(
      atrasados => {
        this.historico = Array.isArray(atrasados) ? atrasados : [];
      },
      () => {
        this.historico = [];
        this.snackBar.open('Erro ao carregar histórico', 'Fechar', { duration: 3000 });
      }
    );
  }

  removerAtrasado(atrasadoId: number): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: { message: 'Tem certeza que deseja remover este atrasado?' }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;

      this.atrasadosService.removerAtrasado(atrasadoId).subscribe(
        () => {
          this.snackBar.open('Atrasado removido com sucesso!', 'Fechar', { duration: 3000 });
          this.loadAll();
          this.carregarHistorico();
        },
        () => {
          this.snackBar.open('Erro ao remover atrasado', 'Fechar', { duration: 3000 });
        }
      );
    });
  }

  getNomeAtrasado(atrasado: any): string {
    if (atrasado?.desbravador?.name) {
      return `${atrasado.desbravador.name} (Desbravador)`;
    }

    if (atrasado?.user?.name) {
      return `${atrasado.user.name}`;
    }

    return 'Registro sem nome';
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

  goToTextosBiblicos(): void {
    this.router.navigate(['/textos-biblicos']);
  }
}
