import { AfterViewInit, Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiCall } from '../models/api-call';
import { ApiCallService } from '../services/api-call.service';
import { CapabilityService } from '../services/capability.service';
import { first } from 'rxjs/operators';

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  items: ApiCall[];
}

@Component({
  selector: 'app-api-group-map',
  template: `
<div class="container-fluid">
  <div class="d-flex align-items-center justify-content-between p-2">
    <div>
      <span class="legend">
        <span class="legend-swatch api ml-3"></span> {{ mode === 'capability' ? 'Capabilities' : 'API Call Groups' }}
      </span>
    </div>
    <div class="text-muted small d-flex align-items-center">
      <a routerLink="/apiCall/groups" class="btn btn-sm btn-outline-secondary mr-2" [class.active]="mode==='group'">
        <i class="fas fa-layer-group mr-1"></i> Groups
      </a>
      <a routerLink="/apiCall/groups/capabilities" class="btn btn-sm btn-outline-secondary" [class.active]="mode==='capability'">
        <i class="fas fa-sitemap mr-1"></i> Capabilities
      </a>
      <span class="ml-3">Click the blue dot to open documentation (if available)</span>
    </div>
  </div>
  <div class="card-body overflow-auto" style="overflow-y: auto;">
    <canvas #canvas class="canvas" (click)="onCanvasClick($event)"></canvas>
  </div>
</div>
  `
})
export class ApiGroupMapComponent implements AfterViewInit {
  @ViewChild('canvas') public canvas: ElementRef<HTMLCanvasElement>;

  apiCalls: ApiCall[] = [];
  groups: Map<string, ApiCall[]> = new Map<string, ApiCall[]>();
  boxes: Box[] = [];

  mode: 'group' | 'capability' = 'group';
  repoId: string;
  capById = new Map<string, { id: string; name: string }>();

  private readonly titleH = 26;
  private readonly itemH = 28;
  private readonly innerPad = 10;

  constructor(private apiCallService: ApiCallService, private route: ActivatedRoute, private capabilityService: CapabilityService) {}

  ngAfterViewInit(): void {
    // Determine mode from route data
    this.route.data.subscribe(d => {
      const m = (d && d['mode']) as 'group' | 'capability';
      this.mode = m || 'group';
      this.loadDataAndDraw();
    });

    // Pick up repoId (if available) from parent
    const parent = this.route.parent;
    if (parent) {
      parent.paramMap.subscribe(pm => {
        this.repoId = pm.get('repoId');
        this.loadDataAndDraw();
      });
    } else {
      this.loadDataAndDraw();
    }
  }

  onCanvasClick(evt: MouseEvent) {
    if (!this.canvas) { return; }
    const canvasEl = this.canvas.nativeElement;
    const rect = canvasEl.getBoundingClientRect();
    const x = evt.clientX - rect.left;
    const y = evt.clientY - rect.top;

    // Find box
    for (const box of this.boxes) {
      if (x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h) {
        // inside box: compute item index
        const yIn = y - box.y - this.titleH - this.innerPad;
        if (yIn < 0) { return; }
        const idx = Math.floor(yIn / this.itemH);
        if (idx >= 0 && idx < box.items.length) {
          const api = box.items[idx];
          const url = (api?.documentation || (api as any)?.docLinkUrl) as string;
          if (url) {
            // click near right edge -> open
            if (x >= box.x + box.w - 32) {
              window.open(url, '_blank');
              return;
            }
          }
        }
      }
    }
  }

  private loadDataAndDraw() {
    // Load APIs first
    this.apiCallService.all().pipe(first()).subscribe(apiCalls => {
      this.apiCalls = apiCalls || [];

      if (this.mode === 'capability') {
        // Build unique capability id list
        const ids = Array.from(new Set(this.apiCalls.map(a => a.capabilityId).filter(id => !!id)));
        if (ids.length > 0) {
          this.capabilityService.byIds(ids).pipe(first()).subscribe(caps => {
            this.capById.clear();
            for (const c of caps) {
              this.capById.set(c.id, { id: c.id, name: c.name });
            }
            this.buildGroups();
            this.draw();
          });
        } else {
          this.capById.clear();
          this.buildGroups();
          this.draw();
        }
      } else {
        // Group mode
        this.buildGroups();
        this.draw();
      }
    });
  }

