import { Component, OnInit } from '@angular/core';
import { ChartType } from 'angular-google-charts';
import { firstValueFrom } from 'rxjs';
import { MeritoService } from '../../services/merito.service';

type ChartRow = (string | number)[];

@Component({
  selector: 'app-merito-page',
  templateUrl: './merito-page.component.html',
  styleUrls: ['./merito-page.component.scss']
})
export class MeritoPageComponent implements OnInit {
  loading = false;
  list: any[] = [];
  // Google Chart
  chartType: ChartType = ChartType.BarChart;
  // chartData as array-of-arrays: first row is header, following rows are [label, number]
  chartData: any[] = [];
  chartOptions: any = {};
  chartHeight = 400;
  // manual chart rows for HTML/CSS rendering (includes animation delay)
  chartRows: { label: string; value: number; delay: number }[] = [];

  constructor(private merito: MeritoService) {}

  async ngOnInit() {
    this.loading = true;
    try {
      this.list = await firstValueFrom(this.merito.all());
      // prepare chart data: [['Name', 'Score'], ...]
      this.list.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
      // build simple rows for manual chart (value in 0..100)
      this.chartRows = [];
      this.list.forEach((it, idx) => {
        const label = String(it.name ?? `#${it.id}`);
        const raw = Number(it.score ?? 0);
        const value = Number.isFinite(raw) ? Math.round(raw * 10000) / 100 : 0;
        const clamped = Math.max(0, Math.min(100, value));
        const delay = idx * 80; // stagger animation
        this.chartRows.push({ label, value: clamped, delay });
      });

      this.chartHeight = Math.max(300, this.list.length * 40);
      this.chartOptions = {
        legend: { position: 'none' },
        chartArea: { left: 160, top: 20, right: 20, bottom: 20 },
        hAxis: { minValue: 0, maxValue: 100, format: 'decimal' },
        orientation: 'horizontal',
        bars: 'horizontal',
        height: this.chartHeight,
      };
    } catch (err) {
      console.error('Erro ao carregar mérito', err);
      this.list = [];
    } finally {
      this.loading = false;
    }
  }
}
