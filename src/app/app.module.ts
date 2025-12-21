import {BrowserModule} from '@angular/platform-browser';
import {CUSTOM_ELEMENTS_SCHEMA, NgModule} from '@angular/core';

import {AppComponent} from './app.component';
import {AppRoutingModule} from './app-routing.module';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {BusinessServiceFilterPipe} from './pipes/business-service.pipe';
import {LoginPage} from './pages/login.page';
import {fakeBackendProvider} from './helpers/fake.backend';
import {HTTP_INTERCEPTORS, HttpClientModule} from '@angular/common/http';
import {ErrorInterceptor} from './helpers/error.interceptor';
import {JwtInterceptor} from './helpers/jwt.interceptor';
import {InformationSystemServiceFilterPipe} from './pipes/information-system-service.pipe';
import {InformationObjectFilterPipe} from './pipes/information-object-filter.pipe';
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
import {DashboardComponent} from './dashboard/dashboard.component';
import {ProcessEditFlowComponent} from './process/process-edit-flow.component';
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
import { CapabilityMapComponent } from './capability/capability-map.component';
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
import {RepoFilterPipe} from './pipes/repo-filter.pipe';
import {DndDirective} from './helpers/dnd.directive';
import {ProcessJourneyComponent} from './process/process-journey.component';
import {PrivacyPolicyComponent} from './privacyPolicy/privacy-policy.component';
import { GithubDialogComponent } from './components/github-dialog.component';
import { FileTypePipe } from './pipes/file-type.pipe';
import { SaveGithubDialogComponent } from './components/save-github-dialog.component';
import { GithubActionsDialogComponent } from './components/github-actions-dialog.component';
import { MergeResolverComponent } from './components/merge-resolver.component';
import { DeleteConfirmationDialogComponent } from './components/delete-confirmation-dialog.component';

import { ThemeService } from './services/theme.service';

import { ModalModule } from 'ngx-bootstrap/modal';
import { JourneyEditComponent } from './journey/journey-maintenance/journey-edit.component';
import { JourneyListComponent } from './journey/journey-list/journey-list.component';
import { JourneyEditorComponent } from './journey/journey-editor/journey-editor.component';
import { ProcessQuickViewModalComponent } from './journey/journey-editor/process-quick-view-modal.component';
import { ConditionEditModalComponent } from './journey/journey-editor/condition-edit-modal.component';
import { NewProcessModalComponent } from './journey/journey-editor/new-process-modal.component';
import { JourneyEditBaseComponent } from './journey/journey-edit-base.component';
import { RepositoriesComponent } from './repositories/repositories.component';
import { ApiGroupMapComponent } from './components/api-group-map.component';
import { ApiCallGroupPipe } from './pipes/api-call-group.pipe';
import { AppSidePanelComponent } from './components/app-side-panel.component';
import { ProcessFlowNodeComponent } from './process/process-flow-node.component';
import { ProcessFlowViewComponent } from './process/process-flow-view.component';
import {LicensesComponent} from './licenses/licenses.component';


@NgModule({
  declarations: [
    GithubDialogComponent,
    SaveGithubDialogComponent,
    GithubActionsDialogComponent,
    DeleteConfirmationDialogComponent,
    RepositoriesComponent,
    FileTypePipe,
    ProcessOverviewComponent,
    ProcessListComponent,
    ProcessViewComponent,
    ProcessEditComponent,
    ProcessEditBaseComponent,
    ProcessEditSubprocessComponent,
    ProcessEditFlowComponent,
    ProcessEditApiCallsComponent,
    ProcessOverviewComponent,
    ProcessFlowNodeComponent,
    ProcessFlowViewComponent,
    AppSidePanelComponent,
    ProcessTableComponent,
    ProcessEditUsedByComponent,
    ProcessJourneyComponent,

    DashboardComponent,
    ApiCallFilterPipe,
    ApiCallGroupPipe,
    ProcessFilterPipe,
    ApiCallCapabilityFilterPipe,
    SystemFilterPipe,
    CapabilityFilterPipe,

    AccountListComponent,
    AccountEditComponent,
    AccountEditBaseComponent,
    AccountFilterPipe,


    RepoFilterPipe,


    DndDirective,

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

    PrivacyPolicyComponent,
    AppComponent,
    ClusterComponent,
    FunctionalClusterFilterPipe,
    BusinessServiceFilterPipe,
    LoginPage,
    InformationSystemServiceFilterPipe,
    InformationObjectFilterPipe,
    ProcessOverviewComponent,
    JourneyEditComponent,
    JourneyEditBaseComponent,
    JourneyListComponent,
    JourneyEditorComponent,
    ProcessQuickViewModalComponent,
    ConditionEditModalComponent,
    NewProcessModalComponent,
    CapabilityMapComponent,
    ApiGroupMapComponent,
    MergeResolverComponent,
    LicensesComponent
  ],
  imports: [
    BrowserModule,
    NgSelectModule,
    BrowserAnimationsModule,
    DragDropModule,
    SortableModule.forRoot(),
    TypeaheadModule.forRoot(),
    ToastrModule.forRoot(),
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    ModalModule.forRoot(),
  ],
  providers: [
    ThemeService,
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
