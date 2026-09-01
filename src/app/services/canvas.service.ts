import {Injectable} from '@angular/core';
import {ProcessStep, Role} from '../models/process';
import {Surface, readableTextOn, surfaceFor} from './color';

// Modern Color Palette & Styles
const PALETTE = {
  text: '#374151',           // Gray 700
  swimlaneOdd: '#ffffff',    // White
  swimlaneEven: '#f9fafb',   // Gray 50
  swimlaneBorder: '#e5e7eb', // Gray 200
  processFill: '#eef4fd',    // a pale wash, so the label carries the box
  processBorder: '#9db8e0',
  processAccent: '#4c7fd4',
  functionFill: '#fdf6e3',
  functionBorder: '#e3cf9a',
  functionAccent: '#c99a2e',
  shadow: 'rgba(0, 0, 0, 0.1)',
  arrow: '#4b5563'           // Gray 600
};

const SHADOW_BLUR = 4;
const SHADOW_OFFSET = 2;
const CORNER_RADIUS = 8;

const BOX_HEIGHT = 50;
const BOX_PADDING = 20;
const FUN_FONT = '500 16px "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
const SYS_FONT = '400 12px "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
const PROCESS_EDGE = 15;

@Injectable({
  providedIn: 'root',
})
export class CanvasService {
    constructor() {}

    private get palette() {
        return PALETTE;
    }

    /**
     * A colour as a canvas can use it. A CSS variable is looked up; one that is
     * not defined returns nothing rather than its own name, because a canvas
     * silently keeps painting in the previous colour when it is handed something
     * it cannot read.
     */
    private resolveColor(color: string): string | null {
        if (!color) return null;
        if (color.startsWith('var(')) {
            const varName = color.substring(4, color.length - 1).split(',')[0].trim();
            const value = typeof getComputedStyle === 'function'
                ? getComputedStyle(document.body).getPropertyValue(varName).trim()
                : '';
            return value || null;
        }
        return color;
    }

    /** The surface of a box that belongs to a role, or the default one */
    private surfaceOf(color: string, fallback: Surface): Surface {
        const resolved = this.resolveColor(color);
        return resolved ? surfaceFor(resolved, fallback) : fallback;
    }

    calcFunctionWidth(cx: CanvasRenderingContext2D, x: number, functionName: string, systemName: string): number {
        cx.save();

        cx.textAlign = 'center';
        cx.textBaseline = 'middle';
        cx.font = FUN_FONT;
      const funW = cx.measureText(functionName).width + BOX_PADDING * 2;

        cx.font = SYS_FONT;
      const sysW = cx.measureText(systemName).width + BOX_PADDING * 2;
        const sysX = funW;// * 0.75;

        cx.restore();

        return Math.max(funW, sysW);
    }

    drawFunction(cx: CanvasRenderingContext2D, x: number, y: number, functionName: string, systemName: string, color: string = '#ffffff', width: number = 0): number {
        cx.save();

        cx.textAlign = 'center';
        cx.textBaseline = 'middle';

        cx.font = FUN_FONT;
        const funW = cx.measureText(functionName).width + BOX_PADDING * 2;
        cx.font = SYS_FONT;
        const sysW = cx.measureText(systemName).width + BOX_PADDING * 2;

        const w = Math.max(funW, sysW, width);
        const h = BOX_HEIGHT;

        // Shadow
        cx.shadowColor = this.palette.shadow;
        cx.shadowBlur = SHADOW_BLUR;
        cx.shadowOffsetX = SHADOW_OFFSET;
        cx.shadowOffsetY = SHADOW_OFFSET;

        // Use Function Fill from Palette if generic color passed, or use passed color if specific (though we generally override)
        // Check if color is the default white/yellow from old code, if so replace with new palette
        const fallback: Surface = {
            fill: this.palette.functionFill,
            border: this.palette.functionBorder,
            accent: this.palette.functionAccent,
            text: this.palette.text
        };
        const surface = (color === '#ffffff' || color === '#e0e050') ? fallback : this.surfaceOf(color, fallback);

        cx.fillStyle = surface.fill;
        cx.strokeStyle = surface.border;

        // Function Box - Rounded Rect
        cx.beginPath();
        cx.lineWidth = 1;
        this.roundRect(cx, x, y, w, h, CORNER_RADIUS);
        cx.fill();
        cx.stroke();

        // Reset shadow for text
        cx.shadowColor = 'transparent';
        cx.shadowBlur = 0;
        cx.shadowOffsetX = 0;
        cx.shadowOffsetY = 0;

        cx.fillStyle = surface.text;
        cx.font = FUN_FONT;
        cx.fillText(functionName, x + w / 2, y + h / 3);
        cx.font = SYS_FONT;

        cx.textBaseline = 'bottom';
        cx.textAlign = 'right';
        cx.fillText(systemName, x + w - 4, y + h - 2);

        cx.restore();

        return w;
    }

