import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {AngularFirestore, DocumentReference} from '@angular/fire/compat/firestore';
import * as firebase from 'firebase/firestore';
import {System} from '../models/system';


@Injectable({
  providedIn: 'root',
})
export class SystemService {

  constructor(private db: AngularFirestore) {
  }

  allSystems(): Observable<System[]> {
    return this.db.collection<System>('system', ref => ref.orderBy('name')).valueChanges({ idField: 'systemId' });
  }

  getSystemById(id: string): Observable<System> {
    return this.db.collection<System>('system').doc(id).valueChanges({ idField: 'systemId' });
  }


  getSystemByIds(ids: string[]): Observable<System[]> {
    return this.db.collection<System>('system', ref => {
      return ref.where( firebase.documentId(), 'in', ids)}
      ).valueChanges({ idField: 'systemId' });

  }


  getSystemByName(name: string): Observable<System[]> {

    return this.db.collection<System>('system', ref => {
      return ref
        .orderBy("name")
        .where('name', '>=', name.toUpperCase())
        .where('name', '<=', name.toLowerCase() + '\uf8ff')
        .limit(10);}
        ).valueChanges({ idField: 'systemId' });
  }

  createSystem(system: System): Promise<DocumentReference<System>> {
    return this.db.collection<System>("system").add(JSON.parse(JSON.stringify(system)));
  }

  updateSystem(id: string, system:  System): Promise<void> {
    return this.db.collection("system").doc(id).update(JSON.parse( JSON.stringify(system ) )).catch(error => this.handleError(error));
  }

  deleteSystem(systemId: string): Promise<void> {
    return this.db.collection("system").doc(systemId).delete();
  }



  private handleError(error) {
    console.log(error);
  }

}
