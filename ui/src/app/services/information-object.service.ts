import {Injectable} from '@angular/core';
import {Observable} from "rxjs";
import {InformationObject} from "../models/information-object";
import {AngularFireDatabase, AngularFireList} from '@angular/fire/compat/database';


@Injectable({
  providedIn: 'root',
})
export class InformationObjectService {

  private dbPath = '/mvp/information-objects';
  informationObjects$: AngularFireList<any> = null;

  constructor(private db: AngularFireDatabase) {
    this.informationObjects$ = db.list(this.dbPath);
  }


  ngOnInit() {
    this.informationObjects$ = this.db.list(this.dbPath);
  }

  getInformationObjectById(id: string): Observable<InformationObject> {
    return Observable.create(observer => {
      this.list().valueChanges().subscribe(result => {
        result = result.filter(item => id === item.id);
        result.length > 0 ? observer.next(result[0]) : observer.error();
        return observer.complete();
      });
    });
  }

  create(informationObject: InformationObject): void {

    this.informationObjects$.push({
      id: informationObject.id,
      name: informationObject.name,
      description: informationObject.description
    });
  }

  update(informationObject: InformationObject): void {
    this.informationObjects$.update(informationObject.$key, {
      id: informationObject.id,
      name: informationObject.name,
      description: informationObject.description
    }).catch(error => this.handleError(error));
  }

  delete(id: string): void {
    this.informationObjects$.remove(id).catch(error => this.handleError(error));
  }

  list(): AngularFireList<InformationObject> {
    return this.informationObjects$;
  }

  deleteAll(): void {
    this.informationObjects$.remove().catch(error => this.handleError(error));
  }

  private handleError(error) {
    console.log(error);
  }

}
