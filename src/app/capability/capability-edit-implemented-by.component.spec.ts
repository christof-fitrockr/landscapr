import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CapabilityEditImplementedByComponent } from './capability-edit-implemented-by.component';
import { CapabilityService } from '../services/capability.service';
import { ApplicationService } from '../services/application.service';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { ApiCallService } from '../services/api-call.service';
import { of, Subject } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { Capability } from '../models/capability';
import { Application } from '../models/application';

describe('CapabilityEditImplementedByComponent', () => {
  let component: CapabilityEditImplementedByComponent;
  let fixture: ComponentFixture<CapabilityEditImplementedByComponent>;
  let mockCapabilityService: jasmine.SpyObj<CapabilityService>;
  let mockApplicationService: jasmine.SpyObj<ApplicationService>;
  let mockToastrService: jasmine.SpyObj<ToastrService>;
  let mockApiCallService: jasmine.SpyObj<ApiCallService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let paramMapSubject: Subject<any>;

  const mockCapability: Capability = {
    id: 'cap1',
    repoId: 'repo1',
    name: 'Capability 1',
    description: 'Description 1',
    implementedBy: ['app1', 'app2'],
    status: 0,
    tags: []
  };

  const mockApp1: Application = {
    id: 'app1',
    name: 'App 1',
    description: 'App 1 Desc',
    repoId: 'repo1',
    systemCluster: 'Cluster A',
    contact: 'Contact 1',
    url: 'http://app1.com',
    tags: [],
    status: 0
  };

  const mockApp2: Application = {
    id: 'app2',
    name: 'App 2',
    description: 'App 2 Desc',
    repoId: 'repo1',
    systemCluster: 'Cluster A',
    contact: 'Contact 2',
    url: 'http://app2.com',
    tags: [],
    status: 0
  };

  beforeEach(async () => {
    mockCapabilityService = jasmine.createSpyObj('CapabilityService', ['byId', 'update', 'all']);
    mockApplicationService = jasmine.createSpyObj('ApplicationService', ['byId', 'byName', 'create', 'all', 'byIds']);
    mockToastrService = jasmine.createSpyObj('ToastrService', ['error', 'info']);
    mockApiCallService = jasmine.createSpyObj('ApiCallService', ['all']);
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    paramMapSubject = new Subject();

    const mockActivatedRoute = {
      parent: {
        paramMap: paramMapSubject.asObservable(),
        snapshot: {
          paramMap: {
            get: (key: string) => {
              if (key === 'id') return 'cap1';
              return null;
            }
          }
        }
      }
    };

    await TestBed.configureTestingModule({
      declarations: [CapabilityEditImplementedByComponent],
      imports: [ReactiveFormsModule],
      providers: [
        { provide: CapabilityService, useValue: mockCapabilityService },
        { provide: ApplicationService, useValue: mockApplicationService },
        { provide: ToastrService, useValue: mockToastrService },
        { provide: ApiCallService, useValue: mockApiCallService },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        FormBuilder
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CapabilityEditImplementedByComponent);
    component = fixture.componentInstance;

    mockCapabilityService.byId.and.returnValue(of(mockCapability));
    mockCapabilityService.all.and.returnValue(of([]));
    mockApplicationService.byId.and.callFake((id) => {
      if (id === 'app1') return of(mockApp1);
      if (id === 'app2') return of(mockApp2);
      return of({ id, name: 'Unknown' } as Application);
    });
    mockApplicationService.byIds.and.callFake((ids) => {
      const result = [];
      if (ids.includes('app1')) result.push(mockApp1);
      if (ids.includes('app2')) result.push(mockApp2);
      return of(result);
    });
    mockApplicationService.all.and.returnValue(of([]));
    mockApiCallService.all.and.returnValue(of([]));
    mockApplicationService.byName.and.returnValue(of([]));

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should populate systems based on capability.implementedBy', fakeAsync(() => {
    // Trigger the subscription in ngOnInit
    paramMapSubject.next({ get: (key: string) => 'repo1' });
    tick(); // allow refresh() to complete

    expect(mockCapabilityService.byId).toHaveBeenCalledWith('cap1');
    expect(mockApplicationService.byIds).toHaveBeenCalledWith(['app1', 'app2']);

    expect(component.systems.length).toBe(2);
    const ids = component.systems.map(s => s.id);
    expect(ids).toEqual(['app1', 'app2']);
  }));

  it('should handle empty implementedBy', fakeAsync(() => {
    const capEmpty = { ...mockCapability, implementedBy: [] };
    mockCapabilityService.byId.and.returnValue(of(capEmpty));

    paramMapSubject.next({ get: (key: string) => 'repo1' });
    tick();

    expect(component.systems).toEqual([]);
  }));

  it('should handle null implementedBy', fakeAsync(() => {
    const capNull = { ...mockCapability, implementedBy: null } as any;
    mockCapabilityService.byId.and.returnValue(of(capNull));

    paramMapSubject.next({ get: (key: string) => 'repo1' });
    tick();

    // component.systems might not be initialized if we don't hit the loop, but in refresh() it is set to [] inside the if?
    // Looking at code:
    // if(this.capability.implementedBy) { this.systems = []; ... }
    // So if implementedBy is null, systems is NOT set to [] in current code?
    // Actually, systems is undefined initially.
    // Let's check expectations for refactor. Ideally it should be [] or stay undefined/empty.
    // In current code: systems is not touched if implementedBy is falsy.

    // Refactored code sets systems to empty array
    expect(component.systems).toEqual([]);
  }));
});
