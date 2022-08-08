import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {TargetPicturePage} from './pages/target-picture.page';
import {BusinessServicePage} from './pages/business-service.page';
import {InformationSystemServicePage} from './pages/information-system-service.page';
import {InformationObjectsPage} from './pages/information-objects-list.page';
import {BusinessServiceDetailsPage} from './pages/business-service-details.page';
import {AuthGuard} from './helpers/auth.guard';
import {LoginPage} from './pages/login.page';
import {InformationSystemServiceDetailsPage} from './pages/information-system-service-details.page';
import {InformationObjectDetailsPage} from './pages/information-object-details-page';
import {ProcessComponent} from './pages/process/process.component';
import {ProcessListComponent} from './process/process-list.component';
import {ProcessViewComponent} from './process/process-view.component';
import {ProcessEditComponent} from './process/process-edit.component';
import {ProcessEditSubprocessComponent} from './process/process-edit-subprocess.component';
import {ProcessEditBaseComponent} from './process/process-edit-base.component';
import {DashboardComponent} from './dashboard/dashboard,component';
import {ProcessEditFlowComponent} from './process/process-edit-flow.component';
import {ProcessEditApiCallsComponent} from './process/process-edit-api-calls.component';
import {ApiCallListComponent} from './apiCall/api-call-list.component';
import {ApiCallViewComponent} from './apiCall/api-call-view.component';
import {ApiCallEditComponent} from './apiCall/api-call-edit.component';
import {ApiCallEditBaseComponent} from './apiCall/api-call-edit-base.component';
import {ApiCallEditUsageComponent} from './apiCall/api-call-edit-usage.component';
import {ImprintComponent} from './imprint/imprint.component';
import {DisclaimerComponent} from './disclaimer/disclaimer.component';
import {PrivacyPolicyComponent} from './privacyPolicy/privacy-policy.component';
import {CapabilityListComponent} from './capability/capability-list.component';
import {CapabilityViewComponent} from './capability/capability-view.component';
import {CapabilityEditComponent} from './capability/capability-edit.component';
import {CapabilityEditBaseComponent} from './capability/capability-edit-base.component';
import {CapabilityEditApiCallComponent} from './capability/capability-edit-api-call.component';
import {SystemListComponent} from './system/system-list.component';
import {SystemViewComponent} from './system/system-view.component';
import {SystemEditComponent} from './system/system-edit.component';
import {SystemEditBaseComponent} from './system/system-edit-base.component';
import {SystemEditImplementsComponent} from './system/system-edit-implements.component';
import {CapabilityEditImplementedByComponent} from './capability/capability-edit-implemented-by.component';
import {ApiCallEditImplementedInComponent} from './apiCall/api-call-edit-implemented-in.component';
import {ProcessEditUsedByComponent} from './process/process-edit-used-by.component';
import {SwimlaneViewComponent} from './swimlaneView/swimlane-view.component';

