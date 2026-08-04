import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

import { Persona, PersonaMeta, PERSONA_META } from '../models/landscape.model';

/**
 * Keeps track of who is looking at the model. The persona is a preference of
 * the person in front of the screen, not a permission - it only decides which
 * parts of the very same model are shown first.
 */
@Injectable({ providedIn: 'root' })
export class PersonaService {

  static readonly STORAGE_KEY = 'ls_persona';

  private personaSubject: BehaviorSubject<Persona>;
  readonly persona$: Observable<Persona>;

  constructor() {
    this.personaSubject = new BehaviorSubject<Persona>(this.read());
    this.persona$ = this.personaSubject.asObservable();
  }

  get persona(): Persona {
    return this.personaSubject.value;
  }

  get meta(): PersonaMeta {
    return PERSONA_META[this.persona];
  }

  metaOf(persona: Persona): PersonaMeta {
    return PERSONA_META[persona];
  }

  set(persona: Persona): void {
    if (persona === this.persona) return;
    try {
      localStorage.setItem(PersonaService.STORAGE_KEY, persona);
    } catch {
      // a browser without storage just loses the preference on reload
    }
    this.personaSubject.next(persona);
  }

  private read(): Persona {
    try {
      const stored = localStorage.getItem(PersonaService.STORAGE_KEY);
      return stored === 'it' ? 'it' : 'business';
    } catch {
      return 'business';
    }
  }
}
