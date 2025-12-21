import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

interface LicenseInfo {
  licenses: string;
  repository?: string;
  publisher?: string;
  email?: string;
  url?: string;
  path?: string;
  licenseFile?: string;
}

interface LicensesData {
  [key: string]: LicenseInfo;
}

@Component({
  selector: 'app-licenses',
  templateUrl: './licenses.component.html',
  styles: [`
    .license-card {
      margin-bottom: 20px;
    }
  `]
})
export class LicensesComponent implements OnInit {
  licenses: { name: string; info: LicenseInfo }[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.http.get<LicensesData>('assets/licenses.json').subscribe(data => {
      this.licenses = Object.keys(data).map(key => ({
        name: key,
        info: data[key]
      }));
    });
  }
}
