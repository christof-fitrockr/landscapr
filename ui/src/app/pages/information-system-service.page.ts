import {Component, OnInit} from '@angular/core';
import {InformationSystemService} from '../models/information-system-service';
import {AppService} from '../services/app.service';
import {InformationSystemServiceService} from '../services/information-system-service.service';


@Component({
  selector: 'app-root',
  templateUrl: './information-system-service.page.html',
  styleUrls: ['./information-system-service.page.scss']
})
export class InformationSystemServicePage implements OnInit {

  informationSystemServices: InformationSystemService[];
  selectedISS: InformationSystemService = null;
  searchText: string;
  editMode: boolean;

  constructor(private issService: InformationSystemServiceService) { }

  ngOnInit() {
    this.issService.list().snapshotChanges().subscribe(item => {
      this.informationSystemServices = [];
      item.forEach(element => {
        const key = element.payload.toJSON();
        key['$key'] = element.key;

        if (!this.selectedISS) {
          this.selectedISS = key as InformationSystemService;
        }

        this.informationSystemServices.push(key as InformationSystemService);
      });
    });
  }


  onEdit(informationSystemService: InformationSystemService, editMode: boolean) {
    this.editMode = editMode;
    this.selectedISS = Object.assign({}, informationSystemService);
  }

  onDelete(key: string) {
    if (confirm('Are you sure to delete this record ?') === true) {
      this.issService.delete(key);
      // TODO this.tostr.warning("Deleted Successfully", "Employee register");
    }
  }

  createNew() {
    this.editMode = true;
    this.selectedISS = Object.assign(new InformationSystemService());
  }
}
