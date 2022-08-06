import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
// import {DocumentReference} from '@angular/fire/compat/firestore';
import {Capability} from '../models/capability';


@Injectable({
  providedIn: 'root',
})
export class CapabilityService {

  // constructor(private db: AngularFirestore) {
  // }

  allCapabilities(): Observable<Capability[]> {
    // return this.db.collection<Capability>('capability', ref => ref.orderBy('name')).valueChanges({ idField: 'capabilityId' });
    return null;
  }

  getCapabilityById(id: string): Observable<Capability> {
    return null;
    // return this.db.collection<Capability>('capability').doc(id).valueChanges({ idField: 'capabilityId' });
  }


  getCapabilityByIds(ids: string[]): Observable<Capability[]> {
    // return this.db.collection<Capability>('capability', ref => {
    //   return ref.where( firebase.documentId(), 'in', ids)}
    //   ).valueChanges({ idField: 'capabilityId' });
    return null;
  }


  getByImplementingSystem(systemId: string) {
    // return this.db.collection<Capability>('capability', ref => {
    //   return ref.where( 'implementedBy', 'array-contains', systemId)}
    // ).valueChanges({ idField: 'capabilityId' });
    return null;
  }

  getCapabilityByName(name: string): Observable<Capability[]> {

    // return this.db.collection<Capability>('capability', ref => {
    //   return ref
    //     .orderBy("name")
    //     .where('name', '>=', name.toUpperCase())
    //     .where('name', '<=', name.toLowerCase() + '\uf8ff')
    //     .limit(10);}
    //     ).valueChanges({ idField: 'capabilityId' });
    return null;
  }

  createCapability(capability: Capability)/*: Promise<DocumentReference<Capability>>*/ {
    return null;
// /    return this.db.collection<Capability>("capability").add(JSON.parse(JSON.stringify(capability)));
  }

  updateCapability(id: string, capability:  Capability): Promise<void> {
    // return this.db.collection("capability").doc(id).update(JSON.parse( JSON.stringify(capability ) )).catch(error => this.handleError(error));
    return null;
  }

  deleteCapability(capabilityId: string): Promise<void> {
    // return this.db.collection("capability").doc(capabilityId).delete();
    return null;
  }



  private handleError(error) {
    console.log(error);
  }
}