    drawProcessStep(cx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, processStepName: string, color: string = '#ffffff', indicator: string = '', isDraft: boolean = false) {
        cx.save();
        cx.textAlign = 'center';
        cx.textBaseline = 'middle';

        cx.font = FUN_FONT;

        // The colour of a role says which lane this belongs to. Used as the
        // surface it swallows the label, so it becomes a wash plus an edge.
        const surface = this.surfaceOf(color, {
            fill: this.palette.processFill,
            border: this.palette.processBorder,
            accent: this.palette.processAccent,
            text: this.palette.text
        });

        cx.fillStyle = surface.fill;
        cx.strokeStyle = surface.border;

        if (isDraft) {
            cx.setLineDash([5, 5]);
        }

        // Shadow
        cx.shadowColor = this.palette.shadow;
        cx.shadowBlur = SHADOW_BLUR;
        cx.shadowOffsetX = SHADOW_OFFSET;
        cx.shadowOffsetY = SHADOW_OFFSET;

        // Shape: Rounded Rectangle (Pill-like)
        cx.lineWidth = 2; // Slightly thicker for visibility
        cx.beginPath();
        this.roundRect(cx, x, y, w, h, CORNER_RADIUS);
        cx.fill();
        cx.stroke();

        // Reset dashed line
        cx.setLineDash([]);

        // Reset shadow
        cx.shadowColor = 'transparent';
        cx.shadowBlur = 0;
        cx.shadowOffsetX = 0;
        cx.shadowOffsetY = 0;

        // the role reads from the edge, where it cannot get in the way of the label
        cx.save();
        this.roundRect(cx, x, y, w, h, CORNER_RADIUS);
        cx.clip();
        cx.fillStyle = surface.accent;
        cx.fillRect(x, y, 4, h);
        cx.restore();

        cx.shadowBlur = 0;
        cx.shadowOffsetX = 0;
        cx.shadowOffsetY = 0;

        cx.fillStyle = surface.text;
        cx.font = FUN_FONT;
        // Adjust text position slightly if needed
        cx.fillText(processStepName, x + w / 2, y + h / 2);

        if (isDraft) {
            cx.font = 'italic 10px sans-serif';
            cx.fillStyle = '#666';
            cx.textAlign = 'left';
            cx.textBaseline = 'top';
            cx.fillText('DRAFT', x + 5, y + 5);
        }

        if (indicator) {
            cx.font = SYS_FONT;
            cx.fillStyle = this.palette.text;
            cx.textAlign = 'right';
            cx.textBaseline = 'bottom';
            cx.fillText(indicator, x + w - 5, y + h - 2);
        }

        cx.restore();
    }

    // Helper for rounded rectangle
    private roundRect(cx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
      if (w < 2 * r) r = w / 2;
      if (h < 2 * r) r = h / 2;
      cx.beginPath();
      cx.moveTo(x + r, y);
      cx.arcTo(x + w, y, x + w, y + h, r);
      cx.arcTo(x + w, y + h, x, y + h, r);
      cx.arcTo(x, y + h, x, y, r);
      cx.arcTo(x, y, x + w, y, r);
      cx.closePath();
    }

