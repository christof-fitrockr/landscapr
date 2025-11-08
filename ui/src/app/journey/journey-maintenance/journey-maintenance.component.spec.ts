import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JourneyMaintenanceComponent } from './journey-maintenance.component';

describe('JourneyMaintenanceComponent', () => {
  let component: JourneyMaintenanceComponent;
  let fixture: ComponentFixture<JourneyMaintenanceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ JourneyMaintenanceComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(JourneyMaintenanceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
