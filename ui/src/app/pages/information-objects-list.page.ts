import {Component, OnInit} from '@angular/core';
import {AppService} from '../services/app.service';
import {InformationObject} from '../models/information-object';
import {InformationObjectService} from '../services/information-object.service';

@Component({
  selector: 'app-root',
  templateUrl: './information-objects-list.page.html',
  styleUrls: ['./information-objects-list.page.scss']
})
export class InformationObjectsPage implements OnInit {

  informationObjects: InformationObject[];
  selectedInformationObject: InformationObject = null;
  searchText: string;
  editMode: boolean;

  constructor(private appService: AppService, private informationObjectService: InformationObjectService) { }

  ngOnInit() {
    this.informationObjectService.list().snapshotChanges().subscribe(item => {
      this.informationObjects = [];
      item.forEach(element => {
        const key = element.payload.toJSON();
        key['$key'] = element.key;

        if(!this.selectedInformationObject) {
          this.selectedInformationObject = key as InformationObject;
        }

        this.informationObjects.push(key as InformationObject);
      });
    });
  }

  onEdit(informationObject: InformationObject, editMode: boolean) {
    this.editMode = editMode;
    this.selectedInformationObject = Object.assign({}, informationObject);
  }

  onDelete(key: string) {
    if (confirm('Are you sure to delete this record ?') == true) {
      this.informationObjectService.delete(key);
      //TODO this.tostr.warning("Deleted Successfully", "Employee register");
    }
  }

  createNew() {
    this.editMode = true;
    this.selectedInformationObject = Object.assign(new InformationObject());
  }
}
