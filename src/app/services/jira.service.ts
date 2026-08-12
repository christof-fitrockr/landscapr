import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

/** One Jira issue referenced by an element of the model */
export interface JiraTicketLink {
  /** what was typed, e.g. 'ABC-123' or a whole issue url */
  key: string;
  /** the address the link points to, empty while no base url is configured */
  url: string;
}

/**
 * Where the Jira of this organisation lives. The model itself only holds the
 * issue keys - the base url is a setting of the person in front of the screen,
 * so the same model can be opened against a test and a production Jira.
 */
@Injectable({ providedIn: 'root' })
export class JiraService {

  static readonly STORAGE_KEY = 'ls_jira_base_url';

  /** matches the keys Jira itself allows, e.g. ABC-123 or AB2-7 */
  private static readonly KEY_PATTERN = /^[A-Za-z][A-Za-z0-9_]*-\d+$/;

  private baseUrlSubject: BehaviorSubject<string>;
  readonly baseUrl$: Observable<string>;

  constructor() {
    this.baseUrlSubject = new BehaviorSubject<string>(this.read());
    this.baseUrl$ = this.baseUrlSubject.asObservable();
  }

  /** Base address of the Jira instance, without a trailing slash */
  get baseUrl(): string {
    return this.baseUrlSubject.value;
  }

  get isConfigured(): boolean {
    return !!this.baseUrl;
  }

  setBaseUrl(url: string): void {
    const cleaned = (url || '').trim().replace(/\/+$/, '');
    if (cleaned === this.baseUrl) return;
    try {
      if (cleaned) {
        localStorage.setItem(JiraService.STORAGE_KEY, cleaned);
      } else {
        localStorage.removeItem(JiraService.STORAGE_KEY);
      }
    } catch {
      // a browser without storage just loses the setting on reload
    }
    this.baseUrlSubject.next(cleaned);
  }

  /**
   * Turns the attribute of an element into the links to show. Several issues
   * can be listed separated by comma, semicolon, space or line break, and a
   * whole issue url is taken as it is.
   */
  links(attribute: string | undefined | null): JiraTicketLink[] {
    return this.keys(attribute).map(key => ({ key: this.label(key), url: this.urlOf(key) }));
  }

  /** The single issue keys held by the attribute of an element */
  keys(attribute: string | undefined | null): string[] {
    return (attribute || '')
      .split(/[\s,;]+/)
      .map(entry => entry.trim())
      .filter(entry => entry.length > 0);
  }

  /** True as soon as an element references at least one issue */
  has(attribute: string | undefined | null): boolean {
    return this.keys(attribute).length > 0;
  }

  /**
   * Address of one issue. A whole url is kept, a plain key is looked up in the
   * configured Jira, and without a base url there is nothing to link to.
   */
  urlOf(key: string): string {
    const entry = (key || '').trim();
    if (!entry) return '';
    if (/^https?:\/\//i.test(entry)) return entry;
    if (!this.isConfigured) return '';
    return `${this.baseUrl}/browse/${encodeURIComponent(entry)}`;
  }

  /** Short text of a link: the issue key, even when a whole url was typed */
  label(key: string): string {
    const entry = (key || '').trim();
    if (!/^https?:\/\//i.test(entry)) return entry;
    const last = entry.split(/[?#]/)[0].split('/').filter(part => !!part).pop() || entry;
    return JiraService.KEY_PATTERN.test(last) ? last : entry;
  }

  private read(): string {
    try {
      return (localStorage.getItem(JiraService.STORAGE_KEY) || '').replace(/\/+$/, '');
    } catch {
      return '';
    }
  }
}
