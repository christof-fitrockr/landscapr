import {Injectable} from '@angular/core';
import {ProcessStep} from '../models/process';

// Modern Color Palette & Styles
const PALETTE = {
  text: '#374151',           // Gray 700 - Softer than black
  swimlaneOdd: '#ffffff',    // White
  swimlaneEven: '#f9fafb',   // Gray 50
  swimlaneBorder: '#e5e7eb', // Gray 200
  processFill: '#dbeafe',    // Blue 100
  processBorder: '#93c5fd',  // Blue 300
  functionFill: '#fef3c7',   // Amber 100
  functionBorder: '#fde68a', // Amber 200
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
        cx.shadowColor = PALETTE.shadow;
        cx.shadowBlur = SHADOW_BLUR;
        cx.shadowOffsetX = SHADOW_OFFSET;
        cx.shadowOffsetY = SHADOW_OFFSET;

        // Use Function Fill from Palette if generic color passed, or use passed color if specific (though we generally override)
        // Check if color is the default white/yellow from old code, if so replace with new palette
        let fillStyle = color;
        if (color === '#ffffff' || color === '#e0e050') {
             fillStyle = PALETTE.functionFill;
        } else {
             fillStyle = color; // Keep specific overrides if any
        }
        cx.fillStyle = fillStyle;
        cx.strokeStyle = PALETTE.functionBorder;

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

        cx.fillStyle = PALETTE.text;
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

        // Modernize Color
        let fillStyle = color;
        if (color === '#ffffff') {
            fillStyle = PALETTE.processFill;
        } else {
            fillStyle = color;
        }

        cx.fillStyle = fillStyle;
        cx.strokeStyle = PALETTE.processBorder;

        if (isDraft) {
            cx.setLineDash([5, 5]);
        }

        // Shadow
        cx.shadowColor = PALETTE.shadow;
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

        cx.fillStyle = PALETTE.text;
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
            cx.fillStyle = PALETTE.text;
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
        if (color) {
            cx.fillStyle = color;
        } else {
            cx.fillStyle = (index % 2 === 0) ? PALETTE.swimlaneEven : PALETTE.swimlaneOdd;
        }
        cx.fillRect(x, y, w, h);

        cx.strokeStyle = PALETTE.swimlaneBorder;
        cx.beginPath();
        cx.moveTo(x , y);
        cx.lineTo(x , y + h);
        cx.lineTo(x + w, y + h);
        cx.stroke();

        cx.fillStyle = PALETTE.text; // Modern text color
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
    cx.strokeStyle = PALETTE.arrow;
    cx.beginPath();
    cx.moveTo(fromX, fromY);
    cx.lineTo(toX, toY);
    cx.stroke();
    cx.restore();
  }

  drawArrowWithHeight(cx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number, height: number, description: string) {

    cx.save();
    cx.strokeStyle = PALETTE.arrow;
    cx.fillStyle = PALETTE.arrow;

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

    cx.fillStyle = PALETTE.text;

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
        cx.strokeStyle = PALETTE.arrow;
        cx.fillStyle = PALETTE.arrow;

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

        cx.fillStyle = PALETTE.text;

        cx.textAlign = 'center';
        cx.textBaseline = 'middle';
        cx.font = FUN_FONT;
        if(description) {
          cx.fillText(description, fromX + dx / 2, fromY + dy / 2 + 15);
        }

        cx.restore();
     }
}
