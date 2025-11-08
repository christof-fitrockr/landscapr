import {Component, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';

@Component({selector: 'app-account-edit', templateUrl: './account-edit.component.html'})
export class AccountEditComponent implements OnInit {

  systemId: string;

  constructor(private route: ActivatedRoute) {
  }

  ngOnInit() {
    this.systemId = this.route.snapshot.paramMap.get('id');
  }
}
