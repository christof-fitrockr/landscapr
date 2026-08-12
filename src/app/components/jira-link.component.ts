import { Component, Input, OnChanges, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';

import { JiraService, JiraTicketLink } from '../services/jira.service';

/**
 * Shows the Jira issues an element of the model references. Every issue key of
 * the element's `jiraTicket` attribute becomes a link into the Jira configured
 * under Settings; without that setting the keys are shown as plain text.
 */
@Component({
  selector: 'app-jira-link',
  templateUrl: './jira-link.component.html',
  styleUrls: ['./jira-link.component.scss']
})
export class JiraLinkComponent implements OnInit, OnChanges, OnDestroy {

  /** the `jiraTicket` attribute of the element, e.g. 'ABC-12, ABC-13' */
  @Input() ticket: string | undefined | null;
  /** shown in front of the issues, set to '' to leave the caption out */
  @Input() label = 'Jira';
  /** true inside tables and side panels, where there is no room for a caption */
  @Input() compact = false;

  links: JiraTicketLink[] = [];

  private subscription: Subscription;

  constructor(private jiraService: JiraService) {}

  ngOnInit(): void {
    // the same element points at another address as soon as Jira is configured
    this.subscription = this.jiraService.baseUrl$.subscribe(() => this.build());
  }

  ngOnChanges(): void {
    this.build();
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  private build(): void {
    this.links = this.jiraService.links(this.ticket);
  }
}
