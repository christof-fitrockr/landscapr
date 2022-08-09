import {Component, OnInit} from '@angular/core';
import {first} from 'rxjs/operators';
import {AccountService} from '../services/account.service';
import {Account} from '../models/account';
import {ApplicationService} from '../services/application.service';
import {CapabilityService} from '../services/capability.service';
import {Capability} from '../models/capability';
import {Application} from '../models/application';
import {ApiCallService} from '../services/api-call.service';
import {ApiCall} from '../models/api-call';
import {ProcessService} from '../services/process.service';
import {Step, StepSuccessor} from '../models/process';
import {Observable} from 'rxjs';
import {Repo} from '../models/repo';
import {RepoService} from '../services/repo.service';

@Component({selector: 'app-account-list', templateUrl: './import-export.component.html'})
export class ImportExportComponent implements OnInit {
  systemMap = new Map<string, Application>();
  capMap = new Map<string, Capability>();
  callMap = new Map<string, ApiCall>();
  idMap = new Map<string, string>();

  repos$: Observable<Repo[]>;

  constructor(private accountService: AccountService,
              private systemService: ApplicationService,
              private capabilityService: CapabilityService,
              private apiCallService: ApiCallService,
              private processService: ProcessService,
              private repoService: RepoService) {
  }

  accounts: Account[];
  searchText: string;
  systems: string = "[\n" +
    "  {\n" +
    "    \"systemCluster\": \"\",\n" +
    "    \"name\": \"APOSNF\",\n" +
    "    \"description\": \"\",\n" +
    "    \"contact\": \"\",\n" +
    "    \"status\": 0,\n" +
    "    \"systemId\": \"72pI1wayUXUomdptTbot\",\n" +
    "    \"url\": \"\",\n" +
    "    \"tags\": []\n" +
    "  },\n" +
    "  {\n" +
    "    \"url\": \"\",\n" +
    "    \"systemId\": \"xvZFNjPOy9BIy7Ui3B8g\",\n" +
    "    \"systemCluster\": \"\",\n" +
    "    \"status\": 0,\n" +
    "    \"description\": \"\",\n" +
    "    \"name\": \"ASID\",\n" +
    "    \"tags\": null,\n" +
    "    \"contact\": \"\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"name\": \"AutoPart\",\n" +
    "    \"description\": \"\",\n" +
    "    \"systemId\": \"4vEMg6g7nWqkNCNe4pEq\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"name\": \"CRM\",\n" +
    "    \"description\": \"\",\n" +
    "    \"systemId\": \"yIPcufRS0bP92AsB290s\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"description\": \"Mainframe Vehicle Management System. To be shut down until 2017.\\nSuccessor => GVF\",\n" +
    "    \"status\": 1,\n" +
    "    \"contact\": \"\",\n" +
    "    \"systemCluster\": \"C4\",\n" +
    "    \"name\": \"Carport\",\n" +
    "    \"url\": \"\",\n" +
    "    \"systemId\": \"HspbFWfFAhoHzJbb7cGr\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"description\": \"\",\n" +
    "    \"name\": \"Customer Portal/APP (local)\",\n" +
    "    \"systemId\": \"PPBuuYEiE2J9k5EUj1ca\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"name\": \"DISS\",\n" +
    "    \"description\": \"\",\n" +
    "    \"systemId\": \"SrbOsklSsJR3uabVs8r4\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"contact\": \"\",\n" +
    "    \"systemId\": \"TE6iB8ZSf09gLY8cLQ8Z\",\n" +
    "    \"name\": \"DMS\",\n" +
    "    \"description\": \"\",\n" +
    "    \"url\": \"\",\n" +
    "    \"systemCluster\": \"CX\",\n" +
    "    \"status\": 0\n" +
    "  },\n" +
    "  {\n" +
    "    \"description\": \"\",\n" +
    "    \"name\": \"ET2000\",\n" +
    "    \"systemId\": \"U4Nwwr2cZvIuHGseMl5e\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"description\": \"\",\n" +
    "    \"name\": \"ETKA\",\n" +
    "    \"systemId\": \"n6q7YQzxhtD8XodgfmTd\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"systemId\": \"bIqafHLeeS8q0XPrpd1t\",\n" +
    "    \"description\": \"\",\n" +
    "    \"name\": \"Elsa\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"contact\": \"\",\n" +
    "    \"url\": \"\",\n" +
    "    \"tags\": null,\n" +
    "    \"systemCluster\": \"\",\n" +
    "    \"description\": \"\",\n" +
    "    \"status\": 0,\n" +
    "    \"name\": \"Ersatzmobilität\",\n" +
    "    \"systemId\": \"A04b10VXpjlCG1Uel0rB\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"name\": \"GSC\",\n" +
    "    \"description\": \"\",\n" +
    "    \"systemId\": \"bBQWRVo0FaztkPoThn8n\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"status\": 0,\n" +
    "    \"contact\": \"\",\n" +
    "    \"name\": \"GSK\",\n" +
    "    \"description\": \"Group Service Key\",\n" +
    "    \"systemCluster\": \"C1\",\n" +
    "    \"url\": \"\",\n" +
    "    \"systemId\": \"yTB2lCq5I40A2JrJXBmY\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"systemId\": \"MbCdVJx2wBgXLdc04rGL\",\n" +
    "    \"systemCluster\": \"C4\",\n" +
    "    \"name\": \"GVF\",\n" +
    "    \"status\": 1,\n" +
    "    \"contact\": \"christof.kuhlmeyer@volkswagen.de\",\n" +
    "    \"description\": \"Group Vehicle File is the Master System for Vehicle Data\",\n" +
    "    \"url\": \"\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"description\": \"\",\n" +
    "    \"name\": \"KVPS\",\n" +
    "    \"systemId\": \"O2ybMmCBkbuVAIWxOP10\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"name\": \"Kassensystem\",\n" +
    "    \"url\": \"\",\n" +
    "    \"contact\": \"\",\n" +
    "    \"description\": \"\",\n" +
    "    \"status\": 0,\n" +
    "    \"systemCluster\": \"\",\n" +
    "    \"tags\": null,\n" +
    "    \"systemId\": \"Pe6Fid2q2fX7TYPyqspD\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"name\": \"LeadInbox\",\n" +
    "    \"description\": \"\",\n" +
    "    \"systemId\": \"0Xe2zTc7X39XwgUkziUN\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"description\": \"\",\n" +
    "    \"name\": \"MSQP\",\n" +
    "    \"systemId\": \"qU4K2DGPdGUDrzozvT4J\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"status\": 0,\n" +
    "    \"tags\": null,\n" +
    "    \"systemCluster\": \"\",\n" +
    "    \"description\": \"\",\n" +
    "    \"contact\": \"\",\n" +
    "    \"name\": \"Media Hub\",\n" +
    "    \"url\": \"\",\n" +
    "    \"systemId\": \"PFAEIDeruswWdR7DFnIN\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"name\": \"ODIS\",\n" +
    "    \"description\": \"\",\n" +
    "    \"systemId\": \"1AFpcEzS9PHdfBfBMP6i\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"systemCluster\": \"C1\",\n" +
    "    \"status\": 0,\n" +
    "    \"systemId\": \"WXLdSdoMrwFl8uJPQSE2\",\n" +
    "    \"description\": \"Order Management Database. Synchronizes the Retail Orders.\",\n" +
    "    \"contact\": \"\",\n" +
    "    \"url\": \"\",\n" +
    "    \"name\": \"OrMa\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"name\": \"PAT\",\n" +
    "    \"description\": \"\",\n" +
    "    \"status\": 0,\n" +
    "    \"systemCluster\": \"C1\",\n" +
    "    \"contact\": \"\",\n" +
    "    \"url\": \"\",\n" +
    "    \"systemId\": \"Zqim3C6ZPcFQQCsdNNeb\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"description\": \"\",\n" +
    "    \"name\": \"PPSO\",\n" +
    "    \"systemId\": \"SSQUDVIOm46AH7lcXN7P\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"name\": \"Partslink/24\",\n" +
    "    \"description\": \"\",\n" +
    "    \"systemId\": \"OMZyA6t69SykAshXgYnG\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"description\": \"\",\n" +
    "    \"name\": \"ReCall\",\n" +
    "    \"systemId\": \"2Y29lqHsBaGNrHjKl1ZZ\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"systemCluster\": \"C4\",\n" +
    "    \"systemId\": \"pAXjF4lMJMcqz09pcb3T\",\n" +
    "    \"url\": \"\",\n" +
    "    \"status\": 0,\n" +
    "    \"contact\": \"\",\n" +
    "    \"name\": \"Reserve\",\n" +
    "    \"description\": \"System to store the maintenance events of a vehicle\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"name\": \"SAGA/2\",\n" +
    "    \"description\": \"\",\n" +
    "    \"systemId\": \"KzYI40bz72s5OeYlvylP\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"name\": \"SPR\",\n" +
    "    \"systemCluster\": \"\",\n" +
    "    \"url\": \"\",\n" +
    "    \"contact\": \"\",\n" +
    "    \"description\": \"\",\n" +
    "    \"status\": 0,\n" +
    "    \"systemId\": \"aPpnS6xc1O1RM14PP8n3\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"url\": \"\",\n" +
    "    \"name\": \"ServiceCam\",\n" +
    "    \"description\": \"\",\n" +
    "    \"contact\": \"\",\n" +
    "    \"systemCluster\": \"\",\n" +
    "    \"tags\": null,\n" +
    "    \"status\": 1,\n" +
    "    \"systemId\": \"lFrKjYoGFW1w6y8U6HsU\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"tags\": null,\n" +
    "    \"description\": \"\",\n" +
    "    \"url\": \"\",\n" +
    "    \"systemCluster\": \"\",\n" +
    "    \"name\": \"Terminplanungssystem\",\n" +
    "    \"status\": 0,\n" +
    "    \"contact\": \"\",\n" +
    "    \"systemId\": \"p9DU7iKOdGSlg2Q6trTo\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"tags\": null,\n" +
    "    \"url\": \"\",\n" +
    "    \"systemCluster\": \"\",\n" +
    "    \"description\": \"\",\n" +
    "    \"contact\": \"\",\n" +
    "    \"name\": \"Time clock\",\n" +
    "    \"status\": 0,\n" +
    "    \"systemId\": \"1yeeGZPf0XbVIw0olRd9\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"name\": \"ToolOrg\",\n" +
    "    \"systemCluster\": \"\",\n" +
    "    \"url\": \"\",\n" +
    "    \"tags\": null,\n" +
    "    \"status\": 0,\n" +
    "    \"description\": \"\",\n" +
    "    \"contact\": \"\",\n" +
    "    \"systemId\": \"m4oqrTDJu23NmMOYJWPS\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"name\": \"Volkswagen We Connect\",\n" +
    "    \"description\": \"\",\n" +
    "    \"systemId\": \"OP6Nhjqvhve6byy9F198\"\n" +
    "  }\n" +
    "]";
  capabilities: string = "[\n" +
    "  {\n" +
    "    \"capabilityId\": \"rHpOqt8GndKfwDynllZ6\",\n" +
    "    \"description\": \"\",\n" +
    "    \"implementedBy\": [\n" +
    "      \"TE6iB8ZSf09gLY8cLQ8Z\",\n" +
    "      \"PPBuuYEiE2J9k5EUj1ca\"\n" +
    "    ],\n" +
    "    \"tags\": [],\n" +
    "    \"name\": \"Appointment Data Management\",\n" +
    "    \"status\": 0\n" +
    "  },\n" +
    "  {\n" +
    "    \"status\": 0,\n" +
    "    \"capabilityId\": \"Cbofv8aU2rFvm7Ykbh9L\",\n" +
    "    \"name\": \"Billing & Payment\",\n" +
    "    \"description\": \"\",\n" +
    "    \"implementedBy\": [\n" +
    "      \"TE6iB8ZSf09gLY8cLQ8Z\"\n" +
    "    ]\n" +
    "  },\n" +
    "  {\n" +
    "    \"status\": 0,\n" +
    "    \"name\": \"Complaint Management\",\n" +
    "    \"implementedBy\": [\n" +
    "      \"SrbOsklSsJR3uabVs8r4\",\n" +
    "      \"PFAEIDeruswWdR7DFnIN\"\n" +
    "    ],\n" +
    "    \"capabilityId\": \"fXCjOUJbOyPzFIx9E5QB\",\n" +
    "    \"description\": \"\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"description\": \"\",\n" +
    "    \"name\": \"Customer Data Management\",\n" +
    "    \"capabilityId\": \"HjpQkFH1gVoBySJ39w02\",\n" +
    "    \"implementedBy\": [\n" +
    "      \"aPpnS6xc1O1RM14PP8n3\",\n" +
    "      \"TE6iB8ZSf09gLY8cLQ8Z\"\n" +
    "    ]\n" +
    "  },\n" +
    "  {\n" +
    "    \"description\": \"\",\n" +
    "    \"capabilityId\": \"AxlZw3nnWAFdFKb4MQ64\",\n" +
    "    \"name\": \"Dealer Data Management\",\n" +
    "    \"implementedBy\": [\n" +
    "      \"TE6iB8ZSf09gLY8cLQ8Z\",\n" +
    "      \"O2ybMmCBkbuVAIWxOP10\",\n" +
    "      \"PPBuuYEiE2J9k5EUj1ca\",\n" +
    "      \"OP6Nhjqvhve6byy9F198\"\n" +
    "    ]\n" +
    "  },\n" +
    "  {\n" +
    "    \"capabilityId\": \"Llf6Q4qEsndsLIugvFPk\",\n" +
    "    \"description\": \"\",\n" +
    "    \"name\": \"Lead Data Management\",\n" +
    "    \"status\": 0\n" +
    "  },\n" +
    "  {\n" +
    "    \"implementedBy\": [\n" +
    "      \"WXLdSdoMrwFl8uJPQSE2\",\n" +
    "      \"TE6iB8ZSf09gLY8cLQ8Z\",\n" +
    "      \"SSQUDVIOm46AH7lcXN7P\",\n" +
    "      \"Zqim3C6ZPcFQQCsdNNeb\",\n" +
    "      \"lFrKjYoGFW1w6y8U6HsU\"\n" +
    "    ],\n" +
    "    \"capabilityId\": \"Klpz11yehhnRLRwrfS87\",\n" +
    "    \"description\": \"\",\n" +
    "    \"name\": \"Offer Data Management\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"name\": \"Order Administration\",\n" +
    "    \"description\": \"\",\n" +
    "    \"implementedBy\": [\n" +
    "      \"WXLdSdoMrwFl8uJPQSE2\",\n" +
    "      \"SSQUDVIOm46AH7lcXN7P\"\n" +
    "    ],\n" +
    "    \"capabilityId\": \"46AKmX3hvUwRBX6qxUIM\",\n" +
    "    \"status\": 0\n" +
    "  },\n" +
    "  {\n" +
    "    \"capabilityId\": \"w2xm9AWx8AAkxAqXPhFM\",\n" +
    "    \"status\": 0,\n" +
    "    \"name\": \"Parts Data Management\",\n" +
    "    \"description\": \"\",\n" +
    "    \"implementedBy\": [\n" +
    "      \"n6q7YQzxhtD8XodgfmTd\",\n" +
    "      \"U4Nwwr2cZvIuHGseMl5e\",\n" +
    "      \"4vEMg6g7nWqkNCNe4pEq\",\n" +
    "      \"OMZyA6t69SykAshXgYnG\"\n" +
    "    ]\n" +
    "  },\n" +
    "  {\n" +
    "    \"capabilityId\": \"4B8Ikio1lRzT7cqSXjho\",\n" +
    "    \"description\": \"\",\n" +
    "    \"implementedBy\": [\n" +
    "      \"qU4K2DGPdGUDrzozvT4J\"\n" +
    "    ],\n" +
    "    \"status\": 0,\n" +
    "    \"name\": \"Quality Management\",\n" +
    "    \"tags\": \"\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"capabilityId\": \"SfOc8ovM9x0iMYMSzoGd\",\n" +
    "    \"description\": \"\",\n" +
    "    \"implementedBy\": [\n" +
    "      \"bIqafHLeeS8q0XPrpd1t\",\n" +
    "      \"72pI1wayUXUomdptTbot\",\n" +
    "      \"xvZFNjPOy9BIy7Ui3B8g\",\n" +
    "      \"m4oqrTDJu23NmMOYJWPS\"\n" +
    "    ],\n" +
    "    \"tags\": \"\",\n" +
    "    \"status\": 0,\n" +
    "    \"name\": \"Repair Management\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"status\": 0,\n" +
    "    \"name\": \"Vehicle Data Management\",\n" +
    "    \"implementedBy\": [\n" +
    "      \"MbCdVJx2wBgXLdc04rGL\",\n" +
    "      \"HspbFWfFAhoHzJbb7cGr\"\n" +
    "    ],\n" +
    "    \"capabilityId\": \"xLmfHHCHQKHIh215yBdA\",\n" +
    "    \"description\": \"Contains all functions to manage vehicle data\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"capabilityId\": \"2ur4he5in23k5vgmtEOe\",\n" +
    "    \"description\": \"\",\n" +
    "    \"implementedBy\": [\n" +
    "      \"1AFpcEzS9PHdfBfBMP6i\"\n" +
    "    ],\n" +
    "    \"name\": \"Vehicle Diagnosis\",\n" +
    "    \"status\": 0\n" +
    "  },\n" +
    "  {\n" +
    "    \"implementedBy\": [\n" +
    "      \"KzYI40bz72s5OeYlvylP\"\n" +
    "    ],\n" +
    "    \"description\": \"\",\n" +
    "    \"capabilityId\": \"xLQ1pCL4Ex3PPAgOr5iO\",\n" +
    "    \"name\": \"Warranty Management\",\n" +
    "    \"status\": 0,\n" +
    "    \"tags\": \"\"\n" +
    "  }\n" +
    "]";

