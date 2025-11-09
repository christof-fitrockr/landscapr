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

  getRepoContents(owner: string, repo: string, path: string = ''): Observable<any[]> {
    return this.http.get<any[]>(`${this.GITHUB_API_URL}/repos/${owner}/${repo}/contents/${path}`, { headers: this.getAuthorizationHeaders() });
  }

  getFileContent(owner: string, repo: string, path: string): Observable<any> {
    return this.http.get(`${this.GITHUB_API_URL}/repos/${owner}/${repo}/contents/${path}`, {
      headers: this.getAuthorizationHeaders()
    });
  }

  createOrUpdateFile(owner: string, repo: string, path: string, content: string, sha?: string, message?: string): Observable<any> {
    const body: any = {
      message: (message && message.trim()) ? message.trim() : `feat: update ${path}`,
      content: btoa(content)
    };
    if (sha) body.sha = sha;
    return this.http.put(`${this.GITHUB_API_URL}/repos/${owner}/${repo}/contents/${path}`, body, {
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
