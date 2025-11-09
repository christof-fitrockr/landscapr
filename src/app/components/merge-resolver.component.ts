import { Component } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { MergeService, LandscaprData, SectionChoice } from '../services/merge.service';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-merge-resolver',
  templateUrl: './merge-resolver.component.html',
  styleUrls: ['./merge-resolver.component.scss']
})
export class MergeResolverComponent {
  // Inputs via initialState
  repoData: any;
  localData: any;

  // Outputs
  onClose: Subject<LandscaprData> = new Subject<LandscaprData>();

  choice: any = {
    processes: 'repo',
    apiCalls: 'repo',
    capabilities: 'repo',
    applications: 'repo',
    journeys: 'repo'
  };

  constructor(public bsModalRef: BsModalRef, private mergeService: MergeService) {}

  ngOnInit(): void {
    // Initialize defaults to prefer local when it differs, otherwise keep repo
    this.choice = {
      processes: this.pref('processes'),
      apiCalls: this.pref('apiCalls'),
      capabilities: this.pref('capabilities'),
      applications: this.pref('applications'),
      journeys: this.pref('journeys'),
    } as SectionChoice;
  }

  private pref(section: keyof LandscaprData): 'repo' | 'local' {
    const r = (this.repoData && this.repoData[section]) || [];
    const l = (this.localData && this.localData[section]) || [];
    return this.mergeService.different(r, l) ? 'local' : 'repo';
  }

  get repo(): any { return this.repoData || {}; }
  get local(): any { return this.localData || {}; }

  getChoice(section: string): 'repo' | 'local' {
    return this.choice[section];
  }

  setChoice(section: string, val: 'repo' | 'local'): void {
    this.choice[section] = val;
  }

  getArray(obj: any, section: string): any[] {
    const val = obj && obj[section];
    return Array.isArray(val) ? val : (val ? val : []);
  }

  getCount(obj: any, section: string): number {
    return this.getArray(obj, section).length;
  }

  apply(): void {
    const merged = this.mergeService.buildMerged(this.repoData || {}, this.localData || {}, this.choice);
    this.onClose.next(merged);
    this.bsModalRef.hide();
  }

  cancel(): void {
    this.onClose.next(undefined as any);
    this.bsModalRef.hide();
  }
}
