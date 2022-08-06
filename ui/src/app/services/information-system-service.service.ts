import {Injectable} from '@angular/core';
import {InformationSystemService} from '../models/information-system-service';
import {AngularFireList} from '@angular/fire/compat/database';


@Injectable({
  providedIn: 'root',
})
export class InformationSystemServiceService {

  private dbPath = '/mvp/information-system-services';
  informationSystemServices$: AngularFireList<any> = null;

  // constructor(private db: AngularFireDatabase) {
    //this.informationSystemServices$; // = db.list(this.dbPath);
  // }
O
  create(informationSystemService: InformationSystemService): void {

    this.informationSystemServices$.push({
      id: informationSystemService.id,
      name: informationSystemService.name,
      docLinkUrl: informationSystemService.docLinkUrl,
      implementationStatus: informationSystemService.implementationStatus,
      description: informationSystemService.description
    });
  }

  update(informationSystemService: InformationSystemService): void {
    this.informationSystemServices$.update(informationSystemService.$key, {
      id: informationSystemService.id,
      name: informationSystemService.name,
      docLinkUrl: informationSystemService.docLinkUrl,
      implementationStatus: informationSystemService.implementationStatus,
      description: informationSystemService.description
    }).catch(error => this.handleError(error));
  }

  delete(id: string): void {
    this.informationSystemServices$.remove(id).catch(error => this.handleError(error));
  }

  list(): AngularFireList<InformationSystemService> {
    return this.informationSystemServices$;
  }

  deleteAll(): void {
    this.informationSystemServices$.remove().catch(error => this.handleError(error));
  }

  private handleError(error) {
    console.log(error);
  }

}
