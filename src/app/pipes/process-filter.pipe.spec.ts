import { ProcessFilterPipe } from './process-filter.pipe';
import { Process, Status } from '../models/process';
import { Comment } from '../models/comment';

describe('ProcessFilterPipe', () => {
  let pipe: ProcessFilterPipe;
  let allProcesses: Process[];
  let roots: Process[];

  const mockComment: Comment = { id: 'c1', timestamp: 123456789, username: 'tester', text: 'some comment' };

  beforeEach(() => {
    pipe = new ProcessFilterPipe();

    // Setup a hierarchy:
    // P1 (Validated, has comments)
    //   -> P1.1 (Draft, no comments)
    // P2 (ReviewNeeded, no comments)
    // P3 (Draft, has comments)
    //   -> P3.1 (Validated, no comments)

    const p1 = new Process();
    p1.id = 'p1';
    p1.name = 'Process 1';
    p1.status = Status.Validated;
    p1.comments = [mockComment];
    p1.steps = [{ processReference: 'p1.1', apiCallReference: null, successors: [] }];

    const p1_1 = new Process();
    p1_1.id = 'p1.1';
    p1_1.name = 'Process 1.1';
    p1_1.status = Status.Draft;
    p1_1.comments = [];

    const p2 = new Process();
    p2.id = 'p2';
    p2.name = 'Process 2';
    p2.status = Status.ReviewNeeded;
    p2.comments = [];

    const p3 = new Process();
    p3.id = 'p3';
    p3.name = 'Process 3';
    p3.status = Status.Draft;
    p3.comments = [mockComment];
    p3.steps = [{ processReference: 'p3.1', apiCallReference: null, successors: [] }];

    const p3_1 = new Process();
    p3_1.id = 'p3.1';
    p3_1.name = 'Process 3.1';
    p3_1.status = Status.Validated;
    p3_1.comments = [];

    allProcesses = [p1, p1_1, p2, p3, p3_1];
    roots = [p1, p2, p3]; // p1.1 and p3.1 are children
  });

  it('create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should filter by status (exact match)', () => {
    // Filter for ReviewNeeded (Status.ReviewNeeded = 2)
    // @ts-ignore
    const result = pipe.transform(roots, allProcesses, '', false, [], Status.ReviewNeeded, false);
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('p2');
  });

  it('should filter by status (recursive match)', () => {
    // Filter for Validated (Status.Validated = 1)
    // P1 matches directly.
    // P3 matches because P3.1 is Validated.
    // P2 is ReviewNeeded (no match).
    // @ts-ignore
    const result = pipe.transform(roots, allProcesses, '', false, [], Status.Validated, false);
    expect(result.length).toBe(2);
    expect(result.map(p => p.id)).toContain('p1');
    expect(result.map(p => p.id)).toContain('p3');
  });

  it('should filter by comments (exact match)', () => {
    // P1 has comments.
    // P3 has comments.
    // P2 no comments.
    // @ts-ignore
    const result = pipe.transform(roots, allProcesses, '', false, [], null, true);
    expect(result.length).toBe(2);
    expect(result.map(p => p.id)).toContain('p1');
    expect(result.map(p => p.id)).toContain('p3');
  });

  it('should filter by comments (recursive match)', () => {
    // Set P1.1 to have comments, P1 to have none.
    const p1 = allProcesses.find(p => p.id === 'p1');
    p1.comments = [];
    const p1_1 = allProcesses.find(p => p.id === 'p1.1');
    p1_1.comments = [mockComment];

    // Now filtering for comments:
    // P1 should be visible because P1.1 has comments.
    // P3 should be visible because P3 has comments.
    // P2 not visible.
    // @ts-ignore
    const result = pipe.transform(roots, allProcesses, '', false, [], null, true);
    expect(result.length).toBe(2);
    expect(result.map(p => p.id)).toContain('p1');
    expect(result.map(p => p.id)).toContain('p3');
  });

  it('should combine status and comments', () => {
    // Filter for Draft AND Comments.
    // P3: Draft (Yes), Comments (Yes). Should match.
    // P2: ReviewNeeded (No), No Comments. No match.
    // P1: Validated (No), Comments (Yes). (Doesn't match, children?)
    //   -> P1.1: Draft (Yes), No Comments. (Doesn't match)
    // So P1 should NOT be visible.

    // @ts-ignore
    const result = pipe.transform(roots, allProcesses, '', false, [], Status.Draft, true);
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('p3');
  });
});
