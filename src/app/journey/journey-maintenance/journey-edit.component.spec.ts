import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JourneyEditComponent } from './journey-edit.component';

describe('JourneyEditComponent', () => {
  let component: JourneyEditComponent;
  let fixture: ComponentFixture<JourneyEditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ JourneyEditComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(JourneyEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
