import { Component, Input, OnInit } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { MeritoService } from '../../services/merito.service';

@Component({
  selector: 'app-merito-top',
  templateUrl: './merito-top.component.html',
  styleUrls: ['./merito-top.component.scss']
})
export class MeritoTopComponent implements OnInit {
  @Input() top = 5;
  loading = false;
  list: any[] = [];

  constructor(private merito: MeritoService) {}

  ngOnInit(): void {
    this.load();
  }

  async load() {
    this.loading = true;
    try {
      this.list = await firstValueFrom(this.merito.top(this.top));
    } catch (err) {
      console.error('Merito load error', err);
      this.list = [];
    } finally {
      this.loading = false;
    }
  }
}