  apiCalls = "[\n" +
    "  {\n" +
    "    \"implementedBy\": [\n" +
    "      \"PPBuuYEiE2J9k5EUj1ca\"\n" +
    "    ],\n" +
    "    \"implementationType\": 2,\n" +
    "    \"name\": \"Get Customer Details\",\n" +
    "    \"tags\": \"\",\n" +
    "    \"implementationStatus\": \"\",\n" +
    "    \"input\": \"Credentials\",\n" +
    "    \"capabilityId\": \"HjpQkFH1gVoBySJ39w02\",\n" +
    "    \"dataStatus\": 1,\n" +
    "    \"apiCallId\": \"yFuWrwnchjcyDODwDgSt\",\n" +
    "    \"description\": \"Identifiziere einen Kunden anhand seines Logins\",\n" +
    "    \"output\": \"Customer Details\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"tags\": \"\",\n" +
    "    \"dataStatus\": 1,\n" +
    "    \"implementationType\": 0,\n" +
    "    \"input\": \"VIN\",\n" +
    "    \"description\": \"Get the details of a vehicle by the vehicle identification number\",\n" +
    "    \"capabilityId\": \"xLmfHHCHQKHIh215yBdA\",\n" +
    "    \"implementedBy\": [\n" +
    "      \"MbCdVJx2wBgXLdc04rGL\",\n" +
    "      \"HspbFWfFAhoHzJbb7cGr\"\n" +
    "    ],\n" +
    "    \"name\": \"Get Vehicle Details \",\n" +
    "    \"implementationStatus\": 3,\n" +
    "    \"output\": \"Vehicle Details\",\n" +
    "    \"apiCallId\": \"KDvWWeZOAjcX8p8zuWxE\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"output\": \"\",\n" +
    "    \"apiCallId\": \"B5fc62LW3QNxCF6TFPWX\",\n" +
    "    \"description\": \"via ODIS\",\n" +
    "    \"tags\": \"\",\n" +
    "    \"dataStatus\": 1,\n" +
    "    \"implementationType\": 0,\n" +
    "    \"name\": \"check Vehicle (diagnosis)\",\n" +
    "    \"capabilityId\": \"2ur4he5in23k5vgmtEOe\",\n" +
    "    \"implementationStatus\": 2,\n" +
    "    \"input\": \"\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"dataStatus\": 1,\n" +
    "    \"implementationType\": 2,\n" +
    "    \"description\": \"out of information from car, customer, and further information\",\n" +
    "    \"name\": \"create Lead\",\n" +
    "    \"tags\": [],\n" +
    "    \"implementationStatus\": 2,\n" +
    "    \"capabilityId\": \"Llf6Q4qEsndsLIugvFPk\",\n" +
    "    \"output\": \"\",\n" +
    "    \"input\": \"\",\n" +
    "    \"apiCallId\": \"fCWlKsM78dJ0Uo3niuux\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"implementationStatus\": \"\",\n" +
    "    \"input\": \"\",\n" +
    "    \"description\": \"\",\n" +
    "    \"implementationType\": \"\",\n" +
    "    \"dataStatus\": 0,\n" +
    "    \"output\": \"\",\n" +
    "    \"apiCallId\": \"nC3CFEQPxyZmDPYF1c43\",\n" +
    "    \"tags\": \"\",\n" +
    "    \"capabilityId\": \"Klpz11yehhnRLRwrfS87\",\n" +
    "    \"name\": \"create Offer\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"tags\": \"\",\n" +
    "    \"dataStatus\": 0,\n" +
    "    \"input\": \"\",\n" +
    "    \"implementationType\": \"\",\n" +
    "    \"description\": \"ein Werkstattauftrag wird erstellt und im DMS gespeichert\",\n" +
    "    \"output\": \"\",\n" +
    "    \"name\": \"create Order\",\n" +
    "    \"implementationStatus\": \"\",\n" +
    "    \"capabilityId\": \"46AKmX3hvUwRBX6qxUIM\",\n" +
    "    \"apiCallId\": \"IGBKXBjGvjrIQIb5qWuL\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"tags\": \"\",\n" +
    "    \"apiCallId\": \"75JeFi6eHv9TbQIUjkJS\",\n" +
    "    \"implementationStatus\": 2,\n" +
    "    \"description\": \"within DISS\",\n" +
    "    \"input\": \"\",\n" +
    "    \"implementationType\": 0,\n" +
    "    \"name\": \"create complaint\",\n" +
    "    \"output\": \"\",\n" +
    "    \"dataStatus\": 1,\n" +
    "    \"capabilityId\": \"fXCjOUJbOyPzFIx9E5QB\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"output\": \"\",\n" +
    "    \"name\": \"create invoice\",\n" +
    "    \"dataStatus\": 0,\n" +
    "    \"implementationType\": \"\",\n" +
    "    \"implementationStatus\": \"\",\n" +
    "    \"capabilityId\": \"Cbofv8aU2rFvm7Ykbh9L\",\n" +
    "    \"tags\": \"\",\n" +
    "    \"input\": \"\",\n" +
    "    \"description\": \"\",\n" +
    "    \"apiCallId\": \"EGn9TWHEuLo12efn1Bvh\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"description\": \"back to customer if everything's fine\",\n" +
    "    \"output\": \"\",\n" +
    "    \"dataStatus\": 0,\n" +
    "    \"implementationType\": \"\",\n" +
    "    \"capabilityId\": \"rHpOqt8GndKfwDynllZ6\",\n" +
    "    \"implementationStatus\": \"\",\n" +
    "    \"name\": \"get Appointment confirmation\",\n" +
    "    \"input\": \"\",\n" +
    "    \"apiCallId\": \"5eymKmYqYcLbNKtqh1zA\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"implementationStatus\": \"\",\n" +
    "    \"capabilityId\": \"rHpOqt8GndKfwDynllZ6\",\n" +
    "    \"dataStatus\": 0,\n" +
    "    \"input\": \"\",\n" +
    "    \"output\": \"\",\n" +
    "    \"description\": \"from DMS / local System\",\n" +
    "    \"name\": \"get Appointment slots\",\n" +
    "    \"implementationType\": \"\",\n" +
    "    \"apiCallId\": \"DKmjgd5KR5UhMwbPkyJn\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"implementationStatus\": \"\",\n" +
    "    \"capabilityId\": \"fXCjOUJbOyPzFIx9E5QB\",\n" +
    "    \"input\": \"\",\n" +
    "    \"dataStatus\": 0,\n" +
    "    \"implementationType\": \"\",\n" +
    "    \"description\": \"\",\n" +
    "    \"tags\": \"\",\n" +
    "    \"name\": \"get DISS notification\",\n" +
    "    \"output\": \"\",\n" +
    "    \"apiCallId\": \"d6WOThHdeXiaiQ39Az3L\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"implementationType\": \"\",\n" +
    "    \"output\": \"\",\n" +
    "    \"input\": \"\",\n" +
    "    \"apiCallId\": \"tG9KB3Yte2UChR9QxbhO\",\n" +
    "    \"implementationStatus\": \"\",\n" +
    "    \"tags\": \"\",\n" +
    "    \"dataStatus\": 0,\n" +
    "    \"description\": \"from KVPS\",\n" +
    "    \"capabilityId\": \"AxlZw3nnWAFdFKb4MQ64\",\n" +
    "    \"name\": \"get Dealer\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"dataStatus\": 0,\n" +
    "    \"implementationType\": \"\",\n" +
    "    \"implementationStatus\": \"\",\n" +
    "    \"description\": \"\",\n" +
    "    \"output\": \"\",\n" +
    "    \"name\": \"get Leads\",\n" +
    "    \"input\": \"\",\n" +
    "    \"capabilityId\": \"Llf6Q4qEsndsLIugvFPk\",\n" +
    "    \"apiCallId\": \"8zURFhTMbaffPITb3cDH\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"name\": \"get Mileage\",\n" +
    "    \"capabilityId\": \"xLmfHHCHQKHIh215yBdA\",\n" +
    "    \"description\": \"\",\n" +
    "    \"output\": \"\",\n" +
    "    \"input\": \"\",\n" +
    "    \"implementationStatus\": \"\",\n" +
    "    \"implementationType\": \"\",\n" +
    "    \"dataStatus\": 0,\n" +
    "    \"apiCallId\": \"3IU0lv5apcoMndZF2Vwc\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"dataStatus\": 0,\n" +
    "    \"input\": \"\",\n" +
    "    \"tags\": \"\",\n" +
    "    \"output\": \"\",\n" +
    "    \"capabilityId\": \"SfOc8ovM9x0iMYMSzoGd\",\n" +
    "    \"name\": \"get Oilnorm\",\n" +
    "    \"implementationStatus\": \"\",\n" +
    "    \"apiCallId\": \"DJvdCyLwUuE7lsWMTEdM\",\n" +
    "    \"description\": \"from PAT\",\n" +
    "    \"implementationType\": \"\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"input\": \"\",\n" +
    "    \"dataStatus\": 0,\n" +
    "    \"implementationType\": \"\",\n" +
    "    \"output\": \"\",\n" +
    "    \"implementationStatus\": \"\",\n" +
    "    \"name\": \"get Parts\",\n" +
    "    \"capabilityId\": \"w2xm9AWx8AAkxAqXPhFM\",\n" +
    "    \"description\": \"\",\n" +
    "    \"apiCallId\": \"vn0DbUljfhW4F8BTKc5C\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"dataStatus\": 0,\n" +
    "    \"name\": \"get Price Packages\",\n" +
    "    \"output\": \"\",\n" +
    "    \"implementationType\": \"\",\n" +
    "    \"input\": \"\",\n" +
    "    \"capabilityId\": \"Klpz11yehhnRLRwrfS87\",\n" +
    "    \"implementationStatus\": \"\",\n" +
    "    \"description\": \"from PPSO\",\n" +
    "    \"tags\": \"\",\n" +
    "    \"apiCallId\": \"1rL9IiVlokUpYPCVgWgn\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"description\": \"\",\n" +
    "    \"implementationStatus\": \"\",\n" +
    "    \"name\": \"get Q-Checklist\",\n" +
    "    \"dataStatus\": 0,\n" +
    "    \"capabilityId\": \"4B8Ikio1lRzT7cqSXjho\",\n" +
    "    \"tags\": \"\",\n" +
    "    \"output\": \"\",\n" +
    "    \"implementationType\": \"\",\n" +
    "    \"input\": \"\",\n" +
    "    \"apiCallId\": \"1baYMT3cZb5plVM6pNOU\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"implementationType\": \"\",\n" +
    "    \"capabilityId\": \"xLmfHHCHQKHIh215yBdA\",\n" +
    "    \"implementationStatus\": \"\",\n" +
    "    \"description\": \"\",\n" +
    "    \"input\": \"\",\n" +
    "    \"name\": \"get ReCalls\",\n" +
    "    \"output\": \"\",\n" +
    "    \"dataStatus\": 0,\n" +
    "    \"apiCallId\": \"q0zSg0WIVtJA1SRdNNvZ\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"output\": \"\",\n" +
    "    \"implementationStatus\": \"\",\n" +
    "    \"name\": \"get Repair-Information\",\n" +
    "    \"implementationType\": \"\",\n" +
    "    \"capabilityId\": \"SfOc8ovM9x0iMYMSzoGd\",\n" +
    "    \"tags\": \"\",\n" +
    "    \"implementedBy\": [\n" +
    "      \"bIqafHLeeS8q0XPrpd1t\"\n" +
    "    ],\n" +
    "    \"dataStatus\": 0,\n" +
    "    \"description\": \"\",\n" +
    "    \"input\": \"\",\n" +
    "    \"apiCallId\": \"H7r1tV1T6arW0yHikhVH\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"name\": \"get Service Prediction\",\n" +
    "    \"output\": \"\",\n" +
    "    \"implementationType\": \"\",\n" +
    "    \"implementationStatus\": \"\",\n" +
    "    \"description\": \"from PAT\",\n" +
    "    \"apiCallId\": \"TO0Iv4Xy7vhiwKE5sMoA\",\n" +
    "    \"capabilityId\": \"Klpz11yehhnRLRwrfS87\",\n" +
    "    \"input\": \"\",\n" +
    "    \"tags\": \"\",\n" +
    "    \"dataStatus\": 0\n" +
    "  },\n" +
    "  {\n" +
    "    \"description\": \"\",\n" +
    "    \"output\": \"\",\n" +
    "    \"dataStatus\": 0,\n" +
    "    \"implementationType\": \"\",\n" +
    "    \"name\": \"get TPI\",\n" +
    "    \"implementationStatus\": \"\",\n" +
    "    \"capabilityId\": \"xLmfHHCHQKHIh215yBdA\",\n" +
    "    \"input\": \"\",\n" +
    "    \"apiCallId\": \"XCh2mjIrz1oSeQ1yxk1V\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"description\": \"\",\n" +
    "    \"implementationType\": \"\",\n" +
    "    \"name\": \"get customer\",\n" +
    "    \"capabilityId\": \"HjpQkFH1gVoBySJ39w02\",\n" +
    "    \"output\": \"\",\n" +
    "    \"input\": \"\",\n" +
    "    \"implementationStatus\": \"\",\n" +
    "    \"dataStatus\": 0,\n" +
    "    \"apiCallId\": \"04huCJqaqfgDIRT8FqjX\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"capabilityId\": \"SfOc8ovM9x0iMYMSzoGd\",\n" +
    "    \"implementationType\": \"\",\n" +
    "    \"tags\": \"\",\n" +
    "    \"description\": \"Handbuch Service Technik\",\n" +
    "    \"apiCallId\": \"vGFNd4LHKiZGAGdbWgkj\",\n" +
    "    \"output\": \"\",\n" +
    "    \"implementationStatus\": \"\",\n" +
    "    \"input\": \"\",\n" +
    "    \"dataStatus\": 0,\n" +
    "    \"name\": \"get hst\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"apiCallId\": \"020aQKv2cjEZnnuLfgee\",\n" +
    "    \"input\": \"\",\n" +
    "    \"implementationStatus\": \"\",\n" +
    "    \"dataStatus\": 0,\n" +
    "    \"output\": \"\",\n" +
    "    \"tags\": \"\",\n" +
    "    \"name\": \"get igg\",\n" +
    "    \"capabilityId\": \"SfOc8ovM9x0iMYMSzoGd\",\n" +
    "    \"description\": \"Instandhaltung Genau Genommen\",\n" +
    "    \"implementationType\": \"\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"implementationType\": \"\",\n" +
    "    \"output\": \"\",\n" +
    "    \"input\": \"\",\n" +
    "    \"implementationStatus\": \"\",\n" +
    "    \"tags\": \"\",\n" +
    "    \"description\": \"\",\n" +
    "    \"dataStatus\": 0,\n" +
    "    \"capabilityId\": \"SfOc8ovM9x0iMYMSzoGd\",\n" +
    "    \"name\": \"get labour positions\",\n" +
    "    \"apiCallId\": \"Y30RiwP76OvQrsuc8vbc\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"dataStatus\": 0,\n" +
    "    \"name\": \"get maintenance tables\",\n" +
    "    \"description\": \"\",\n" +
    "    \"implementationStatus\": \"\",\n" +
    "    \"output\": \"\",\n" +
    "    \"implementationType\": \"\",\n" +
    "    \"capabilityId\": \"SfOc8ovM9x0iMYMSzoGd\",\n" +
    "    \"input\": \"\",\n" +
    "    \"tags\": \"\",\n" +
    "    \"apiCallId\": \"XIv4owPJLWeSjJij0DkO\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"name\": \"get order data\",\n" +
    "    \"implementationStatus\": \"\",\n" +
    "    \"output\": \"\",\n" +
    "    \"input\": \"\",\n" +
    "    \"description\": \"\",\n" +
    "    \"implementationType\": \"\",\n" +
    "    \"dataStatus\": 0,\n" +
    "    \"tags\": \"\",\n" +
    "    \"capabilityId\": \"46AKmX3hvUwRBX6qxUIM\",\n" +
    "    \"apiCallId\": \"0gS7iTOPWGQi1SDipAI9\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"tags\": \"\",\n" +
    "    \"dataStatus\": 0,\n" +
    "    \"implementationType\": \"\",\n" +
    "    \"capabilityId\": \"Cbofv8aU2rFvm7Ykbh9L\",\n" +
    "    \"implementationStatus\": \"\",\n" +
    "    \"output\": \"\",\n" +
    "    \"name\": \"get prices\",\n" +
    "    \"description\": \"\",\n" +
    "    \"input\": \"\",\n" +
    "    \"apiCallId\": \"X92tklmbJRwJhbGuA738\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"tags\": \"\",\n" +
    "    \"dataStatus\": 0,\n" +
    "    \"implementationStatus\": \"\",\n" +
    "    \"output\": \"\",\n" +
    "    \"capabilityId\": \"SfOc8ovM9x0iMYMSzoGd\",\n" +
    "    \"implementationType\": \"\",\n" +
    "    \"description\": \"\",\n" +
    "    \"input\": \"\",\n" +
    "    \"name\": \"get repair infos\",\n" +
    "    \"apiCallId\": \"oYEefUmV7kQ2Ky2KdDpq\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"input\": \"\",\n" +
    "    \"implementationStatus\": \"\",\n" +
    "    \"name\": \"get warranty info\",\n" +
    "    \"tags\": \"\",\n" +
    "    \"capabilityId\": \"xLQ1pCL4Ex3PPAgOr5iO\",\n" +
    "    \"implementationType\": \"\",\n" +
    "    \"description\": \"\",\n" +
    "    \"dataStatus\": 0,\n" +
    "    \"output\": \"\",\n" +
    "    \"apiCallId\": \"yehNZt8pp8V3t0WonzBQ\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"name\": \"get wiring diagramms\",\n" +
    "    \"implementationStatus\": \"\",\n" +
    "    \"dataStatus\": 0,\n" +
    "    \"implementationType\": \"\",\n" +
    "    \"tags\": \"\",\n" +
    "    \"input\": \"\",\n" +
    "    \"capabilityId\": \"SfOc8ovM9x0iMYMSzoGd\",\n" +
    "    \"output\": \"\",\n" +
    "    \"description\": \"\",\n" +
    "    \"apiCallId\": \"13Qh1JvfmsOfP10iMBfg\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"output\": \"\",\n" +
    "    \"input\": \"\",\n" +
    "    \"implementationStatus\": \"\",\n" +
    "    \"dataStatus\": 0,\n" +
    "    \"description\": \"\",\n" +
    "    \"implementationType\": \"\",\n" +
    "    \"name\": \"order Parts\",\n" +
    "    \"capabilityId\": \"w2xm9AWx8AAkxAqXPhFM\",\n" +
    "    \"apiCallId\": \"BcHTRRhJUeI92dKGUWuu\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"name\": \"reserve Tools\",\n" +
    "    \"implementationType\": \"\",\n" +
    "    \"tags\": \"\",\n" +
    "    \"apiCallId\": \"nsDxLstHJ6fx7s4ghH4w\",\n" +
    "    \"implementationStatus\": \"\",\n" +
    "    \"description\": \"Werkzeuge + Betriebsmittel reservieren in Toolorg\",\n" +
    "    \"output\": \"\",\n" +
    "    \"dataStatus\": 0,\n" +
    "    \"capabilityId\": \"SfOc8ovM9x0iMYMSzoGd\",\n" +
    "    \"input\": \"\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"input\": \"\",\n" +
    "    \"capabilityId\": \"rHpOqt8GndKfwDynllZ6\",\n" +
    "    \"output\": \"\",\n" +
    "    \"dataStatus\": 0,\n" +
    "    \"name\": \"send Appointment\",\n" +
    "    \"implementationType\": \"\",\n" +
    "    \"description\": \"to DMS / local Tool\",\n" +
    "    \"implementationStatus\": \"\",\n" +
    "    \"apiCallId\": \"tUdTHyj6Y7sdkHQfNAEX\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"name\": \"send Offer\",\n" +
    "    \"capabilityId\": \"Klpz11yehhnRLRwrfS87\",\n" +
    "    \"description\": \"to customer\",\n" +
    "    \"dataStatus\": 0,\n" +
    "    \"apiCallId\": \"kW3gqAQJIvrqwWdmabEj\",\n" +
    "    \"implementationStatus\": \"\",\n" +
    "    \"implementationType\": \"\",\n" +
    "    \"input\": \"\",\n" +
    "    \"output\": \"\",\n" +
    "    \"tags\": \"\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"input\": \"\",\n" +
    "    \"output\": \"\",\n" +
    "    \"capabilityId\": \"Cbofv8aU2rFvm7Ykbh9L\",\n" +
    "    \"implementationStatus\": \"\",\n" +
    "    \"implementationType\": \"\",\n" +
    "    \"tags\": \"\",\n" +
    "    \"name\": \"send invoice\",\n" +
    "    \"dataStatus\": 0,\n" +
    "    \"description\": \"to customer\",\n" +
    "    \"apiCallId\": \"0E9ouboyTnN9vzR7bw3K\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"description\": \"between CRM + DISS + DMS\",\n" +
    "    \"dataStatus\": 0,\n" +
    "    \"capabilityId\": \"fXCjOUJbOyPzFIx9E5QB\",\n" +
    "    \"name\": \"sync Complaint\",\n" +
    "    \"implementationType\": 2,\n" +
    "    \"input\": \"\",\n" +
    "    \"tags\": \"\",\n" +
    "    \"implementationStatus\": null,\n" +
    "    \"output\": \"\",\n" +
    "    \"apiCallId\": \"bYRQiYcbj2836Px02AYZ\"\n" +
    "  },\n" +
    "  {\n" +
    "    \"implementationType\": \"\",\n" +
    "    \"dataStatus\": 0,\n" +
    "    \"capabilityId\": \"Klpz11yehhnRLRwrfS87\",\n" +
    "    \"name\": \"update Offer\",\n" +
    "    \"tags\": \"\",\n" +
    "    \"input\": \"\",\n" +
    "    \"description\": \"\",\n" +
    "    \"implementationStatus\": \"\",\n" +
    "    \"output\": \"\",\n" +
    "    \"apiCallId\": \"MlM8BCQNTrdqjQ2H3sfh\"\n" +
    "  }\n" +
    "]"

