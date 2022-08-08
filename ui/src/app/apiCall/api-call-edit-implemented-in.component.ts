import {Component, OnInit} from '@angular/core';
import {FormBuilder} from '@angular/forms';
import {ActivatedRoute} from '@angular/router';
import {first} from 'rxjs/operators';
import {ApiCall} from '../models/api-call';
import {ApiCallService} from '../services/api-call.service';
import {SystemService} from '../services/system.service';
import {CapabilityService} from '../services/capability.service';
import {Capability} from '../models/capability';
import {System} from '../models/system';

@Component({templateUrl: './api-call-edit-implemented-in.component.html'})
export class ApiCallEditImplementedInComponent implements OnInit {

  apiCallId: string;
  apiCall: ApiCall;
  capability: Capability;
  implementedIn: System[];

  constructor(private apiCallService: ApiCallService, private capabilityService: CapabilityService,
              private systemService: SystemService, private formBuilder: FormBuilder, private route: ActivatedRoute) {
  }

  ngOnInit() {
    this.apiCallId = this.route.parent.snapshot.paramMap.get('id');
    this.apiCallService.byId(this.apiCallId).pipe(first()).subscribe(apiCall => {
      this.apiCall = apiCall;
      this.capabilityService.byId(this.apiCall.capabilityId).pipe(first()).subscribe(capability => {
        this.capability = capability;
        const systemIds = this.capability.implementedBy;

        this.implementedIn = [];
        const chunkSize = 10;
        for (let i = 0; i < systemIds.length; i += chunkSize) {
          const idChunk = systemIds.slice(i, i + chunkSize);
          this.systemService.byIds(idChunk).pipe(first()).subscribe(result => {
            for(let item of result) {
              this.implementedIn.push(item);
            }
          });
        }
      });
    });
  }
}
