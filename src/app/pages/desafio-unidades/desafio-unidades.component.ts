import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthService } from 'src/app/auth/auth.service';
import { DesafioUnidadesService } from 'src/app/services/desafio-unidades.service';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';

@Component({
  selector: 'app-desafio-unidades',
  templateUrl: './desafio-unidades.component.html',
  styleUrls: ['./desafio-unidades.component.scss']
})
export class DesafioUnidadesComponent implements OnInit, AfterViewInit {
  loading = false;
  challenges: any[] = [];
  availableChallenges: any[] = [];
  pending: any[] = [];
  mySubmissions: any[] = [];
  // per-challenge selected file and metadata (podem ser undefined)
  selectedFor: Record<string, { file?: File; previewUrl?: string | null; isImage?: boolean; comment?: string } | undefined> = {};
  uploadingFor: Record<string, boolean> = {};
  comments: Record<number, string> = {};

  // form model
  newTitle = '';
  newDescription = '';
  newDue: string | null = null;

  // edição
  editingId: number | null = null;

  // approval notes map
  approvalNotes: Record<number, number> = {};

  // tabela de desafios criados (admin)
  displayedColumnsChallenges: string[] = ['title', 'dueDate', 'description', 'acoes'];
  dataSourceChallenges: MatTableDataSource<any> = new MatTableDataSource<any>([]);
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild('modalVideo') modalVideo?: ElementRef<HTMLVideoElement>;

  // tabela de pendentes
  displayedColumnsPendentes: string[] = ['desafio', 'unidade', 'data', 'preview', 'comentario', 'nota', 'acoes'];
  showAvailableSection = false;

  // preview overlay (image or video)
  selectedMediaUrl: string | null = null;
  selectedMediaIsVideo = false;
  selectedMediaAutoMuted = false;

  constructor(private svc: DesafioUnidadesService, public auth: AuthService, private cd: ChangeDetectorRef) {}

  ngAfterViewInit() {
    // assign paginator if already available
    try { this.dataSourceChallenges.paginator = this.paginator; } catch (e) { /* ignore */ }
  }

  ngOnInit() {
    // Aguarda estado do usuário no backend (após validação do token) antes de carregar
    this.auth.currentUser$.subscribe(() => {
      this.reloadAll();
    });
  }

  async reloadAll() {
    this.loading = true;
    try {
      const user = await firstValueFrom(this.auth.currentUser$);
      const allChallenges = await firstValueFrom(this.svc.all());
      // ADMIN: show ALL created challenges (regardless delivered)
      if (user && user.roles && user.roles.includes('ADMIN')) {
        this.challenges = allChallenges;
        this.dataSourceChallenges.data = this.challenges;
        setTimeout(() => {
          if (this.paginator) this.dataSourceChallenges.paginator = this.paginator;
        }, 0);
        // Admins also see pending submissions
        this.pending = await firstValueFrom(this.svc.pendingSubmissions());

        // Admins: show 'disponíveis' only if they have a unit
        if (user.unidade) {
          this.availableChallenges = await firstValueFrom(this.svc.available());
          this.showAvailableSection = true;
        } else {
          this.availableChallenges = [];
          this.showAvailableSection = false;
        }
      } else if (user && user.roles && user.roles.includes('CONSELHEIRO')) {
        // CONSELHEIRO: show only available challenges for their unit (if they have one)
        if (user.unidade) {
          this.availableChallenges = await firstValueFrom(this.svc.available());
          this.showAvailableSection = true;
          // também carregamos as submissões da unidade para exibir status
          try {
            this.mySubmissions = await firstValueFrom(this.svc.mySubmissions());
          console.debug('mySubmissions loaded', this.mySubmissions);
          } catch (e) {
            this.mySubmissions = [];
          }
        } else {
          this.availableChallenges = [];
          this.showAvailableSection = false;
        }
        this.challenges = [];
        this.dataSourceChallenges.data = [];
        this.pending = [];
      } else {
        // other users: do not show available section
        this.availableChallenges = [];
        this.showAvailableSection = false;
        this.challenges = [];
        this.dataSourceChallenges.data = [];
        this.pending = [];
      }
    } catch (err) {
      console.error('Erro ao carregar desafios', err);
      this.challenges = [];
      this.pending = [];
    } finally {
      this.loading = false;
    }
  }

  async createChallenge() {
    await this.saveChallenge();
  }

  async saveChallenge() {
    try {
      const payload = {
        title: this.newTitle,
        description: this.newDescription,
        dueDate: this.newDue
      };

      if (this.editingId) {
        await firstValueFrom(this.svc.update(this.editingId, payload));
        this.editingId = null;
      } else {
        await firstValueFrom(this.svc.create(payload));
      }

      this.newTitle = '';
      this.newDescription = '';
      this.newDue = null;
      await this.reloadAll();
    } catch (err) {
      console.error('Erro ao salvar desafio', err);
    }
  }

