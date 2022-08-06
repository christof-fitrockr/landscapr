import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {ApiCall} from '../models/api-call';

@Injectable({
  providedIn: 'root',
})
export class ApiCallService {

  constructor() {
  }

  allApiCalls(): Observable<ApiCall[]> {
    // return this.db.collection<ApiCall>('apiCall', ref => ref.orderBy('name')).valueChanges({ idField: 'apiCallId' });
    return null;
  }

  getApiCallById(id: string): Observable<ApiCall> {
    //return this.db.collection<ApiCall>('apiCall').doc(id).valueChanges({ idField: 'apiCallId' });
    return null;
  }


  getApiCallByIds(ids: string[]): Observable<ApiCall[]> {
    // return this.db.collection<ApiCall>('apiCall', ref => {
    //   return ref.where( firebase.documentId(), 'in', ids)}
    //   ).valueChanges({ idField: 'apiCallId' });
    return null;
  }


  getApiCallByCapability(capabilityId: string) {
    // return this.db.collection<ApiCall>('apiCall', ref => {
    //   return ref.where( 'capabilityId', '==', capabilityId)}
    // ).valueChanges({ idField: 'apiCallId' });
    return null;
  }


  getApiCallByName(name: string): Observable<ApiCall[]> {
    //
    // return this.db.collection<ApiCall>('apiCall', ref => {
    //   return ref
    //     .orderBy("name")
    //     .where('name', '>=', name.toUpperCase())
    //     .where('name', '<=', name.toLowerCase() + '\uf8ff')
    //     .limit(10);}
    //     ).valueChanges({ idField: 'apiCallId' });
    return null;
  }

  createApiCall(apiCall: ApiCall)/*: Promise<DocumentReference<ApiCall>>*/ {
    // return this.db.collection<ApiCall>("apiCall").add(JSON.parse(JSON.stringify(apiCall)));
    return null;
  }

  updateApiCall(id: string, apiCall:  ApiCall): Promise<void> {
    // return this.db.collection("apiCall").doc(id).update(JSON.parse( JSON.stringify(apiCall ) )).catch(error => this.handleError(error));
    return null;
  }


  deleteApiCall(apiCallId: string): Promise<void> {
    // return this.db.collection("apiCall").doc(apiCallId).delete();
    return null;
  }



  private handleError(error) {
    console.log(error);
  }
}
