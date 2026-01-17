import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RepositoriesComponent } from './repositories.component';
import { GithubService } from '../services/github.service';
import { RepoService } from '../services/repo.service';
import { ToastrService } from 'ngx-toastr';
import { FileSaverService } from 'ngx-filesaver';
import { BsModalService } from 'ngx-bootstrap/modal';
import { MergeService } from '../services/merge.service';
import { AuthenticationService } from '../services/authentication.service';
import { of } from 'rxjs';
import { FormsModule } from '@angular/forms';

describe('RepositoriesComponent', () => {
  let component: RepositoriesComponent;
  let fixture: ComponentFixture<RepositoriesComponent>;
  let githubServiceSpy: jasmine.SpyObj<GithubService>;
  let repoServiceSpy: jasmine.SpyObj<RepoService>;
  let toastrServiceSpy: jasmine.SpyObj<ToastrService>;
  let fileSaverServiceSpy: jasmine.SpyObj<FileSaverService>;
  let modalServiceSpy: jasmine.SpyObj<BsModalService>;
  let mergeServiceSpy: jasmine.SpyObj<MergeService>;
  let authServiceSpy: jasmine.SpyObj<AuthenticationService>;

  beforeEach(async () => {
    githubServiceSpy = jasmine.createSpyObj('GithubService', ['getUser', 'getRepos', 'getRepoContents', 'getFileContent', 'createOrUpdateFile', 'setPersonalAccessToken', 'getPersonalAccessToken', 'getRef', 'createBranch', 'createPullRequest', 'getBranches']);
    repoServiceSpy = jasmine.createSpyObj('RepoService', ['getCurrentData', 'applyData', 'uploadJsonContent', 'downloadAsJson', 'uploadJson']);
    toastrServiceSpy = jasmine.createSpyObj('ToastrService', ['success', 'error', 'info', 'warning']);
    fileSaverServiceSpy = jasmine.createSpyObj('FileSaverService', ['save']);
    modalServiceSpy = jasmine.createSpyObj('BsModalService', ['show']);
    mergeServiceSpy = jasmine.createSpyObj('MergeService', ['different']);
    authServiceSpy = jasmine.createSpyObj('AuthenticationService', ['updateUserFromGithub']);

    await TestBed.configureTestingModule({
      declarations: [ RepositoriesComponent ],
      imports: [ FormsModule ],
      providers: [
        { provide: GithubService, useValue: githubServiceSpy },
        { provide: RepoService, useValue: repoServiceSpy },
        { provide: ToastrService, useValue: toastrServiceSpy },
        { provide: FileSaverService, useValue: fileSaverServiceSpy },
        { provide: BsModalService, useValue: modalServiceSpy },
        { provide: MergeService, useValue: mergeServiceSpy },
        { provide: AuthenticationService, useValue: authServiceSpy }
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RepositoriesComponent);
    component = fixture.componentInstance;
    githubServiceSpy.getPersonalAccessToken.and.returnValue('token');
    githubServiceSpy.getUser.and.returnValue(of({ login: 'current-user' }));
    githubServiceSpy.getRepos.and.returnValue(of([]));
    githubServiceSpy.getBranches.and.returnValue(of([]));
    fixture.detectChanges(); // ngOnInit -> connect
  });

  it('should use repo owner instead of current user when selecting repo', () => {
    const repo = { name: 'my-repo', owner: { login: 'other-owner' } };
    githubServiceSpy.getRepoContents.and.returnValue(of([]));

    component.selectRepo(repo);

    // This expectation is what we want to be true, but currently it will fail
    expect(githubServiceSpy.getRepoContents).toHaveBeenCalledWith('other-owner', 'my-repo', '');
  });

  it('should use repo owner when loading file from github', () => {
    const repo = { name: 'my-repo', owner: { login: 'other-owner' } };
    component.selectedRepo = repo;
    component.selectedFilePath = 'path/to/file.json';

    githubServiceSpy.getFileContent.and.returnValue(of({ content: btoa('{}') }));

    component.loadFromGithub();

    // This expectation is what we want to be true, but currently it will fail
    expect(githubServiceSpy.getFileContent).toHaveBeenCalledWith('other-owner', 'my-repo', 'path/to/file.json', 'main');
  });

  it('should use repo owner when saving file to github', () => {
    const repo = { name: 'my-repo', owner: { login: 'other-owner' } };
    component.selectedRepo = repo;
    component.selectedFilePath = 'path/to/file.json';
    // component.owner is set to 'current-user' in beforeEach -> connect

    githubServiceSpy.getFileContent.and.returnValue(of({ content: btoa('{}'), sha: '123' }));
    repoServiceSpy.getCurrentData.and.returnValue({
      processes: [], apiCalls: [], capabilities: [], applications: [], journeys: []
    });

    // Mock modal to return confirm
    const modalRefMock = {
        content: {
            onClose: of({ commitMessage: 'msg', data: {} })
        }
    };
    modalServiceSpy.show.and.returnValue(modalRefMock as any);
    githubServiceSpy.createOrUpdateFile.and.returnValue(of({}));

    component.saveToGithub();

    // This expectation is what we want to be true, but currently it will fail
    expect(githubServiceSpy.getFileContent).toHaveBeenCalledWith('other-owner', 'my-repo', 'path/to/file.json', 'main');
  });
});
