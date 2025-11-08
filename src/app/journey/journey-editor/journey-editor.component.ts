import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { Process } from '../../models/process';
import { ProcessService } from '../../services/process.service';

// Basic types for nodes and edges
export type ToolType = 'select' | 'process' | 'decision' | 'group' | 'connector';

export interface CanvasNodeBase {
  id: string;
  x: number; // canvas coords
  y: number;
  width: number;
  height: number;
  selected?: boolean;
  label?: string;
  type: 'process' | 'decision' | 'group';
}

export interface ProcessNode extends CanvasNodeBase {
  type: 'process';
  processId: string;
  label: string;
}

export interface DecisionNode extends CanvasNodeBase {
  type: 'decision';
  label: string;
}

export interface GroupNode extends CanvasNodeBase {
  type: 'group';
  label: string;
}

export type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export type CanvasNode = ProcessNode | DecisionNode | GroupNode;

export interface Edge {
  id: string;
  from: string; // node id
  to: string;   // node id
  label?: string;
}

@Component({
  selector: 'app-journey-editor',
  templateUrl: './journey-editor.component.html',
  styleUrls: ['./journey-editor.component.scss']
})
export class JourneyEditorComponent implements OnInit {
  @ViewChild('svgEl', { static: true }) svgEl: ElementRef<SVGSVGElement>;

  // Toolbox / tools
  tools: { key: ToolType; icon: string; label: string }[] = [
    { key: 'select', icon: 'fa-mouse-pointer', label: 'Select' },
    { key: 'process', icon: 'fa-cube', label: 'Process' },
    { key: 'decision', icon: 'fa-code-branch', label: 'Decision' },
    { key: 'group', icon: 'fa-object-group', label: 'Group Box' },
    { key: 'connector', icon: 'fa-project-diagram', label: 'Connector' },
  ];
  activeTool: ToolType = 'select';

  // Process catalog for the process tool
  processes: Process[] = [];
  selectedProcessId: string | null = null;

  // Canvas state
  nodes: CanvasNode[] = [];
  edges: Edge[] = [];

  // Pan & zoom
  zoom = 1; // scale
  panX = 0;
  panY = 0;
  private isPanning = false;
  private lastPanX = 0;
  private lastPanY = 0;

  // Keyboard state
  private spacePressed = false;

  // Dragging nodes
  private isDraggingNodes = false;
  private dragStartMouseX = 0;
  private dragStartMouseY = 0;
  private dragStartPositions: Map<string, { x: number; y: number }> = new Map();

  // Resizing groups
  private isResizing = false;
  private resizeHandle: ResizeHandle | null = null;
  private resizeNodeId: string | null = null;
  private resizeStartMouseX = 0;
  private resizeStartMouseY = 0;
  private resizeStartRect: { x: number; y: number; w: number; h: number } | null = null;

  // Connector drawing state
  private pendingEdgeSourceId: string | null = null;

  constructor(private processService: ProcessService) {}

  ngOnInit(): void {
    this.processService.all().subscribe(list => {
      this.processes = list || [];
    });
  }

  // Mouse interactions on canvas
  onCanvasMouseDown(event: MouseEvent) {
    const svg = this.svgEl.nativeElement;
    const pt = this.getSvgPoint(event);

    if (event.button === 1 || event.button === 2 || event.shiftKey || (this.activeTool === 'select' && this.spacePressed)) {
      // middle/right button or with modifier: start panning
      this.startPan(event);
      return;
    }

    switch (this.activeTool) {
      case 'select': {
        const hit = this.handleSelectDown(pt.x, pt.y);
        // Start dragging selected nodes with left mouse button when clicking on a selected node
        if (event.button === 0 && hit && hit.selected) {
          this.isDraggingNodes = true;
          this.dragStartMouseX = pt.x;
          this.dragStartMouseY = pt.y;
          this.dragStartPositions.clear();
          this.nodes.filter(n => n.selected).forEach(n => {
            this.dragStartPositions.set(n.id, { x: n.x, y: n.y });
          });
        }
        break;
      }
      case 'process':
        if (!this.selectedProcessId && this.processes.length > 0) {
          this.selectedProcessId = this.processes[0].id;
        }
        if (this.selectedProcessId) {
          this.placeProcessNode(pt.x, pt.y, this.selectedProcessId);
        }
        break;
      case 'decision':
        this.placeDecisionNode(pt.x, pt.y);
        break;
      case 'group':
        this.placeGroupNode(pt.x, pt.y);
        break;
      case 'connector':
        this.handleConnectorDown(pt.x, pt.y);
        break;
    }
  }

