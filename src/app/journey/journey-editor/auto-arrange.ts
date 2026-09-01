/**
 * Laying out a journey so it can be read.
 *
 * A journey drawn by hand - or written by an assistant, which places its steps
 * on a fixed grid - ends up with boxes that are all the same size no matter how
 * long their names are, and with steps sitting on top of each other. This turns
 * such a canvas into one that reads left to right: every box is as wide as its
 * name needs, every column is as wide as its widest box, and what follows what
 * is what the arrows say.
 *
 * Nothing here touches the DOM, so the same arrangement can be checked in a test
 * as the one the editor draws.
 */

export interface ArrangeableNode {
  id: string;
  type: 'process' | 'decision' | 'group';
  label?: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ArrangeableEdge {
  from: string;
  to: string;
}

export interface Geometry {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** How wide a piece of text is when drawn at this size */
export type Measure = (text: string, fontSize: number) => number;

/** What a label may take up inside a box */
export const LABEL = {
  fontSize: 12,
  lineHeight: 15,
  paddingX: 12,
  paddingY: 12,
  /** beyond this a name is cut short - three lines is what stays readable */
  maxLines: 3,
  minWidth: 120,
  /** a soft cap: a single word longer than this widens the box rather than being cut */
  maxWidth: 260,
  minHeight: 60
};

/** How the boxes sit next to each other */
export const GRID = {
  columnGap: 56,
  rowGap: 34,
  /** distance between two chains that are not connected to each other */
  chainGap: 90,
  startX: 80,
  startY: 160,
  /** a decision carries its label underneath, which needs room of its own */
  decisionLabelHeight: 20,
  groupPadding: 28
};

/**
 * Roughly how wide a string is, for use where nothing can be measured for real.
 * The editor hands in the browser's own measurement; this keeps the arrangement
 * sane in a test, or before the canvas exists.
 */
export function estimateTextWidth(text: string, fontSize: number): number {
  const narrow = 'iljtfrI.,:;\'`|!()[]{} ';
  const wide = 'mwMW@%';
  let units = 0;
  for (const character of text || '') {
    if (narrow.indexOf(character) >= 0) {
      units += 0.34;
    } else if (wide.indexOf(character) >= 0) {
      units += 0.92;
    } else if (character === character.toUpperCase() && character !== character.toLowerCase()) {
      units += 0.68;
    } else {
      units += 0.55;
    }
  }
  return units * fontSize;
}

/**
 * Breaks a label into the lines a box will show. Words are kept whole - a name
 * broken mid-word is harder to read than one that takes a wider box.
 */
export function wrapLabel(label: string, maxTextWidth: number, measure: Measure = estimateTextWidth,
                          fontSize: number = LABEL.fontSize, maxLines: number = LABEL.maxLines): string[] {
  const words = String(label || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) {
    return [''];
  }

  const lines: string[] = [];
  let current = '';

  words.forEach(word => {
    const candidate = current ? current + ' ' + word : word;
    if (!current || measure(candidate, fontSize) <= maxTextWidth) {
      current = candidate;
      return;
    }
    lines.push(current);
    current = word;
  });
  lines.push(current);

  if (lines.length <= maxLines) {
    return lines;
  }

  // what is left over is folded into the last line the box can show
  const kept = lines.slice(0, maxLines);
  kept[maxLines - 1] = cutToWidth(lines.slice(maxLines - 1).join(' '), maxTextWidth, measure, fontSize);
  return kept;
}

function cutToWidth(text: string, maxTextWidth: number, measure: Measure, fontSize: number): string {
  if (measure(text, fontSize) <= maxTextWidth) {
    return text;
  }
  let cut = text;
  while (cut.length > 1 && measure(cut + '…', fontSize) > maxTextWidth) {
    cut = cut.slice(0, -1);
  }
  return cut.replace(/[\s,;:.]+$/, '') + '…';
}

/** The box a node needs for its own label */
export function sizeOfNode(node: ArrangeableNode, measure: Measure = estimateTextWidth): Geometry {
  if (node.type === 'decision') {
    // the diamond stays the size the editor draws it at; its label sits below
    return { x: node.x, y: node.y, width: 24, height: 24 };
  }
  if (node.type === 'group') {
    return { x: node.x, y: node.y, width: node.width, height: node.height };
  }

  const room = LABEL.maxWidth - 2 * LABEL.paddingX;
  const lines = wrapLabel(node.label || '', room, measure);
  const widest = lines.reduce((widest2, line) => Math.max(widest2, measure(line, LABEL.fontSize)), 0);

  return {
    x: node.x,
    y: node.y,
    width: Math.max(LABEL.minWidth, Math.ceil(widest) + 2 * LABEL.paddingX),
    height: Math.max(LABEL.minHeight, lines.length * LABEL.lineHeight + 2 * LABEL.paddingY)
  };
}

/** What a node occupies including anything drawn outside its box */
function footprintOf(node: ArrangeableNode, size: Geometry, measure: Measure): { width: number; height: number } {
  if (node.type !== 'decision') {
    return { width: size.width, height: size.height };
  }
  const labelWidth = measure(node.label || '', 11);
  return {
    width: Math.max(size.width, Math.ceil(labelWidth)),
    height: size.height + GRID.decisionLabelHeight
  };
}

/**
 * Arranges the steps of a journey.
 *
 * Steps are laid out in the order the arrows put them in: a step comes after
 * everything that leads to it. Steps that nothing connects form a chain of their
 * own and are placed underneath, so a canvas with several loose pieces still
 * reads as several pieces rather than as one heap.
 *
 * @returns the new geometry per node id; nodes that are left alone are absent
 */
export function arrangeJourney(nodes: ArrangeableNode[], edges: ArrangeableEdge[],
                               measure: Measure = estimateTextWidth): Map<string, Geometry> {
  const result = new Map<string, Geometry>();
  const flow = (nodes || []).filter(node => node.type !== 'group');
  if (!flow.length) {
    return result;
  }

  const byId = new Map<string, ArrangeableNode>(flow.map(node => [node.id, node] as [string, ArrangeableNode]));
  const links = (edges || []).filter(edge => byId.has(edge.from) && byId.has(edge.to) && edge.from !== edge.to);

  const sizes = new Map<string, Geometry>();
  const footprints = new Map<string, { width: number; height: number }>();
  flow.forEach(node => {
    const size = sizeOfNode(node, measure);
    sizes.set(node.id, size);
    footprints.set(node.id, footprintOf(node, size, measure));
  });

  let bandTop = GRID.startY;

  chainsOf(flow, links).forEach(chain => {
    const layers = layersOf(chain, links);
    const columns = columnsOf(chain, layers, links);

    // a column is as wide as the widest thing in it, so nothing sticks out
    const columnWidths = columns.map(column =>
      column.reduce((widest, id) => Math.max(widest, footprints.get(id).width), 0));
    const columnHeights = columns.map(column =>
      column.reduce((total, id, index) => total + footprints.get(id).height + (index ? GRID.rowGap : 0), 0));
    const bandHeight = columnHeights.reduce((tallest, height) => Math.max(tallest, height), 0);
    const centerY = bandTop + bandHeight / 2;

    let x = GRID.startX;
    columns.forEach((column, index) => {
      const columnWidth = columnWidths[index];
      let y = centerY - columnHeights[index] / 2;

      column.forEach(id => {
        const size = sizes.get(id);
        const footprint = footprints.get(id);
        result.set(id, {
          // centred in its column, so a straight chain draws a straight line
          x: Math.round(x + (columnWidth - size.width) / 2),
          y: Math.round(y),
          width: size.width,
          height: size.height
        });
        y += footprint.height + GRID.rowGap;
      });

      x += columnWidth + GRID.columnGap;
    });

    bandTop += bandHeight + GRID.chainGap;
  });

  fitGroups(nodes, result);
  return result;
}

/** The pieces of the canvas that are connected to each other */
function chainsOf(flow: ArrangeableNode[], links: ArrangeableEdge[]): ArrangeableNode[][] {
  const neighbours = new Map<string, string[]>(flow.map(node => [node.id, []] as [string, string[]]));
  links.forEach(link => {
    neighbours.get(link.from).push(link.to);
    neighbours.get(link.to).push(link.from);
  });

  const seen = new Set<string>();
  const chains: ArrangeableNode[][] = [];

  flow.forEach(node => {
    if (seen.has(node.id)) return;
    const chain: ArrangeableNode[] = [];
    const queue = [node.id];
    seen.add(node.id);

    while (queue.length) {
      const id = queue.shift();
      chain.push(flow.find(entry => entry.id === id));
      neighbours.get(id).forEach(other => {
        if (seen.has(other)) return;
        seen.add(other);
        queue.push(other);
      });
    }

    // inside a chain the drawing order stays the order the canvas holds
    chains.push(chain.sort((a, b) => flow.indexOf(a) - flow.indexOf(b)));
  });

  return chains;
}

/**
 * Which column each step belongs in: one further than everything that leads to
 * it. A journey that leads back to an earlier step would have no such order, so
 * the step that closes the circle simply keeps the column it had reached.
 */
function layersOf(chain: ArrangeableNode[], links: ArrangeableEdge[]): Map<string, number> {
  const ids = new Set(chain.map(node => node.id));
  const inside = links.filter(link => ids.has(link.from) && ids.has(link.to));

  const incoming = new Map<string, number>(chain.map(node => [node.id, 0] as [string, number]));
  const outgoing = new Map<string, string[]>(chain.map(node => [node.id, []] as [string, string[]]));
  inside.forEach(link => {
    incoming.set(link.to, incoming.get(link.to) + 1);
    outgoing.get(link.from).push(link.to);
  });

  const layer = new Map<string, number>(chain.map(node => [node.id, 0] as [string, number]));
  const ready = chain.filter(node => incoming.get(node.id) === 0).map(node => node.id);
  const queue = ready.length ? [...ready] : [chain[0].id];
  const settled = new Set<string>(queue);

  while (queue.length) {
    const id = queue.shift();
    outgoing.get(id).forEach(next => {
      layer.set(next, Math.max(layer.get(next), layer.get(id) + 1));
      incoming.set(next, incoming.get(next) - 1);
      if (incoming.get(next) <= 0 && !settled.has(next)) {
        settled.add(next);
        queue.push(next);
      }
    });
  }

  // whatever a circle left unsettled goes after what it depends on
  chain.forEach(node => {
    if (settled.has(node.id)) return;
    const before = inside.filter(link => link.to === node.id)
      .reduce((deepest, link) => Math.max(deepest, layer.get(link.from)), -1);
    layer.set(node.id, before + 1);
  });

  return layer;
}

/** The steps per column, ordered so that arrows cross as little as possible */
function columnsOf(chain: ArrangeableNode[], layers: Map<string, number>, links: ArrangeableEdge[]): string[][] {
  const depth = chain.reduce((deepest, node) => Math.max(deepest, layers.get(node.id)), 0);
  const columns: string[][] = [];
  for (let index = 0; index <= depth; index++) {
    columns.push(chain.filter(node => layers.get(node.id) === index).map(node => node.id));
  }

  // each step follows the average height of what leads into it
  const rowOf = new Map<string, number>();
  columns.forEach(column => column.forEach((id, index) => rowOf.set(id, index)));

  columns.forEach((column, index) => {
    if (index === 0) return;
    const weight = new Map<string, number>();
    column.forEach(id => {
      const parents = links.filter(link => link.to === id && rowOf.has(link.from));
      const average = parents.length
        ? parents.reduce((sum, link) => sum + rowOf.get(link.from), 0) / parents.length
        : rowOf.get(id);
      weight.set(id, average);
    });
    column.sort((a, b) => weight.get(a) - weight.get(b) || rowOf.get(a) - rowOf.get(b));
    column.forEach((id, row) => rowOf.set(id, row));
  });

  return columns;
}

/**
 * A group box is drawn around steps, so once the steps have moved the box has to
 * move with them. A box that held nothing is left where it was.
 */
function fitGroups(nodes: ArrangeableNode[], result: Map<string, Geometry>): void {
  (nodes || []).filter(node => node.type === 'group').forEach(group => {
    const members = (nodes || []).filter(node =>
      node.type !== 'group' && result.has(node.id) && centerInside(node, group));
    if (!members.length) return;

    const boxes = members.map(member => result.get(member.id));
    const left = Math.min(...boxes.map(box => box.x));
    const top = Math.min(...boxes.map(box => box.y));
    const right = Math.max(...boxes.map(box => box.x + box.width));
    const bottom = Math.max(...boxes.map(box => box.y + box.height));

    result.set(group.id, {
      x: Math.round(left - GRID.groupPadding),
      y: Math.round(top - GRID.groupPadding),
      width: Math.round(right - left + 2 * GRID.groupPadding),
      height: Math.round(bottom - top + 2 * GRID.groupPadding)
    });
  });
}

function centerInside(node: ArrangeableNode, group: ArrangeableNode): boolean {
  const centerX = node.x + node.width / 2;
  const centerY = node.y + node.height / 2;
  return centerX >= group.x && centerX <= group.x + group.width &&
    centerY >= group.y && centerY <= group.y + group.height;
}
