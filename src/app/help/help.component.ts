import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

interface HelpTopic {
  id: string;
  title: string;
  file: string;
  content: string;
}

@Component({
  selector: 'app-help',
  templateUrl: './help.component.html',
  styleUrls: ['./help.component.scss']
})
export class HelpComponent implements OnInit {

  rawTopics: HelpTopic[] = [
    { id: 'access-processes', title: 'Access Processes', file: 'assets/help/access-processes.md', content: '' },
    { id: 'howto-workflow', title: 'How To: Workflow', file: 'assets/help/howto-workflow.md', content: '' },
    { id: 'dashboard', title: 'Dashboard', file: 'assets/help/dashboard.md', content: '' },
    { id: 'journeys', title: 'Journeys', file: 'assets/help/journeys.md', content: '' },
    { id: 'process', title: 'Process', file: 'assets/help/process.md', content: '' },
    { id: 'api-call', title: 'Api Call', file: 'assets/help/api-call.md', content: '' },
    { id: 'capability', title: 'Capability', file: 'assets/help/capability.md', content: '' },
    { id: 'system', title: 'System', file: 'assets/help/system.md', content: '' },
    { id: 'repositories', title: 'Repositories', file: 'assets/help/repositories.md', content: '' }
  ];

  filteredTopics: HelpTopic[] = [];
  selectedTopic: HelpTopic | null = null;
  searchTerm: string = '';
  isLoading: boolean = true;

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    this.isLoading = true;

    // Create an array of observables to fetch content for each topic
    const requests = this.rawTopics.map(topic =>
      this.http.get(topic.file, { responseType: 'text' }).pipe(
        map(content => ({ ...topic, content })),
        catchError(err => of({ ...topic, content: `# Error\nCould not load help file: ${topic.file}` }))
      )
    );

    forkJoin(requests).subscribe(topicsWithContent => {
      this.rawTopics = topicsWithContent;
      this.filteredTopics = this.rawTopics;
      this.selectedTopic = this.rawTopics[0];
      this.isLoading = false;
    });
  }

  selectTopic(topic: HelpTopic) {
    this.selectedTopic = topic;
  }

  search() {
    const term = this.searchTerm.toLowerCase();

    if (!term.trim()) {
      this.filteredTopics = this.rawTopics;
    } else {
      this.filteredTopics = this.rawTopics.filter(t =>
        t.title.toLowerCase().includes(term) ||
        t.content.toLowerCase().includes(term)
      );
    }

    // If selected topic is no longer visible, select the first visible one (optional UX choice)
    // For now, we keep the selected topic even if it's filtered out from the list,
    // unless the list is empty.
    if (this.filteredTopics.length > 0 && !this.filteredTopics.includes(this.selectedTopic!)) {
        // Optionally switch: this.selectedTopic = this.filteredTopics[0];
        // But users often search to find *other* things while reading one thing.
    }
  }

  clearSearch() {
    this.searchTerm = '';
    this.search();
  }

}
