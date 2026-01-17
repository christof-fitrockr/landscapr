import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { GithubService } from './github.service';

describe('GithubService', () => {
  let service: GithubService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [GithubService]
    });
    service = TestBed.inject(GithubService);
    httpMock = TestBed.inject(HttpTestingController);
    service.setPersonalAccessToken('test-token');
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch branches', () => {
    const dummyBranches = [{ name: 'main' }, { name: 'dev' }];

    service.getBranches('owner', 'repo').subscribe(branches => {
      expect(branches.length).toBe(2);
      expect(branches).toEqual(dummyBranches);
    });

    const req = httpMock.expectOne('https://api.github.com/repos/owner/repo/branches');
    expect(req.request.method).toBe('GET');
    req.flush(dummyBranches);
  });

  it('should get ref', () => {
    const dummyRef = { ref: 'refs/heads/main', object: { sha: '123' } };

    service.getRef('owner', 'repo', 'heads/main').subscribe(ref => {
      expect(ref).toEqual(dummyRef);
    });

    const req = httpMock.expectOne('https://api.github.com/repos/owner/repo/git/ref/heads/main');
    expect(req.request.method).toBe('GET');
    req.flush(dummyRef);
  });

  it('should create branch', () => {
    const branchName = 'new-feature';
    const sha = '123';

    service.createBranch('owner', 'repo', branchName, sha).subscribe(res => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne('https://api.github.com/repos/owner/repo/git/refs');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      ref: `refs/heads/${branchName}`,
      sha: sha
    });
    req.flush({});
  });

  it('should create pull request', () => {
    service.createPullRequest('owner', 'repo', 'Title', 'Body', 'head', 'base').subscribe(res => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne('https://api.github.com/repos/owner/repo/pulls');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      title: 'Title',
      body: 'Body',
      head: 'head',
      base: 'base'
    });
    req.flush({});
  });

  it('should get file content with ref', () => {
    service.getFileContent('owner', 'repo', 'path', 'branch').subscribe();

    const req = httpMock.expectOne('https://api.github.com/repos/owner/repo/contents/path?ref=branch');
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('should create or update file with branch', () => {
    service.createOrUpdateFile('owner', 'repo', 'path', 'content', 'sha', 'msg', 'branch').subscribe();

    const req = httpMock.expectOne('https://api.github.com/repos/owner/repo/contents/path');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.branch).toBe('branch');
    expect(req.request.body.sha).toBe('sha');
    req.flush({});
  });

  it('should fetch commits', () => {
    const dummyCommits = [{ sha: '123' }, { sha: '456' }];

    service.getCommits('owner', 'repo').subscribe(commits => {
      expect(commits.length).toBe(2);
      expect(commits).toEqual(dummyCommits);
    });

    const req = httpMock.expectOne('https://api.github.com/repos/owner/repo/commits?per_page=10');
    expect(req.request.method).toBe('GET');
    req.flush(dummyCommits);
  });
});