  processes = "";
  selectedRepoId: string;

  ngOnInit() {
    this.repos$ = this.repoService.all();
    this.refresh();
  }

  refresh() {
    this.accountService.all().pipe(first()).subscribe(accounts => {
      this.accounts = accounts;
    });
  }

  saveSystems() {
    const systemList = JSON.parse(this.systems);
    for(let system of systemList) {

      if("" === system.tags) {
        system.tags = [];
      }

      system.repoId = this.selectedRepoId;
      this.systemService.create(system).pipe(first()).subscribe((item) => {
        this.systemMap.set(system.systemId, item);
      });
    }
  }

  saveCapabilities() {
    const capList = JSON.parse(this.capabilities);

    for(let cap of capList) {
      let implArr = [];
      if(cap.implementedBy) {
        for (let index = 0; index < cap.implementedBy.length; index++) {
          if (this.systemMap.has(cap.implementedBy[index])) {
            implArr.push(this.systemMap.get(cap.implementedBy[index]).id);
          }
        }
      }

      if("" === cap.tags) {
        cap.tags = [];
      }
      cap.implementedBy = implArr;
      cap.repoId = this.selectedRepoId;
      this.capabilityService.create(cap).pipe(first()).subscribe((item) => {
        this.capMap.set(cap.capabilityId, item);
      });
    }
  }

