import {Component, Input, OnChanges, OnInit, SimpleChanges, ViewChild} from '@angular/core';
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

@Component({selector: 'app-process-view', styleUrls: ['./process-view.component.scss'], templateUrl: './process-view.component.html'})
export class ProcessViewComponent implements OnInit, OnChanges {

  @Input() processId: string | null = null;
  process: Process;
  loading: boolean = false;
  parents: Process[];
  selectedProcess: Process;
  selectedSubprocesses: Process[];
  selectedFunctions: ApiCall[];
  zoomFactor = 0.6;


  @ViewChild(SwimlaneViewComponent) child:SwimlaneViewComponent;

  constructor(private processService: ProcessService, private apiCallService: ApiCallService, private formBuilder: FormBuilder, private location: Location,
              private route: ActivatedRoute, private router: Router, private toastr: ToastrService) {
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
}
