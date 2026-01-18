import {Injectable} from '@angular/core';
import {FunctionCall, Process, ProcessModel, ProcessStep} from '../models/process';
import {CanvasService} from './canvas.service';
import {RoleService} from './role.service';

const SWIMLANE_HEIGHT = 150;
const BOX_HEIGHT = 50;
const FUNCTION_PADDING = 10;


@Injectable({
  providedIn: 'root',
})
export class ProcessDrawingService {

    constructor(private canvasService: CanvasService, private roleService: RoleService) {}

    private zoomFactor = 1.0;

    private static getHeight(process: ProcessModel) {
        if(process && process.swimlanes && Object.values(process.swimlanes)) {
            return Object.values(process.swimlanes).length * SWIMLANE_HEIGHT + 20;
        } else {
            return 0;
        }
    }

    private getWidth(cx: CanvasRenderingContext2D, process: ProcessModel) {
        let totalWidth = 50;
        process.processSteps.forEach((step, idx) => {

            const processX = totalWidth;
            let xOffset = 10;

            if (step.calls) {
                Object.values(step.calls).forEach((call, callIdx) => {
                    const widthFunction = this.canvasService.calcFunctionWidth(
                        cx,
                        processX + xOffset,
                        call.fct,
                        call.sys);

                    xOffset = xOffset + widthFunction + FUNCTION_PADDING;
                });
            }

            totalWidth = totalWidth + Math.max(xOffset, 200) + FUNCTION_PADDING;
        });
        return totalWidth + 50;
    }

    public drawProcess(canvasEl: HTMLCanvasElement, process: ProcessModel) {
        const cx = canvasEl.getContext('2d');

        canvasEl.height = ProcessDrawingService.getHeight(process);
        canvasEl.width = 7000; //this.getWidth(cx, process);

        cx.scale(this.zoomFactor, this.zoomFactor);

        Object.values(process.swimlanes).forEach((lane, idx) => {
            this.canvasService.drawSwimlane(cx, 20, 20 + idx * 150, canvasEl.width, 140, lane.name);
        });

        let totalWidth = 50;
        process.processSteps.forEach((step, idx) => {
            const processX = totalWidth;
            let xOffset = 10;

            let stepColor = '#ffffff';
            const drawingDetails = this.drawCalls(cx, process, 'aswp', step.calls, processX, xOffset, stepColor, 0);
            xOffset = xOffset + drawingDetails.totalWidth;
            stepColor = drawingDetails.stepColor;

            totalWidth = totalWidth + Math.max(xOffset, 200) + 2* FUNCTION_PADDING;
            this.drawProcessStep(cx, process, 'aswp', processX, Math.max(drawingDetails.totalWidth + 2* FUNCTION_PADDING, 200), step, step.color, false);
        });
    }


    private  drawCalls(cx: CanvasRenderingContext2D, process: ProcessModel, srcLaneId: string, calls: FunctionCall[], processX: number, xOffset: number, stepColor: string, recursionLevel: number) {
        let totalWidth = 0;
        if (calls) {
            Object.values(calls).forEach((call, callIdx) => {
                const drawingDetails = this.drawCalls(cx, process, call.laneId, call.calls, processX, xOffset, stepColor, recursionLevel + 1);

                const widthFunction = this.canvasService.drawFunction(
                    cx,
                    processX + xOffset + FUNCTION_PADDING * 1.5 * (recursionLevel + 1),
                    this.getLaneMidX(process, call.laneId) - BOX_HEIGHT / 2,
                    call.fct,
                    call.sys,
                    call.color, drawingDetails.totalWidth + FUNCTION_PADDING * 2);
                totalWidth += widthFunction + FUNCTION_PADDING;

                // FIXME..
                stepColor = call.color;

                if (call.in) {
                    const srcLane = this.getLaneMidX(process, srcLaneId);
                    const targetLane = this.getLaneMidX(process, call.laneId);

                    this.canvasService.drawVerticalArrow(
                        cx,
                        processX + xOffset + FUNCTION_PADDING*2.5 * (recursionLevel + 1),
                        srcLane + (srcLane < targetLane ? 1 : -1) * BOX_HEIGHT / 2,
                        targetLane - (srcLane < targetLane ? 1 : -1) * BOX_HEIGHT / 2,
                        call.in);
                }

                if (call.out) {
                    const srcLane = this.getLaneMidX(process, srcLaneId);
                    const targetLane = this.getLaneMidX(process, call.laneId);
                    this.canvasService.drawVerticalArrow(cx,
                        processX + xOffset + widthFunction + FUNCTION_PADDING,
                        this.getLaneMidX(process, call.laneId) - (srcLane < targetLane ? 1 : -1) * BOX_HEIGHT / 2,
                        this.getLaneMidX(process, srcLaneId) + (srcLane < targetLane ? 1 : -1) * BOX_HEIGHT / 2,
                        call.out);
                }


                stepColor = drawingDetails.stepColor;
                xOffset = xOffset + widthFunction + FUNCTION_PADDING;
            });
        }
        return {totalWidth, stepColor};
    }

    private drawProcessStep(cx: CanvasRenderingContext2D, process: ProcessModel, laneId: string, x: number, w: number, step: ProcessStep, color: string = '#ffffff', isDraft: boolean = false) {
        const fillColor = color === '#ffffff' ? this.roleService.getRoleColor(laneId) : color;
        this.canvasService.drawProcessStep(cx, x, this.getLaneMidX(process, laneId) - BOX_HEIGHT / 2, w, BOX_HEIGHT, step.name, fillColor, '', isDraft);
    }

    private getLaneMidX(process: ProcessModel, laneId: string): number {
        const idx = Object.values(process.swimlanes).findIndex(x => x.id === laneId);
        if (idx >= 0) {
            return idx * SWIMLANE_HEIGHT + 10 + SWIMLANE_HEIGHT / 2;
        }
        throw new Error('Lane Id ' + laneId + ' not found.');
    }

    zoom(number: number) {
        this.zoomFactor += number;
    }
}
