import { Component, HostListener, OnInit } from '@angular/core';
import { ChartType } from 'angular-google-charts';
import { AuthService } from 'src/app/auth/auth.service';
import { StatsService } from 'src/app/services/stats.service';

@Component({
	selector: 'app-instrutor-graficos',
	templateUrl: './instrutor-graficos.component.html',
	styleUrls: ['./instrutor-graficos.component.scss']
})
export class InstrutorGraficosComponent implements OnInit {
	loaded = false;
	chartWidth = 260;
	chartHeight = 200;

	progressoChartType: ChartType = ChartType.BarChart;
	progressoChartColumns: string[] = ['Classe', 'Progresso (%)'];
	progressoChartData: any[] = [];
	progressoChartOptions: any = {
		legend: { position: 'none' },
		hAxis: { title: 'Progresso (%)', minValue: 0, maxValue: 100 },
		vAxis: { title: 'Classe' },
		chartArea: { width: '70%', height: '68%' }
	};

	itensChartType: ChartType = ChartType.BarChart;
	itensChartColumns: string[] = ['Desbravador', 'Itens Concluidos'];
	itensChartData: any[] = [];
	itensChartOptions: any = {
		legend: { position: 'none' },
		hAxis: { title: 'Itens Concluidos', minValue: 0 },
		vAxis: { title: 'Desbravador' },
		chartArea: { width: '70%', height: '68%' }
	};

	percentualChartType: ChartType = ChartType.BarChart;
	percentualChartColumns: string[] = ['Desbravador', 'Progresso (%)'];
	percentualChartData: any[] = [];
	percentualChartOptions: any = {
		legend: { position: 'none' },
		hAxis: { title: 'Progresso (%)', minValue: 0, maxValue: 100 },
		vAxis: { title: 'Desbravador' },
		chartArea: { width: '70%', height: '68%' }
	};

	private instrutorId: number | null = null;

	constructor(
		private authService: AuthService,
		private statsService: StatsService
	) {}

	ngOnInit(): void {
		this.updateChartSize();

		this.authService.currentUser$.subscribe((user) => {
			if (user?.id) {
				this.instrutorId = user.id;
				this.loadGraficos();
			}
		});
	}

	@HostListener('window:resize')
	onResize(): void {
		this.updateChartSize();
	}

	private loadGraficos(): void {
		if (!this.instrutorId) return;

		this.statsService.getInstrutorClasseResumo(this.instrutorId).subscribe((res) => {
			const classe = res?.classe ?? 'Classe';
			const progresso = Number(res?.progressoClasse ?? 0);
			const itensConcluidos = res?.itensConcluidos ?? 0;
			const itensTotal = res?.itensTotal ?? 0;

			this.progressoChartData = [[`${classe} (${itensConcluidos}/${itensTotal})`, progresso]];

			this.itensChartData = (res?.desbravadores ?? [])
				.map((item: any) => [item.name, Number(item.concluidos ?? 0)])
				.sort((a: any, b: any) => b[1] - a[1]);

			this.percentualChartData = (res?.desbravadoresPercent ?? [])
				.map((item: any) => [item.name, Number(item.percentual ?? 0)])
				.sort((a: any, b: any) => b[1] - a[1]);

			this.loaded = true;
		});
	}

	private updateChartSize(): void {
		this.chartWidth = 260;
		this.chartHeight = 200;
	}
}
