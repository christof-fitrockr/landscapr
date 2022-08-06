import {Component, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';

@Component({selector: 'app-capability-edit', templateUrl: './capability-edit.component.html'})
export class CapabilityEditComponent implements OnInit {

  capabilityId: string;

  constructor(private route: ActivatedRoute) {
  }

  ngOnInit() {
    this.capabilityId = this.route.snapshot.paramMap.get('id');
  }
}
