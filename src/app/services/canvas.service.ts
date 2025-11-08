import {Injectable} from '@angular/core';
import {ProcessStep} from '../models/process';


const SWIMLANE_COLOR = '#c0c0c0';
const BOX_HEIGHT = 50;
const BOX_PADDING = 20;
const FUN_FONT = '18px sans-serif';
const SYS_FONT = '14px sans-serif';
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

        cx.fillStyle = color;


        // Function
        cx.beginPath();
        cx.lineWidth = 1;
        cx.rect(x, y, w, h);
        cx.fill();
        cx.stroke();






        cx.fillStyle = '#000000';
        cx.font = FUN_FONT;
        cx.fillText(functionName, x + w / 2, y + h / 3);
        cx.font = SYS_FONT;

        cx.textBaseline = 'bottom';
        cx.textAlign = 'right';
        cx.fillText(systemName, x + w - 4, y + h - 2);

        cx.restore();

        return w;
    }

    drawProcessStep(cx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, processStepName: string, color: string = '#ffffff') {
        cx.save();
        cx.textAlign = 'center';
        cx.textBaseline = 'middle';

        cx.font = FUN_FONT;
        cx.fillStyle = color;

        const edge = PROCESS_EDGE;

        // Function
        cx.lineWidth = 1;
        cx.beginPath();
        cx.moveTo(x, y);
        cx.lineTo(x + w, y);
        cx.lineTo(x + w + edge, y + h / 2);
        cx.lineTo(x + w, y + h);
        cx.lineTo(x, y + h);
        cx.lineTo(x + edge, y + h / 2);
        cx.lineTo(x, y);
        cx.fill();
        cx.stroke();


        cx.fillStyle = '#000000';
        cx.font = FUN_FONT;
        cx.fillText(processStepName, x + 10 + w / 2, y + h / 2);
        cx.restore();
    }

    drawSwimlane(cx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, description: string) {
        cx.save();

        cx.strokeStyle = SWIMLANE_COLOR;
        cx.beginPath();
        cx.moveTo(x , y);
        cx.lineTo(x , y + h);
        cx.lineTo(x + w, y + h);
        cx.stroke();



        cx.fillStyle = SWIMLANE_COLOR;
        cx.font = FUN_FONT;
        cx.fillText(description, x + 10, y + h - 10);

        cx.restore();
    }

    drawVerticalArrow(cx: CanvasRenderingContext2D, fromX: number, fromY: number, toY: number, description: string) {
        this.drawArrow(cx, fromX, fromY, fromX, toY, description);
    }


  drawLine(cx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number, description: string) {
    cx.beginPath();
    cx.moveTo(fromX, fromY);
    cx.lineTo(toX, toY);
    cx.stroke();
  }

  drawArrowWithHeight(cx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number, height: number, description: string) {

    cx.save();

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

    cx.fillStyle = '#000000';

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

        cx.fillStyle = '#000000';

        cx.textAlign = 'center';
        cx.textBaseline = 'middle';
        cx.font = FUN_FONT;
        if(description) {
          cx.fillText(description, fromX + dx / 2, fromY + dy / 2 + 15);
        }

        cx.restore();
     }
}
