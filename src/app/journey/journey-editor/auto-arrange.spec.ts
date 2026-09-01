import { ArrangeableEdge, ArrangeableNode, GRID, LABEL, arrangeJourney, estimateTextWidth, sizeOfNode, wrapLabel } from './auto-arrange';

/** A measurer that is easy to reason about: every character is ten units wide */
const tenPerCharacter = (text: string) => (text || '').length * 10;

function processNode(id: string, label: string, x = 0, y = 0): ArrangeableNode {
  return { id, type: 'process', label, x, y, width: 120, height: 60 };
}

function overlap(a: { x: number; y: number; width: number; height: number },
                 b: { x: number; y: number; width: number; height: number }): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width &&
    a.y < b.y + b.height && b.y < a.y + a.height;
}

describe('wrapLabel', () => {

  it('keeps a short name on one line', () => {
    expect(wrapLabel('Book a car', 400, tenPerCharacter)).toEqual(['Book a car']);
  });

  it('breaks between words, never inside one', () => {
    // four lines are allowed here, so nothing is cut and the whole name survives
    const lines = wrapLabel('Phase 2 Ordering Production Delivery', 100, tenPerCharacter, 12, 4);
    expect(lines.length).toBeGreaterThan(1);
    lines.forEach(line => expect(line.trim()).toBe(line));
    expect(lines.join(' ')).toBe('Phase 2 Ordering Production Delivery');
  });

  it('keeps a word that is longer than the line rather than cutting it in half', () => {
    expect(wrapLabel('Kraftfahrzeughaftpflichtversicherung', 100, tenPerCharacter))
      .toEqual(['Kraftfahrzeughaftpflichtversicherung']);
  });

  it('cuts a name short once it would take more lines than a box shows', () => {
    const lines = wrapLabel('one two three four five six seven eight nine ten', 60, tenPerCharacter, 12, 2);
    expect(lines.length).toBe(2);
    expect(lines[1].endsWith('…')).toBe(true);
  });

  it('survives an empty name', () => {
    expect(wrapLabel('', 200, tenPerCharacter)).toEqual(['']);
  });
});

describe('sizeOfNode', () => {

  it('gives a long name a wider box than a short one', () => {
    const short = sizeOfNode(processNode('a', 'Order'), tenPerCharacter);
    const long = sizeOfNode(processNode('b', 'Consolidated Billing'), tenPerCharacter);
    expect(long.width).toBeGreaterThan(short.width);
  });

  it('never goes below the size the editor draws by hand', () => {
    const size = sizeOfNode(processNode('a', 'Go'), tenPerCharacter);
    expect(size.width).toBe(LABEL.minWidth);
    expect(size.height).toBe(LABEL.minHeight);
  });

  it('keeps the minimum height as long as the name fits inside it', () => {
    const oneLine = sizeOfNode(processNode('a', 'Short'), tenPerCharacter);
    const twoLines = sizeOfNode(processNode('b', 'Phase 2 Ordering Production and Delivery'), tenPerCharacter);
    expect(twoLines.height).toBe(oneLine.height);
  });

  it('grows in height once the name needs more lines than that', () => {
    const oneLine = sizeOfNode(processNode('a', 'Short'), tenPerCharacter);
    const threeLines = sizeOfNode(
      processNode('b', 'Phase 2 Ordering Production Delivery and Handover to the Driver'), tenPerCharacter);
    expect(threeLines.height).toBeGreaterThan(oneLine.height);
  });

  it('leaves a decision at the size the editor uses', () => {
    const size = sizeOfNode({ id: 'd', type: 'decision', label: 'covered?', x: 0, y: 0, width: 99, height: 99 });
    expect(size.width).toBe(24);
    expect(size.height).toBe(24);
  });
});

