import { Component } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { MergeService, LandscaprData, SectionDiff, AllItemChoices, ItemChoicesPerSection, ItemRecord, DiffNode } from '../services/merge.service';
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
  requireCommitMessage: boolean = false;

  // Outputs
  onClose: Subject<any> = new Subject<any>();

  // Item-level state
  diffs: { [K in keyof LandscaprData]: SectionDiff } | null = null;
  choices: AllItemChoices = {
    processes: {},
    apiCalls: {},
    capabilities: {},
    applications: {},
    journeys: {}
  };

  activeTab: keyof LandscaprData = 'processes';
  showConflictsOnly: boolean = true;

  // View options
  highlightedView: boolean = true;
  showChangedOnly: boolean = false;

  // Commit message
  commitMessage: string = '';

  // Diff cache per section+itemKey
  private diffCache = new Map<string, any>();

  constructor(public bsModalRef: BsModalRef, private mergeService: MergeService) {}

  ngOnInit(): void {
    const repo = this.repoData || {};
    const local = this.localData || {};
    this.diffs = this.mergeService.computeDiffs(repo, local);
    // Defaults: same -> either (prefer local), onlyRepo -> repo, onlyLocal -> local, conflict -> local
    (['processes','apiCalls','capabilities','applications','journeys'] as (keyof LandscaprData)[]).forEach(sec => {
      const map: ItemChoicesPerSection = {};
      for (const rec of (this.diffs![sec].items || [])) {
        switch (rec.status) {
          case 'same':
            // no explicit choice needed
            break;
          case 'onlyRepo':
            map[rec.key] = 'repo';
            break;
          case 'onlyLocal':
            map[rec.key] = 'local';
            break;
          case 'conflict':
            map[rec.key] = 'local';
            break;
        }
      }
      (this.choices as any)[sec] = map;
    });
  }

  setActiveTab(tab: keyof LandscaprData): void {
    this.activeTab = tab;
  }

  // UI helpers
  sectionTitle(section: keyof LandscaprData): string { return section; }

  countByStatus(section: keyof LandscaprData, status: string): number {
    const sec = this.diffs![section];
    return (sec?.items || []).filter(i => i.status === status).length;
  }

  filteredItems(section: keyof LandscaprData): ItemRecord[] {
    const all = this.diffs ? (this.diffs[section]?.items || []) : [];
    return this.showConflictsOnly ? all.filter(i => i.status === 'conflict') : all;
  }

  getName(item: any): string {
    return (item && (item.name || item.id || item.repoId || '')) + '';
  }

  pick(section: keyof LandscaprData, key: string, side: 'repo' | 'local'): void {
    (this.choices[section] as ItemChoicesPerSection)[key] = side;
  }

  bulk(section: keyof LandscaprData, side: 'repo' | 'local'): void {
    const map = (this.choices[section] as ItemChoicesPerSection);
    for (const rec of (this.diffs![section].items || [])) {
      if (rec.status === 'conflict') {
        map[rec.key] = side;
      }
    }
  }

  // ----- Diff helpers -----
  private cacheKey(section: keyof LandscaprData, key: string): string {
    return `${section}:${key}`;
  }

  getDiff(section: keyof LandscaprData, rec: ItemRecord): DiffNode | null {
    if (!rec) return null;
    const ckey = this.cacheKey(section, rec.key);
    if (this.diffCache.has(ckey)) return this.diffCache.get(ckey);
    const node = this.mergeService.computeItemDiff(section, rec.repoItem, rec.localItem);
    this.diffCache.set(ckey, node);
    return node;
  }

  countChanges(node: DiffNode | null | undefined): { changed: number; added: number; removed: number } {
    const out = { changed: 0, added: 0, removed: 0 };
    const walk = (n: DiffNode | undefined) => {
      if (!n) return;
      if (n.type === 'changed') out.changed++;
      if (n.type === 'added') out.added++;
      if (n.type === 'removed') out.removed++;
      (n.children || []).forEach(walk);
    };
    walk(node || undefined);
    return out;
  }

  // Whether to render a node based on showChangedOnly
  showNode(n: DiffNode): boolean {
    if (!this.showChangedOnly) return true;
    if (n.type === 'equal') return false;
    if (!n.children || n.children.length === 0) return true;
    return (n.children || []).some(ch => this.showNode(ch));
  }

  // CSS class to highlight per side
  cssClass(n: DiffNode, side: 'left' | 'right'): any {
    switch (n.type) {
      case 'added': return side === 'left' ? 'diff-added' : 'diff-missing';
      case 'removed': return side === 'right' ? 'diff-added' : 'diff-missing'; // show as added on local side
      case 'changed': return 'diff-changed';
      case 'equal': return 'diff-equal';
      default: return '';
    }
  }

  // Value for a leaf node per side
  valueFor(n: DiffNode, side: 'left' | 'right'): any {
    return side === 'left' ? n.left : n.right;
  }

  isContainer(n: DiffNode): boolean {
    return n.type === 'object' || n.type === 'array';
  }

  isLeaf(n: DiffNode): boolean {
    return !n.children || n.children.length === 0;
  }

  apply(): void {
    const merged = this.mergeService.buildMergedItemLevel(this.repoData || {}, this.localData || {}, this.choices);
    if (this.requireCommitMessage) {
      const msg = (this.commitMessage || '').trim();
      this.onClose.next({ data: merged, commitMessage: msg });
    } else {
      this.onClose.next(merged);
    }
    this.bsModalRef.hide();
  }

  cancel(): void {
    this.onClose.next(undefined as any);
    this.bsModalRef.hide();
  }
}
