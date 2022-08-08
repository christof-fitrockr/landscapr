import {Component, OnInit} from '@angular/core';
import {ProcessService} from '../services/process.service';
import {Process, ProcessWithStep} from '../models/process';
import {FormBuilder} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {ToastrService} from 'ngx-toastr';
import {Location} from '@angular/common';
import {first} from 'rxjs/operators';
import {ApiCall} from '../models/api-call';
import {ApiCallService} from '../services/api-call.service';

@Component({selector: 'app-process-view', styleUrls: ['./process-view.component.scss'], templateUrl: './process-view.component.html'})
export class ProcessViewComponent implements OnInit {

  processId: string;
  process: Process;
  loading: boolean = false;
  parents: Process[];
  selectedProcess: Process;
  selectedSubprocesses: Process[];
  selectedFunctions: ApiCall[];

  constructor(private processService: ProcessService, private apiCallService: ApiCallService, private formBuilder: FormBuilder, private location: Location,
              private route: ActivatedRoute, private router: Router, private toastr: ToastrService) {
  }

  ngOnInit() {
    this.refresh();
  }

  private refresh() {
    this.loading = true;
    this.processId = this.route.snapshot.paramMap.get('id');
    this.processService.getProcessById(this.processId).pipe(first()).subscribe(
      process => {
        this.process = process;
        this.loadProcessDetails(process);
        this.loading = false;
      },
      () => {
        this.loading = false
        this.toastr.error("Error loading process.")
      });

    this.processService.getParentProcesses(this.processId).pipe(first()).subscribe( result => {
      this.parents = result
    });
  }

  processNodeClicked(processId: string) {
    this.processService.getProcessById(processId).pipe(first()).subscribe( result => {
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
        this.processService.getProcessByIds(idChunk).pipe(first()).subscribe(results => {
          for (let item of results) {
            this.selectedSubprocesses.push(item);
          }
        });
      }
    }

    this.selectedFunctions = [];
    if (process.apiCallsIds) {
      for (let i = 0; i < process.apiCallsIds.length; i += chunkSize) {
        const idChunk = process.apiCallsIds.slice(i, i + chunkSize);
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
}
