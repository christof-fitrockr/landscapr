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
import {Application} from '../models/application';

@Component({selector: 'app-process-journey', styleUrls: ['./process-journey.component.scss'], templateUrl: './process-journey.component.html'})
export class ProcessJourneyComponent implements OnInit {


  private processMap = new Map<string, Process>();
  private apiCallMap = new Map<string, ApiCall>();
  private systemMap = new Map<string, Application>();
  processOrder: Process[] = [];

  mainProcessId: string;
  processId: string;
  process: Process;
  loading: boolean = false;
  parents: Process[];
  selectedProcess: Process;
  selectedSubprocesses: Process[];
  selectedFunctions: ApiCall[];


  nextSteps: ProcessWithNumber[];
  private step: number;

  constructor(private processService: ProcessService, private apiCallService: ApiCallService,
              private formBuilder: FormBuilder, private location: Location,
              private route: ActivatedRoute, private router: Router, private toastr: ToastrService) {
  }


  ngOnInit() {
    this.refresh();
  }

  private refresh() {
    this.loading = true;
    this.mainProcessId = this.route.snapshot.paramMap.get('id');


    this.processService.all().pipe(first()).subscribe((processes) => {
      this.apiCallService.all().pipe(first()).subscribe(apiCalls => {
          // this.systemService.all(this.repoId).pipe(first()).subscribe(systems => {
            for (let process of processes) {
              this.processMap.set(process.id, process);
            }
            for (let apiCall of apiCalls) {
              this.apiCallMap.set(apiCall.id, apiCall);
            }
            this.createProcessOrder(this.mainProcessId);

            if(this.route.snapshot.paramMap.has('step')) {
              this.step = Number(this.route.snapshot.paramMap.get('step'));
              this.processId = this.processOrder[this.step]?.id;
              if(this.processOrder.length > this.step + 1) {
                this.nextSteps = [new ProcessWithNumber(this.processOrder[this.step + 1], this.step + 1)];
              }
            } else {
              this.processId = this.mainProcessId;
              this.nextSteps = [new ProcessWithNumber(this.processOrder[0], 0)];
            }

        this.processService.byId(this.processId).pipe(first()).subscribe(process => {
          this.process = process;
          this.selectedProcess = process;
          console.log(JSON.stringify(this.process))
          this.loading = false;
        });
       })



    },
    () => {
      this.loading = false
      this.toastr.error("Error loading process.")
    });

    this.processService.allParents(this.processId).pipe(first()).subscribe( result => {
      this.parents = result
    });
  }


  private createProcessOrder(id: string, layer = 0): Process {
    const process = this.processMap.get(id)

    if(!process) {
      console.error('Process with id ' + id + ' not found.');
      let processBox = new Process();
      processBox.id = id;
      processBox.name = '!! MISSING !!';
      return processBox;
    }


    if(process.steps && process.steps.length > 0) {
      const childBoxes = new Map<string, Process>();
      for (let step of process.steps) {
        if(step.processReference) {
          console.debug('Childs of id ' + id + ' with name ' + process.name + ' not found.');
          const childBox = this.createProcessOrder(step.processReference, layer + 1);
          childBoxes.set(step.processReference, childBox);
        }
      }
    }


    this.processOrder.push(process);

    return process;

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


  show(number: number) {
    this.router.navigateByUrl('/process/journey/' + this.mainProcessId + '/' + number).then(() => location.reload());
    this.step = number;
    this.refresh();
  }
}


class ProcessWithNumber {
  constructor(private process: Process, private number: number) {
  }
}
