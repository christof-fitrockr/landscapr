import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {Capability} from '../models/capability';
import {HttpClient} from '@angular/common/http';
import {environment} from '../../environments/environment';


@Injectable({
  providedIn: 'root',
})
export class CapabilityService {

  constructor(private http: HttpClient) {
  }

  all(): Observable<Capability[]> {
    return this.http.get<Capability[]>(`${environment.apiUrl}/capability/all`);
  }

  byId(id: string): Observable<Capability> {
    return this.http.get<Capability>(`${environment.apiUrl}/capability/byId/` + id);
  }

  byIds(ids: string[]): Observable<Capability[]> {
    return this.http.post<Capability[]>(`${environment.apiUrl}/capability/byIds`, ids);
  }

  byName(name: string): Observable<Capability[]> {
    return this.http.get<Capability[]>(`${environment.apiUrl}/capability/byName/` + name);
  }

  byImplementation(systemId: string): Observable<Capability[]> {
    return this.http.get<Capability[]>(`${environment.apiUrl}/cabability/byImplementation/` + systemId);
  }

  create(capability: Capability): Observable<Capability> {
    return this.http.post<Capability>(`${environment.apiUrl}/capability/update`, capability);
  }

  update(id: string, capability:  Capability): Observable<Capability> {
    return this.http.post<Capability>(`${environment.apiUrl}/capability/update`, capability);
  }

  delete(capabilityId: string): Observable<void> {
    return this.http.get<void>(`${environment.apiUrl}/capability/delete/` + capabilityId);
  }

//   allCapabilities(): Observable<Capability[]> {
//     // return this.db.collection<Capability>('capability', ref => ref.orderBy('name')).valueChanges({ idField: 'capabilityId' });
//     return null;
//   }
//
//   getCapabilityById(id: string): Observable<Capability> {
//     return null;
//     // return this.db.collection<Capability>('capability').doc(id).valueChanges({ idField: 'capabilityId' });
//   }
//
//
//   getCapabilityByIds(ids: string[]): Observable<Capability[]> {
//     // return this.db.collection<Capability>('capability', ref => {
//     //   return ref.where( firebase.documentId(), 'in', ids)}
//     //   ).valueChanges({ idField: 'capabilityId' });
//     return null;
//   }
//
//
//   getByImplementingCapability(id: string) {
//     // return this.db.collection<Capability>('capability', ref => {
//     //   return ref.where( 'implementedBy', 'array-contains', capabilityId)}
//     // ).valueChanges({ idField: 'capabilityId' });
//
//   }
//
//   getCapabilityByName(name: string): Observable<Capability[]> {
//
//     // return this.db.collection<Capability>('capability', ref => {
//     //   return ref
//     //     .orderBy("name")
//     //     .where('name', '>=', name.toUpperCase())
//     //     .where('name', '<=', name.toLowerCase() + '\uf8ff')
//     //     .limit(10);}
//     //     ).valueChanges({ idField: 'capabilityId' });
//     return null;
//   }
//
//   createCapability(capability: Capability)/*: Promise<DocumentReference<Capability>>*/ {
//     return null;
// // /    return this.db.collection<Capability>("capability").add(JSON.parse(JSON.stringify(capability)));
//   }
//
//   updateCapability(id: string, capability:  Capability): Promise<void> {
//     // return this.db.collection("capability").doc(id).update(JSON.parse( JSON.stringify(capability ) )).catch(error => this.handleError(error));
//     return null;
//   }
//
//   deleteCapability(capabilityId: string): Promise<void> {
//     // return this.db.collection("capability").doc(capabilityId).delete();
//     return null;
//   }
//
//
//
//   private handleError(error) {
//     console.log(error);
//   }
}
