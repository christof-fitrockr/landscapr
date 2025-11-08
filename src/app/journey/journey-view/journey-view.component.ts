import { Component, OnInit } from '@angular/core';
import { Journey } from 'src/app/models/journey.model';
import { JourneyService } from 'src/app/services/journey.service';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-journey-view',
  templateUrl: './journey-view.component.html',
  styleUrls: ['./journey-view.component.scss']
})
export class JourneyViewComponent implements OnInit {

  journey: Journey;
  mermaidGraph: string;

  constructor(
    private journeyService: JourneyService,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const journeyId = params['id'];
      if (journeyId) {
        this.journeyService.byId(journeyId).subscribe(journey => {
          this.journey = journey;
          this.mermaidGraph = this.generateMermaidSyntax(this.journey);
        });
      }
    });
  }

  private generateMermaidSyntax(journey: Journey): string {
    let mermaid = 'stateDiagram-v2\\n';
    for (const item of journey.items) {
      if ('items' in item) {
        mermaid += `  state ${item.id} {\\n`;
        mermaid += `    ${this.generateMermaidSyntax(item as Journey)}\\n`;
        mermaid += `  }\\n`;
      } else {
        mermaid += `  ${item.id}: ${item.name}\\n`;
      }
    }
    for (const connection of journey.connections) {
      mermaid += `  ${connection.from} --> ${connection.to}: ${connection.label || ''}\\n`;
    }
    return mermaid;
  }
}
