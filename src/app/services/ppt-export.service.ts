import { Injectable } from '@angular/core';
import pptxgen from "pptxgenjs";
import { Journey } from '../models/journey.model';
import { Process, Role, Status } from '../models/process';
import { ApiCall, ApiImplementationStatus } from '../models/api-call';
import { Capability } from '../models/capability';
import { Application } from '../models/application';

@Injectable({
  providedIn: 'root'
})
export class PptExportService {

  constructor() { }

  private splitImage(dataUrl: string | undefined, maxW: number, maxH: number, overlap: number = 0, boxes?: { x: number, y: number, w: number, h: number }[]): Promise<{ data: string, w: number, h: number }[]> {
    if (!dataUrl) return Promise.resolve([]);
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const results: { data: string, w: number, h: number }[] = [];
        const originalW = img.width;
        const originalH = img.height;

        if (originalW <= maxW && originalH <= maxH) {
          resolve([{ data: dataUrl, w: originalW, h: originalH }]);
          return;
        }

        const findBestSplit = (start: number, end: number, axis: 'x' | 'y'): number => {
          let bestPos = (start + end) / 2;
          let minCuts = Infinity;
          for (let p = start; p <= end; p += 5) {
            let cuts = 0;
            if (boxes) {
              for (const box of boxes) {
                if (axis === 'x') {
                  if (p > box.x && p < box.x + box.w) cuts++;
                } else {
                  if (p > box.y && p < box.y + box.h) cuts++;
                }
              }
            }
            if (cuts < minCuts) {
              minCuts = cuts;
              bestPos = p;
              if (cuts === 0) break;
            }
          }
          return bestPos;
        };

        const getPoints = (totalSize: number, maxSize: number, axis: 'x' | 'y'): number[] => {
          if (totalSize <= maxSize) return [0];
          const count = 1 + Math.ceil((totalSize - maxSize) / (maxSize - overlap));
          const points: number[] = [0];
          const idealStep = totalSize / count;

          for (let i = 1; i < count; i++) {
            const target = i * idealStep;
            // Search around target for a gap
            const searchRange = Math.min(overlap, idealStep / 2);
            points.push(findBestSplit(target - searchRange / 2, target + searchRange / 2, axis));
          }
          return points;
        };

        const xPoints = getPoints(originalW, maxW, 'x');
        const yPoints = getPoints(originalH, maxH, 'y');

        for (let r = 0; r < yPoints.length; r++) {
          for (let c = 0; c < xPoints.length; c++) {
            const sx = xPoints[c];
            const sy = yPoints[r];
            const nextX = (c + 1 < xPoints.length) ? xPoints[c + 1] : originalW;
            const nextY = (r + 1 < yPoints.length) ? yPoints[r + 1] : originalH;

            // We want each chunk to show some overlap if it's not a perfect gap
            // But if we use smart points, we can just take from point to point,
            // OR we can still use maxW to allow some overlap.
            // Let's use maxW but center the chunk around the split point if possible.

            let sw = Math.min(maxW, originalW - sx);
            let sh = Math.min(maxH, originalH - sy);

            const canvas = document.createElement('canvas');
            canvas.width = sw;
            canvas.height = sh;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.fillStyle = 'white';
              ctx.fillRect(0, 0, sw, sh);
              ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
              results.push({
                data: canvas.toDataURL("image/png"),
                w: sw,
                h: sh
              });
            }
          }
        }
        resolve(results);
      };
      img.onerror = () => resolve(dataUrl ? [{ data: dataUrl, w: 1000, h: 1000 }] : []);
      img.src = dataUrl;
    });
  }

  async generatePpt(data: {
    journeys: {entity: Journey, image?: string, boxes?: {x: number, y: number, w: number, h: number}[]}[],
    processes: {entity: Process, image?: string, boxes?: {x: number, y: number, w: number, h: number}[]}[],
    apis: ApiCall[],
    capabilities: Capability[],
    systems: Application[]
  }) {
    const ppt = new pptxgen();
    ppt.layout = 'LAYOUT_WIDE';
    const PIXELS_PER_INCH = 96;
    const DEFAULT_SCALE = 0.75;
    const MIN_SCALE = 0.40;
    const SPLIT_OVERLAP = 200; // Pixels to overlap when splitting to "repeat" cut boxes

    // Title Slide
    let titleSlide = ppt.addSlide();
    titleSlide.background = { color: 'F1F1F1' };
    titleSlide.addText("Enterprise Architecture Report", {
      x: 0, y: '35%', w: '100%', h: 1,
      fontSize: 44, bold: true, color: '363636', align: 'center'
    });
    titleSlide.addText(`Generated on ${new Date().toLocaleDateString()}`, {
      x: 0, y: '50%', w: '100%', h: 0.5,
      fontSize: 18, color: '666666', align: 'center'
    });

    // Journeys Chapter
    if (data.journeys.length > 0) {
      let chapterSlide = ppt.addSlide();
      chapterSlide.background = { color: '343A40' };
      chapterSlide.addText("Journeys", {
        x: 0, y: '40%', w: '100%', h: 1.5,
        fontSize: 60, bold: true, color: 'FFFFFF', align: 'center'
      });

      for (const j of data.journeys) {
        const targetW = 12.3;
        const targetH = 5.5;
        const thresholdW = (targetW * PIXELS_PER_INCH) / MIN_SCALE;
        const thresholdH = (targetH * PIXELS_PER_INCH) / MIN_SCALE;

        const images = await this.splitImage(j.image, thresholdW, thresholdH, SPLIT_OVERLAP, j.boxes);
        if (images.length === 0) {
          let slide = ppt.addSlide();
          slide.addText(j.entity.name, { x: 0.5, y: 0.2, w: 9, h: 0.5, fontSize: 24, bold: true, color: '007BFF' });
          slide.addText(j.entity.description || "No description provided.", { x: 0.5, y: 0.8, w: 12, h: 0.6, fontSize: 12, color: '333333' });
          continue;
        }

        images.forEach((img, index) => {
          let slide = ppt.addSlide();
          const pageInfo = images.length > 1 ? ` (Part ${index + 1}/${images.length})` : '';
          slide.addText(j.entity.name + pageInfo, { x: 0.5, y: 0.2, w: 9, h: 0.5, fontSize: 24, bold: true, color: '007BFF' });
          if (index === 0) {
            slide.addText(j.entity.description || "No description provided.", { x: 0.5, y: 0.8, w: 12, h: 0.6, fontSize: 12, color: '333333' });
          }

          // Manually calculate containment to preserve ratio and avoid stretching
          const maxW = targetW;
          const maxH = targetH;
          const ratio = img.w / img.h;
          const areaRatio = maxW / maxH;
          let finalW, finalH;
          if (ratio > areaRatio) {
            finalW = maxW;
            finalH = maxW / ratio;
          } else {
            finalH = maxH;
            finalW = maxH * ratio;
          }

          // Apply default scale cap (75%)
          const defaultAllowedW = (img.w / PIXELS_PER_INCH) * DEFAULT_SCALE;
          const defaultAllowedH = (img.h / PIXELS_PER_INCH) * DEFAULT_SCALE;
          if (finalW > defaultAllowedW) {
            finalW = defaultAllowedW;
            finalH = finalW / ratio;
          }
          if (finalH > defaultAllowedH) {
            finalH = defaultAllowedH;
            finalW = finalH * ratio;
          }

          slide.addImage({
            data: img.data,
            x: 0.5 + (maxW - finalW) / 2,
            y: 1.5 + (maxH - finalH) / 2,
            w: finalW,
            h: finalH
          });
        });
      }
    }

    // Processes Chapter
    if (data.processes.length > 0) {
      let chapterSlide = ppt.addSlide();
      chapterSlide.background = { color: '343A40' };
      chapterSlide.addText("Processes", {
        x: 0, y: '40%', w: '100%', h: 1.5,
        fontSize: 60, bold: true, color: 'FFFFFF', align: 'center'
      });

      for (const p of data.processes) {
        const targetW = 9.0;
        const targetH = 6.2;
        const thresholdW = (targetW * PIXELS_PER_INCH) / MIN_SCALE;
        const thresholdH = (targetH * PIXELS_PER_INCH) / MIN_SCALE;

        const images = await this.splitImage(p.image, thresholdW, thresholdH, SPLIT_OVERLAP, p.boxes);
        if (images.length === 0) {
          let slide = ppt.addSlide();
          slide.addText(p.entity.name, { x: 0.5, y: 0.2, w: 9, h: 0.5, fontSize: 24, bold: true, color: '28A745' });

          slide.addShape(ppt.ShapeType.rect, { x: 0.5, y: 0.8, w: 12.3, h: 6.2, fill: { color: 'F8F9FA' } });
          const fullText = [
            { text: "Role: ", options: { bold: true } }, { text: typeof p.entity.role === 'number' ? Role[p.entity.role] : (p.entity.role || 'N/A') },
            { text: "\nStatus: ", options: { bold: true } }, { text: p.entity.status !== undefined ? Status[p.entity.status] : 'N/A' },
            { text: "\n\nDescription:\n", options: { bold: true } }, { text: p.entity.description || "No description provided." },
            { text: "\n\nInput:\n", options: { bold: true } }, { text: p.entity.input || 'N/A' },
            { text: "\n\nOutput:\n", options: { bold: true } }, { text: p.entity.output || 'N/A' }
          ];
          slide.addText(fullText, { x: 0.6, y: 0.9, w: 12, h: 6, fontSize: 11, valign: 'top' });
          continue;
        }

        images.forEach((img, index) => {
          let slide = ppt.addSlide();
          const pageInfo = images.length > 1 ? ` (Part ${index + 1}/${images.length})` : '';
          slide.addText(p.entity.name + pageInfo, { x: 0.5, y: 0.2, w: 9, h: 0.5, fontSize: 24, bold: true, color: '28A745' });

          // Sidebar for process information and description
          slide.addShape(ppt.ShapeType.rect, { x: 0.5, y: 0.8, w: 3.1, h: 6.2, fill: { color: 'F8F9FA' } });
          const sidebarText = [
            { text: "Role: ", options: { bold: true } }, { text: typeof p.entity.role === 'number' ? Role[p.entity.role] : (p.entity.role || 'N/A') },
            { text: "\nStatus: ", options: { bold: true } }, { text: p.entity.status !== undefined ? Status[p.entity.status] : 'N/A' },
            { text: "\n\nDescription:\n", options: { bold: true } }, { text: p.entity.description || "No description provided." },
            { text: "\n\nInput:\n", options: { bold: true } }, { text: p.entity.input || 'N/A' },
            { text: "\n\nOutput:\n", options: { bold: true } }, { text: p.entity.output || 'N/A' }
          ];
          slide.addText(sidebarText, { x: 0.6, y: 0.9, w: 2.9, h: 6, fontSize: 10, valign: 'top' });

          const maxW = targetW;
          const maxH = targetH;
          const startY = 0.8;
          const startX = 3.8;

          const ratio = img.w / img.h;
          const areaRatio = maxW / maxH;
          let finalW, finalH;
          if (ratio > areaRatio) {
            finalW = maxW;
            finalH = maxW / ratio;
          } else {
            finalH = maxH;
            finalW = maxH * ratio;
          }

          // Apply default scale cap (75%)
          const defaultAllowedW = (img.w / PIXELS_PER_INCH) * DEFAULT_SCALE;
          const defaultAllowedH = (img.h / PIXELS_PER_INCH) * DEFAULT_SCALE;
          if (finalW > defaultAllowedW) {
            finalW = defaultAllowedW;
            finalH = finalW / ratio;
          }
          if (finalH > defaultAllowedH) {
            finalH = defaultAllowedH;
            finalW = finalH * ratio;
          }

          slide.addImage({
            data: img.data,
            x: startX + (maxW - finalW) / 2,
            y: startY + (maxH - finalH) / 2,
            w: finalW,
            h: finalH
          });
        });
      }
    }

    // APIs Chapter
    if (data.apis.length > 0) {
      let chapterSlide = ppt.addSlide();
      chapterSlide.background = { color: '343A40' };
      chapterSlide.addText("APIs", {
        x: 0, y: '40%', w: '100%', h: 1.5,
        fontSize: 60, bold: true, color: 'FFFFFF', align: 'center'
      });

      for (const api of data.apis) {
        let slide = ppt.addSlide();
        slide.addText(api.name, { x: 0.5, y: 0.2, w: 9, h: 0.5, fontSize: 24, bold: true, color: '17A2B8' });

        slide.addText("Description", { x: 0.5, y: 0.8, w: 12, h: 0.3, fontSize: 14, bold: true, color: '666666' });
        slide.addText(api.description || 'No description provided.', { x: 0.5, y: 1.1, w: 12, h: 1, fontSize: 12, valign: 'top' });

        slide.addText("Data Flow", { x: 0.5, y: 2.2, w: 12, h: 0.3, fontSize: 14, bold: true, color: '666666' });
        slide.addShape(ppt.ShapeType.rect, { x: 0.5, y: 2.5, w: 6, h: 1.5, fill: { color: 'E9ECEF' } });
        slide.addText("Input:", { x: 0.6, y: 2.6, w: 5.8, h: 0.3, fontSize: 11, bold: true });
        slide.addText(api.input || 'N/A', { x: 0.6, y: 2.9, w: 5.8, h: 1, fontSize: 10 });

        slide.addShape(ppt.ShapeType.rect, { x: 6.8, y: 2.5, w: 6, h: 1.5, fill: { color: 'E9ECEF' } });
        slide.addText("Output:", { x: 6.9, y: 2.6, w: 5.8, h: 0.3, fontSize: 11, bold: true });
        slide.addText(api.output || 'N/A', { x: 6.9, y: 2.9, w: 5.8, h: 1, fontSize: 10 });

        slide.addText(`Implementation Status: ${ApiImplementationStatus[api.implementationStatus] || 'N/A'}`, { x: 0.5, y: 4.2, w: 12, h: 0.5, fontSize: 12, bold: true });
        if (api.documentation) {
            slide.addText(`Documentation: ${api.documentation}`, { x: 0.5, y: 4.7, w: 12, h: 0.5, fontSize: 12, color: '007BFF' });
        }
      }
    }

    // Capabilities Chapter
    if (data.capabilities.length > 0) {
      let chapterSlide = ppt.addSlide();
      chapterSlide.background = { color: '343A40' };
      chapterSlide.addText("Capabilities", {
        x: 0, y: '40%', w: '100%', h: 1.5,
        fontSize: 60, bold: true, color: 'FFFFFF', align: 'center'
      });

      for (const cap of data.capabilities) {
        let slide = ppt.addSlide();
        slide.addText(cap.name, { x: 0.5, y: 0.2, w: 9, h: 0.5, fontSize: 24, bold: true, color: '6F42C1' });
        slide.addText("Description", { x: 0.5, y: 0.8, w: 12, h: 0.3, fontSize: 14, bold: true, color: '666666' });
        slide.addText(cap.description || "No description provided.", { x: 0.5, y: 1.1, w: 12, h: 2, fontSize: 12, valign: 'top' });
      }
    }

    // Systems Chapter
    if (data.systems.length > 0) {
      let chapterSlide = ppt.addSlide();
      chapterSlide.background = { color: '343A40' };
      chapterSlide.addText("Systems", {
        x: 0, y: '40%', w: '100%', h: 1.5,
        fontSize: 60, bold: true, color: 'FFFFFF', align: 'center'
      });

      for (const sys of data.systems) {
        let slide = ppt.addSlide();
        slide.addText(sys.name, { x: 0.5, y: 0.2, w: 9, h: 0.5, fontSize: 24, bold: true, color: 'FD7E14' });

        slide.addText("Description", { x: 0.5, y: 0.8, w: 12, h: 0.3, fontSize: 14, bold: true, color: '666666' });
        slide.addText(sys.description || 'No description provided.', { x: 0.5, y: 1.1, w: 12, h: 1.5, fontSize: 12, valign: 'top' });

        slide.addText("Contact Information", { x: 0.5, y: 2.8, w: 12, h: 0.3, fontSize: 14, bold: true, color: '666666' });
        slide.addText(`Contact: ${sys.contact || 'N/A'}`, { x: 0.5, y: 3.1, w: 12, h: 0.4, fontSize: 12 });
        if (sys.url) {
            slide.addText(`URL: ${sys.url}`, { x: 0.5, y: 3.5, w: 12, h: 0.4, fontSize: 12, color: '007BFF' });
        }
      }
    }

    await ppt.writeFile({ fileName: `Landscapr_Export_${new Date().getTime()}.pptx` });
  }
}
