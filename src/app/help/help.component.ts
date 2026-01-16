import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { of, Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-help',
  templateUrl: './help.component.html',
  styleUrls: ['./help.component.scss']
})
export class HelpComponent implements OnInit {

  topics = [
    { id: 'dashboard', title: 'Dashboard', file: 'assets/help/dashboard.md' },
    { id: 'journeys', title: 'Journeys', file: 'assets/help/journeys.md' },
    { id: 'process', title: 'Process', file: 'assets/help/process.md' },
    { id: 'api-call', title: 'Api Call', file: 'assets/help/api-call.md' },
    { id: 'capability', title: 'Capability', file: 'assets/help/capability.md' },
    { id: 'system', title: 'System', file: 'assets/help/system.md' },
    { id: 'repositories', title: 'Repositories', file: 'assets/help/repositories.md' }
  ];

  selectedTopic = this.topics[0];
  content$: Observable<string> = of('');

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    this.selectTopic(this.topics[0]);
  }

  selectTopic(topic: any) {
    this.selectedTopic = topic;
    this.content$ = this.http.get(topic.file, { responseType: 'text' }).pipe(
      catchError(err => of(`# Error\nCould not load help file: ${topic.file}`))
    );
  }

}