  private buildGroups() {
    this.groups.clear();

    if (this.mode === 'capability') {
      // Group by capability name
      for (const api of this.apiCalls) {
        const capId = api.capabilityId;
        const name = capId && this.capById.get(capId) ? this.capById.get(capId).name : 'Unassigned';
        if (!this.groups.has(name)) {
          this.groups.set(name, []);
        }
        this.groups.get(name).push(api);
      }
    } else {
      // Group by apiGroup (default)
      for (const api of this.apiCalls) {
        const group = (api.apiGroup && api.apiGroup.trim().length > 0) ? api.apiGroup.trim() : 'Ungrouped';
        if (!this.groups.has(group)) {
          this.groups.set(group, []);
        }
        this.groups.get(group).push(api);
      }
    }

    // Sort APIs by name inside each group for stable layout
    for (const [k, list] of this.groups.entries()) {
      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.draw();
  }

  private textW(cx: CanvasRenderingContext2D, text: string, font: string): number {
    cx.save();
    cx.font = font;
    const w = cx.measureText(text).width;
    cx.restore();
    return w;
  }

  private drawGroupBox(cx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, title: string) {
    cx.save();

    // Box
    cx.fillStyle = '#f0f0f0';
    cx.strokeStyle = '#a0a0a0';
    cx.lineWidth = 1;
    cx.beginPath();
    cx.rect(x, y, w, h);
    cx.fill();
    cx.stroke();

    // Title bar
    const titleH = 26;
    cx.fillStyle = '#d9edf7';
    cx.strokeStyle = '#a0a0a0';
    cx.beginPath();
    cx.rect(x, y, w, titleH);
    cx.fill();
    cx.stroke();

    cx.fillStyle = '#000';
    cx.font = 'bold 14px sans-serif';
    cx.textBaseline = 'middle';
    cx.textAlign = 'left';
    cx.fillText(title, x + 8, y + titleH / 2);

    cx.restore();
  }

  private draw() {
    if (!this.canvas) { return; }
    const canvasEl = this.canvas.nativeElement;
    const parentEl = canvasEl.parentElement as HTMLElement;
    const width = parentEl.clientWidth - 20;
    const height = Math.max(600, window.innerHeight - 200);

    canvasEl.width = width;
    canvasEl.height = height;

    const cx = canvasEl.getContext('2d');
    cx.clearRect(0, 0, width, height);

    // Layout groups in a grid
    const padding = 20;
    const boxW = Math.max(320, Math.min(500, Math.floor((width - padding * 3) / 2)));
    const colCount = Math.max(1, Math.floor((width - padding) / (boxW + padding)));

    const groupEntries = Array.from(this.groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));

    let x = padding;
    let y = padding;
    let col = 0;

    this.boxes = [];

    for (const [groupName, apis] of groupEntries) {
      // Measure height based on APIs
      const titleH = 26;
      const itemH = 28;
      const innerPad = 10;
      const boxH = titleH + innerPad + apis.length * itemH + innerPad;

      this.drawGroupBox(cx, x, y, boxW, boxH, groupName);

      // Draw items
      const icon = '\0ac'; // not used; using text/url symbol will be drawn via small circle indicator
      cx.font = '13px sans-serif';
      cx.fillStyle = '#333';
      cx.textBaseline = 'middle';
      cx.textAlign = 'left';

      for (let i = 0; i < apis.length; i++) {
        const api = apis[i];
        const iy = y + titleH + innerPad + i * itemH + itemH / 2;

        // API name
        cx.fillText(api.name || '(unnamed)', x + 10, iy);

        // Documentation globe indicator on the right
        const hasDoc = !!(api.documentation || (api as any).docLinkUrl);
        if (hasDoc) {
          const r = 6;
          const cxPos = x + boxW - 16;
          const cyPos = iy;
          cx.beginPath();
          cx.arc(cxPos, cyPos, r, 0, Math.PI * 2);
          cx.fillStyle = '#2a7ae2';
          cx.fill();
          cx.strokeStyle = '#1b5db2';
          cx.stroke();
          // small white dot to hint clickability
          cx.beginPath();
          cx.arc(cxPos, cyPos, 2, 0, Math.PI * 2);
          cx.fillStyle = '#fff';
          cx.fill();
        }
      }

      this.boxes.push({ x, y, w: boxW, h: boxH, title: groupName, items: apis });

      // Next position
      col++;
      if (col >= colCount) {
        col = 0;
        x = padding;
        y += boxH + padding;
      } else {
        x += boxW + padding;
      }
    }
  }
}
