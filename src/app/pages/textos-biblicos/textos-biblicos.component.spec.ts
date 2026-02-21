import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TextosBiblicosComponent } from './textos-biblicos.component';

describe('TextosBiblicosComponent', () => {
  let component: TextosBiblicosComponent;
  let fixture: ComponentFixture<TextosBiblicosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TextosBiblicosComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TextosBiblicosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
