import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'avatarUrl' })
export class AvatarUrlPipe implements PipeTransform {
  transform(user: any): string | null {
    if (!user) return null;
    if (user.avatarUrl) return user.avatarUrl;
    if (user.photoURL) return user.photoURL;
    if (user.photoUrl) return user.photoUrl;

    const name = (user.name || user.email || '').trim();
    if (!name) return null;

    const bg = '2F80ED';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${bg}&color=fff&bold=true&size=128`;
  }
}
