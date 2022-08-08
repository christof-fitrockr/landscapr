import {Component, OnInit} from '@angular/core';
import {first} from 'rxjs/operators';
import {AccountService} from '../services/account.service';
import {Account} from '../models/account';

@Component({selector: 'app-account-list', templateUrl: './account-list.component.html'})
export class AccountListComponent implements OnInit {

  constructor(private accountService: AccountService) {
  }

  accounts: Account[];
  searchText: string;

  ngOnInit() {
    this.refresh();
  }

  refresh() {
    this.accountService.all().pipe(first()).subscribe(accounts => {
      this.accounts = accounts;
    });
  }
}
