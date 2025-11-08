import { Directive, ElementRef, Input, OnChanges, SimpleChanges } from '@angular/core';
import mermaid from 'mermaid';

@Directive({
  selector: '[appMermaid]'
})
export class MermaidDirective implements OnChanges {
  @Input() appMermaid: string;

  constructor(private el: ElementRef) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.appMermaid) {
      this.render();
    }
  }

  private render(): void {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default'
    });
    const graph = this.appMermaid;
    if (graph) {
      mermaid.render('graph', graph, (svgGraph) => {
        this.el.nativeElement.innerHTML = svgGraph;
      });
    }
  }
}
