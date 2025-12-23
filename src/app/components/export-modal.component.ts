import { Component, OnInit, ViewChild } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { JourneyService } from '../services/journey.service';
import { ProcessService } from '../services/process.service';
import { ApiCallService } from '../services/api-call.service';
import { CapabilityService } from '../services/capability.service';
import { ApplicationService } from '../services/application.service';
import { PptExportService } from '../services/ppt-export.service';
import { Journey } from '../models/journey.model';
import { Process } from '../models/process';
import { ApiCall } from '../models/api-call';
import { Capability } from '../models/capability';
import { Application } from '../models/application';
import { forkJoin } from 'rxjs';
import { SwimlaneViewComponent } from '../swimlaneView/swimlane-view.component';

@Component({
  selector: 'app-export-modal',
  templateUrl: './export-modal.component.html',
  styleUrls: ['./export-modal.component.scss']
})
export class ExportModalComponent implements OnInit {
  @ViewChild('renderer') renderer: SwimlaneViewComponent;

  // Input from caller
  currentJourney: {entity: Journey, image?: string, boxes?: any[]};
  currentProcess: {entity: Process, image?: string, boxes?: any[]};

  renderingProcessId: string | null = null;
  private renderResolve: ((data: {image: string, boxes: any[]}) => void) | null = null;

  journeys: {selected: boolean, entity: Journey}[] = [];
  processes: {selected: boolean, entity: Process}[] = [];
  apis: {selected: boolean, entity: ApiCall}[] = [];
  capabilities: {selected: boolean, entity: Capability}[] = [];
  systems: {selected: boolean, entity: Application}[] = [];

  loading = true;
  exporting = false;

  constructor(
    public bsModalRef: BsModalRef,
    private journeyService: JourneyService,
    private processService: ProcessService,
    private apiCallService: ApiCallService,
    private capabilityService: CapabilityService,
    private systemService: ApplicationService,
    private pptExportService: PptExportService
  ) {}

  ngOnInit() {
    forkJoin({
      journeys: this.journeyService.all(),
      processes: this.processService.all(),
      apis: this.apiCallService.all(),
      capabilities: this.capabilityService.all(''),
      systems: this.systemService.all('')
    }).subscribe(data => {
      this.journeys = data.journeys.map(j => ({
        selected: this.currentJourney && j.id === this.currentJourney.entity.id,
        entity: j
      }));
      this.processes = data.processes.map(p => ({
        selected: this.currentProcess && p.id === this.currentProcess.entity.id,
        entity: p
      }));
      this.apis = data.apis.map(a => ({ selected: false, entity: a }));
      this.capabilities = data.capabilities.map(c => ({ selected: false, entity: c }));
      this.systems = data.systems.map(s => ({ selected: false, entity: s }));
      this.loading = false;
    });
  }

  async export() {
    this.exporting = true;

    const selectedJourneys = this.journeys.filter(j => j.selected).map(j => {
        if (this.currentJourney && j.entity.id === this.currentJourney.entity.id) {
            return this.currentJourney;
        }
        return { entity: j.entity };
    });

    const selectedProcessesData: {entity: Process, image?: string, boxes?: any[]}[] = [];
    const selectedProcesses = this.processes.filter(p => p.selected);

    for (const p of selectedProcesses) {
        if (this.currentProcess && p.entity.id === this.currentProcess.entity.id) {
            selectedProcessesData.push(this.currentProcess);
        } else {
            const data = await this.renderProcess(p.entity.id);
            selectedProcessesData.push({ entity: p.entity, image: data.image, boxes: data.boxes });
            this.renderingProcessId = null;
        }
    }

    await this.pptExportService.generatePpt({
      journeys: selectedJourneys,
      processes: selectedProcessesData,
      apis: this.apis.filter(a => a.selected).map(a => a.entity),
      capabilities: this.capabilities.filter(c => c.selected).map(c => c.entity),
      systems: this.systems.filter(s => s.selected).map(s => s.entity)
    });

    this.exporting = false;
    this.bsModalRef.hide();
  }

  private renderProcess(processId: string): Promise<{image: string, boxes: any[]}> {
    return new Promise((resolve) => {
      this.renderingProcessId = processId;
      this.renderResolve = (data) => {
        resolve(data);
      };
    });
  }

  onDrawn() {
    if (this.renderResolve) {
      const resolve = this.renderResolve;
      this.renderResolve = null;
      setTimeout(() => {
        const data = this.renderer.getCanvasImage();
        resolve(data);
      }, 100); // Small delay to ensure canvas is ready
    }
  }

  selectAll(type: string, value: boolean) {
      this[type].forEach(item => item.selected = value);
  }
}
