import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GithubService {

  private readonly GITHUB_API_URL = 'https://api.github.com';
  private readonly GITHUB_PAT_KEY = 'github_pat';

  constructor(private http: HttpClient) { }

  setPersonalAccessToken(token: string): void {
    localStorage.setItem(this.GITHUB_PAT_KEY, token);
  }

  getPersonalAccessToken(): string | null {
    return localStorage.getItem(this.GITHUB_PAT_KEY);
  }

  getUser(): Observable<any> {
    return this.http.get(`${this.GITHUB_API_URL}/user`, { headers: this.getAuthorizationHeaders() });
  }

  getRepos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.GITHUB_API_URL}/user/repos`, { headers: this.getAuthorizationHeaders() });
  }

  getBranches(owner: string, repo: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.GITHUB_API_URL}/repos/${owner}/${repo}/branches`, { headers: this.getAuthorizationHeaders() });
  }

  getRepoContents(owner: string, repo: string, path: string = ''): Observable<any[]> {
    return this.http.get<any[]>(`${this.GITHUB_API_URL}/repos/${owner}/${repo}/contents/${path}`, { headers: this.getAuthorizationHeaders() });
  }

  getFileContent(owner: string, repo: string, path: string, ref?: string): Observable<any> {
    let url = `${this.GITHUB_API_URL}/repos/${owner}/${repo}/contents/${path}`;
    if (ref) {
      url += `?ref=${ref}`;
    }
    return this.http.get(url, {
      headers: this.getAuthorizationHeaders()
    });
  }

  getRef(owner: string, repo: string, ref: string): Observable<any> {
    return this.http.get<any>(`${this.GITHUB_API_URL}/repos/${owner}/${repo}/git/ref/${ref}`, { headers: this.getAuthorizationHeaders() });
  }

  createBranch(owner: string, repo: string, branchName: string, sha: string): Observable<any> {
    const body = {
      ref: `refs/heads/${branchName}`,
      sha: sha
    };
    return this.http.post<any>(`${this.GITHUB_API_URL}/repos/${owner}/${repo}/git/refs`, body, { headers: this.getAuthorizationHeaders() });
  }

  createPullRequest(owner: string, repo: string, title: string, body: string, head: string, base: string): Observable<any> {
    const payload = {
      title,
      body,
      head,
      base
    };
    return this.http.post<any>(`${this.GITHUB_API_URL}/repos/${owner}/${repo}/pulls`, payload, { headers: this.getAuthorizationHeaders() });
  }

  createOrUpdateFile(owner: string, repo: string, path: string, content: string, sha?: string, message?: string, branch?: string): Observable<any> {
    const body: any = {
      message: (message && message.trim()) ? message.trim() : `feat: update ${path}`,
      content: btoa(content)
    };
    if (sha) body.sha = sha;
    if (branch) body.branch = branch;
    return this.http.put(`${this.GITHUB_API_URL}/repos/${owner}/${repo}/contents/${path}`, body, {
      headers: this.getAuthorizationHeaders()
    });
  }

  getCommits(owner: string, repo: string, branch: string = 'main'): Observable<any[]> {
    return this.http.get<any[]>(`${this.GITHUB_API_URL}/repos/${owner}/${repo}/commits?sha=${branch}&per_page=10`, {
      headers: this.getAuthorizationHeaders()
    });
  }

  private getAuthorizationHeaders(): HttpHeaders {
    const token = this.getPersonalAccessToken();
    if (token) {
      return new HttpHeaders().set('Authorization', `token ${token}`);
    }
    return new HttpHeaders();
  }
}
