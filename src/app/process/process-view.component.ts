import {Component, Input, OnChanges, OnInit, SimpleChanges, ViewChild, OnDestroy} from '@angular/core';
import {ProcessService} from '../services/process.service';
import {Process} from '../models/process';
import {FormBuilder} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {ToastrService} from 'ngx-toastr';
import {Location} from '@angular/common';
import {first} from 'rxjs/operators';
import {ApiCall} from '../models/api-call';
import {ApiCallService} from '../services/api-call.service';
import {SwimlaneViewComponent} from '../swimlaneView/swimlane-view.component';
import { FlowViewService } from './flow-view.service';
import { Application } from '../models/application';
import { ApplicationService } from '../services/application.service';
import { Subscription } from 'rxjs';
import { BsModalService } from 'ngx-bootstrap/modal';
import { DeleteConfirmationDialogComponent } from '../components/delete-confirmation-dialog.component';

@Component({selector: 'app-process-view', styleUrls: ['./process-view.component.scss'], templateUrl: './process-view.component.html'})
export class ProcessViewComponent implements OnInit, OnChanges, OnDestroy {

  @Input() processId: string | null = null;
  process: Process;
  loading: boolean = false;
  parents: Process[];
  selectedProcess: Process;
  selectedSubprocesses: Process[];
  selectedFunctions: ApiCall[];
  zoomFactor = 0.6;

  // Flow View & Sidebar State
  showFlowView = false;
  panelOpen = false;
  panelTitle = '';
  selectedApi: ApiCall | null = null;
  selectedSystem: Application | null = null;
  selectedApiSystemName: string | null = null;
  private selectionSubscription: Subscription;


  @ViewChild(SwimlaneViewComponent) child:SwimlaneViewComponent;

  constructor(
      private processService: ProcessService,
      private apiCallService: ApiCallService,
      private formBuilder: FormBuilder,
      private location: Location,
      private route: ActivatedRoute,
      private router: Router,
      private toastr: ToastrService,
      private flowViewService: FlowViewService,
      private applicationService: ApplicationService,
      private modalService: BsModalService
  ) {
      this.selectionSubscription = this.flowViewService.selection$.subscribe(selection => {
          if (selection.type === 'api') {
              this.showApiDetails(selection.data as ApiCall);
          } else if (selection.type === 'system') {
              this.showSystemDetails(selection.data as Application);
          }
      });
  }

  ngOnDestroy(): void {
      if (this.selectionSubscription) {
          this.selectionSubscription.unsubscribe();
      }
  }


  zoomIn() {
    this.zoomFactor += 0.1;
  }
  zoomOut() {
    this.zoomFactor -= 0.1;
  }

  ngOnInit() {
      // Prefer input `processId` if provided; otherwise fallback to route param
      if (!this.processId) {
        this.processId = this.route.snapshot.paramMap.get('id');
      }
      if (this.processId) {
        this.refresh();
      }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['processId'] && this.processId) {
      this.refresh();
    }
  }

  private refresh() {
    if (!this.processId) {
      return;
    }
    this.loading = true;
    this.processService.byId(this.processId).pipe(first()).subscribe(
      process => {
        this.process = process;
        this.loadProcessDetails(process);
        this.loading = false;
      },
      () => {
        this.loading = false
        this.toastr.error("Error loading process.")
      });

    this.processService.allParents(this.processId).pipe(first()).subscribe( result => {
      this.parents = result
    });
  }

  processNodeClicked(processId: string) {
    this.processService.byId(processId).pipe(first()).subscribe( result => {
      this.loadProcessDetails(result);
    });

  }

  private loadProcessDetails(process: Process) {
    this.selectedProcess = process;
    const chunkSize = 10;
    const ids = [];
    this.selectedSubprocesses = [];
    if (process.steps) {
      for (let item of process.steps) {
        ids.push(item.processReference);
      }

      for (let i = 0; i < ids.length; i += chunkSize) {
        const idChunk = ids.slice(i, i + chunkSize);
        this.processService.byIds(idChunk).pipe(first()).subscribe(results => {
          for (let item of results) {
            this.selectedSubprocesses.push(item);
          }
        });
      }
    }

    this.selectedFunctions = [];
    if (process.apiCallIds) {
      for (let i = 0; i < process.apiCallIds.length; i += chunkSize) {
        const idChunk = process.apiCallIds.slice(i, i + chunkSize);
        this.apiCallService.byIds(idChunk).pipe(first()).subscribe(results => {
          for (let item of results) {
            this.selectedFunctions.push(item);
          }
        });
      }
    }
  }

  showProcess(processId: string) {
    this.router.navigateByUrl('/process/view/' + processId).then(() => location.reload());
  }

  downloadPpt() {
    this.child.downloadPpt();

  }

  downloadPdf() {

    this.child.downloadPdf();
  }

  toggleFlowView() {
    this.showFlowView = !this.showFlowView;
  }

  closePanel() {
      this.panelOpen = false;
      this.selectedApi = null;
      this.selectedSystem = null;
  }

  showApiDetails(api: ApiCall) {
      this.selectedApi = api;
      this.selectedSystem = null;
      this.panelTitle = 'API Call: ' + api.name;
      this.panelOpen = true;
      this.selectedApiSystemName = null;

      if (api.implementedBy && api.implementedBy.length > 0) {
          // Fetch system name for display
          this.applicationService.byId(api.implementedBy[0]).pipe(first()).subscribe(app => {
              if (app) {
                  this.selectedApiSystemName = app.name;
              }
          });
      }
  }

  showSystemDetails(system: Application) {
      this.selectedSystem = system;
      this.selectedApi = null;
      this.panelTitle = 'System: ' + system.name;
      this.panelOpen = true;
  }

  onSystemClick(systemId: string) {
      if (systemId) {
          this.applicationService.byId(systemId).pipe(first()).subscribe(app => {
              if (app) {
                  this.showSystemDetails(app);
              } else {
                  this.toastr.warning('System details not found.');
              }
          });
      }
  }

  delete() {
    const modalRef = this.modalService.show(DeleteConfirmationDialogComponent, { class: 'modal-md' });
    modalRef.content.itemName = this.process.name;
    modalRef.content.onClose.subscribe(result => {
      if (result) {
        this.processService.delete(this.process.id).subscribe(() => {
          this.toastr.success('Process deleted');
          this.router.navigate(['/process/list']);
        }, error => {
          this.toastr.error('Error deleting process');
        });
      }
    });
  }
}
