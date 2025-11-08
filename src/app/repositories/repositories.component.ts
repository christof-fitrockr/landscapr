import { Component, OnInit } from '@angular/core';
import { GithubService } from '../services/github.service';
import { RepoService } from '../services/repo.service';
import { ToastrService } from 'ngx-toastr';
import { Observable, EMPTY } from 'rxjs';
import { first } from 'rxjs/operators';
import { FileSaverService } from 'ngx-filesaver';

@Component({
  selector: 'app-repositories',
  templateUrl: './repositories.component.html',
  styleUrls: ['./repositories.component.scss']
})
export class RepositoriesComponent implements OnInit {

  pat: string = '';
  owner: string = '';

  repos$: Observable<any[]> = EMPTY;
  files$: Observable<any[]> = EMPTY;

  selectedRepo: any = null;
  selectedFilePath: string | null = null;

  connecting = false;
  loadingFiles = false;
  saving = false;

  constructor(
    private githubService: GithubService,
    private repoService: RepoService,
    private fileSaverService: FileSaverService,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    const savedPat = this.githubService.getPersonalAccessToken();
    if (savedPat) {
      this.pat = savedPat;
      this.connect();
    }
  }

  connect(): void {
    if (!this.pat) { this.toastr.info('Enter your GitHub Personal Access Token'); return; }
    this.connecting = true;
    this.githubService.setPersonalAccessToken(this.pat);
    this.githubService.getUser().pipe(first()).subscribe(user => {
      this.owner = user.login;
      this.repos$ = this.githubService.getRepos();
      this.connecting = false;
      this.toastr.success('Connected to GitHub');
    }, _ => {
      this.connecting = false;
      this.toastr.error('Failed to connect to GitHub. Check your PAT.');
    });
  }

  selectRepo(repo: any): void {
    this.selectedRepo = repo;
    this.selectedFilePath = null;
    this.loadingFiles = true;
    this.files$ = this.githubService.getRepoContents(this.owner, repo.name, '');
    // When observable resolves, Angular will render. We just turn off spinner shortly after by subscribing once.
    this.files$.pipe(first()).subscribe(_ => this.loadingFiles = false, _ => this.loadingFiles = false);
  }

  selectFile(file: any): void {
    this.selectedFilePath = file.path;
  }

  // Load from selected GitHub file into local app storage
  loadFromGithub(): void {
    if (!this.selectedRepo || !this.selectedFilePath) { return; }
    this.githubService.getFileContent(this.owner, this.selectedRepo.name, this.selectedFilePath)
      .pipe(first())
      .subscribe(fileContent => {
        try {
          const contentStr = atob(fileContent.content);
          this.repoService.uploadJsonContent(contentStr).pipe(first()).subscribe(() => {
            this.toastr.success('Repository content updated from GitHub file');
          });
        } catch (e) {
          this.toastr.error('Failed to parse GitHub file content');
        }
      }, _ => this.toastr.error('Failed to load file from GitHub'));
  }

  // Save current local app JSON into the selected GitHub file (create or update)
  saveToGithub(): void {
    if (!this.selectedRepo || !this.selectedFilePath) { return; }
    this.saving = true;
    const owner = this.owner;
    const repo = this.selectedRepo.name;
    const path = this.selectedFilePath;

    this.githubService.getFileContent(owner, repo, path).pipe(first()).subscribe(file => {
      const sha = file && file.sha ? file.sha : undefined;
      this.performSave(owner, repo, path, sha);
    }, _ => {
      // File does not exist -> create new
      this.performSave(owner, repo, path);
    });
  }

  private performSave(owner: string, repo: string, path: string, sha?: string): void {
    this.repoService.downloadAsJson().pipe(first()).subscribe(blob => {
      (blob as Blob).text().then(contentText => {
        this.githubService.createOrUpdateFile(owner, repo, path, contentText, sha).pipe(first()).subscribe(() => {
          this.toastr.success('File saved successfully');
          this.saving = false;
        }, _ => {
          this.toastr.error('Failed to save file to GitHub');
          this.saving = false;
        });
      }).catch(() => {
        this.toastr.error('Failed to prepare JSON content for GitHub');
        this.saving = false;
      });
    });
  }

  // Download local data as JSON
  download(): void {
    this.repoService.downloadAsJson().pipe(first()).subscribe(blob => {
      this.fileSaverService.save(blob, 'landscapr.json');
    });
  }

  // Upload local JSON file and apply to storage
  uploadDocument(files: any): void {
    const file = files[0];
    this.repoService.uploadJson(file).pipe(first()).subscribe(() => {
      this.toastr.success('Upload completed');
    }, _ => this.toastr.error('Upload failed'));
  }
}
