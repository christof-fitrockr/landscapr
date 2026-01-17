import { TestBed } from '@angular/core/testing';
import { AuthenticationService } from './authentication.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { GithubService } from './github.service';
import { User } from '../models/user';

describe('AuthenticationService', () => {
  let service: AuthenticationService;
  let githubServiceSpy: jasmine.SpyObj<GithubService>;

  beforeEach(() => {
    const spy = jasmine.createSpyObj('GithubService', ['getPersonalAccessToken', 'getUser']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthenticationService,
        { provide: GithubService, useValue: spy }
      ]
    });
    service = TestBed.inject(AuthenticationService);
    githubServiceSpy = TestBed.inject(GithubService) as jasmine.SpyObj<GithubService>;

    // Clear localStorage before each test
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should login successfully with correct code', (done) => {
    service.login('landscapr4digitalR€belz').subscribe(user => {
      expect(user).toBeTruthy();
      expect(user.success).toBeTrue();
      expect(user.username).toBe('Guest');
      expect(user.admin).toBeTrue();
      done();
    });
  });

  it('should fail login with incorrect code', (done) => {
    service.login('wrongcode').subscribe(user => {
      expect(user).toBeTruthy();
      expect(user.success).toBeFalse();
      expect(user.code).toBe('login-failed');
      done();
    });
  });
});
