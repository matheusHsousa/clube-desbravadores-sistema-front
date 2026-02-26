import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { environment } from 'src/environments/environments';

import { AppModule } from './app/app.module';


platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));

// Registrar service worker apenas em produção e se o arquivo existir
if ('serviceWorker' in navigator && environment.production) {
  window.addEventListener('load', async () => {
    try {
      // Verifica se o script do service worker está acessível (evita 404 em dev)
      const resp = await fetch('/service-worker.js', { method: 'HEAD' });
      if (!resp.ok) {
        console.info('service-worker.js não encontrado (status ' + resp.status + '), pular registro.');
        return;
      }

      const reg = await navigator.serviceWorker.register('/service-worker.js');
      console.log('ServiceWorker registrado:', reg.scope);
    } catch (err) {
      // falha é silenciosa — apenas log
      console.warn('ServiceWorker não registrado:', err);
    }
  });
}
