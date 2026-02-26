import { Component, HostListener, OnInit } from '@angular/core';
import { ChartType } from 'angular-google-charts';
import { StatsService } from 'src/app/services/stats.service';

@Component({
    selector: 'app-admin-graficos',
    templateUrl: './admin-graficos.component.html',
    styleUrls: ['./admin-graficos.component.scss']
})
export class AdminGraficosComponent implements OnInit {
    aprovados: any[] = [];
    pts: any[] = [];
    loaded = false;
    lineChartType: ChartType = ChartType.LineChart;
    topChartType: ChartType = ChartType.BarChart;
    classeChartType: ChartType = ChartType.BarChart;
    unitChartType: ChartType = ChartType.BarChart;
    chartWidth = 500;
    chartHeight = 300;
    lineChartColumns: string[] = ['Unidade', 'Pontos'];
    topChartColumns: string[] = ['Desbravador', 'Pontos'];
    classeChartColumns: string[] = ['Classe', 'Progresso (%)'];
    unitChartColumns: string[] = ['Unidade', 'Pontos'];

    // Google Charts
    lineChartData: any[] = [];
    topChartData: any[] = [];
    classeChartData: any[] = [];
    unitChartData: any[] = [];
    classeChartLegenda: Array<{ classe: string; legenda: string }> = [];
    lineChartOptions: any = {
        legend: { position: 'bottom' },
        hAxis: { title: 'Unidade' },
        vAxis: { title: 'Soma de Pontos', minValue: 0 },
        chartArea: { width: '82%', height: '68%' },
        pointSize: 4,
        lineWidth: 3
    };
    topChartOptions: any = {
        legend: { position: 'none' },
        hAxis: { title: 'Pontos', minValue: 0 },
        vAxis: { title: 'Desbravador' },
        chartArea: { width: '70%', height: '68%' }
    };
    unitChartOptions: any = {
        legend: { position: 'none' },
        hAxis: { title: 'Pontos', minValue: 0 },
        vAxis: { title: 'Unidade' },
        chartArea: { width: '70%', height: '68%' }
    };
    classeChartOptions: any = {
        legend: { position: 'none' },
        hAxis: { title: 'Progresso (%)', minValue: 0, maxValue: 100 },
        vAxis: { title: 'Classe' },
        chartArea: { width: '70%', height: '68%' }
    };

    constructor(private stats: StatsService) {}

    ngOnInit() {
        this.updateChartSize();

        this.stats.getAdminOverview().subscribe(res => {
            this.aprovados = res.aprovados;
            this.pts = res.pts ?? [];

            const pointsByUnit = new Map<string, number>();
            for (const p of this.pts) {
                const unidade = p?.desbravador?.unidade;
                if (!unidade) continue;
                const total = Number(p?.total ?? 0);
                pointsByUnit.set(unidade, (pointsByUnit.get(unidade) ?? 0) + total);
            }

            this.lineChartData = Array.from(pointsByUnit.entries())
                .sort((a, b) => b[1] - a[1])
                .map(([unidade, total]) => [unidade, total]);

            // mesma fonte de dados para gráfico de comparação por unidade (barras)
            this.unitChartData = this.lineChartData.slice();

            this.topChartData = this.pts
                .map((p: any) => [p?.desbravador?.name ?? 'Sem nome', Number(p?.total ?? 0)])
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3);

            this.loaded = true;
        });

            // Request aggregated points per unit from backend (more accurate + includes unit_points)
            this.stats.getAdminUnitsPoints().subscribe((res: any[]) => {
                this.unitChartData = (res ?? [])
                    .map((u: any) => [u.unidade || 'Sem Unidade', Number(u.total || 0)])
                    .sort((a: any, b: any) => b[1] - a[1]);
            }, () => {
                // keep previous client-side fallback if the endpoint fails
            });
        this.stats.getAdminProgressoClasses().subscribe(res => {
            this.classeChartData = (res?.data ?? [])
                .map((item: any) => [item.classe, item.progresso]);
            this.classeChartLegenda = (res?.data ?? [])
                .map((item: any) => ({ classe: item.classe, legenda: item.legenda }));
        });
    }

    @HostListener('window:resize')
    onResize() {
        this.updateChartSize();
    }

    private updateChartSize() {
        const viewportWidth = window.innerWidth;

        // if (viewportWidth < 768) {
        //     this.chartWidth = Math.max(160, viewportWidth - 80);
        //     this.chartHeight = 200;
        //     return;
        // }

        // if (viewportWidth < 1200) {
        //     this.chartWidth = Math.min(380, Math.max(320, viewportWidth - 280));
        //     this.chartHeight = 240;
        //     return;
        // }

        this.chartWidth = 260;
        this.chartHeight = 200;
    }
}