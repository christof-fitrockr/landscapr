import {Component, OnDestroy, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, Validators, FormArray} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {first} from 'rxjs/operators';
import {ToastrService} from 'ngx-toastr';
import {DataService} from '../services/data.service';
import {Data, DataItem, DataType} from '../models/data';
import {Subscription, Observable} from 'rxjs';
import {v4 as uuidv4} from 'uuid';

@Component({selector: 'app-data-edit-base', templateUrl: './data-edit-base.component.html', styleUrls: ['./data-edit-base.component.scss']})
export class DataEditBaseComponent implements OnInit, OnDestroy {

  dataForm: FormGroup;
  dataObj: Data;
  dataId: string;
  allData$: Observable<Data[]>;
  DataType = DataType;

  private subscription: Subscription;

  constructor(private dataService: DataService,
              private formBuilder: FormBuilder, private route: ActivatedRoute, private router: Router, private toastr: ToastrService) {
  }

  ngOnInit() {
    this.dataForm = this.formBuilder.group({
      name: ['', Validators.required],
      description: [''],
      state: [0],
      link: [''],
      items: this.formBuilder.array([])
    });

    // Load all data for reference dropdown
    this.allData$ = this.dataService.all();

    this.subscription = this.route.parent.paramMap.subscribe(obs => {
        this.refresh();
    });
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  get items(): FormArray {
    return this.dataForm.get('items') as FormArray;
  }

  newItem(): FormGroup {
    return this.formBuilder.group({
      id: [uuidv4()],
      name: ['', Validators.required],
      description: [''],
      state: [0],
      type: [DataType.Primitive],
      primitiveType: ['String'],
      dataId: [null]
    });
  }

  addItem() {
    this.items.push(this.newItem());
  }

  removeItem(index: number) {
    this.items.removeAt(index);
  }

  private refresh() {
    this.dataId = this.route.parent.snapshot.paramMap.get('id');
    if (this.dataId != null) {
      this.dataService.byId(this.dataId).pipe(first()).subscribe(data => {
        this.dataObj = data;
        this.dataForm.patchValue({
            name: data.name,
            description: data.description,
            state: data.state,
            link: data.link
        });
        this.items.clear();
        if (data.items) {
            data.items.forEach(item => {
                const group = this.newItem();
                group.patchValue(item);
                this.items.push(group);
            });
        }
      });
    } else {
      this.dataObj = new Data();
    }
  }

  onUpdate() {
    this.dataForm.markAllAsTouched();

    if (this.dataForm.valid) {
      this.dataObj = Object.assign(this.dataObj, this.dataForm.value);

      // Ensure items is correct
      this.dataObj.items = this.items.value;

      if(!this.dataId) {
        this.dataService.create(this.dataObj).pipe(first()).subscribe(docRef => {
          this.router.navigateByUrl('/data/edit/' + docRef.id).then(() => {
            this.toastr.info('Data created successfully');
            this.refresh()
          });
        });
      } else {
        this.dataService.update(this.dataId, this.dataObj).pipe(first()).subscribe(() => {
          this.toastr.info('Data updated successfully');
          this.refresh();
        });
      }
    }
  }

  delete() {
    this.dataService.delete(this.dataId).pipe(first()).subscribe(() => {
      this.router.navigateByUrl('/data/list').then(() => {
        this.toastr.info('Data deleted successfully');
      });
    })
  }
}
