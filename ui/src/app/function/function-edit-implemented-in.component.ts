import {Component, OnInit} from '@angular/core';
import {FormBuilder} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {ToastrService} from 'ngx-toastr';
import {first} from 'rxjs/operators';
import {ApiCall} from '../models/api-call';
import {ApiCallService} from '../services/api-call.service';
import {Process} from '../models/process';
import {ProcessService} from '../services/process.service';
import {SystemService} from '../services/system.service';
import {CapabilityService} from '../services/capability.service';
import {Capability} from '../models/capability';
import {System} from '../models/system';

@Component({templateUrl: './function-edit-implemented-in.component.html'})
export class FunctionEditImplementedInComponent implements OnInit {

  apiCallId: string;
  apiCall: ApiCall;
  capability: Capability;
  implementedIn: System[];

  constructor(private apiCallService: ApiCallService, private capabilityService: CapabilityService, private systemService: SystemService, private formBuilder: FormBuilder,
              private route: ActivatedRoute, private router: Router, private toastr: ToastrService) {
  }

  ngOnInit() {
    this.apiCallId = this.route.parent.snapshot.paramMap.get('id');
    this.apiCallService.getApiCallById(this.apiCallId).pipe(first()).subscribe(apiCall => {
      this.apiCall = apiCall;
      this.capabilityService.byId(this.apiCall.capabilityId).pipe(first()).subscribe(capability => {
        this.capability = capability;
        const systemIds = this.capability.implementedBy;

        this.implementedIn = [];
        const chunkSize = 10;
        for (let i = 0; i < systemIds.length; i += chunkSize) {
          const idChunk = systemIds.slice(i, i + chunkSize);
          this.systemService.getSystemByIds(idChunk).pipe(first()).subscribe(result => {
            for(let item of result) {
              this.implementedIn.push(item);
            }
          });
        }
      });
    });
  }

}
