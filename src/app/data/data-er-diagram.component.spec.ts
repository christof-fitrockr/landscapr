import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DataErDiagramComponent } from './data-er-diagram.component';
import { DataService } from '../services/data.service';
import { ErDiagramService } from '../services/er-diagram.service';
import { of } from 'rxjs';
import { Data } from '../models/data';

describe('DataErDiagramComponent', () => {
  let component: DataErDiagramComponent;
  let fixture: ComponentFixture<DataErDiagramComponent>;
  let dataServiceSpy: jasmine.SpyObj<DataService>;
  let erDiagramServiceSpy: jasmine.SpyObj<ErDiagramService>;

  beforeEach(async () => {
    const dataSpy = jasmine.createSpyObj('DataService', ['all', 'update']);
    const erSpy = jasmine.createSpyObj('ErDiagramService', ['drawErDiagram']);

    await TestBed.configureTestingModule({
      declarations: [ DataErDiagramComponent ],
      providers: [
        { provide: DataService, useValue: dataSpy },
        { provide: ErDiagramService, useValue: erSpy }
      ]
    })
    .compileComponents();

    dataServiceSpy = TestBed.inject(DataService) as jasmine.SpyObj<DataService>;
    erDiagramServiceSpy = TestBed.inject(ErDiagramService) as jasmine.SpyObj<ErDiagramService>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DataErDiagramComponent);
    component = fixture.componentInstance;
    dataServiceSpy.all.and.returnValue(of([{ id: '1', name: 'Test', items: [] } as Data]));
    // Mock positions map
    const positions = new Map();
    positions.set('1', { x: 10, y: 10, w: 100, h: 100 });
    erDiagramServiceSpy.drawErDiagram.and.returnValue(positions);

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should update data position on drag and drop', () => {
    component.ngOnInit();
    // Simulate draw being called (it's called in timeout, so we might need to tick or just call it)
    component.draw();

    // Mouse down on the entity at 20, 20 (inside 10,10 100x100)
    const canvas = component.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const eventDown = new MouseEvent('mousedown', {
      clientX: rect.left + 20,
      clientY: rect.top + 20
    });
    component.onMouseDown(eventDown);

    // Mouse move by 10px
    const eventMove = new MouseEvent('mousemove', {
      clientX: rect.left + 30,
      clientY: rect.top + 30
    });
    component.onMouseMove(eventMove);

    // Mouse up
    dataServiceSpy.update.and.returnValue(of({} as Data));
    const eventUp = new MouseEvent('mouseup', {
        clientX: rect.left + 30,
        clientY: rect.top + 30
    });
    component.onMouseUp(eventUp);

    expect(dataServiceSpy.update).toHaveBeenCalled();
    const updatedData = dataServiceSpy.update.calls.mostRecent().args[1];
    // Original x: 10, y: 10. Click at 20, 20. Offset: 10, 10.
    // Move to 30, 30. New Pos = 30 - 10 = 20.
    // So new x,y should be 20, 20.
    expect(updatedData.x).toBe(20);
    expect(updatedData.y).toBe(20);
  });
});
