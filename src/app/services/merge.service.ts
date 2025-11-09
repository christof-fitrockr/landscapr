import { Injectable } from '@angular/core';

export interface LandscaprData {
  processes?: any[];
  apiCalls?: any[];
  capabilities?: any[];
  applications?: any[];
  journeys?: any[];
}

export interface SectionChoice {
  processes: 'repo' | 'local';
  apiCalls: 'repo' | 'local';
  capabilities: 'repo' | 'local';
  applications: 'repo' | 'local';
  journeys: 'repo' | 'local';
}

@Injectable({ providedIn: 'root' })
export class MergeService {

  different(a: any, b: any): boolean {
    try {
      return JSON.stringify(a) !== JSON.stringify(b);
    } catch {
      return true;
    }
  }

  buildMerged(repo: LandscaprData, local: LandscaprData, choice: SectionChoice): LandscaprData {
    return {
      processes: choice.processes === 'repo' ? (repo.processes ?? []) : (local.processes ?? []),
      apiCalls: choice.apiCalls === 'repo' ? (repo.apiCalls ?? []) : (local.apiCalls ?? []),
      capabilities: choice.capabilities === 'repo' ? (repo.capabilities ?? []) : (local.capabilities ?? []),
      applications: choice.applications === 'repo' ? (repo.applications ?? []) : (local.applications ?? []),
      journeys: choice.journeys === 'repo' ? (repo.journeys ?? []) : (local.journeys ?? []),
    };
  }
}
