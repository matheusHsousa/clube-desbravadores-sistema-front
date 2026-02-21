import { Component } from '@angular/core';
import { Router, NavigationEnd, RouterOutlet } from '@angular/router';
import { Observable } from 'rxjs';
import { LoadingService } from './services/loading.service';
import { filter } from 'rxjs/operators';
import { trigger, transition, style, query, animate, group } from '@angular/animations';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
  ,
  animations: [
    trigger('routeAnimations', [
      transition(':increment', [
        style({ position: 'relative' }),
        query(':enter, :leave', [
          style({ position: 'absolute', left: 0, right: 0, width: '100%' })
        ], { optional: true }),
        query(':enter', [ style({ transform: 'translateX(12px)', opacity: 0 }) ], { optional: true }),
        group([
          query(':leave', [ animate('180ms ease', style({ transform: 'translateX(-8px)', opacity: 0 })) ], { optional: true }),
          query(':enter', [ animate('260ms cubic-bezier(.22,.61,.36,1)', style({ transform: 'translateX(0)', opacity: 1 })) ], { optional: true })
        ])
      ]),
      transition(':decrement', [
        style({ position: 'relative' }),
        query(':enter, :leave', [
          style({ position: 'absolute', left: 0, right: 0, width: '100%' })
        ], { optional: true }),
        query(':enter', [ style({ transform: 'translateX(-12px)', opacity: 0 }) ], { optional: true }),
        group([
          query(':leave', [ animate('180ms ease', style({ transform: 'translateX(8px)', opacity: 0 })) ], { optional: true }),
          query(':enter', [ animate('260ms cubic-bezier(.22,.61,.36,1)', style({ transform: 'translateX(0)', opacity: 1 })) ], { optional: true })
        ])
      ])
    ])
  ]
})
export class AppComponent {
  title = 'clube-desbravadores';
  showHeader = true;
  isLoading = true;
  loading$: Observable<boolean>;
  constructor(private router: Router, private loading: LoadingService) {
    this.loading$ = this.loading.loading$;
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe((ev: any) => {
      const url = ev.urlAfterRedirects || ev.url || '';
      this.showHeader = !(url === '/' || url.startsWith('/dashboard'));
      this.isLoading = false;
    });
  }

  prepareRoute(outlet: RouterOutlet) {
    return outlet && outlet.activatedRouteData && outlet.activatedRouteData['order'];
  }
}
