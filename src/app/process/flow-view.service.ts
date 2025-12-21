import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { ApiCall } from '../models/api-call';
import { Application } from '../models/application';

export type FlowSelection = { type: 'api', data: ApiCall } | { type: 'system', data: Application };

@Injectable({
  providedIn: 'root'
})
export class FlowViewService {
  private selectionSubject = new Subject<FlowSelection>();
  selection$ = this.selectionSubject.asObservable();

  selectApi(api: ApiCall) {
    this.selectionSubject.next({ type: 'api', data: api });
  }

  selectSystem(system: Application) {
    this.selectionSubject.next({ type: 'system', data: system });
  }
}
