import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {RoleService} from '../../services/role.service';
import {Role} from '../../models/role';
import {ToastrService} from 'ngx-toastr';

@Component({
  selector: 'app-role-edit',
  templateUrl: './role-edit.component.html'
})
export class RoleEditComponent implements OnInit {
  roleForm: FormGroup;
  roleId: string;
  isNew = true;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private roleService: RoleService,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    this.roleForm = this.fb.group({
      name: ['', Validators.required],
      color: ['', Validators.required],
      description: ['']
    });

    this.route.params.subscribe(params => {
      if (params['id'] && params['id'] !== 'new') {
        this.roleId = params['id'];
        this.isNew = false;
        this.loadRole(this.roleId);
      }
    });
  }

  loadRole(id: string) {
    this.roleService.getById(id).subscribe(role => {
      this.roleForm.patchValue(role);
    }, error => {
        this.toastr.error('Role not found');
        this.router.navigate(['/settings/roles']);
    });
  }

  save() {
    if (this.roleForm.invalid) return;

    const roleData: Role = {
        id: this.roleId,
        ...this.roleForm.value
    };

    if (this.isNew) {
      this.roleService.create(roleData).subscribe(() => {
        this.toastr.success('Role created');
        this.router.navigate(['/settings/roles']);
      });
    } else {
      this.roleService.update(this.roleId, roleData).subscribe(() => {
        this.toastr.success('Role updated');
        this.router.navigate(['/settings/roles']);
      });
    }
  }

  delete() {
      if (confirm('Are you sure you want to delete this role?')) {
          this.roleService.delete(this.roleId).subscribe(() => {
              this.toastr.success('Role deleted');
              this.router.navigate(['/settings/roles']);
          });
      }
  }
}
