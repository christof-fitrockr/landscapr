import {BrowserModule} from '@angular/platform-browser';
import {CUSTOM_ELEMENTS_SCHEMA, NgModule} from '@angular/core';

import {AppComponent} from './app.component';
import {AppRoutingModule} from './app-routing.module';
import {LoginPage} from './pages/login.page';
import {fakeBackendProvider} from './helpers/fake.backend';
import {HTTP_INTERCEPTORS, HttpClientModule} from '@angular/common/http';
import {ErrorInterceptor} from './helpers/error.interceptor';
import {JwtInterceptor} from './helpers/jwt.interceptor';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
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
import {SystemEditApiComponent} from './system/system-edit-api.component';
import {SystemListComponent} from './system/system-list.component';
import {SystemViewComponent} from './system/system-view.component';
import {SystemEditBaseComponent} from './system/system-edit-base.component';
import {SystemTreeNodeComponent} from './system/system-tree-node.component';
import {DragDropModule} from '@angular/cdk/drag-drop';
import {CapabilityEditImplementedByComponent} from './capability/capability-edit-implemented-by.component';
import {CapabilityOverviewComponent} from './components/capability-overview.component';
import {SystemOverviewComponent} from './components/system-overview.component';
import {ApiCallEditImplementedInComponent} from './apiCall/api-call-edit-implemented-in.component';
import { CapabilityMapComponent } from './capability/capability-map.component';
import {CapabilityTreeNodeComponent} from './capability/capability-tree-node.component';
import {ApiCallTreeNodeComponent} from './apiCall/api-call-tree-node.component';
import {ProcessEditUsedByComponent} from './process/process-edit-used-by.component';
import {ApiCallOverviewComponent} from './components/api-call-overview.component';
import {SwimlaneViewComponent} from './swimlaneView/swimlane-view.component';
import {ApiCallCapabilityFilterPipe} from './pipes/api-call-capability-filter.pipe';
import {ApiCallFilterPipe} from './pipes/api-call-filter.pipe';
import {ProcessFilterPipe} from './pipes/process-filter.pipe';
import {SystemFilterPipe} from './pipes/system-filter.pipe';
import {DndDirective} from './helpers/dnd.directive';
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
import { CommentsPanelComponent } from './components/comments-panel/comments-panel.component';


@NgModule({
  declarations: [
    CommentsPanelComponent,
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
    ProcessEditApiCallsComponent,
    ProcessOverviewComponent,
    ProcessFlowNodeComponent,
    ProcessFlowViewComponent,
    AppSidePanelComponent,
    ProcessTableComponent,
    ProcessEditUsedByComponent,

    DashboardComponent,
    ApiCallFilterPipe,
    ApiCallGroupPipe,
    ProcessFilterPipe,
    ApiCallCapabilityFilterPipe,
    SystemFilterPipe,

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

    CapabilityEditComponent,
    CapabilityEditBaseComponent,
    CapabilityEditApiCallComponent,
    CapabilityEditImplementedByComponent,
    CapabilityTreeNodeComponent,
    ApiCallTreeNodeComponent,
    CapabilityListComponent,
    CapabilityViewComponent,
    CapabilityOverviewComponent,

    SystemEditComponent,
    SystemEditBaseComponent,
    SystemEditImplementsComponent,
    SystemEditApiComponent,
    SystemTreeNodeComponent,
    SystemListComponent,
    SystemViewComponent,
    SystemOverviewComponent,

    PrivacyPolicyComponent,
    AppComponent,
    LoginPage,
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
