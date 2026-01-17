import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CapabilitySelectorTreeNodeComponent } from './capability-selector-tree-node.component';
import { Capability } from '../../models/capability';

describe('CapabilitySelectorTreeNodeComponent', () => {
  let component: CapabilitySelectorTreeNodeComponent;
  let fixture: ComponentFixture<CapabilitySelectorTreeNodeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CapabilitySelectorTreeNodeComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CapabilitySelectorTreeNodeComponent);
    component = fixture.componentInstance;
    component.capability = new Capability();
    component.capability.id = '1';
    component.capability.name = 'Test Capability';
    component.selectedIds = new Set<string>();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle selection', () => {
    component.toggleSelection();
    expect(component.selectedIds.has('1')).toBeTrue();
    component.toggleSelection();
    expect(component.selectedIds.has('1')).toBeFalse();
  });

  it('should show if matches search', () => {
      component.searchText = 'Test';
      expect(component.shouldShow()).toBeTrue();
  });

  it('should hide if does not match search', () => {
      component.searchText = 'Other';
      expect(component.shouldShow()).toBeFalse();
  });
});
