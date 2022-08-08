import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {first} from 'rxjs/operators';
import {ToastrService} from 'ngx-toastr';
import {AccountService} from '../services/account.service';
import {Account} from '../models/account';

@Component({selector: 'app-account-edit', templateUrl: './account-edit-base.component.html'})
export class AccountEditBaseComponent implements OnInit {

  accountForm: FormGroup;
  account: Account;
  private accountId: string;


  constructor(private accountService: AccountService, private formBuilder: FormBuilder,
              private route: ActivatedRoute, private router: Router, private toastr: ToastrService) {
  }


  ngOnInit() {
    this.accountForm = this.formBuilder.group({
      email: ['', Validators.required],
      firstname: ['', Validators.required],
      lastname: ['', Validators.required],
      roles: ['Viewer']
    });

    this.refresh();
  }

  private refresh() {
    this.accountId = this.route.parent.snapshot.paramMap.get('id');
    if (this.accountId != null) {
      this.accountService.byId(this.accountId).pipe(first()).subscribe(account => {
        this.account = account;
        this.accountForm.patchValue(this.account);
      });
    } else {
      this.account = new Account();
    }
  }

  onUpdate() {
    Object.keys(this.accountForm.controls).forEach(field => {
      const control = this.accountForm.get(field);
      control.markAsTouched({ onlySelf: true });
    });

    if (this.accountForm.valid) {
      this.account = Object.assign(this.account, this.accountForm.value);
      if(!this.accountId) {
        this.accountService.invite(this.account).pipe(first()).subscribe(account => {
          this.router.navigateByUrl('/account/edit/' + account.id).then(() => {
            this.toastr.info('Account created successfully');
            this.refresh()
          });
        });
      } else {
        this.accountService.update(this.accountId, this.account).pipe(first()).subscribe(() => {
          this.toastr.info('Account updated successfully');
          this.refresh();
        });
      }
    }
  }

  delete() {
    this.accountService.delete(this.accountId).pipe(first()).subscribe(() => {
      this.router.navigate(['/account']).then(() => {
        this.toastr.info('Account deleted successfully');
      });
    })
  }
}
