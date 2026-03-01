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
  private spinnerEl!: HTMLElement;

  constructor(private el: ElementRef, private renderer: Renderer2, private zone: NgZone) {}

  ngOnInit(): void {
    this.createIndicator();
  }

  ngOnDestroy(): void {
    if (this.indicator && this.indicator.parentNode) this.indicator.parentNode.removeChild(this.indicator);
  }

  private createIndicator() {
    // inject minimal spinner styles once
    if (!document.getElementById('ptr-spin-style')) {
      const style = this.renderer.createElement('style');
      this.renderer.setAttribute(style, 'id', 'ptr-spin-style');
      this.renderer.appendChild(style, this.renderer.createText(`
        @keyframes ptr-rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .ptr-spinner { width:28px; height:28px; border-radius:50%; border:3px solid rgba(0,0,0,0.12); border-top-color: rgba(33,150,243,1); animation: ptr-rotate 1s linear infinite; }
      `));
      this.renderer.appendChild(document.head, style);
    }

    this.indicator = this.renderer.createElement('div');
    this.renderer.setStyle(this.indicator, 'position', 'absolute');
    this.renderer.setStyle(this.indicator, 'top', '0');
    this.renderer.setStyle(this.indicator, 'left', '0');
    this.renderer.setStyle(this.indicator, 'right', '0');
    this.renderer.setStyle(this.indicator, 'height', '0px');
    this.renderer.setStyle(this.indicator, 'display', 'flex');
    this.renderer.setStyle(this.indicator, 'alignItems', 'center');
    this.renderer.setStyle(this.indicator, 'justifyContent', 'center');
    this.renderer.setStyle(this.indicator, 'overflow', 'hidden');
    this.renderer.setStyle(this.indicator, 'pointerEvents', 'none');
    this.renderer.setStyle(this.indicator, 'transition', 'height 150ms ease');
    this.renderer.setStyle(this.indicator, 'zIndex', '9999');

    const spinner = this.renderer.createElement('div');
    this.renderer.addClass(spinner, 'ptr-spinner');
    this.renderer.setStyle(spinner, 'transform', 'scale(0)');
    this.renderer.setStyle(spinner, 'transition', 'transform 120ms ease');
    this.renderer.appendChild(this.indicator, spinner);
    this.spinnerEl = spinner;

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
      // scale spinner progressively
      try {
        const scale = Math.min(1, h / this.threshold);
        if (this.spinnerEl) this.renderer.setStyle(this.spinnerEl, 'transform', `scale(${scale})`);
      } catch (e) {}
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
          (navigator as any).vibrate([50, 30, 50]);
        }
      } catch (e) {
        // ignore
      }

      // show spinner height briefly before emitting
      this.renderer.setStyle(this.indicator, 'height', `${this.threshold}px`);
      this.renderer.setStyle(this.indicator, 'display', 'flex');
      if (this.spinnerEl) this.renderer.setStyle(this.spinnerEl, 'transform', 'scale(1)');
      setTimeout(() => {
        this.renderer.setStyle(this.indicator, 'height', `0px`);
        if (this.spinnerEl) this.renderer.setStyle(this.spinnerEl, 'transform', 'scale(0)');
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
