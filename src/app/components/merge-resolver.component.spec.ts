import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MergeResolverComponent } from './merge-resolver.component';
import { MergeService, LandscaprData, DiffNode } from '../services/merge.service';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { FormsModule } from '@angular/forms';

describe('MergeResolverComponent', () => {
  let component: MergeResolverComponent;
  let fixture: ComponentFixture<MergeResolverComponent>;
  let mockMergeService: jasmine.SpyObj<MergeService>;

  beforeEach(async () => {
    mockMergeService = jasmine.createSpyObj('MergeService', ['computeDiffs', 'computeItemDiff', 'buildMergedItemLevel']);

    await TestBed.configureTestingModule({
      declarations: [MergeResolverComponent],
      imports: [FormsModule],
      providers: [
        { provide: BsModalRef, useValue: { hide: () => {} } },
        { provide: MergeService, useValue: mockMergeService }
      ]
    })
    .compileComponents();
  });

  function setup(conflicts: number) {
    fixture = TestBed.createComponent(MergeResolverComponent);
    component = fixture.componentInstance;

    const mockDiffs: any = {
      processes: { section: 'processes', items: [] },
      apiCalls: { section: 'apiCalls', items: [] },
      capabilities: { section: 'capabilities', items: [] },
      applications: { section: 'applications', items: [] },
      journeys: { section: 'journeys', items: [] },
    };

    if (conflicts > 0) {
      mockDiffs.processes.items.push({ key: '1', status: 'conflict', repoItem: { id: '1' }, localItem: { id: '1' } });
    }
    mockDiffs.processes.items.push({ key: '2', status: 'onlyLocal', localItem: { id: '2' } }); // Update

    mockMergeService.computeDiffs.and.returnValue(mockDiffs);
    component.repoData = {};
    component.localData = {};
    fixture.detectChanges();
  }

  it('should enable simple mode if no conflicts exist', () => {
    setup(0); // 0 conflicts
    expect(component.totalConflicts).toBe(0);
    expect(component.isSimpleMode).toBeTrue();
  });

  it('should disable simple mode if conflicts exist', () => {
    setup(1); // 1 conflict
    expect(component.totalConflicts).toBe(1);
    expect(component.isSimpleMode).toBeFalse();
  });

  it('should resolve all to repo when requested', () => {
    setup(1);
    // Initial state: conflict defaults to local
    expect(component.choices.processes['1']).toBe('local');

    component.resolveAll('repo');
    expect(component.choices.processes['1']).toBe('repo');
    expect(component.choices.processes['2']).toBe('repo'); // non-conflict also updated
  });

  it('should flatten diff correctly', () => {
    setup(0);
    const node: DiffNode = {
      key: 'root', type: 'object',
      children: [
        { key: 'child', type: 'changed', left: 'old', right: 'new' },
        { key: 'sub', type: 'object', children: [
          { key: 'leaf', type: 'added', left: undefined, right: 'val' }
        ]}
      ]
    };

    const flat = component.flattenDiff(node, '');
    expect(flat.length).toBe(2);
    expect(flat[0].path).toBe('root.child');
    expect(flat[0].type).toBe('changed');
    expect(flat[1].path).toBe('root.sub.leaf');
    expect(flat[1].type).toBe('added');
  });
});
