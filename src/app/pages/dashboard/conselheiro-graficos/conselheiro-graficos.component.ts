import { Component, HostListener, OnInit } from '@angular/core';
import { ChartType } from 'angular-google-charts';
import { StatsService } from 'src/app/services/stats.service';
import { AuthService } from 'src/app/auth/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-conselheiro-graficos',
  templateUrl: './conselheiro-graficos.component.html',
  styleUrls: ['./conselheiro-graficos.component.scss']
})
export class ConselheiroGraficosComponent implements OnInit {
  loaded = false;
  chartType: ChartType = ChartType.LineChart;
  chartWidth = 260;
  chartHeight = 200;
  chartColumns: string[] = ['Domingo'];
  chartData: any[] = [];
  chartOptions: any = {
    legend: { position: 'bottom' },
    hAxis: { title: 'Domingo' },
    vAxis: { title: 'Pontuação', minValue: 0 },
    chartArea: { width: '82%', height: '68%' },
    pointSize: 4,
    lineWidth: 2
  };

  bestWorstChartType: ChartType = ChartType.BarChart;
  bestWorstChartColumns: string[] = ['Desbravador', 'Pontos'];
  bestWorstChartData: any[] = [];
  bestWorstChartOptions: any = {
    legend: { position: 'none' },
    hAxis: { title: 'Pontos', minValue: 0 },
    vAxis: { title: 'Desbravador' },
    chartArea: { width: '70%', height: '68%' }
  };

  ausenciasChartType: ChartType = ChartType.BarChart;
  ausenciasChartColumns: string[] = ['Desbravador', 'Ausências'];
  ausenciasChartData: any[] = [];
  ausenciasSequencia: string[] = [];
  ausenciasChartOptions: any = {
    legend: { position: 'none' },
    hAxis: { title: 'Ausências', minValue: 0 },
    vAxis: { title: 'Desbravador' },
    chartArea: { width: '70%', height: '68%' },
    colors: ['#FF5252']
  };

  currentUserUnidade: string = '';
  startDate: string = '2026-02-22';
  private alertShown = false;

  constructor(
    private stats: StatsService,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.updateChartSize();
    
    this.authService.currentUser$.subscribe(user => {
      if (user?.unidade) {
        this.currentUserUnidade = user.unidade;
        this.loadGraficos();
      }
    });
  }

  @HostListener('window:resize')
  onResize() {
    this.updateChartSize();
  }

  private loadGraficos() {
    this.stats.getConselheiropontuacaoSemanal(this.currentUserUnidade, 12).subscribe(res => {
      const desbravadores: string[] = res?.desbravadores ?? [];
      const rows: Array<{ date: string; [key: string]: any }> = res?.rows ?? [];

      this.chartColumns = ['Domingo', ...desbravadores];
      this.chartData = rows.map((row) => [
        row.date,
        ...desbravadores.map((desbrav) => row?.[desbrav] ?? 0)
      ]);

      this.loaded = true;
    });

    this.stats.getConselheiroBestWorst(this.currentUserUnidade, 12).subscribe(res => {
      const best = res?.best;
      const worst = res?.worst;

      this.bestWorstChartData = [];
      if (best?.name) {
        this.bestWorstChartData.push([best.name, best.points]);
      }
      if (worst?.name) {
        this.bestWorstChartData.push([worst.name, worst.points]);
      }
    });

    this.stats.getConselheiroAusencias(this.currentUserUnidade, this.startDate).subscribe(res => {
      this.ausenciasChartData = res?.data ?? [];
      this.ausenciasSequencia = res?.ausenciasSequencia ?? [];
      this.showAusenciasAlertIfNeeded(this.ausenciasSequencia);
    });
  }

  onDateChange(date: string) {
    this.startDate = date;
    this.stats.getConselheiroAusencias(this.currentUserUnidade, this.startDate).subscribe(res => {
      this.ausenciasChartData = res?.data ?? [];
      this.ausenciasSequencia = res?.ausenciasSequencia ?? [];
    });
  }

  private showAusenciasAlertIfNeeded(nomes: string[]) {
    if (this.alertShown || !nomes.length) return;
    this.alertShown = true;
    const lista = nomes.join(', ');
    this.snackBar.open(
      `Desbravadores com 3+ ausencias seguidas: ${lista}`,
      'Fechar',
      { duration: 7000 }
    );
  }

  private updateChartSize() {
    this.chartWidth = 260;
    this.chartHeight = 200;
  }
}
