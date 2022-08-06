import {Injectable} from '@angular/core';
import {ModelledProcess, Process, Step} from '../models/process';
import {AngularFireList} from '@angular/fire/compat/database';
import {Observable} from 'rxjs';
import * as firebase from 'firebase/firestore';
import { collectionGroup, query, where, getDocs } from "firebase/firestore";
import {AngularFirestore, DocumentReference} from '@angular/fire/compat/firestore';
import {first} from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class ProcessService {

  private dbPath = '/landscapr/process';

  modelledProcesses$: AngularFireList<ModelledProcess> = null;


  constructor(private db: AngularFirestore) {
  }

  allProcesses(): Observable<Process[]> {
    return this.db.collection<Process>('process', ref => ref.orderBy('name')).valueChanges({ idField: 'processId' });
  }


  getProcessById(id: string): Observable<Process> {
    return this.db.collection<Process>('process').doc(id).valueChanges({ idField: 'processId' });
  }


  allFavorites() {
    return this.db.collection<Process>('process', ref => {
      return ref.where( 'favorite', '==', true)}
    ).valueChanges({ idField: 'processId' });
  }

  getProcessByIds(ids: string[]): Observable<Process[]> {
    return this.db.collection<Process>('process', ref => {
      return ref.where( firebase.documentId(), 'in', ids)}
      ).valueChanges({ idField: 'processId' });

  }

  getProcessesByApiCall(apiCallId: string) {
    return this.db.collection<Process>('process', ref => {
      return ref.where( 'apiCallsIds', 'array-contains', apiCallId)}
    ).valueChanges({ idField: 'processId' });
  }

  getParentProcesses(processId: string) {
    return new Observable<Process[]>(obs => {
      const result = [];
      this.allProcesses().pipe(first()).subscribe(processes => {
        for(let item of processes) {
          if(item.steps) {
            for(let step of item.steps) {
              if(step.processReference === processId) {
                result.push(item);
              }
            }
          }
        }
        obs.next(result);
      })

    });
  }

  getProcessByName(name: string): Observable<Process[]> {

    return this.db.collection<Process>('process', ref => {
      return ref
        .orderBy("name")
        .where('name', '>=', name.toUpperCase())
        .where('name', '<=', name.toLowerCase() + '\uf8ff')
        .limit(10);}
        ).valueChanges({ idField: 'processId' });
  }



  createProcess(process: Process): Promise<DocumentReference<Process>> {
    return this.db.collection<Process>("process").add(JSON.parse(JSON.stringify(process)));
  }

  updateProcess(id: string, process:  Process): Promise<void> {
    return this.db.collection("process").doc(id).update(JSON.parse( JSON.stringify(process ) )).catch(error => this.handleError(error));
  }

  deleteProcess(processId: string): Promise<void> {
    return this.db.collection("process").doc(processId).delete();
  }



  create(modelledProcess: ModelledProcess): void {
    this.modelledProcesses$.push(JSON.parse( JSON.stringify(modelledProcess ) ));
  }

  update(modelledProcess: ModelledProcess): void {
    this.modelledProcesses$.update(modelledProcess.$key, modelledProcess).catch(error => this.handleError(error));
  }

  delete(id: string): void {
    this.modelledProcesses$.remove(id).catch(error => this.handleError(error));
  }

  list(): AngularFireList<ModelledProcess> {
    return this.modelledProcesses$;
  }

  deleteAll(): void {
    this.modelledProcesses$.remove().catch(error => this.handleError(error));
  }

  private handleError(error) {
    console.log(error);
  }

}
