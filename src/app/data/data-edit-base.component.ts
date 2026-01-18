import {Component, OnDestroy, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, Validators, FormArray} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {first, map} from 'rxjs/operators';
import {ToastrService} from 'ngx-toastr';
import {DataService} from '../services/data.service';
import {Data, DataItem, DataType} from '../models/data';
import {Subscription, Observable, throwError} from 'rxjs';
import {v4 as uuidv4} from 'uuid';

@Component({selector: 'app-data-edit-base', templateUrl: './data-edit-base.component.html', styleUrls: ['./data-edit-base.component.scss']})
export class DataEditBaseComponent implements OnInit, OnDestroy {

  dataForm: FormGroup;
  dataObj: Data;
  dataId: string;
  returnTo: string;
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
      group: [''],
      state: [0],
      link: [''],
      items: this.formBuilder.array([])
    });

    // Load all data for reference dropdown
    this.allData$ = this.dataService.all().pipe(
      map(list => list.filter(d => !d.isSubObject))
    );

    this.subscription = this.route.parent.paramMap.subscribe(obs => {
        this.refresh();
    });
    this.route.queryParamMap.subscribe(params => {
      this.returnTo = params.get('returnTo');
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
            group: data.group,
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
    this.saveParent().subscribe(() => {
       if(!this.dataId) {
          // If we just created it, we are already navigated?
          // Wait, saveParent handles create and returns ID.
          // But existing onUpdate logic did navigation and toastr.
          // I should preserve the existing behavior for manual save.
          this.toastr.info('Data saved successfully');
       } else {
          this.toastr.info('Data updated successfully');
          this.refresh();
       }
    });
  }

  private saveParent(): Observable<string> {
    this.dataForm.markAllAsTouched();

    if (this.dataForm.valid) {
      this.dataObj = Object.assign(this.dataObj, this.dataForm.value);
      // Ensure items is correct
      this.dataObj.items = this.items.value;

      if(!this.dataId) {
        return this.dataService.create(this.dataObj).pipe(first(), map(docRef => {
           this.router.navigateByUrl('/data/edit/' + docRef.id); // Update URL to new ID
           return docRef.id;
        }));
      } else {
        return this.dataService.update(this.dataId, this.dataObj).pipe(first(), map(() => this.dataId));
      }
    }
    return throwError('Invalid form');
  }

  editSubObject(index: number) {
      this.saveParent().pipe(first()).subscribe(parentId => {
          const itemControl = this.items.at(index);
          const currentDataId = itemControl.get('dataId').value;

          if (currentDataId) {
               this.router.navigate(['/data/edit', currentDataId, 'base'], { queryParams: { returnTo: parentId } });
          } else {
               // Create new sub object
               const subData = new Data();
               subData.name = this.dataObj.name + ' - ' + itemControl.get('name').value;
               subData.isSubObject = true;
               subData.parentId = parentId;
               subData.state = 0; // Draft

               this.dataService.create(subData).pipe(first()).subscribe(newSub => {
                   // Update parent item with new ID
                   itemControl.patchValue({ dataId: newSub.id });
                   // Save parent again to persist the link
                   this.saveParent().subscribe(() => {
                        this.router.navigate(['/data/edit', newSub.id, 'base'], { queryParams: { returnTo: parentId } });
                   });
               });
          }
      }, error => {
          this.toastr.error('Please fix validation errors before configuring sub-object');
      });
  }

  delete() {
    this.dataService.delete(this.dataId).pipe(first()).subscribe(() => {
      this.router.navigateByUrl('/data/list').then(() => {
        this.toastr.info('Data deleted successfully');
      });
    })
  }
}
