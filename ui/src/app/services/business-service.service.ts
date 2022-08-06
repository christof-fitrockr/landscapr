import {Injectable} from '@angular/core';
import {BusinessService} from '../models/business-service';
import {AngularFireDatabase, AngularFireList} from '@angular/fire/compat/database';


@Injectable({
  providedIn: 'root',
})
export class BusinessServiceService {

  private dbPath = '/mvp/business-services';
  businessServices$: AngularFireList<any> = null;

  constructor(private db: AngularFireDatabase) {
    this.businessServices$ = db.list(this.dbPath);
  }

  create(businessService: BusinessService): void {

    this.businessServices$.push({
      id: businessService.id,
      name: businessService.name,
      description: businessService.description,
      actor: businessService.actor,
      screenshotUrl: businessService.screenshotUrl
    });
  }

  update(businessService: BusinessService): void {
    this.businessServices$.update(businessService.$key, {
      id: businessService.id,
      name: businessService.name,
      description: businessService.description,
      actor: businessService.actor,
      screenshotUrl: businessService.screenshotUrl
    }).catch(error => this.handleError(error));
  }

  delete(id: string): void {
    this.businessServices$.remove(id).catch(error => this.handleError(error));
  }

  list(): AngularFireList<BusinessService> {
    return this.businessServices$;
  }

  deleteAll(): void {
    this.businessServices$.remove().catch(error => this.handleError(error));
  }

  private handleError(error) {
    console.log(error);
  }
}
