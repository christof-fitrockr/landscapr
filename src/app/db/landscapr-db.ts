import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';
import { Process } from '../models/process';
import { ApiCall } from '../models/api-call';
import { Capability } from '../models/capability';
import { Application } from '../models/application';
import { Journey } from '../models/journey.model';

@Injectable({
  providedIn: 'root'
})
export class LandscaprDb extends Dexie {
  processes!: Table<Process, string>;
  apiCalls!: Table<ApiCall, string>;
  capabilities!: Table<Capability, string>;
  applications!: Table<Application, string>;
  journeys!: Table<Journey, string>;

  constructor() {
    super('LandscaprDb');
    this.version(1).stores({
      processes: 'id, name, *apiCallIds',
      apiCalls: 'id, name, capabilityId, *implementedBy',
      capabilities: 'id, name, parentId',
      applications: 'id, name',
      journeys: 'id, name'
    });
  }
}