    drawSwimlane(cx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, description: string, index: number = 0, color?: string) {
        cx.save();

        // Background color: Use provided color, or default to zebra striping
        const given = color ? this.resolveColor(color) : null;
        const background = given || ((index % 2 === 0) ? this.palette.swimlaneEven : this.palette.swimlaneOdd);
        cx.fillStyle = background;
        cx.fillRect(x, y, w, h);

        cx.strokeStyle = this.palette.swimlaneBorder;
        cx.beginPath();
        cx.moveTo(x , y);
        cx.lineTo(x , y + h);
        cx.lineTo(x + w, y + h);
        cx.stroke();

        // a lane that was given a colour of its own decides its own text colour
        cx.fillStyle = given ? readableTextOn(background, this.palette.text) : this.palette.text;
        cx.font = FUN_FONT;
        // Adjust text position
        cx.fillText(description, x + 10, y + h - 15);

        cx.restore();
    }

    drawVerticalArrow(cx: CanvasRenderingContext2D, fromX: number, fromY: number, toY: number, description: string) {
        this.drawArrow(cx, fromX, fromY, fromX, toY, description);
    }


  drawLine(cx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number, description: string) {
    cx.save();
    cx.strokeStyle = this.palette.arrow;
    cx.beginPath();
    cx.moveTo(fromX, fromY);
    cx.lineTo(toX, toY);
    cx.stroke();
    cx.restore();
  }

  drawArrowWithHeight(cx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number, height: number, description: string) {

    cx.save();
    cx.strokeStyle = this.palette.arrow;
    cx.fillStyle = this.palette.arrow;

    const headlen = 10; // length of head in pixels
    const dx = toX - fromX;
    const dy = toY - fromY;

    let angle = Math.PI/2; Math.atan2(dy, dx);
    // if(dx === 0) {
    //   angle = -0.5 * Math.PI;
    // } else if(dx > 0) {
    //   angle = 0;
    // } else if(dx < 0) {
    //   angle = -1*Math.PI;
    // }

    cx.beginPath();

    cx.moveTo(fromX, fromY);
    cx.lineTo(fromX, fromY - (height + 20));
    cx.lineTo(toX, fromY - (height + 20));
    cx.lineTo(toX, toY);

    cx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
    cx.moveTo(toX, toY);
    cx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
    cx.stroke();

    cx.translate(fromX + dx / 2, fromY + dy / 2);
    // cx.rotate(dy > 0 ? -angle : angle);
    cx.translate(-(fromX + dx / 2), -(fromY + dy / 2));

    cx.fillStyle = this.palette.text;

    cx.textAlign = 'center';
    cx.textBaseline = 'middle';
    cx.font = FUN_FONT;
    if(description) {
      cx.fillText(description, fromX + dx / 2, fromY - (height + 20) + dy / 2 - 15);
    }

    cx.restore();
  }

    drawArrow(cx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number, description: string) {
        cx.save();
        cx.strokeStyle = this.palette.arrow;
        cx.fillStyle = this.palette.arrow;

        const headlen = 10; // length of head in pixels
        const dx = toX - fromX;
        const dy = toY - fromY;
        let angle = Math.atan2(dy, dx);
        if(dx === 0) {
          if(dy >= 0) {
            angle = 0.5 * Math.PI;
          } else {
            angle = -0.5 * Math.PI;
          }
        } else if(dx > 0) {
          angle = 0;
        } else if(dx < 0) {
          angle = -1*Math.PI;
        }
        cx.beginPath();

        cx.moveTo(fromX, fromY);
      cx.lineTo(fromX + (toX - fromX) / 2, fromY);
      cx.lineTo(fromX + (toX - fromX) / 2, toY);
      cx.lineTo(toX, toY);
        // cx.lineTo(toX, toY);




        cx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
        cx.moveTo(toX, toY);
        cx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
        cx.stroke();

        cx.translate(fromX + dx / 2, fromY + dy / 2);
        cx.rotate(dy > 0 ? -angle : angle);
        cx.translate(-(fromX + dx / 2), -(fromY + dy / 2));

        cx.fillStyle = this.palette.text;

        cx.textAlign = 'center';
        cx.textBaseline = 'middle';
        cx.font = FUN_FONT;
        if(description) {
          cx.fillText(description, fromX + dx / 2, fromY + dy / 2 + 15);
        }

        cx.restore();
     }

