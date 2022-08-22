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
import {Subscription} from 'rxjs';

@Component({selector: 'app-process-journey', styleUrls: ['./process-journey.component.scss'], templateUrl: './process-journey.component.html'})
export class ProcessJourneyComponent implements OnInit {

  processId: string;
  process: Process;
  loading: boolean = false;
  parents: Process[];
  selectedProcess: Process;
  selectedSubprocesses: Process[];
  selectedFunctions: ApiCall[];
  private subscription: Subscription;
  repoId: string;
  zoomFactor = 0.6;

  constructor(private processService: ProcessService, private apiCallService: ApiCallService,
              private formBuilder: FormBuilder, private location: Location,
              private route: ActivatedRoute, private router: Router, private toastr: ToastrService) {
  }



  ngOnInit() {

    this.subscription = this.route.parent.paramMap.subscribe(obs => {
      this.repoId = obs.get('repoId');
      this.refresh();
    });
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  private refresh() {
    this.loading = true;
    this.processId = this.route.snapshot.paramMap.get('id');
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

    this.processService.allParents(this.repoId, this.processId).pipe(first()).subscribe( result => {
      this.parents = result
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
    this.router.navigateByUrl('/process/journey/' + processId).then(() => location.reload());
  }
}
