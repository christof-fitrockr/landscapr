import {BrowserModule} from '@angular/platform-browser';
import {CUSTOM_ELEMENTS_SCHEMA, NgModule} from '@angular/core';

import {AppComponent} from './app.component';
import {ClusterComponent} from './components/cluster.component';
import {BusinessFunctionComponent} from './components/business-function.component';
import {BusinessServiceComponent} from './components/business-service.component';
import {InformationObjectsPage} from './pages/information-objects-list.page';
import {BusinessServicePage} from './pages/business-service.page';
import {InformationSystemServicePage} from './pages/information-system-service.page';
import {TargetPicturePage} from './pages/target-picture.page';
import {AppRoutingModule} from './app-routing.module';
import {InformationSystemServiceComponent} from './components/information-system-service.component';
import {FunctionalClusterFilterPipe} from './pipes/functional-cluster-filter.pipe';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {BusinessServiceDetailsPage} from './pages/business-service-details.page';
import {BusinessServiceFilterPipe} from './pipes/business-service.pipe';
import {LoginPage} from './pages/login.page';
import {fakeBackendProvider} from './helpers/fake.backend';
import {HTTP_INTERCEPTORS, HttpClientModule} from '@angular/common/http';
import {ErrorInterceptor} from './helpers/error.interceptor';
import {JwtInterceptor} from './helpers/jwt.interceptor';
import {InformationSystemServiceFilterPipe} from './pipes/information-system-service.pipe';
import {InformationObjectFilterPipe} from './pipes/information-object-filter.pipe';
import {InformationSystemServiceDetailsPage} from './pages/information-system-service-details.page';
import {InformationObjectDetailsPage} from './pages/information-object-details-page';
import {InformationObjectComponent} from './components/information-object.component';
import {ProcessComponent} from './pages/process/process.component';
import {AngularFireAuthModule} from '@angular/fire/compat/auth';
import {ProcessListComponent} from './process/process-list.component';
import {ProcessEditComponent} from './process/process-edit.component';
import {ProcessViewComponent} from './process/process-view.component';
import {ToastrModule} from 'ngx-toastr';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {SortableModule} from 'ngx-bootstrap/sortable';
import {TypeaheadModule} from 'ngx-bootstrap/typeahead';
import {ProcessOverviewComponent} from './components/process-overview.component';
import {NgSelectModule} from '@ng-select/ng-select';
import {ProcessEditSubprocessComponent} from './process/process-edit-subprocess.component';
import {ProcessEditBaseComponent} from './process/process-edit-base.component';
import {NgxGraphModule} from '@swimlane/ngx-graph';
import {DashboardComponent} from './dashboard/dashboard,component';
import {ProcessEditFlowComponent} from './process/process-edit-flow.component';
import {ProcessGraphComponent} from './components/process-graph.component';
import {ProcessEditApiCallsComponent} from './process/process-edit-api-calls.component';
import {ApiCallEditComponent} from './apiCall/api-call-edit.component';
import {ApiCallEditBaseComponent} from './apiCall/api-call-edit-base.component';
import {ApiCallEditUsageComponent} from './apiCall/api-call-edit-usage.component';
import {ApiCallListComponent} from './apiCall/api-call-list.component';
import {ApiCallViewComponent} from './apiCall/api-call-view.component';
import {ImprintComponent} from './imprint/imprint.component';
import {DisclaimerComponent} from './disclaimer/disclaimer.component';
import {HashLocationStrategy, LocationStrategy} from '@angular/common';
import {ProcessTableComponent} from './components/process-table.component';
import {CapabilityViewComponent} from './capability/capability-view.component';
import {CapabilityEditApiCallComponent} from './capability/capability-edit-api-call.component';
import {CapabilityListComponent} from './capability/capability-list.component';
import {CapabilityEditComponent} from './capability/capability-edit.component';
import {CapabilityEditBaseComponent} from './capability/capability-edit-base.component';
import {SystemEditComponent} from './system/system-edit.component';
import {SystemEditImplementsComponent} from './system/system-edit-implements.component';
import {SystemListComponent} from './system/system-list.component';
import {SystemViewComponent} from './system/system-view.component';
import {SystemEditBaseComponent} from './system/system-edit-base.component';
import {DragDropModule} from '@angular/cdk/drag-drop';
import {CapabilityEditImplementedByComponent} from './capability/capability-edit-implemented-by.component';
import {ApiCallOverviewComponent} from './components/api-call-overview.component';
import {CapabilityOverviewComponent} from './components/capability-overview.component';
import {SystemOverviewComponent} from './components/system-overview.component';
import {ApiCallEditImplementedInComponent} from './apiCall/api-call-edit-implemented-in.component';
import {CapabilityComponent} from './components/capability.component';
import {ApiCallGraphComponent} from './components/api-call-graph.component';
import {ProcessEditUsedByComponent} from './process/process-edit-used-by.component';
import {SwimlaneViewComponent} from './swimlaneView/swimlane-view.component';
import {ApiCallCapabilityFilterPipe} from './pipes/api-call-capability-filter.pipe';
import {ApiCallFilterPipe} from './pipes/api-call-filter.pipe';
import {ProcessFilterPipe} from './pipes/process-filter.pipe';
import {SystemFilterPipe} from './pipes/system-filter.pipe';
import {CapabilityFilterPipe} from './pipes/capability-filter.pipe';
import {AccountListComponent} from './account/account-list.component';
import {AccountEditComponent} from './account/account-edit.component';
import {AccountEditBaseComponent} from './account/account-edit-base.component';
import {AccountFilterPipe} from './pipes/account-filter.pipe';
import {ImportExportComponent} from './importExport/import-export.component';
import {RepoFilterPipe} from './pipes/repo-filter.pipe';
import {RepoListComponent} from './repo/repo-list.component';
import {RepoEditBaseComponent} from './repo/repo-edit-base.component';
import {RepoEditComponent} from './repo/repo-edit.component';


