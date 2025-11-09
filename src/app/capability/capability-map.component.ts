import { AfterViewInit, Component, ElementRef, HostListener, Input, OnInit, ViewChild } from '@angular/core';
import { Capability } from '../models/capability';
import { CapabilityService } from '../services/capability.service';
import { first } from 'rxjs/operators';
import { CanvasService } from '../services/canvas.service';
import { ApplicationService } from '../services/application.service';
import { ApiCallService } from '../services/api-call.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiCall } from '../models/api-call';
import { Application } from '../models/application';

@Component({
  selector: 'app-capability-map',
  templateUrl: './capability-map.component.html',
  styleUrls: ['./capability-map.component.scss']
})
export class CapabilityMapComponent implements OnInit, AfterViewInit {
  @Input() repoId: string;
  @ViewChild('canvas') canvas: ElementRef<HTMLCanvasElement>;

  // Data
  public capabilities: Capability[] = [];
  public capById = new Map<string, Capability>();
  private systemsById = new Map<string, Application>();
  private apiCallsByCap = new Map<string, ApiCall[]>();

  // Interaction state
  public currentRootId: string | null = null;
  private hitRegions: { x: number; y: number; w: number; h: number; type: 'cap'|'sys'|'api'; id?: string }[] = [];

  // Layout constants
  private OUTER_PADDING_X = 20;
  private OUTER_PADDING_Y = 20;
  private ROOT_TITLE_H = 60;
  private CHILD_TITLE_H = 44;
  private BOX_PADDING = 12;
  private GAP_X = 16;
  private GAP_Y = 16;
  private CHIP_H = 24;
  private CHIP_GAP = 8;

  private COLORS = {
    cap: '#e0e0f8',
    sys: '#d1f7c4',
    api: '#fce4d6',
    border: '#666',
    text: '#000'
  };

  // Simple rectangular capability box (no process arrow)
  private drawCapBox(cx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, title: string, fill: string = this.COLORS.cap): void {
    cx.save();
    cx.fillStyle = fill;
    cx.strokeStyle = this.COLORS.border;
    cx.lineWidth = 1;
    cx.fillRect(x, y, w, h);
    cx.strokeRect(x, y, w, h);
    cx.fillStyle = this.COLORS.text;
    cx.font = '16px sans-serif';
    cx.textAlign = 'center';
    cx.textBaseline = 'middle';
    const tx = x + w / 2;
    const ty = y + h / 2;
    cx.fillText(title, tx, ty);
    cx.restore();
  }

  constructor(
    private capabilityService: CapabilityService,
    private canvasService: CanvasService,
    private systemService: ApplicationService,
    private apiCallService: ApiCallService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Read root from URL path param (and migrate legacy ?root= if present)
    const legacyRoot = this.route.snapshot.queryParamMap.get('root');
    const initialRoot = this.route.snapshot.paramMap.get('root') || legacyRoot;
    this.currentRootId = initialRoot || null;

    // If legacy query param is present, migrate to path param once
    if (legacyRoot && !this.route.snapshot.paramMap.get('root')) {
      this.currentRootId = legacyRoot;
      this.syncUrlWithRoot();
    }

    this.route.paramMap.subscribe(params => {
      const root = params.get('root');
      const newRoot = root || null;
      if (this.currentRootId !== newRoot) {
        this.currentRootId = newRoot;
        this.draw();
      }
    });
  }

  ngAfterViewInit(): void {
    // Load all needed datasets
    this.capabilityService.all(this.repoId).pipe(first()).subscribe(caps => {
      this.capabilities = caps || [];
      this.capById.clear();
      for (const c of this.capabilities) this.capById.set(c.id, c);
      // Load systems and api calls
      this.systemService.all(this.repoId).pipe(first()).subscribe(sysList => {
        this.systemsById.clear();
        for (const s of (sysList || [])) this.systemsById.set(s.id, s);
        this.apiCallService.all().pipe(first()).subscribe(apiList => {
          this.apiCallsByCap.clear();
          for (const a of (apiList || [])) {
            if (!a.capabilityId) continue;
            const arr = this.apiCallsByCap.get(a.capabilityId) || [];
            arr.push(a);
            this.apiCallsByCap.set(a.capabilityId, arr);
          }
          this.draw();
        });
      });
    });
  }

  // Window resize: redraw
  @HostListener('window:resize') onResize() { this.draw(); }

