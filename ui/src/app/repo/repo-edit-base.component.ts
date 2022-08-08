import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {first} from 'rxjs/operators';
import {ToastrService} from 'ngx-toastr';
import {RepoService} from '../services/repo.service';
import {Repo} from '../models/repo';

@Component({selector: 'app-repo-edit', templateUrl: './repo-edit-base.component.html'})
export class RepoEditBaseComponent implements OnInit {

  repoForm: FormGroup;
  repo: Repo;
  private repoId: string;


  constructor(private repoService: RepoService, private formBuilder: FormBuilder,
              private route: ActivatedRoute, private router: Router, private toastr: ToastrService) {
  }


  ngOnInit() {
    this.repoForm = this.formBuilder.group({
      name: ['', Validators.required],
      description: [''],
      status: [0],
    });

    this.refresh();
  }

  private refresh() {
    this.repoId = this.route.parent.snapshot.paramMap.get('id');
    if (this.repoId != null) {
      this.repoService.byId(this.repoId).pipe(first()).subscribe(repo => {
        this.repo = repo;
        this.repoForm.patchValue(this.repo);
      });
    } else {
      this.repo = new Repo();
    }
  }

  onUpdate() {
    Object.keys(this.repoForm.controls).forEach(field => {
      const control = this.repoForm.get(field);
      control.markAsTouched({ onlySelf: true });
    });

    if (this.repoForm.valid) {
      this.repo = Object.assign(this.repo, this.repoForm.value);
      if(!this.repoId) {
        this.repoService.update(null, this.repo).pipe(first()).subscribe(repo => {
          this.router.navigateByUrl('/repository/edit/' + repo.id).then(() => {
            this.toastr.info('Repo created successfully');
            this.refresh()
          });
        });
      } else {
        this.repoService.update(this.repoId, this.repo).pipe(first()).subscribe(() => {
          this.toastr.info('Repo updated successfully');
          this.refresh();
        });
      }
    }
  }

  delete() {
    this.repoService.delete(this.repoId).pipe(first()).subscribe(() => {
      this.router.navigate(['/repository']).then(() => {
        this.toastr.info('Repo deleted successfully');
      });
    })
  }
}
