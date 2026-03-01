import { Directive, ElementRef, EventEmitter, HostListener, Input, NgZone, OnDestroy, OnInit, Output, Renderer2 } from '@angular/core';

@Directive({
  selector: '[appPullToRefresh]'
})
export class PullToRefreshDirective implements OnInit, OnDestroy {
  @Input() threshold = 80; // pixels to trigger
  @Input() disabled = false;
  @Output() refresh = new EventEmitter<void>();

  private startY = 0;
  private pulling = false;
  private indicator!: HTMLElement;

  constructor(private el: ElementRef, private renderer: Renderer2, private zone: NgZone) {}

  ngOnInit(): void {
    this.createIndicator();
  }

  ngOnDestroy(): void {
    if (this.indicator && this.indicator.parentNode) this.indicator.parentNode.removeChild(this.indicator);
  }

  private createIndicator() {
    this.indicator = this.renderer.createElement('div');
    this.renderer.setStyle(this.indicator, 'position', 'absolute');
    this.renderer.setStyle(this.indicator, 'top', '0');
    this.renderer.setStyle(this.indicator, 'left', '0');
    this.renderer.setStyle(this.indicator, 'right', '0');
    this.renderer.setStyle(this.indicator, 'height', '0px');
    this.renderer.setStyle(this.indicator, 'display', 'flex');
    this.renderer.setStyle(this.indicator, 'alignItems', 'center');
    this.renderer.setStyle(this.indicator, 'justifyContent', 'center');
    this.renderer.setStyle(this.indicator, 'pointerEvents', 'none');
    this.renderer.setStyle(this.indicator, 'transition', 'height 150ms ease');
    this.renderer.setStyle(this.indicator, 'zIndex', '9999');
    const parent = this.el.nativeElement as HTMLElement;
    parent.style.position = parent.style.position || 'relative';
    this.renderer.insertBefore(parent, this.indicator, parent.firstChild);
  }

  @HostListener('touchstart', ['$event'])
  onTouchStart(ev: TouchEvent) {
    if (this.disabled) return;
    if (!this.isMobile()) return;
    if ((this.el.nativeElement as HTMLElement).scrollTop > 0) return;
    this.startY = ev.touches[0].clientY;
    this.pulling = true;
  }

  @HostListener('touchmove', ['$event'])
  onTouchMove(ev: TouchEvent) {
    if (!this.pulling || this.disabled) return;
    const currentY = ev.touches[0].clientY;
    const delta = Math.max(0, currentY - this.startY);
    if (delta > 0) {
      ev.preventDefault();
      const h = Math.min(delta / 2, this.threshold + 20);
      this.renderer.setStyle(this.indicator, 'height', `${h}px`);
    }
  }

  @HostListener('touchend')
  onTouchEnd() {
    if (!this.pulling || this.disabled) return;
    const h = parseInt(getComputedStyle(this.indicator).height || '0', 10);
    this.renderer.setStyle(this.indicator, 'height', `0px`);
    this.pulling = false;
    if (h >= this.threshold) {
      // provide haptic feedback on supported devices
      try {
        if (navigator && 'vibrate' in navigator) {
          // pattern: small buzz
          (navigator as any).vibrate([50, 30, 50]);
        }
      } catch (e) {
        // ignore
      }

      // show a brief loading state before emitting
      this.renderer.setStyle(this.indicator, 'height', `${this.threshold}px`);
      this.renderer.setStyle(this.indicator, 'display', 'flex');
      const prevText = this.indicator.textContent;
      this.indicator.textContent = 'Atualizando...';
      setTimeout(() => {
        // restore and emit refresh
        this.indicator.textContent = prevText || 'Puxe para atualizar';
        this.renderer.setStyle(this.indicator, 'height', `0px`);
        this.zone.run(() => this.refresh.emit());
      }, 650);
    }
  }

  private isMobile(): boolean {
    // ativa apenas em dispositivos touch / telas pequenas
    if (typeof window === 'undefined') return false;
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const smallScreen = window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
    return !!(hasTouch && smallScreen);
  }
}
