import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

import { ModelDiff, ModelDiffService, ModelPayload, ObjectChange } from './model-diff.service';
import { landscapeNodeId } from '../models/landscape.model';

/** What the user is doing with the two states of the model */
export type ReviewMode = 'review' | 'conflicts';

/** Which side of a conflict the user decided to keep */
export type ConflictChoice = 'mine' | 'theirs';

export interface ReviewSession {
  mode: ReviewMode;
  /** headline of the review banner */
  title: string;
  /** what the two sides are called in this situation */
  mineLabel: string;
  theirsLabel: string;
  /** state in the repository */
  theirs: ModelPayload;
  /** state being proposed */
  mine: ModelPayload;
  diff: ModelDiff;
  resolutions: { [nodeId: string]: ConflictChoice };
}

/** Sections of the stored model and the layer their elements belong to */
const SECTIONS: { section: keyof ModelPayload; layer: any }[] = [
  { section: 'journeys', layer: 'journey' },
  { section: 'processes', layer: 'process' },
  { section: 'capabilities', layer: 'capability' },
  { section: 'apiCalls', layer: 'api' },
  { section: 'data', layer: 'data' },
  { section: 'applications', layer: 'system' }
];

/**
 * Holds the review a user is currently looking at. The landscape canvas reads
 * it to paint the changes; the page that started the review gets the resolved
 * model back.
 */
@Injectable({ providedIn: 'root' })
export class ReviewSessionService {

  private sessionSubject = new BehaviorSubject<ReviewSession | null>(null);
  readonly session$: Observable<ReviewSession | null> = this.sessionSubject.asObservable();

  /** called with the merged model once every conflict has been decided */
  private applyHandler: ((merged: ModelPayload) => void) | null = null;

  constructor(private modelDiffService: ModelDiffService) {}

  get session(): ReviewSession | null {
    return this.sessionSubject.value;
  }

  /** Starts a plain review: what does the proposed state change? */
  startReview(theirs: ModelPayload, mine: ModelPayload, options?: { title?: string; mineLabel?: string; theirsLabel?: string }): ReviewSession {
    const diff = this.modelDiffService.compute(theirs, mine);
    const session: ReviewSession = {
      mode: 'review',
      title: options?.title || 'Review of your changes',
      mineLabel: options?.mineLabel || 'Your version',
      theirsLabel: options?.theirsLabel || 'Published model',
      theirs,
      mine,
      diff,
      resolutions: {}
    };
    this.applyHandler = null;
    this.sessionSubject.next(session);
    return session;
  }

  /**
   * Starts a resolution: both sides changed the model and someone has to
   * decide per element which version survives.
   */
  startConflictResolution(
    theirs: ModelPayload,
    mine: ModelPayload,
    onApply: (merged: ModelPayload) => void,
    options?: { title?: string; mineLabel?: string; theirsLabel?: string; base?: ModelPayload }
  ): ReviewSession {
    const diff = this.modelDiffService.markConflicts(
      this.modelDiffService.compute(theirs, mine),
      theirs,
      mine,
      options?.base
    );

    const session: ReviewSession = {
      mode: 'conflicts',
      title: options?.title || 'Differences to resolve',
      mineLabel: options?.mineLabel || 'Your version',
      theirsLabel: options?.theirsLabel || 'Version in the repository',
      theirs,
      mine,
      diff,
      // nothing decided yet, the user has to pick for every conflict
      resolutions: {}
    };
    this.applyHandler = onApply;
    this.sessionSubject.next(session);
    return session;
  }

  end(): void {
    this.applyHandler = null;
    this.sessionSubject.next(null);
  }

  resolve(nodeId: string, choice: ConflictChoice): void {
    const session = this.session;
    if (!session) return;
    session.resolutions = { ...session.resolutions, [nodeId]: choice };
    this.sessionSubject.next({ ...session });
  }

  resolveAll(choice: ConflictChoice): void {
    const session = this.session;
    if (!session) return;
    const resolutions = { ...session.resolutions };
    session.diff.conflicts.forEach(conflict => resolutions[conflict.nodeId] = choice);
    session.resolutions = resolutions;
    this.sessionSubject.next({ ...session });
  }

  choiceFor(nodeId: string): ConflictChoice | null {
    return this.session?.resolutions[nodeId] || null;
  }

  openConflicts(): ObjectChange[] {
    const session = this.session;
    if (!session) return [];
    return session.diff.conflicts.filter(conflict => !session.resolutions[conflict.nodeId]);
  }

  /**
   * Builds the resolved model and hands it back to whoever started the review.
   * The result is assembled from whole stored objects, so it is a valid model
   * by construction - no text is ever patched together.
   */
  apply(): ModelPayload | null {
    const session = this.session;
    if (!session || this.openConflicts().length > 0) return null;

    const merged = this.buildMerged(session);
    const handler = this.applyHandler;
    this.end();
    if (handler) {
      handler(merged);
    }
    return merged;
  }

  /** The merged model as it would be saved right now */
  buildMerged(session: ReviewSession): ModelPayload {
    const merged: ModelPayload = {};

    SECTIONS.forEach(({ section, layer }) => {
      const theirItems = new Map<string, any>(((session.theirs as any)[section] || []).map((item: any) => [item.id, item]));
      const myItems = new Map<string, any>(((session.mine as any)[section] || []).map((item: any) => [item.id, item]));
      const ids = Array.from(new Set([...theirItems.keys(), ...myItems.keys()]));

      (merged as any)[section] = ids.map(id => {
        const choice = session.resolutions[landscapeNodeId(layer, id)];
        const their = theirItems.get(id);
        const my = myItems.get(id);

        if (choice === 'theirs') return their;
        if (choice === 'mine') return my;
        // no decision needed: whichever side has the element, the proposal wins
        return my !== undefined ? my : their;
      }).filter(item => item !== undefined && item !== null);
    });

    // roles are not part of the review, keep the ones of the proposed state
    merged.roles = (session.mine.roles && session.mine.roles.length > 0) ? session.mine.roles : session.theirs.roles;
    return merged;
  }
}
