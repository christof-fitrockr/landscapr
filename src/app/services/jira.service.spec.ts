import { TestBed } from '@angular/core/testing';

import { JiraService } from './jira.service';

describe('JiraService', () => {

  let service: JiraService;

  beforeEach(() => {
    localStorage.removeItem(JiraService.STORAGE_KEY);
    TestBed.configureTestingModule({});
    service = TestBed.inject(JiraService);
  });

  afterEach(() => {
    localStorage.removeItem(JiraService.STORAGE_KEY);
  });

  it('starts without a Jira address', () => {
    expect(service.isConfigured).toBeFalse();
    expect(service.urlOf('ABC-1')).toBe('');
  });

  it('keeps the base url without a trailing slash', () => {
    service.setBaseUrl('https://example.atlassian.net/');
    expect(service.baseUrl).toBe('https://example.atlassian.net');
    expect(service.urlOf('ABC-1')).toBe('https://example.atlassian.net/browse/ABC-1');
  });

  it('reads several tickets out of one attribute', () => {
    expect(service.keys('ABC-1, ABC-2;ABC-3 ABC-4')).toEqual(['ABC-1', 'ABC-2', 'ABC-3', 'ABC-4']);
    expect(service.keys('')).toEqual([]);
    expect(service.keys(undefined)).toEqual([]);
    expect(service.has('ABC-1')).toBeTrue();
    expect(service.has('   ')).toBeFalse();
  });

  it('takes a whole issue url as it is and shows its key', () => {
    service.setBaseUrl('https://example.atlassian.net');
    const links = service.links('https://other.atlassian.net/browse/XY-9');
    expect(links.length).toBe(1);
    expect(links[0].url).toBe('https://other.atlassian.net/browse/XY-9');
    expect(links[0].key).toBe('XY-9');
  });

  it('shows the tickets without a link while no Jira is configured', () => {
    const links = service.links('ABC-1, ABC-2');
    expect(links.map(link => link.key)).toEqual(['ABC-1', 'ABC-2']);
    expect(links.every(link => link.url === '')).toBeTrue();
  });

  it('announces a changed base url to everyone showing a ticket', () => {
    const seen: string[] = [];
    service.baseUrl$.subscribe(url => seen.push(url));
    service.setBaseUrl('https://example.atlassian.net');
    service.setBaseUrl('https://example.atlassian.net'); // unchanged, no second event
    expect(seen).toEqual(['', 'https://example.atlassian.net']);
  });

  it('forgets the address when it is removed', () => {
    service.setBaseUrl('https://example.atlassian.net');
    service.setBaseUrl('');
    expect(service.isConfigured).toBeFalse();
    expect(localStorage.getItem(JiraService.STORAGE_KEY)).toBeNull();
  });
});