  drawPolylineArrow(cx: CanvasRenderingContext2D, points: {x: number, y: number}[], description: string) {
    if (points.length < 2) return;

    cx.save();
    cx.strokeStyle = this.palette.arrow;
    cx.fillStyle = this.palette.arrow;

    cx.beginPath();
    cx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      cx.lineTo(points[i].x, points[i].y);
    }
    cx.stroke();

    // Arrow head at the last segment
    const last = points[points.length - 1];
    const prev = points[points.length - 2];
    const headlen = 10;
    const dx = last.x - prev.x;
    const dy = last.y - prev.y;
    const angle = Math.atan2(dy, dx);

    cx.beginPath();
    cx.moveTo(last.x, last.y);
    cx.lineTo(last.x - headlen * Math.cos(angle - Math.PI / 6), last.y - headlen * Math.sin(angle - Math.PI / 6));
    cx.moveTo(last.x, last.y);
    cx.lineTo(last.x - headlen * Math.cos(angle + Math.PI / 6), last.y - headlen * Math.sin(angle + Math.PI / 6));
    cx.stroke();

    if (description) {
        // Find middle segment
        const totalLen = points.reduce((acc, pt, i) => {
            if (i === 0) return 0;
            const dx = pt.x - points[i-1].x;
            const dy = pt.y - points[i-1].y;
            return acc + Math.sqrt(dx*dx + dy*dy);
        }, 0);

        let currentLen = 0;
        const midLen = totalLen / 2;
        let midPt = points[0];

        for (let i = 1; i < points.length; i++) {
             const dx = points[i].x - points[i-1].x;
             const dy = points[i].y - points[i-1].y;
             const dist = Math.sqrt(dx*dx + dy*dy);
             if (currentLen + dist >= midLen) {
                 // Interpolate
                 const remaining = midLen - currentLen;
                 const ratio = remaining / dist;
                 midPt = {
                     x: points[i-1].x + dx * ratio,
                     y: points[i-1].y + dy * ratio
                 };
                 break;
             }
             currentLen += dist;
        }


        cx.fillStyle = this.palette.text;
        cx.textAlign = 'center';
        cx.textBaseline = 'middle';
        cx.font = FUN_FONT;
        cx.fillText(description, midPt.x, midPt.y + 15);
    }

    cx.restore();
  }

  drawPolylineComposition(cx: CanvasRenderingContext2D, points: {x: number, y: number}[]) {
    if (points.length < 2) return;

    cx.save();
    cx.strokeStyle = '#555';
    cx.fillStyle = '#555';
    cx.lineWidth = 1;

    const start = points[0];
    const next = points[1];

    const dx = next.x - start.x;
    const dy = next.y - start.y;
    const angle = Math.atan2(dy, dx);
    const dSize = 8; // Half length of diamond

    // Diamond at start
    // We need to rotate the diamond to align with the first segment
    cx.translate(start.x, start.y);
    cx.rotate(angle);

    cx.beginPath();
    cx.moveTo(0, 0);
    cx.lineTo(dSize, -dSize/1.5);
    cx.lineTo(2*dSize, 0);
    cx.lineTo(dSize, dSize/1.5);
    cx.closePath();
    cx.fill();

    cx.rotate(-angle);
    cx.translate(-start.x, -start.y);

    // Line from end of diamond to next point
    // Calculate point at end of diamond
    const diamondEndX = start.x + Math.cos(angle) * (2*dSize);
    const diamondEndY = start.y + Math.sin(angle) * (2*dSize);

    cx.beginPath();
    cx.moveTo(diamondEndX, diamondEndY);
    cx.lineTo(next.x, next.y);
    for (let i = 2; i < points.length; i++) {
        cx.lineTo(points[i].x, points[i].y);
    }
    cx.stroke();

    cx.restore();
  }
}