@NgModule({
  declarations: [
    ProcessOverviewComponent,
    ProcessGraphComponent,
    ProcessListComponent,
    ProcessViewComponent,
    ProcessEditComponent,
    ProcessEditBaseComponent,
    ProcessEditSubprocessComponent,
    ProcessEditFlowComponent,
    ProcessEditApiCallsComponent,
    ProcessOverviewComponent,
    ProcessTableComponent,
    ProcessEditUsedByComponent,
    DashboardComponent,
    ApiCallFilterPipe,
    ProcessFilterPipe,
    ApiCallCapabilityFilterPipe,
    SystemFilterPipe,
    CapabilityFilterPipe,

    AccountListComponent,
    AccountEditComponent,
    AccountEditBaseComponent,
    AccountFilterPipe,

    ImportExportComponent,

    RepoFilterPipe,
    RepoListComponent,
    RepoEditComponent,
    RepoEditBaseComponent,

    SwimlaneViewComponent,

    ImprintComponent,
    DisclaimerComponent,

    ApiCallEditComponent,
    ApiCallEditBaseComponent,
    ApiCallEditUsageComponent,
    ApiCallEditImplementedInComponent,
    ApiCallListComponent,
    ApiCallViewComponent,
    ApiCallOverviewComponent,
    ApiCallGraphComponent,

    CapabilityEditComponent,
    CapabilityEditBaseComponent,
    CapabilityEditApiCallComponent,
    CapabilityEditImplementedByComponent,
    CapabilityListComponent,
    CapabilityViewComponent,
    CapabilityOverviewComponent,

    SystemEditComponent,
    SystemEditBaseComponent,
    SystemEditImplementsComponent,
    SystemListComponent,
    SystemViewComponent,
    SystemOverviewComponent,


    AppComponent,
    ClusterComponent,
    ProcessComponent,
    BusinessFunctionComponent,
    BusinessServiceComponent,
    InformationSystemServiceComponent,
    InformationObjectsPage,
    BusinessServicePage,
    InformationSystemServicePage,
    BusinessServiceDetailsPage,
    TargetPicturePage,
    FunctionalClusterFilterPipe,
    BusinessServiceFilterPipe,
    LoginPage,
    InformationSystemServiceFilterPipe,
    InformationObjectFilterPipe,
    InformationSystemServiceDetailsPage,
    InformationObjectDetailsPage,
    InformationObjectComponent,
    ProcessOverviewComponent,
    CapabilityComponent,
  ],
  imports: [
    BrowserModule,
    // AngularFireModule.initializeApp(environment.firebase),
    // AngularFireDatabaseModule,
    NgxGraphModule,
    NgSelectModule,
    BrowserAnimationsModule,
    AngularFireAuthModule,
    DragDropModule,
    SortableModule.forRoot(),
    TypeaheadModule.forRoot(),
    ToastrModule.forRoot(),
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: JwtInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true },
    {provide: LocationStrategy, useClass: HashLocationStrategy},
    // provider used to create fake backend
    fakeBackendProvider
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  bootstrap: [AppComponent]
})
export class AppModule { }
