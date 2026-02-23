import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environments';

interface RuntimeConfig {
  apiBase?: string;
}

@Injectable({ providedIn: 'root' })
export class RuntimeConfigService {
  constructor(private http: HttpClient) {}

  async load(): Promise<void> {
    try {
      const cfg = await firstValueFrom(this.http.get<RuntimeConfig>('/assets/config.json'));
      if (cfg && cfg.apiBase) {
        (environment as any).apiBase = cfg.apiBase;
      }
    } catch (err) {
      // silently ignore — keep existing environment.apiBase
    }
  }
}
