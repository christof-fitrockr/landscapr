import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { CapabilityEditImplementedByComponent } from './capability-edit-implemented-by.component';
import { CapabilityService } from '../services/capability.service';
import { ApplicationService } from '../services/application.service';
import { ApiCallService } from '../services/api-call.service';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ToastrService } from 'ngx-toastr';
import { of } from 'rxjs';
import { ActivatedRoute } from '@angular/router';

describe('CapabilityEditImplementedByComponent', () => {
  let component: CapabilityEditImplementedByComponent;
  let fixture: ComponentFixture<CapabilityEditImplementedByComponent>;
  let capabilityService: jasmine.SpyObj<CapabilityService>;
  let applicationService: jasmine.SpyObj<ApplicationService>;
  let apiCallService: jasmine.SpyObj<ApiCallService>;

  beforeEach(async () => {
    const capSpy = jasmine.createSpyObj('CapabilityService', ['byId', 'all', 'update']);
    const appSpy = jasmine.createSpyObj('ApplicationService', ['byId', 'all', 'create', 'byName']);
    const apiSpy = jasmine.createSpyObj('ApiCallService', ['all']);
    const toastrSpy = jasmine.createSpyObj('ToastrService', ['success', 'error', 'info']);

    await TestBed.configureTestingModule({
      declarations: [ CapabilityEditImplementedByComponent ],
      imports: [
        ReactiveFormsModule,
        RouterTestingModule,
        HttpClientTestingModule
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: CapabilityService, useValue: capSpy },
        { provide: ApplicationService, useValue: appSpy },
        { provide: ApiCallService, useValue: apiSpy },
        { provide: ToastrService, useValue: toastrSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            parent: {
              paramMap: of({ get: () => 'repo1' }),
              snapshot: {
                paramMap: {
                  get: () => 'cap1'
                }
              }
            }
          }
        }
      ]
    })
    .compileComponents();

    capabilityService = TestBed.inject(CapabilityService) as jasmine.SpyObj<CapabilityService>;
    applicationService = TestBed.inject(ApplicationService) as jasmine.SpyObj<ApplicationService>;
    apiCallService = TestBed.inject(ApiCallService) as jasmine.SpyObj<ApiCallService>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CapabilityEditImplementedByComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load systems on refresh', fakeAsync(() => {
    const mockCapability = {
      id: 'cap1',
      name: 'Test Capability',
      implementedBy: ['sys1', 'sys2']
    };

    const mockSystem1 = { id: 'sys1', name: 'System 1' };
    const mockSystem2 = { id: 'sys2', name: 'System 2' };

    capabilityService.byId.and.returnValue(of(mockCapability as any));
    applicationService.byId.withArgs('sys1').and.returnValue(of(mockSystem1 as any));
    applicationService.byId.withArgs('sys2').and.returnValue(of(mockSystem2 as any));

    // Mock other calls in ngOnInit/refreshTree
    applicationService.all.and.returnValue(of([]));
    capabilityService.all.and.returnValue(of([]));
    apiCallService.all.and.returnValue(of([]));

    // ngOnInit triggers refresh via subscription to parent params
    fixture.detectChanges();

    tick(); // Wait for async calls

    expect(capabilityService.byId).toHaveBeenCalledWith('cap1');
    expect(applicationService.byId).toHaveBeenCalledWith('sys1');
    expect(applicationService.byId).toHaveBeenCalledWith('sys2');

    expect(component.systems.length).toBe(2);
    // Note: In original implementation, order is not guaranteed if calls were real async,
    // but in test environment with of(), they are synchronous.
    // We check containment to be safe initially, but we want to assert order eventually.
    expect(component.systems).toContain(mockSystem1 as any);
    expect(component.systems).toContain(mockSystem2 as any);
  }));
});