  editChallenge(challenge: any) {
    this.editingId = challenge.id;
    this.newTitle = challenge.title || '';
    this.newDescription = challenge.description || '';
    this.newDue = challenge.dueDate ? (new Date(challenge.dueDate).toISOString().slice(0, 10)) : null;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit() {
    this.editingId = null;
    this.newTitle = '';
    this.newDescription = '';
    this.newDue = null;
  }

  async deleteChallenge(challenge: any) {
    if (!confirm('Deseja excluir este desafio? Esta ação é irreversível.')) return;
    try {
      await firstValueFrom(this.svc.delete(challenge.id));
      await this.reloadAll();
    } catch (err) {
      console.error('Erro ao excluir desafio', err);
    }
  }

  async submitForUnit(challenge: any) {
    try {
      const user = await firstValueFrom(this.auth.currentUser$);
      const payload = { unitid: user?.unidade, comment: this.comments[challenge.id] ?? `Submissão da unidade ${user?.unidade}` };
      await firstValueFrom(this.svc.submit(challenge.id, payload));
      await this.reloadAll();
    } catch (err) {
      console.error('Erro ao submeter desafio', err);
    }
  }

  async approve(submission: any) {
    try {
      const nota = Number(this.approvalNotes[submission.id] ?? 0);
      await firstValueFrom(this.svc.approveSubmission(submission.id, nota));
      await this.reloadAll();
    } catch (err) {
      console.error('Erro ao aprovar submissão', err);
    }
  }

  async reject(submission: any) {
    if (!confirm('Deseja recusar esta submissão? A unidade poderá reenviar.')) return;
    try {
      await firstValueFrom(this.svc.rejectSubmission(submission.id));
      await this.reloadAll();
    } catch (err) {
      console.error('Erro ao recusar submissão', err);
    }
  }

  formatarData(data: string | undefined): string {
    if (!data) return '';
    const date = new Date(data);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  openMedia(url: string, isVideo = false): void {
    // Não re-encode URLs assinadas (p.ex. Supabase) — isso quebra a assinatura
    this.selectedMediaUrl = url;
    this.selectedMediaIsVideo = !!isVideo;
    // ensure video starts muted to allow autoplay in browsers
    this.selectedMediaAutoMuted = !!isVideo;
    document.body.style.overflow = 'hidden';
    if (this.selectedMediaIsVideo) {
      // force change detection so the video element is created synchronously
      try {
        this.cd.detectChanges();
        const el = this.modalVideo && this.modalVideo.nativeElement;
        console.debug('openMedia: modalVideo element', !!el, el?.readyState);
        if (el && typeof el.play === 'function') {
          el.play().then(() => {
            console.debug('openMedia: play succeeded');
            // try to unmute shortly after playback begins so user hears audio
            setTimeout(() => {
              try { el.muted = false; this.selectedMediaAutoMuted = false; this.cd.detectChanges(); } catch (e) { /* ignore */ }
            }, 500);
          }).catch((err: any) => {
            console.warn('openMedia: play() rejected', err);
            // leave muted; user can press play
          });
          // listen for errors
          el.addEventListener('error', (ev) => console.error('modal video error', ev));
        }
      } catch (e) {
        console.error('openMedia: error', e);
      }
    }
  }

  closeMedia(): void {
    try {
      if (this.selectedMediaIsVideo) {
        const el = this.modalVideo && this.modalVideo.nativeElement;
        if (el) {
          try { el.pause(); } catch (e) { /* ignore */ }
          try { el.currentTime = 0; } catch (e) { /* ignore */ }
        }
      }
    } catch (e) {
      // ignore
    }
    this.selectedMediaUrl = null;
    this.selectedMediaIsVideo = false;
    document.body.style.overflow = '';
  }

  onFileChange(event: Event, challenge: any) {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length > 0 ? input.files[0] : undefined;
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const previewUrl = URL.createObjectURL(file);
    this.selectedFor[challenge.id] = { file, previewUrl, isImage, comment: this.comments[challenge.id] || this.selectedFor[challenge.id]?.comment || '' };
  }

  triggerFileInput(challengeId: any) {
    try {
      const el = document.getElementById(`file-${challengeId}`) as HTMLInputElement | null;
      if (el) el.click();
    } catch (e) {
      // ignore
    }
  }

  async uploadMedia(challenge: any) {
    const entry = this.selectedFor[challenge.id];
    if (!entry || !entry.file) {
      console.warn('Nenhum arquivo selecionado');
      return;
    }

    const user = await firstValueFrom(this.auth.currentUser$);

    const form = new FormData();
    form.append('challengeId', String(challenge.id));
    if (user?.unidade) form.append('unitId', user.unidade);
    // prefer comment from comments map if present
    const comment = this.comments[challenge.id] ?? entry.comment;
    if (comment) form.append('comment', comment);
    form.append('file', entry.file, entry.file.name);

    try {
      this.uploadingFor[challenge.id] = true;
      const resp: any = await firstValueFrom(this.svc.uploadMedia(form));
      console.log('Upload response', resp);
      // limpa seleção
      if (entry.previewUrl) URL.revokeObjectURL(entry.previewUrl);
      delete this.selectedFor[challenge.id];
      await this.reloadAll();
    } catch (err) {
      console.error('Erro ao enviar mídia', err);
    } finally {
      this.uploadingFor[challenge.id] = false;
    }
  }
}