  // Navigation helpers
  private syncUrlWithRoot(): void {
    if (this.currentRootId) {
      // Navigate to path param variant: /capability/view/:root
      this.router.navigate(['/capability/view', this.currentRootId]);
    } else {
      // Navigate to top-level capability view without root
      this.router.navigate(['/capability/view']);
    }
  }

  // Click handling
  public onCanvasClick(evt: MouseEvent): void {
    if (!this.canvas) return;
    const rect = this.canvas.nativeElement.getBoundingClientRect();
    const x = evt.clientX - rect.left;
    const y = evt.clientY - rect.top;

    // Hit-test in reverse order (topmost first)
    for (let i = this.hitRegions.length - 1; i >= 0; i--) {
      const r = this.hitRegions[i];
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
        if (r.type === 'cap' && r.id) {
          this.currentRootId = r.id;
          this.syncUrlWithRoot();
          this.draw();
          return;
        }
        if (r.type === 'sys' && r.id) {
          this.router.navigate(['/system/edit', r.id]);
          return;
        }
        if (r.type === 'api' && r.id) {
          this.router.navigate(['/apiCall/edit', r.id]);
          return;
        }
      }
    }
  }

  // Helpers
  private getRoots(): Capability[] {
    return this.capabilities.filter(c => !c.parentId || !this.capById.has(c.parentId));
  }
  private getChildren(cap: Capability): Capability[] {
    if (cap.childrenIds && cap.childrenIds.length) {
      return cap.childrenIds.map(id => this.capById.get(id)).filter(Boolean) as Capability[];
    }
    return this.capabilities.filter(c => c.parentId === cap.id);
  }
  private getSystems(cap: Capability): Application[] {
    const ids = cap.implementedBy || [];
    return ids.map(id => this.systemsById.get(id)).filter(Boolean) as Application[];
  }
  private getApiCalls(cap: Capability): ApiCall[] {
    const key = cap.capabilityId || cap.id;
    return (this.apiCallsByCap.get(key) || []).slice();
  }

  private textW(cx: CanvasRenderingContext2D, text: string, font = '16px sans-serif'): number {
    cx.save();
    cx.font = font;
    const w = cx.measureText(text).width;
    cx.restore();
    return w;
  }
  private drawChip(cx: CanvasRenderingContext2D, x: number, y: number, text: string, color: string): { w: number; h: number } {
    const padX = 10; const h = this.CHIP_H; const r = 8;
    const w = Math.ceil(this.textW(cx, text, '12px sans-serif')) + padX * 2;
    cx.save();
    cx.fillStyle = color; cx.strokeStyle = this.COLORS.border;
    cx.lineWidth = 1;
    // rounded rect
    cx.beginPath();
    cx.moveTo(x + r, y);
    cx.lineTo(x + w - r, y);
    cx.quadraticCurveTo(x + w, y, x + w, y + r);
    cx.lineTo(x + w, y + h - r);
    cx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    cx.lineTo(x + r, y + h);
    cx.quadraticCurveTo(x, y + h, x, y + h - r);
    cx.lineTo(x, y + r);
    cx.quadraticCurveTo(x, y, x + r, y);
    cx.closePath();
    cx.fill(); cx.stroke();
    // text
    cx.fillStyle = this.COLORS.text;
    cx.font = '12px sans-serif';
    cx.textAlign = 'center'; cx.textBaseline = 'middle';
    cx.fillText(text, x + w / 2, y + h / 2);
    cx.restore();
    return { w, h };
  }

  // Title bar (filled rect with centered title, no border)
  private drawTitleBar(cx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, title: string, fill: string = this.COLORS.cap): void {
    cx.save();
    cx.fillStyle = fill;
    cx.fillRect(x, y, w, h);
    cx.fillStyle = this.COLORS.text;
    cx.font = '16px sans-serif';
    cx.textAlign = 'center';
    cx.textBaseline = 'middle';
    cx.fillText(title, x + w / 2, y + h / 2);
    cx.restore();
  }

  private draw(): void {
    if (!this.canvas) { return; }
    const canvasEl = this.canvas.nativeElement;
    const cx = canvasEl.getContext('2d');
    if (!cx) { return; }

    // Reset hit regions
    this.hitRegions = [];

    // Compute size based on content
    const width = Math.max(1200, window.innerWidth - 60);
    const height = Math.max(800, window.innerHeight * 0.7);
    canvasEl.width = width;
    canvasEl.height = height;
    cx.clearRect(0, 0, width, height);

    // If no root selected, show roots as selectable boxes
    if (!this.currentRootId) {
      this.drawRootSelection(cx);
      return;
    }

    // Otherwise, draw two-level boxed view for the selected root
    const root = this.capById.get(this.currentRootId);
    if (!root) { this.currentRootId = null; this.drawRootSelection(cx); return; }

    // Root container
    const x0 = this.OUTER_PADDING_X;
    const y0 = this.OUTER_PADDING_Y + 10; // leave space for header line in template
    const rootTitle = root.name || '(unnamed capability)';
    const rootW = width - this.OUTER_PADDING_X * 2;

    // Draw root title box (full width) as a simple rectangle
    this.drawCapBox(cx, x0, y0, rootW, this.ROOT_TITLE_H, rootTitle, this.COLORS.cap);
    this.hitRegions.push({ x: x0, y: y0, w: rootW, h: this.ROOT_TITLE_H, type: 'cap', id: root.id });

    // Compute and draw Systems/API chips for current root just below the title
    const contentX0 = x0 + this.BOX_PADDING;
    const contentW0 = rootW - this.BOX_PADDING * 2;
    const rootSystems = this.getSystems(root);
    const rootApis = this.getApiCalls(root);

    // Measure total chip rows height to position children after chips
    const chipRowsHeight0 = this.layoutChipsMeasure(
      rootSystems.map(s => s.name).concat(rootApis.map(a => a.name)),
      cx,
      contentW0
    );

    // Draw chips if any
    let currentY = y0 + this.ROOT_TITLE_H + this.GAP_Y;
    if (chipRowsHeight0 > 0) {
      let chipX = contentX0;
      let chipY = currentY;
      // Systems first
      for (const s of rootSystems) {
        const chip = this.drawChip(cx, chipX, chipY, s.name, this.COLORS.sys);
        this.hitRegions.push({ x: chipX, y: chipY, w: chip.w, h: chip.h, type: 'sys', id: s.id });
        chipX += chip.w + this.CHIP_GAP;
        if (chipX + 60 > contentX0 + contentW0) { // wrap
          chipX = contentX0; chipY += this.CHIP_H + this.CHIP_GAP;
        }
      }
      // API calls next
      for (const a of rootApis) {
        const chip = this.drawChip(cx, chipX, chipY, a.name, this.COLORS.api);
        this.hitRegions.push({ x: chipX, y: chipY, w: chip.w, h: chip.h, type: 'api', id: a.id });
        chipX += chip.w + this.CHIP_GAP;
        if (chipX + 60 > contentX0 + contentW0) { // wrap
          chipX = contentX0; chipY += this.CHIP_H + this.CHIP_GAP;
        }
      }
      // advance Y past the chip area plus a gap before children
      currentY = (y0 + this.ROOT_TITLE_H + this.GAP_Y) + chipRowsHeight0 + this.GAP_Y;
    }

    // Child area inside root box
    const childAreaX = x0 + this.BOX_PADDING;
    let currentX = childAreaX;
    const childMaxW = rootW - this.BOX_PADDING * 2;

    const children = this.getChildren(root);

    for (const child of children) {
      const capTitle = child.name || '(unnamed capability)';
      const titleW = Math.ceil(this.textW(cx, capTitle, '16px sans-serif')) + this.BOX_PADDING * 2;

      // Compute chips sizes to estimate height and width
      const sysList = this.getSystems(child);
      const apiList = this.getApiCalls(child);

      // Lay out chips into rows to compute needed width/height
      const innerW = Math.max(titleW, Math.min(childMaxW, 360));

      // Compute height: title + gaps + chips rows
      const chipRowsHeight = this.layoutChipsMeasure(sysList.map(s => s.name).concat(apiList.map(a => a.name)), cx, innerW);
      const boxH = this.CHILD_TITLE_H + (chipRowsHeight > 0 ? this.GAP_Y + chipRowsHeight : 0) + this.BOX_PADDING;
      const boxW = innerW + this.BOX_PADDING * 2;

      // Wrap if necessary
      if ((currentX + boxW) > (x0 + childMaxW)) {
        currentX = childAreaX;
        currentY += boxH + this.GAP_Y;
      }

      // Draw child box background and title area
      // Outer rectangle
      cx.save();
      cx.strokeStyle = this.COLORS.border;
      cx.lineWidth = 1;
      cx.strokeRect(currentX, currentY, boxW, boxH);
      cx.restore();

      // Title bar (simple filled rectangle)
      this.drawTitleBar(cx, currentX, currentY, boxW, this.CHILD_TITLE_H, capTitle, this.COLORS.cap);
      this.hitRegions.push({ x: currentX, y: currentY, w: boxW, h: this.CHILD_TITLE_H, type: 'cap', id: child.id });

      // Chips area
      const contentX = currentX + this.BOX_PADDING;
      let chipX = contentX;
      let chipY = currentY + this.CHILD_TITLE_H + this.GAP_Y;
      const contentW = boxW - this.BOX_PADDING * 2;

      // Systems first
      for (const s of sysList) {
        const chip = this.drawChip(cx, chipX, chipY, s.name, this.COLORS.sys);
        this.hitRegions.push({ x: chipX, y: chipY, w: chip.w, h: chip.h, type: 'sys', id: s.id });
        chipX += chip.w + this.CHIP_GAP;
        if (chipX + 60 > contentX + contentW) { // wrap
          chipX = contentX; chipY += this.CHIP_H + this.CHIP_GAP;
        }
      }
      // API calls next
      for (const a of apiList) {
        const chip = this.drawChip(cx, chipX, chipY, a.name, this.COLORS.api);
        this.hitRegions.push({ x: chipX, y: chipY, w: chip.w, h: chip.h, type: 'api', id: a.id });
        chipX += chip.w + this.CHIP_GAP;
        if (chipX + 60 > contentX + contentW) { // wrap
          chipX = contentX; chipY += this.CHIP_H + this.CHIP_GAP;
        }
      }

      currentX += boxW + this.GAP_X;
    }
  }

  private layoutChipsMeasure(labels: string[], cx: CanvasRenderingContext2D, maxInnerW: number): number {
    if (!labels || labels.length === 0) return 0;
    let x = 0; let rows = 1;
    for (const t of labels) {
      const w = Math.ceil(this.textW(cx, t, '12px sans-serif')) + 20; // pad in chip
      if (x > 0 && (x + w) > maxInnerW) { rows++; x = 0; }
      x += w + this.CHIP_GAP;
    }
    return rows * this.CHIP_H + (rows - 1) * this.CHIP_GAP;
  }

  private drawRootSelection(cx: CanvasRenderingContext2D): void {
    const roots = this.getRoots();
    const canvasW = this.canvas.nativeElement.width;
    const x0 = this.OUTER_PADDING_X;
    const y0 = this.OUTER_PADDING_Y + 10;
    let x = x0;
    let y = y0;
    const maxRowW = canvasW - this.OUTER_PADDING_X * 2;

    const tileBaseW = 360; // target tile width

    for (const r of roots) {
      const title = r.name || '(unnamed capability)';

      // Determine tile width based on title within bounds
      const titleW = Math.ceil(this.textW(cx, title, '16px sans-serif')) + 32;
      const tileW = Math.min(tileBaseW, Math.max(220, titleW));

      // Children and inner width
      const innerW = tileW - this.BOX_PADDING * 2;
      const children = this.getChildren(r);

      const titleH = this.CHILD_TITLE_H;
      const childCount = children.length;
      const childContentH = childCount > 0 ? (childCount * this.CHILD_TITLE_H + (childCount - 1) * this.GAP_Y) : 0;
      const tileH = titleH + (childCount ? this.GAP_Y + childContentH : 0) + this.BOX_PADDING;

      // Wrap to next row if needed
      if (x + tileW > x0 + maxRowW) { x = x0; y += tileH + this.GAP_Y; }

      // Draw tile outline
      cx.save();
      cx.strokeStyle = this.COLORS.border;
      cx.lineWidth = 1;
      cx.strokeRect(x, y, tileW, tileH);
      cx.restore();

      // Title bar of tile (click to open root)
      this.drawTitleBar(cx, x, y, tileW, titleH, title, this.COLORS.cap);
      this.hitRegions.push({ x, y, w: tileW, h: titleH, type: 'cap', id: r.id });

      // Draw children inside: full width rows
      let drawX = x + this.BOX_PADDING;
      let drawY = y + titleH + this.GAP_Y;
      for (const ch of children) {
        const ct = ch.name || '(unnamed)';
        const cw = innerW;
        const chH = this.CHILD_TITLE_H;
        // child box outline + filled title
        cx.save();
        cx.strokeStyle = this.COLORS.border;
        cx.lineWidth = 1;
        cx.strokeRect(drawX, drawY, cw, chH);
        cx.restore();
        this.drawTitleBar(cx, drawX, drawY, cw, chH, ct, this.COLORS.cap);
        this.hitRegions.push({ x: drawX, y: drawY, w: cw, h: chH, type: 'cap', id: ch.id });

        drawY += chH + this.GAP_Y;
      }

      x += tileW + this.GAP_X;
    }
  }
}
