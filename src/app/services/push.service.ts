import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class PushService {
  constructor(private http: HttpClient) {}

  private urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  async subscribe(userId: string | null, role: string | null) {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;
    try {
      const resp: any = await this.http.get('/push/publicKey').toPromise();
      const publicKey = resp?.publicKey;
      if (!publicKey) return null;
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(publicKey),
      });
      await this.http.post('/push/subscribe', { subscription: sub, userId, role }).toPromise();
      return sub;
    } catch (e) {
      console.warn('Push subscribe failed', e);
      return null;
    }
  }
}
