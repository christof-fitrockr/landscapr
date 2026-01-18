import {Injectable} from '@angular/core';
import {CanvasService} from './canvas.service';
import {Data, DataType} from '../models/data';

const BOX_WIDTH = 200;
const BOX_HEADER_HEIGHT = 40;
const ITEM_HEIGHT = 25;
const PADDING = 20;

@Injectable({
  providedIn: 'root',
})
export class ErDiagramService {

    constructor(private canvasService: CanvasService) {}

    public drawErDiagram(canvasEl: HTMLCanvasElement, dataList: Data[]): Map<string, {x: number, y: number, w: number, h: number}> {
        const cx = canvasEl.getContext('2d');
        const width = canvasEl.width;
        const height = canvasEl.height;

        cx.clearRect(0, 0, width, height);

        // Simple layout: Grid
        const cols = Math.floor(width / (BOX_WIDTH + PADDING * 2));

        const positions: Map<string, {x: number, y: number, w: number, h: number}> = new Map();

        dataList.forEach((data, index) => {
            let x: number, y: number;

            if (data.x !== undefined && data.y !== undefined) {
                x = data.x;
                y = data.y;
            } else {
                const row = Math.floor(index / cols);
                const col = index % cols;

                x = PADDING + col * (BOX_WIDTH + PADDING * 2);
                y = PADDING + row * (250 + PADDING * 2); // Approximation
            }

            const itemCount = data.items ? data.items.length : 0;
            const h = BOX_HEADER_HEIGHT + itemCount * ITEM_HEIGHT + 10;

            positions.set(data.id, {x, y, w: BOX_WIDTH, h});

            this.drawEntity(cx, x, y, BOX_WIDTH, h, data);
        });

        // Draw relationships
        dataList.forEach(data => {
            if (data.items) {
                const startPos = positions.get(data.id);
                if (!startPos) return;

                data.items.forEach((item, itemIdx) => {
                    if (item.type === DataType.Reference && item.dataId) {
                        const endPos = positions.get(item.dataId);
                        if (endPos) {
                            // Draw line from attribute to target entity
                            const startX = startPos.x + BOX_WIDTH;
                            const startY = startPos.y + BOX_HEADER_HEIGHT + itemIdx * ITEM_HEIGHT + ITEM_HEIGHT/2;

                            const endX = endPos.x;
                            const endY = endPos.y + BOX_HEADER_HEIGHT / 2;

                            this.canvasService.drawArrow(cx, startX, startY, endX, endY, '');
                        }
                    } else if (item.type === DataType.SubObject && item.dataId) {
                         const endPos = positions.get(item.dataId);
                         if (endPos) {
                            const startX = startPos.x + BOX_WIDTH;
                            const startY = startPos.y + BOX_HEADER_HEIGHT + itemIdx * ITEM_HEIGHT + ITEM_HEIGHT/2;

                            const endX = endPos.x;
                            const endY = endPos.y + BOX_HEADER_HEIGHT / 2;

                            this.drawComposition(cx, startX, startY, endX, endY);
                         }
                    }
                });
            }
        });

        return positions;
    }

    private drawComposition(cx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
        cx.save();
        cx.strokeStyle = '#555';
        cx.fillStyle = '#555';
        cx.lineWidth = 1;

        const midX = x1 + (x2 - x1) / 2;
        const dSize = 6;

        // Diamond at start (x1, y1) representing composition
        cx.beginPath();
        cx.moveTo(x1, y1);
        cx.lineTo(x1 + dSize, y1 - dSize);
        cx.lineTo(x1 + 2*dSize, y1);
        cx.lineTo(x1 + dSize, y1 + dSize);
        cx.closePath();
        cx.fill();

        // Line
        cx.beginPath();
        cx.moveTo(x1 + 2*dSize, y1);
        cx.lineTo(midX, y1);
        cx.lineTo(midX, y2);
        cx.lineTo(x2, y2);
        cx.stroke();

        cx.restore();
    }

    private drawEntity(cx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, data: Data) {
        cx.save();

        // Box
        cx.fillStyle = '#ffffff';
        cx.strokeStyle = '#333';
        cx.lineWidth = 1;
        cx.shadowColor = 'rgba(0,0,0,0.1)';
        cx.shadowBlur = 5;
        cx.fillRect(x, y, w, h);
        cx.strokeRect(x, y, w, h);
        cx.shadowColor = 'transparent';

        // Header
        cx.fillStyle = data.isSubObject ? '#e2e6ea' : '#f8f9fa';
        cx.fillRect(x, y, w, BOX_HEADER_HEIGHT);
        cx.strokeStyle = '#dee2e6';
        cx.strokeRect(x, y, w, BOX_HEADER_HEIGHT);

        // Title
        cx.fillStyle = '#333';
        cx.font = 'bold 14px sans-serif';
        cx.textAlign = 'center';
        cx.textBaseline = 'middle';
        cx.fillText(data.name, x + w/2, y + BOX_HEADER_HEIGHT/2);

        // Attributes
        if (data.items) {
            cx.textAlign = 'left';
            cx.font = '12px sans-serif';
            data.items.forEach((item, idx) => {
                const itemY = y + BOX_HEADER_HEIGHT + idx * ITEM_HEIGHT + ITEM_HEIGHT/2;

                cx.fillStyle = '#333';
                cx.fillText(item.name, x + 10, itemY);

                cx.textAlign = 'right';
                cx.fillStyle = '#666';
                let typeText = 'REF';
                if (item.type === DataType.Primitive) typeText = item.primitiveType;
                else if (item.type === DataType.SubObject) typeText = 'SUB';
                cx.fillText(typeText, x + w - 10, itemY);
                cx.textAlign = 'left';
            });
        }

        cx.restore();
    }
}