  onCanvasMouseMove(event: MouseEvent) {
    // Resizing group
    if (this.isResizing && this.resizeNodeId && this.resizeStartRect && this.resizeHandle) {
      const pt = this.getSvgPoint(event);
      const dx = pt.x - this.resizeStartMouseX;
      const dy = pt.y - this.resizeStartMouseY;
      const node = this.nodes.find(n => n.id === this.resizeNodeId) as GroupNode | undefined;
      if (node) {
        const minW = 40;
        const minH = 30;
        let x = this.resizeStartRect.x;
        let y = this.resizeStartRect.y;
        let w = this.resizeStartRect.w;
        let h = this.resizeStartRect.h;

        // Horizontal adjustments
        if (this.resizeHandle.includes('e')) {
          w = Math.max(minW, this.resizeStartRect.w + dx);
        }
        if (this.resizeHandle.includes('w')) {
          const newW = Math.max(minW, this.resizeStartRect.w - dx);
          const moved = this.resizeStartRect.w - newW; // how much x moves right when shrinking from west
          x = this.resizeStartRect.x + moved;
          w = newW;
        }

        // Vertical adjustments
        if (this.resizeHandle.includes('s')) {
          h = Math.max(minH, this.resizeStartRect.h + dy);
        }
        if (this.resizeHandle.includes('n')) {
          const newH = Math.max(minH, this.resizeStartRect.h - dy);
          const movedY = this.resizeStartRect.h - newH;
          y = this.resizeStartRect.y + movedY;
          h = newH;
        }

        node.x = x;
        node.y = y;
        node.width = w;
        node.height = h;
      }
      return;
    }

    // Dragging selected nodes (in world space)
    if (this.isDraggingNodes) {
      const pt = this.getSvgPoint(event);
      const dx = pt.x - this.dragStartMouseX;
      const dy = pt.y - this.dragStartMouseY;
      this.dragStartPositions.forEach((pos, id) => {
        const n = this.nodes.find(nn => nn.id === id);
        if (n) {
          n.x = pos.x + dx;
          n.y = pos.y + dy;
        }
      });
      return;
    }

    // Panning the canvas
    if (this.isPanning) {
      this.panX += (event.clientX - this.lastPanX);
      this.panY += (event.clientY - this.lastPanY);
      this.lastPanX = event.clientX;
      this.lastPanY = event.clientY;
    }
  }

  onCanvasMouseUp(_event: MouseEvent) {
    this.isPanning = false;
    if (this.isDraggingNodes) {
      this.isDraggingNodes = false;
      this.dragStartPositions.clear();
    }
    if (this.isResizing) {
      this.isResizing = false;
      this.resizeHandle = null;
      this.resizeNodeId = null;
      this.resizeStartRect = null;
    }
  }

  // Ensure drag/pan stop even if mouseup occurs outside the SVG
  @HostListener('window:mouseup', ['$event'])
  onWindowMouseUp(event: MouseEvent) {
    this.onCanvasMouseUp(event);
  }

  onWheel(event: WheelEvent) {
    event.preventDefault();
    const delta = event.deltaY;
    const factor = Math.exp(-delta / 500); // smooth zoom

    // Zoom to cursor position
    const ptBefore = this.getSvgPoint(event as any as MouseEvent);
    this.zoom *= factor;
    this.zoom = Math.max(0.2, Math.min(4, this.zoom));
    const ptAfter = this.getSvgPoint(event as any as MouseEvent);

    // Adjust pan to keep the cursor under the same world point
    this.panX += (ptAfter.x - ptBefore.x) * this.zoom;
    this.panY += (ptAfter.y - ptBefore.y) * this.zoom;
  }

  private startPan(event: MouseEvent) {
    this.isPanning = true;
    this.lastPanX = event.clientX;
    this.lastPanY = event.clientY;
  }

  // Helpers
  private getSvgPoint(event: MouseEvent): { x: number; y: number } {
    const svg = this.svgEl.nativeElement;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const x = (event.clientX - ctm.e - this.panX) / this.zoom;
    const y = (event.clientY - ctm.f - this.panY) / this.zoom;
    return { x, y };
  }

  private newId(prefix: string) {
    return prefix + '_' + Math.random().toString(36).substring(2, 9);
  }

  // Node creation
  private placeProcessNode(x: number, y: number, processId: string) {
    const proc = this.processes.find(p => p.id === processId);
    const label = proc?.name || 'Process';
    const node: ProcessNode = {
      id: this.newId('proc'),
      x: x - 60,
      y: y - 30,
      width: 120,
      height: 60,
      type: 'process',
      processId,
      label,
    };
    this.nodes.push(node);
    // Auto-select the newly created node and switch back to select tool
    this.selectSingleNode(node.id);
    this.activeTool = 'select';
  }

