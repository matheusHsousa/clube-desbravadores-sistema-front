import { Component, HostListener, ViewChild, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { CantinhoUnidadeComponent } from '../cantinho-unidade.component';

@Component({
    selector: 'app-cantinho-marcacao',
    templateUrl: './marcacao.component.html',
    styleUrls: ['./marcacao.component.scss']
})
export class MarcacaoComponent {
    @ViewChildren('stepFirstInput', { read: ElementRef })
    stepFirstInputs?: QueryList<ElementRef>;

    @ViewChild('stepperContainer', { read: ElementRef })
    stepperHeaderElement?: ElementRef;

    constructor(public parent: CantinhoUnidadeComponent, private host: ElementRef) {}

    get form() {
        return this.parent.form;
    }

    get sundays() {
        return this.parent.sundays;
    }

    get quickItems() {
        return this.parent.quickItems;
    }

    get desbravadores() {
        return this.parent.desbravadores;
    }

    get submittingQuick() {
        return this.parent.submittingQuick;
    }

    getQuickScore(key: string, id: number) {
        return this.parent.getQuickScore(key, id);
    }

    getOptions(key: string) {
        return this.parent.getOptions ? this.parent.getOptions(key) : [];
    }

    setQuickScore(key: string, id: number, value: any) {
        return this.parent.setQuickScore ? this.parent.setQuickScore(key, id, value) : null;
    }

    saveQuickMarks() {
        return this.parent.saveQuickMarks();
    }

    get presentDesbravadores() {
        return this.parent.presentDesbravadores;
    }

    get pointsMap() {
        return this.parent.pointsMap;
    }

    getQuickTotal(desbId: number) {
        return this.parent.getQuickTotal ? this.parent.getQuickTotal(desbId) : 0;
    }

    onSundayChange($event: any) {
        return this.parent.onSundayChange ? this.parent.onSundayChange($event) : null;
    }

    // Stepper state is kept on parent but navigation/scroll/focus logic lives here
    get activeStepIndex() {
        return this.parent.activeStepIndex;
    }

    set activeStepIndex(v: number) {
        this.parent.activeStepIndex = v;
    }

    @HostListener('window:resize')
    updateStepperOrientation() {
        try {
            // intentionally empty — parent manages orientation
        } catch (e) {
            // ignore
        }
    }

    nextStep() {
        try {
            const max = this.quickItems?.length ?? 0;
            if (this.activeStepIndex < max) this.activeStepIndex++;

            setTimeout(() => this.scrollToActiveStepHeader(), 0);

            setTimeout(() => {
                try {
                    const el = document.querySelector('.stepper-headers') as HTMLElement | null;
                    if (el && typeof el.scrollIntoView === 'function') {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
                    }
                } catch (e) {
                    /* ignore */
                }
            }, 50);

            setTimeout(() => {
                this.scrollToActiveStepContent();
                this.focusFirstInActiveStep();
            }, 180);
        } catch (e) {
            console.warn(e);
        }
    }

    previousStep() {
        try {
            if (this.activeStepIndex > 0) this.activeStepIndex--;

            setTimeout(() => this.scrollToActiveStepHeader(), 0);

            setTimeout(() => {
                try {
                    const el = document.querySelector('.stepper-headers') as HTMLElement | null;
                    if (el && typeof el.scrollIntoView === 'function') {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
                    }
                } catch (e) {
                    /* ignore */
                }
            }, 50);

            setTimeout(() => {
                this.scrollToActiveStepContent();
                this.focusFirstInActiveStep();
            }, 180);
        } catch (e) {
            console.warn(e);
        }
    }

    goToStep(i: number) {
        const max = this.quickItems?.length ?? 0;
        if (i < 0) i = 0;
        if (i > max) i = max;
        this.activeStepIndex = i;

        setTimeout(() => this.scrollToActiveStepHeader(), 0);
        setTimeout(() => {
            this.scrollToActiveStepContent();
            this.focusFirstInActiveStep();
        }, 180);
    }

    private scrollToActiveStepContent() {
        try {
            const idx = this.activeStepIndex ?? 0;
            const host = this.host?.nativeElement as HTMLElement | null;
            const panels = host
                ? (host.querySelectorAll('.step-panel') as NodeListOf<HTMLElement>)
                : (document.querySelectorAll('.step-panel') as NodeListOf<HTMLElement>);
            const panel = panels?.[idx] as HTMLElement | undefined;
            if (panel) {
                const rect = panel.getBoundingClientRect();
                const headerOffset = 72;
                const target = rect.top + window.pageYOffset - headerOffset - 8;
                window.scrollTo({ top: target, behavior: 'smooth' });
            }
        } catch (e) {
            /* ignore */
        }
    }

    private scrollToActiveStepHeader() {
        try {
            const idx = this.activeStepIndex ?? 0;
            const headerContainer =
                (this.stepperHeaderElement?.nativeElement as HTMLElement | null) ||
                (this.host?.nativeElement && (this.host.nativeElement.querySelector('.stepper-headers, .mat-horizontal-stepper-header, .mat-mdc-stepper-header, .mat-stepper-header') as HTMLElement)) ||
                (document.querySelector('.stepper-headers, .mat-horizontal-stepper-header, .mat-mdc-stepper-header, .mat-stepper-header') as HTMLElement);

            if (!headerContainer) return;

            const selector = `[data-step="${idx}"]`;
            const header = headerContainer.querySelector(selector) as HTMLElement | null;
            if (header) {
                try {
                    const container = headerContainer as HTMLElement;
                    const headerCenter = header.offsetLeft + header.offsetWidth / 2;
                    const targetScrollLeft = Math.max(0, headerCenter - container.clientWidth / 2);
                    if (typeof container.scrollTo === 'function') {
                        container.scrollTo({ left: targetScrollLeft, behavior: 'smooth' });
                        return;
                    }
                    if (typeof header.scrollIntoView === 'function') {
                        header.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                    }
                } catch (e) {
                    /* ignore */
                }
            }
        } catch (e) {
            // ignore
        }
    }

    private focusFirstInActiveStep() {
        try {
            const idx = this.activeStepIndex ?? 0;
            const arr = this.stepFirstInputs?.toArray() ?? [];
            const elRef = arr[idx];
            if (elRef && elRef.nativeElement) {
                try {
                    const el = elRef.nativeElement as HTMLElement;
                    if (typeof el.focus === 'function') {
                        el.focus();
                        return;
                    }
                    const inner = el.querySelector<HTMLElement>('select, input, button, [tabindex]');
                    if (inner && typeof inner.focus === 'function') {
                        inner.focus();
                        return;
                    }
                } catch (e) {
                    /* ignore */
                }
            }

            try {
                const host = this.host?.nativeElement as HTMLElement | null;
                if (host) {
                    const steps = host.querySelectorAll('.step-panel, .mat-step, .mat-stepper-content');
                    const panel = steps?.[idx] as HTMLElement | undefined;
                    const root = panel ?? host.querySelector('.stepper-content') ?? host;
                    if (root) {
                        const first = root.querySelector<HTMLElement>('select, input, textarea, button, [tabindex]');
                        if (first && typeof first.focus === 'function') {
                            first.focus();
                            return;
                        }
                    }
                }
            } catch (e) {
                // ignore
            }
        } catch (e) {
            // ignore
        }
    }
}
