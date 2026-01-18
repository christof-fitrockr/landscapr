import {Component, OnInit} from '@angular/core';
import {RoleService} from '../../services/role.service';
import {Role} from '../../models/role';
import {Observable} from 'rxjs';

@Component({
  selector: 'app-role-list',
  templateUrl: './role-list.component.html'
})
export class RoleListComponent implements OnInit {
  roles$: Observable<Role[]>;

  constructor(private roleService: RoleService) {}

  ngOnInit() {
    this.roles$ = this.roleService.getAll();
  }
}