  saveApiCalls() {
    const calls = JSON.parse(this.apiCalls);

    console.log(calls.length);
    for(let call of calls) {
      if(call.capabilityId) {
        if(this.callMap.has(call.capabilityId)) {
          call.capabilityId = this.capMap.get(call.capabilityId).id;
        }
      }

      if("" === call.tags) {
        call.tags = [];
      }

      let implArr = [];
      if(call.implementedBy) {
        for (let index = 0; index < call.implementedBy.length; index++) {
          if (this.systemMap.has(call.implementedBy[index])) {
            implArr.push(this.systemMap.get(call.implementedBy[index]).id);
          }
        }
      }
      call.implementedBy = implArr;

      call.repoId = this.selectedRepoId;
      this.apiCallService.create(call).pipe(first()).subscribe((item) => {
        this.callMap.set(call.apiCallId, item);
      });
    }
  }


  saveProcesses() {
    const prcs = JSON.parse(this.processes);


    for(let prc of prcs) {
      if("" === prc.tags) {
        prc.tags = [];
      }
      prc.implementedBy = [];
      prc.steps = [];
      prc.apiCallIds = [];
      prc.tags = [];
      prc.role = Number(prc.role);

      prc.repoId = this.selectedRepoId;
      this.processService.create(prc).pipe(first()).subscribe((item) => {
        this.idMap.set(prc.processId, item.id);
      });
    }
  }