  private placeDecisionNode(x: number, y: number) {
    const node: DecisionNode = {
      id: this.newId('dec'),
      x: x - 50,
      y: y - 50,
      width: 100,
      height: 100,
      type: 'decision',
      label: 'Decision',
    };
    this.nodes.push(node);
    this.selectSingleNode(node.id);
    this.activeTool = 'select';
  }

  private placeGroupNode(x: number, y: number) {
    const node: GroupNode = {
      id: this.newId('grp'),
      x: x - 100,
      y: y - 60,
      width: 200,
      height: 120,
      type: 'group',
      label: 'Group',
    };
    this.nodes.push(node);
    this.selectSingleNode(node.id);
    this.activeTool = 'select';
  }

  // Selection & connector logic (minimal)
  private handleSelectDown(x: number, y: number): CanvasNode | undefined {
    // Toggle selection by hit testing nodes from topmost
    let hit: CanvasNode | undefined;
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      const n = this.nodes[i];
      if (x >= n.x && x <= n.x + n.width && y >= n.y && y <= n.y + n.height) {
        hit = n; break;
      }
    }
    this.nodes.forEach(n => n.selected = false);
    if (hit) {
      hit.selected = true;
    }
    return hit;
  }

  private handleConnectorDown(x: number, y: number) {
    // If no source yet, pick source node under cursor; otherwise pick target and create edge
    const node = this.findNodeAt(x, y);
    if (!node) return;
    if (!this.pendingEdgeSourceId) {
      this.pendingEdgeSourceId = node.id;
    } else if (this.pendingEdgeSourceId && node.id !== this.pendingEdgeSourceId) {
      const edge: Edge = { id: this.newId('e'), from: this.pendingEdgeSourceId, to: node.id };
      this.edges.push(edge);
      this.pendingEdgeSourceId = null;
      // After creating a connector, switch back to select tool
      this.activeTool = 'select';
      // Select the target node for convenience
      this.selectSingleNode(node.id);
    }
  }

  private findNodeAt(x: number, y: number): CanvasNode | undefined {
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      const n = this.nodes[i];
      if (x >= n.x && x <= n.x + n.width && y >= n.y && y <= n.y + n.height) {
        return n;
      }
    }
    return undefined;
  }

  private selectSingleNode(id: string) {
    this.nodes.forEach(n => n.selected = (n.id === id));
  }

  onResizeHandleMouseDown(node: any, handle: ResizeHandle, event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    // Only allow with left button
    if (event.button !== 0) return;
    const g: GroupNode = node as GroupNode;
    this.isResizing = true;
    this.resizeHandle = handle;
    this.resizeNodeId = g.id;
    const pt = this.getSvgPoint(event);
    this.resizeStartMouseX = pt.x;
    this.resizeStartMouseY = pt.y;
    this.resizeStartRect = { x: g.x, y: g.y, w: g.width, h: g.height };
  }

  // Keyboard shortcuts
  @HostListener('window:keydown', ['$event'])
  onKeyDown(ev: KeyboardEvent) {
    const target = ev.target as HTMLElement | null;
    const tag = target?.tagName?.toLowerCase();
    const typing = !!(target && (target.isContentEditable || tag === 'input' || tag === 'textarea' || tag === 'select'));

    // Hold Space to temporarily enable panning while Select tool is active
    if (ev.code === 'Space' || ev.key === ' ') {
      if (!typing) {
        this.spacePressed = true;
        if (this.activeTool === 'select') {
          ev.preventDefault(); // avoid page scroll while holding space to pan
        }
      }
    }

    // Delete key removes selected nodes and their connected edges
    if (ev.key === 'Delete') {
      const selected = this.nodes.filter(n => n.selected);
      if (selected.length > 0) {
        const ids = new Set(selected.map(n => n.id));
        this.nodes = this.nodes.filter(n => !ids.has(n.id));
        this.edges = this.edges.filter(e => !ids.has(e.from) && !ids.has(e.to));
      }
    }
  }

  @HostListener('window:keyup', ['$event'])
  onKeyUp(ev: KeyboardEvent) {
    if (ev.code === 'Space' || ev.key === ' ') {
      this.spacePressed = false;
    }
  }

  edgePath(e: Edge): string {
    const from = this.nodes.find(n => n.id === e.from);
    const to = this.nodes.find(n => n.id === e.to);
    if (!from || !to) return '';
    const x1 = from.x + from.width / 2;
    const y1 = from.y + from.height / 2;
    const x2 = to.x + to.width / 2;
    const y2 = to.y + to.height / 2;
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }

  setTool(tool: ToolType) {
    this.activeTool = tool;
    this.pendingEdgeSourceId = null;
  }
}
