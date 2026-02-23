import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environments';
import { firstValueFrom } from 'rxjs';
import { AuthService } from 'src/app/auth/auth.service';
import { UsersService } from 'src/app/services/users.service';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { filter, take } from 'rxjs/operators';

@Component({
  selector: 'app-user-profile',
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.scss']
})
export class UserProfileComponent implements OnInit {
  currentUser: any = null;
  formData: any = {};
  loading = false;
  saving = false;
  hasChanges = false;
  uploadingAvatar = false;

  // Upload agora é feito via backend endpoint (/upload/avatar)

  unidades = ['DA', 'ASER', 'MANASSES', 'JUDA', 'BENJAMIN', 'RUBEN'];
  classes = ['AMIGO', 'COMPANHEIRO', 'PESQUISADOR', 'PIONEIRO', 'EXCURSIONISTA', 'GUIA'];

  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    private router: Router,
    private snackBar: MatSnackBar,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.loading = true;
    this.authService.currentUser$.pipe(
      filter(u => !!u),
      take(1)
    ).subscribe(user => {
      this.currentUser = user;
      this.formData = {
        name: user?.name || '',
        email: user?.email || '',
        roles: user?.roles || [],
        unidade: user?.unidade || null,
        classe: user?.classe || null,
      };
      this.loading = false;
    });
  }

  onInputChange(): void {
    this.hasChanges = this.formData.name !== this.currentUser.name;
  }

  saveProfile(): void {
    if (!this.hasChanges) return;

    this.saving = true;
    const payload = {
      name: this.formData.name,
    };

    this.usersService.updateProfile(this.currentUser.id, payload).subscribe(
      (response: any) => {
        this.currentUser = response;
        this.formData = {
          ...this.formData,
          ...response
        };
        this.hasChanges = false;
        this.saving = false;
        this.snackBar.open('Perfil atualizado com sucesso!', 'Fechar', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
      },
      (error: any) => {
        this.saving = false;
        console.error('Erro ao atualizar perfil:', error);
        this.snackBar.open('Erro ao atualizar perfil. Tente novamente.', 'Fechar', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
      }
    );
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  canEdit(): boolean {
    return !this.saving && this.hasChanges;
  }

  async onAvatarSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.snackBar.open('Por favor, selecione uma imagem', 'Fechar');
      input.value = '';
      return;
    }

    // optional: limit original file size
    if (file.size > 10 * 1024 * 1024) {
      this.snackBar.open('Imagem muito grande. Máximo 10MB', 'Fechar');
      input.value = '';
      return;
    }

    this.uploadingAvatar = true;

    try {
      const compressedBlob = await this.compressImage(file, 800, 0.6);

      const timestamp = Date.now();
      const safeName = (file.name || 'avatar')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9._-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase();
      const ext = 'jpg';
      const filePath = `avatars/${this.currentUser?.id || 'anon'}/${timestamp}_${safeName}.${ext}`;

      const form = new FormData();
      form.append('avatar', compressedBlob, `${timestamp}_${safeName}.jpg`);
      form.append('userId', String(this.currentUser?.id ?? 'anon'));

      let publicUrl: string | null = null;
      try {
        const resp: any = await firstValueFrom(this.http.post(`${environment.apiBase}/upload/avatar`, form));
        publicUrl = resp?.url ?? null;
      } catch (err: any) {
        console.error('Erro ao enviar para backend:', err);
        this.snackBar.open('Erro ao enviar imagem para o servidor. Tente novamente.', 'Fechar');
        throw err;
      }

      if (!publicUrl) {
        this.snackBar.open('Arquivo enviado, mas não foi possível obter URL pública. Verifique o backend.', 'Fechar', { duration: 6000 });
      }

      // update profile on backend
      this.saving = true;
      this.usersService.updateProfile(this.currentUser.id, { avatarUrl: publicUrl }).subscribe(
        (resp: any) => {
          this.currentUser = { ...this.currentUser, avatarUrl: publicUrl };
          this.formData = { ...this.formData, ...resp };
          this.saving = false;
          this.uploadingAvatar = false;
          input.value = '';
          this.snackBar.open('Foto atualizada', 'Fechar', { duration: 3000 });
        }, err => {
          this.saving = false;
          this.uploadingAvatar = false;
          console.error(err);
          this.snackBar.open('Erro ao salvar foto de perfil', 'Fechar');
          input.value = '';
        }
      );
    } catch (err) {
      console.error(err);
      this.snackBar.open('Erro ao enviar imagem', 'Fechar');
      this.uploadingAvatar = false;
      input.value = '';
    }
  }

  removeAvatar(): void {
    // simply remove avatarUrl from profile (doesn't delete from storage)
    this.saving = true;
    this.usersService.updateProfile(this.currentUser.id, { avatarUrl: null }).subscribe(
      (resp: any) => {
        this.currentUser = { ...this.currentUser, avatarUrl: null };
        this.formData = { ...this.formData, ...resp };
        this.saving = false;
        this.snackBar.open('Foto removida', 'Fechar');
      }, err => {
        this.saving = false;
        console.error(err);
        this.snackBar.open('Erro ao remover foto', 'Fechar');
      }
    );
  }

  private compressImage(file: File, maxWidth = 800, quality = 0.6): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = (e: any) => {
        img.src = e.target.result;
      };
      img.onerror = (err) => reject(err);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas context unavailable'));

        const ratio = img.width / img.height;
        const width = Math.min(maxWidth, img.width);
        const height = Math.round(width / ratio);
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (!blob) return reject(new Error('Compress failed'));
          resolve(blob);
        }, 'image/jpeg', quality);
      };
      reader.readAsDataURL(file);
    });
  }
}