describe('arrangeJourney', () => {

  it('puts a chain left to right on one line', () => {
    const nodes = [processNode('a', 'First'), processNode('b', 'Second'), processNode('c', 'Third')];
    const edges: ArrangeableEdge[] = [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }];

    const result = arrangeJourney(nodes, edges, tenPerCharacter);
    const [a, b, c] = ['a', 'b', 'c'].map(id => result.get(id));

    expect(a.x).toBeLessThan(b.x);
    expect(b.x).toBeLessThan(c.x);
    // one after the other means one height: the middles line up
    expect(a.y + a.height / 2).toBe(b.y + b.height / 2);
    expect(b.y + b.height / 2).toBe(c.y + c.height / 2);
  });

  it('respects the length of the names when spacing the columns', () => {
    const nodes = [processNode('a', 'A very long step name indeed'), processNode('b', 'Next')];
    const result = arrangeJourney(nodes, [{ from: 'a', to: 'b' }], tenPerCharacter);
    const a = result.get('a');
    const b = result.get('b');

    // the second box starts after the first one ends, with the gap in between
    expect(b.x).toBe(a.x + a.width + GRID.columnGap);
  });

  it('never lets two steps overlap', () => {
    const nodes = [
      processNode('start', 'Report a complaint'),
      processNode('check', 'Check it against the contract'),
      processNode('credit', 'Raise a credit note in SAP'),
      processNode('refuse', 'Explain the refusal to the customer'),
      processNode('close', 'Close the case')
    ];
    const edges: ArrangeableEdge[] = [
      { from: 'start', to: 'check' },
      { from: 'check', to: 'credit' },
      { from: 'check', to: 'refuse' },
      { from: 'credit', to: 'close' },
      { from: 'refuse', to: 'close' }
    ];

    const result = arrangeJourney(nodes, edges, tenPerCharacter);
    const boxes = nodes.map(node => result.get(node.id));

    boxes.forEach((box, index) => {
      boxes.slice(index + 1).forEach(other => expect(overlap(box, other)).toBe(false));
    });
  });

  it('puts the two sides of a branch in the same column', () => {
    const nodes = [processNode('check', 'Check'), processNode('yes', 'Approve'), processNode('no', 'Reject')];
    const edges: ArrangeableEdge[] = [{ from: 'check', to: 'yes' }, { from: 'check', to: 'no' }];

    const result = arrangeJourney(nodes, edges, tenPerCharacter);
    expect(result.get('yes').x).toBe(result.get('no').x);
    expect(result.get('yes').y).not.toBe(result.get('no').y);
  });

  it('lays a second, unconnected chain out underneath the first', () => {
    const nodes = [
      processNode('a1', 'First chain start'), processNode('a2', 'First chain end'),
      processNode('b1', 'Second chain start'), processNode('b2', 'Second chain end')
    ];
    const edges: ArrangeableEdge[] = [{ from: 'a1', to: 'a2' }, { from: 'b1', to: 'b2' }];

    const result = arrangeJourney(nodes, edges, tenPerCharacter);
    // both chains start at the same left edge, the second one below the first
    expect(result.get('b1').x).toBe(result.get('a1').x);
    expect(result.get('b1').y).toBeGreaterThan(result.get('a1').y + result.get('a1').height);
  });

  it('leaves room under a decision for the label it carries', () => {
    const nodes: ArrangeableNode[] = [
      { id: 'd', type: 'decision', label: 'is it covered by the contract?', x: 0, y: 0, width: 24, height: 24 },
      processNode('after', 'Next')
    ];
    const result = arrangeJourney(nodes, [{ from: 'd', to: 'after' }], tenPerCharacter);
    const decision = result.get('d');

    expect(decision.width).toBe(24);
    // the column is as wide as the label underneath, so the next column clears it
    expect(result.get('after').x).toBeGreaterThan(decision.x + 24 + GRID.columnGap);
  });

  it('draws a group box around the steps it held', () => {
    const nodes: ArrangeableNode[] = [
      { id: 'g', type: 'group', label: 'Onboarding', x: -10, y: -10, width: 400, height: 200 },
      processNode('a', 'Inside one', 20, 20),
      processNode('b', 'Inside two', 200, 20),
      processNode('far', 'Outside', 900, 900)
    ];
    const edges: ArrangeableEdge[] = [{ from: 'a', to: 'b' }, { from: 'b', to: 'far' }];

    const result = arrangeJourney(nodes, edges, tenPerCharacter);
    const group = result.get('g');
    const a = result.get('a');
    const b = result.get('b');

    expect(group).toBeTruthy();
    expect(group.x).toBeLessThan(a.x);
    expect(group.x + group.width).toBeGreaterThan(b.x + b.width);
    // the step that sat outside the box is not pulled into it
    expect(group.x + group.width).toBeLessThan(result.get('far').x);
  });

  it('leaves a group that held nothing where it was', () => {
    const nodes: ArrangeableNode[] = [
      { id: 'g', type: 'group', label: 'Empty', x: 500, y: 500, width: 100, height: 100 },
      processNode('a', 'Alone')
    ];
    expect(arrangeJourney(nodes, [], tenPerCharacter).has('g')).toBe(false);
  });

  it('does not hang on a journey that leads back to an earlier step', () => {
    const nodes = [processNode('a', 'One'), processNode('b', 'Two'), processNode('c', 'Three')];
    const edges: ArrangeableEdge[] = [
      { from: 'a', to: 'b' }, { from: 'b', to: 'c' }, { from: 'c', to: 'a' }
    ];

    const result = arrangeJourney(nodes, edges, tenPerCharacter);
    expect(result.size).toBe(3);
    nodes.forEach(node => expect(isFinite(result.get(node.id).x)).toBe(true));
  });

  it('ignores an arrow that points at a step which is not there', () => {
    const nodes = [processNode('a', 'One'), processNode('b', 'Two')];
    const result = arrangeJourney(nodes, [{ from: 'a', to: 'ghost' }, { from: 'a', to: 'b' }], tenPerCharacter);
    expect(result.get('b').x).toBeGreaterThan(result.get('a').x);
  });

  it('has nothing to arrange on an empty canvas', () => {
    expect(arrangeJourney([], [], tenPerCharacter).size).toBe(0);
  });
});

describe('estimateTextWidth', () => {

  it('makes a longer text wider', () => {
    expect(estimateTextWidth('a much longer piece of text', 12))
      .toBeGreaterThan(estimateTextWidth('short', 12));
  });

  it('makes capitals wider than narrow letters', () => {
    expect(estimateTextWidth('MMMM', 12)).toBeGreaterThan(estimateTextWidth('llll', 12));
  });

  it('scales with the font size', () => {
    expect(estimateTextWidth('Landscapr', 24)).toBe(estimateTextWidth('Landscapr', 12) * 2);
  });
});
