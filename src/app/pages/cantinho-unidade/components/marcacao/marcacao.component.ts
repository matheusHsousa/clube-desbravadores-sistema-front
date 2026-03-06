import { Component } from '@angular/core';
import { CantinhoUnidadeComponent } from '../cantinho-unidade.component';

@Component({
    selector: 'app-cantinho-marcacao',
    templateUrl: './marcacao.component.html',
    styleUrls: ['../cantinho-unidade.component.scss', '../cantinho-stepper.scss']

})
export class MarcacaoComponent {
    constructor(public parent: CantinhoUnidadeComponent) { }

    get form() { return this.parent.form; }
    get sundays() { return this.parent.sundays; }
    get quickItems() { return this.parent.quickItems; }
    get desbravadores() { return this.parent.desbravadores; }
    get activeStepIndex() { return this.parent.activeStepIndex; }
    get submittingQuick() { return this.parent.submittingQuick; }

    getQuickScore(key: string, id: number) { return this.parent.getQuickScore(key, id); }
    getOptions(key: string) { return this.parent.getOptions ? (this.parent.getOptions(key)) : []; }
    setQuickScore(key: string, id: number, value: any) { return this.parent.setQuickScore ? this.parent.setQuickScore(key, id, value) : null; }
    nextStep() { return this.parent.nextStep(); }
    previousStep() { return this.parent.previousStep(); }
    saveQuickMarks() { return this.parent.saveQuickMarks(); }
    get presentDesbravadores() { return this.parent.presentDesbravadores; }
    get pointsMap() { return this.parent.pointsMap; }
    onSundayChange($event: any) { return this.parent.onSundayChange ? this.parent.onSundayChange($event) : null; }
}
