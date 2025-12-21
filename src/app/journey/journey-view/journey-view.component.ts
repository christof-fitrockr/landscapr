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

  private generateMermaidSyntax(journey: Journey, isRoot = true): string {
    let mermaid = isRoot ? 'stateDiagram-v2\n' : '';
    if (journey && journey.items) {
      for (const item of journey.items) {
        if (item && 'items' in item) {
          mermaid += `  state ${item.id} {\n`;
          mermaid += `    ${this.generateMermaidSyntax(item as Journey, false)}\n`;
          mermaid += `  }\n`;
        } else if (item) {
          mermaid += `  ${item.id}: ${item.name}\n`;
        }
      }
    }
    if (journey && journey.connections) {
      for (const connection of journey.connections) {
        mermaid += `  ${connection.from} --> ${connection.to}: ${connection.label || ''}\n`;
      }
    }
    return mermaid;
  }
}
