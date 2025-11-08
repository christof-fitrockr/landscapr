import {Component, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';

@Component({selector: 'app-system-edit', templateUrl: './system-edit.component.html'})
export class SystemEditComponent implements OnInit {

  systemId: string;

  constructor(private route: ActivatedRoute) {
  }

  ngOnInit() {
    this.systemId = this.route.snapshot.paramMap.get('id');
  }
}
