import {Injectable} from '@angular/core';
import {FunctionalCluster} from "../models/functional-cluster";
import {InformationSystemService} from "../models/information-system-service";
import {BusinessService} from "../models/business-service";
import {HttpClient} from "@angular/common/http";
import {Observable} from "rxjs";
import {InformationObject} from "../models/information-object";
import {BusinessFunction} from "../models/business-function";
import {AngularFireDatabase} from '@angular/fire/compat/database';


@Injectable({
  providedIn: 'root',
})
export class AppService {

  constructor(private http: HttpClient, private db: AngularFireDatabase) { }

  getClusterList(): Observable<FunctionalCluster[]> {
    return this.db.list<FunctionalCluster>('/mvp/functional-cluster').valueChanges();
  }

  getInformationSystemServices(): Observable<InformationSystemService[]> {
    return this.db.list<InformationSystemService>('/mvp/information-system-services').valueChanges();
  }

  getBusinessServices(): Observable<BusinessService[]> {
    return this.db.list<BusinessService>('/mvp/business-services').valueChanges();
  }

  getInformationObjects(): Observable<InformationObject[]> {
    return this.db.list<InformationObject>('/mvp/information-objects').valueChanges();
  }

  getBusinessServiceById(id: string): Observable<BusinessService> {
    return Observable.create(observer => {
      this.db.list('/mvp/business-services', ref => ref.orderByChild('id').equalTo(id)).valueChanges().subscribe(result => {
        result.length > 0 ? observer.next(result[0]) : observer.error();
        return observer.complete();
      });
    });
  }

  getBusinessFunctionsByISS(service: InformationSystemService): Observable<BusinessFunction[]> {
    return Observable.create(observer => {
      this.getClusterList().subscribe(result => {
        let functions: BusinessFunction[] = [];
        result.forEach(item => {
          item.functions.forEach(item => {
            if(item.informationSystemServices.some(result => {
              return service && result === service.id;
            })) {
              functions.push(item);
            }
          })
        });

        observer.next(functions);
        return observer.complete()
      });
    });
  }

  getBusinessFunctionsByBS(service: BusinessService): Observable<BusinessFunction[]> {
    return Observable.create(observer => {
      this.getClusterList().subscribe(result => {
        let functions: BusinessFunction[] = [];
        result.forEach(item => {
          item.functions.forEach(item => {
            if(item.businessServices.some(result => {
              return service && result === service.id;
            })) {
              functions.push(item);
            }
          })
        });

        observer.next(functions);
        return observer.complete()
      });
    });
  }

  getInformationSystemServiceById(id: string): Observable<InformationSystemService> {
    return Observable.create(observer => {
      this.getInformationSystemServices().subscribe(result => {
        result = result.filter(item => id === item.id);
        result.length > 0 ? observer.next(result[0]) : observer.error();
        return observer.complete();
      });
    });
  }

  getInformationObjectById(id: string): Observable<InformationObject> {
    return Observable.create(observer => {
      this.getInformationObjects().subscribe(result => {
        result = result.filter(item => id === item.id);
        result.length > 0 ? observer.next(result[0]) : observer.error();
        return observer.complete();
      });
    });
  }


  getCourses(listPath): Observable<any[]> {
    return this.db.list(listPath).valueChanges();
  }
}
