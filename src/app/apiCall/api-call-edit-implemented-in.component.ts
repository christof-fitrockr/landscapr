import {Component, OnDestroy, OnInit} from '@angular/core';
import {FormBuilder} from '@angular/forms';
import {ActivatedRoute} from '@angular/router';
import {first} from 'rxjs/operators';
import {ApiCall} from '../models/api-call';
import {ApiCallService} from '../services/api-call.service';
import {ApplicationService} from '../services/application.service';
import {Application} from '../models/application';
import {Subscription} from 'rxjs';

@Component({templateUrl: './api-call-edit-implemented-in.component.html'})
export class ApiCallEditImplementedInComponent implements OnInit, OnDestroy {

  apiCallId: string;
  apiCall: ApiCall;
  implementedIn: Application[];
  private subscription: Subscription;
  repoId: string;

  constructor(private apiCallService: ApiCallService,
              private systemService: ApplicationService, private formBuilder: FormBuilder, private route: ActivatedRoute) {
  }

  ngOnInit() {
    this.apiCallId = this.route.parent.snapshot.paramMap.get('id');
    this.refresh();

    this.subscription = this.route.parent.paramMap.subscribe(obs => {
      this.repoId = obs.get('repoId');
    });
  }

  private refresh() {
    this.apiCallService.byId(this.apiCallId).pipe(first()).subscribe(apiCall => {
      this.apiCall = apiCall;
      const uniqueSystemIds = [...new Set(this.apiCall.implementedBy || [])];

      this.implementedIn = [];
      const chunkSize = 10;
      for (let i = 0; i < uniqueSystemIds.length; i += chunkSize) {
        const idChunk = uniqueSystemIds.slice(i, i + chunkSize);
        this.systemService.byIds(idChunk).pipe(first()).subscribe(result => {
          for (let item of result) {
            this.implementedIn.push(item);
          }
        });
      }
    });
  }

  delete(systemId: string) {
    if (this.apiCall && this.apiCall.implementedBy) {
      const index = this.apiCall.implementedBy.indexOf(systemId);
      if (index > -1) {
        this.apiCall.implementedBy.splice(index, 1);
        this.apiCallService.update(this.apiCallId, this.apiCall).pipe(first()).subscribe(() => {
          this.refresh();
        });
      }
    }
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
