import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { MarkdownModule } from 'ngx-markdown';
import { HelpComponent } from './help.component';
import { FormsModule } from '@angular/forms';

describe('HelpComponent', () => {
  let component: HelpComponent;
  let fixture: ComponentFixture<HelpComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ HelpComponent ],
      imports: [
        HttpClientTestingModule,
        MarkdownModule.forRoot(),
        FormsModule
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HelpComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create and load topics', () => {
    const requests = httpMock.match(req => req.url.endsWith('.md'));
    expect(requests.length).toBeGreaterThan(0);

    // Respond to all requests
    requests.forEach(req => req.flush('# Title\nContent'));

    expect(component).toBeTruthy();
    expect(component.isLoading).toBeFalse();
    expect(component.rawTopics[0].content).toContain('# Title');
  });

  it('should search topics', () => {
    // Initial load
    const requests = httpMock.match(req => req.url.endsWith('.md'));
    requests.forEach(req => {
        if (req.request.url.includes('dashboard')) {
            req.flush('Dashboard Content');
        } else {
            req.flush('Other Content');
        }
    });

    component.searchTerm = 'Dashboard';
    component.search();

    expect(component.filteredTopics.length).toBe(1);
    expect(component.filteredTopics[0].title).toBe('Dashboard');
  });
});
