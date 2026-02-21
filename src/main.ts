import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';


platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));

// Registrar service worker se disponível (arquivo deve ser gerado na build/serviço)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').then(reg => {
      console.log('ServiceWorker registrado:', reg.scope);
    }).catch(err => {
      // falha é silenciosa — apenas log
      console.warn('ServiceWorker não registrado:', err);
    });
  });
}