  processProcesses() {
    const prcs = JSON.parse(this.processes);


    for(let prc of prcs) {

      this.processService.byId(this.idMap.get(prc.processId)).pipe(first()).subscribe((item) => {

        let implArr = [];
        if(prc.implementedBy) {
          for (let index = 0; index < prc.implementedBy.length; index++) {
            if (this.systemMap.has(prc.implementedBy[index])) {
              implArr.push(this.systemMap.get(prc.implementedBy[index]).id);
            }
          }
        }
        item.implementedBy = implArr;

        item.tags = [];
        if(prc.tags) {
          for(let tag of prc.tags) {
            item.tags.push(tag.label);
          }
        }

        let apiCallsIds = [];
        if(prc.apiCallsIds) {
          for (let index = 0; index < prc.apiCallsIds.length; index++) {
            if (this.callMap.has(prc.apiCallsIds[index])) {
              implArr.push(this.callMap.get(prc.apiCallsIds[index]).id);
            }
          }
        }
        item.apiCallIds = apiCallsIds;

        let stepArr = [];
        if(prc.steps) {
          for (let index = 0; index < prc.steps.length; index++) {
            const step = prc.steps[index];

            let newStep = new Step();
            newStep.processReference = this.idMap.get(step.processReference);
            newStep.successor = [];
            if(step.successor) {
              for (let succ of step.successor) {
                let s = new StepSuccessor();
                s.processReference = this.idMap.get(succ.processReference);
                s.edgeTitle = succ.edgeTitle;
                newStep.successor.push(s);
              }
            }
            stepArr.push(newStep);
          }
        }
        item.steps = stepArr;

        this.processService.update(item.id, item).pipe(first()).subscribe((item) => {
          this.idMap.set(prc.processId, item.id);
        });

      });


    }
  }
}
