import { Component, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';

import { JiraService } from '../../services/jira.service';

/**
 * Where the Jira of this organisation lives. Every element of the model can
 * name the issues it is worked on in; this setting turns those keys into links.
 */
@Component({
  selector: 'app-jira-settings',
  templateUrl: './jira-settings.component.html'
})
export class JiraSettingsComponent implements OnInit {

  baseUrl = '';

  constructor(private jiraService: JiraService, private toastr: ToastrService) {}

  ngOnInit(): void {
    this.baseUrl = this.jiraService.baseUrl;
  }

  get example(): string {
    return this.jiraService.urlOf('ABC-123') || 'https://your-company.atlassian.net/browse/ABC-123';
  }

  save(): void {
    this.jiraService.setBaseUrl(this.baseUrl);
    this.baseUrl = this.jiraService.baseUrl;
    this.toastr.info(this.baseUrl ? 'Jira address saved' : 'Jira address removed');
  }

  clear(): void {
    this.baseUrl = '';
    this.save();
  }
}
