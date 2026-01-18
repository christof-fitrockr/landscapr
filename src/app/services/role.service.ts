import {Injectable} from '@angular/core';
import {Observable, from, of, BehaviorSubject, throwError} from 'rxjs';
import {map, switchMap, tap} from 'rxjs/operators';
import {LandscaprDb} from '../db/landscapr-db';
import {Role} from '../models/role';
import {v4 as uuidv4} from 'uuid';

@Injectable({
  providedIn: 'root'
})
export class RoleService {

  private rolesSubject = new BehaviorSubject<Role[]>([]);
  public roles$ = this.rolesSubject.asObservable();
  private rolesMap: {[id: string]: Role} = {};

  constructor(private db: LandscaprDb) {
    this.initOrSeed();
  }

  async initOrSeed() {
    let count = await this.db.roles.count();
    if (count === 0) {
      // Seed default roles
      const defaultRoles: Role[] = [
        { id: '0', name: 'Customer', color: 'var(--role-customer)', description: 'Customer Role' },
        { id: '1', name: 'Vehicle', color: 'var(--role-vehicle)', description: 'Vehicle Role' },
        { id: '2', name: 'Service with Customer', color: 'var(--role-service-with-customer)', description: 'Service with Customer Role' },
        { id: '3', name: 'Service', color: 'var(--role-service)', description: 'Service Role' },
        { id: '4', name: 'Workshop', color: 'var(--role-workshop)', description: 'Workshop Role' },
        { id: '5', name: 'Parts', color: 'var(--role-parts)', description: 'Parts Role' },
        { id: '6', name: 'Processing', color: 'var(--role-processing)', description: 'Processing Role' },
      ];
      await this.db.roles.bulkAdd(defaultRoles);
    }
    this.loadRoles();
  }

  private loadRoles() {
    this.db.roles.toArray().then(roles => {
      this.rolesMap = {};
      roles.forEach(r => this.rolesMap[r.id] = r);
      this.rolesSubject.next(roles);
    });
  }

  getAll(): Observable<Role[]> {
    return this.roles$;
  }

  getById(id: string): Observable<Role> {
    return from(this.db.roles.get(id)).pipe(
      switchMap(role => {
        if (role) return of(role);
        return throwError(undefined);
      })
    );
  }

  getRoleColor(id: string): string {
    if (!id) return 'var(--role-unassigned)';
    // Handle numeric IDs passed as numbers (legacy)
    const strId = String(id);
    const role = this.rolesMap[strId];
    return role ? role.color : 'var(--role-unassigned)';
  }

  getRoleName(id: string): string {
    if (!id) return '';
    const strId = String(id);
    const role = this.rolesMap[strId];
    return role ? role.name : strId;
  }

  create(role: Role): Observable<Role> {
    if (!role.id) {
      role.id = uuidv4();
    }
    return from(this.db.roles.add(role)).pipe(
      tap(() => this.loadRoles()),
      map(() => role)
    );
  }

  update(id: string, role: Role): Observable<Role> {
    return from(this.db.roles.update(id, role)).pipe(
      tap(() => this.loadRoles()),
      switchMap(updated => {
        if (updated) return of(role);
        return throwError(undefined);
      })
    );
  }

  delete(id: string): Observable<void> {
    return from(this.db.roles.delete(id)).pipe(
      tap(() => this.loadRoles())
    );
  }
}