const routes: Routes = [
  { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] },
  { path: 'swimlane/view/:id', component: SwimlaneViewComponent, canActivate: [AuthGuard] },
  { path: 'process', canActivate: [AuthGuard], children: [
      { path: '', redirectTo: 'list', pathMatch: 'full' },
      { path: 'list', component: ProcessListComponent, canActivate: [AuthGuard] },
      { path: 'view/:id', component: ProcessViewComponent, canActivate: [AuthGuard] },
      { path: 'edit/:id', component: ProcessEditComponent, canActivate: [AuthGuard], children: [
          { path: '', redirectTo: 'base', pathMatch: 'full' },
          { path: 'base', component: ProcessEditBaseComponent, canActivate: [AuthGuard] },
          { path: 'flow', component: ProcessEditFlowComponent, canActivate: [AuthGuard] },
          { path: 'subprocesses', component: ProcessEditSubprocessComponent, canActivate: [AuthGuard] },
          { path: 'functions', component: ProcessEditApiCallsComponent, canActivate: [AuthGuard] },
          { path: 'usedBy', component: ProcessEditUsedByComponent, canActivate: [AuthGuard] },

        ] },
      { path: 'create', component: ProcessEditBaseComponent, canActivate: [AuthGuard] },
    ] },
  { path: 'apiCall', canActivate: [AuthGuard], children: [
      { path: '', redirectTo: 'list', pathMatch: 'full' },
      { path: 'list', component: ApiCallListComponent, canActivate: [AuthGuard] },
      { path: 'view/:id', component: ApiCallViewComponent, canActivate: [AuthGuard] },
      { path: 'edit/:id', component: ApiCallEditComponent, canActivate: [AuthGuard], children: [
          { path: '', redirectTo: 'base', pathMatch: 'full' },
          { path: 'base', component: ApiCallEditBaseComponent, canActivate: [AuthGuard] },
          { path: 'usage', component: ApiCallEditUsageComponent, canActivate: [AuthGuard] },
          { path: 'implementedIn', component: ApiCallEditImplementedInComponent, canActivate: [AuthGuard] },
        ] },
      { path: 'create', component: ApiCallEditBaseComponent, canActivate: [AuthGuard] },
    ] },
  { path: 'capability', canActivate: [AuthGuard], children: [
      { path: '', redirectTo: 'list', pathMatch: 'full' },
      { path: 'list', component: CapabilityListComponent, canActivate: [AuthGuard] },
      { path: 'view', component: CapabilityViewComponent, canActivate: [AuthGuard] },
      { path: 'edit/:id', component: CapabilityEditComponent, canActivate: [AuthGuard], children: [
          { path: '', redirectTo: 'base', pathMatch: 'full' },
          { path: 'base', component: CapabilityEditBaseComponent, canActivate: [AuthGuard] },
          { path: 'implementedBy', component: CapabilityEditImplementedByComponent, canActivate: [AuthGuard] },
          { path: 'usage', component: CapabilityEditApiCallComponent, canActivate: [AuthGuard] },

        ] },
      { path: 'create', component: CapabilityEditBaseComponent, canActivate: [AuthGuard] },
    ] },
  { path: 'system', canActivate: [AuthGuard], children: [
      { path: '', redirectTo: 'list', pathMatch: 'full' },
      { path: 'list', component: SystemListComponent, canActivate: [AuthGuard] },
      { path: 'view/:id', component: SystemViewComponent, canActivate: [AuthGuard] },
      { path: 'edit/:id', component: SystemEditComponent, canActivate: [AuthGuard], children: [
          { path: '', redirectTo: 'base', pathMatch: 'full' },
          { path: 'base', component: SystemEditBaseComponent, canActivate: [AuthGuard] },
          { path: 'usage', component: SystemEditImplementsComponent, canActivate: [AuthGuard] },

        ] },
      { path: 'create', component: SystemEditBaseComponent, canActivate: [AuthGuard] },
    ] },
  { path: 'system', component: ProcessComponent, canActivate: [AuthGuard] },
  { path: 'targetPicture', component: TargetPicturePage, canActivate: [AuthGuard] },
  { path: 'businessServices', component: BusinessServicePage, canActivate: [AuthGuard]},
  { path: 'businessServiceDetails/:id', component: BusinessServiceDetailsPage, canActivate: [AuthGuard]},
  { path: 'informationSystemServices', component: InformationSystemServicePage, canActivate: [AuthGuard]},
  { path: 'informationSystemServiceDetails/:id', component: InformationSystemServiceDetailsPage, canActivate: [AuthGuard]},
  { path: 'informationObjects', component: InformationObjectsPage },
  { path: 'informationObjectDetails/:id', component: InformationObjectDetailsPage, canActivate: [AuthGuard]},

  { path: 'privacyPolicy', component: PrivacyPolicyComponent},
  { path: 'disclaimer', component: DisclaimerComponent},
  { path: 'imprint', component: ImprintComponent},
  { path: 'login', component: LoginPage},
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
];

@NgModule({
  imports: [ RouterModule.forRoot(routes, {onSameUrlNavigation: 'reload'}) ],
  exports: [ RouterModule ]
})
export class AppRoutingModule {}
