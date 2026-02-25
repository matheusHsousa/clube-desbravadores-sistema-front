import { Component, OnInit } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthService } from 'src/app/auth/auth.service';
import { DesafioUnidadesService } from 'src/app/services/desafio-unidades.service';

@Component({
  selector: 'app-desafio-unidades',
  templateUrl: './desafio-unidades.component.html',
  styleUrls: ['./desafio-unidades.component.scss']
})
export class DesafioUnidadesComponent implements OnInit {
  loading = false;
  challenges: any[] = [];
  pending: any[] = [];
  // per-challenge selected file and metadata
  selectedFor: Record<string, { file?: File; previewUrl?: string | null; isImage?: boolean; comment?: string }> = {};
  uploadingFor: Record<string, boolean> = {};

  // form model
  newTitle = '';
  newDescription = '';
  newDue: string | null = null;

  // approval notes map
  approvalNotes: Record<number, number> = {};

  constructor(private svc: DesafioUnidadesService, public auth: AuthService) {}

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

      // Admin: load pending submissions
        if (user && user.roles && (user.roles.includes('ADMIN') || user.roles.includes('CONSELHEIRO'))) {
          // For both ADMIN and CONSELHEIRO: show only challenges not yet submitted by this unit
          this.challenges = await firstValueFrom(this.svc.available());
          // Admins also see pending submissions
          this.pending = user.roles.includes('ADMIN') ? await firstValueFrom(this.svc.pendingSubmissions()) : [];
      } else {
        this.challenges = allChallenges;
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
    try {
      const payload = {
        title: this.newTitle,
        description: this.newDescription,
        dueDate: this.newDue
      };
      await firstValueFrom(this.svc.create(payload));
      this.newTitle = '';
      this.newDescription = '';
      this.newDue = null;
      await this.reloadAll();
    } catch (err) {
      console.error('Erro ao criar desafio', err);
    }
  }

  async submitForUnit(challenge: any) {
    try {
      const user = await firstValueFrom(this.auth.currentUser$);
      const payload = { unitid: user?.unidade, comment: `Submissão da unidade ${user?.unidade}` };
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

  onFileChange(event: Event, challenge: any) {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length > 0 ? input.files[0] : undefined;
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const previewUrl = URL.createObjectURL(file);
    this.selectedFor[challenge.id] = { file, previewUrl, isImage, comment: this.selectedFor[challenge.id]?.comment || '' };
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
    if (entry.comment) form.append('comment', entry.comment);
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
