import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {AuthGuard} from './helpers/auth.guard';
import {LoginPage} from './pages/login.page';
import {ProcessListComponent} from './process/process-list.component';
import {ProcessViewComponent} from './process/process-view.component';
import {ProcessEditSubprocessComponent} from './process/process-edit-subprocess.component';
import {ProcessEditBaseComponent} from './process/process-edit-base.component';
import {DashboardComponent} from './dashboard/dashboard.component';
import {ProcessEditApiCallsComponent} from './process/process-edit-api-calls.component';
import {ApiCallListComponent} from './apiCall/api-call-list.component';
import {ApiCallViewComponent} from './apiCall/api-call-view.component';
import {ApiCallEditBaseComponent} from './apiCall/api-call-edit-base.component';
import {ApiCallEditUsageComponent} from './apiCall/api-call-edit-usage.component';
import {DataListComponent} from './data/data-list.component';
import {DataEditBaseComponent} from './data/data-edit-base.component';
import {DataErDiagramComponent} from './data/data-er-diagram.component';
import {ImprintComponent} from './imprint/imprint.component';
import {DisclaimerComponent} from './disclaimer/disclaimer.component';
import {PrivacyPolicyComponent} from './privacyPolicy/privacy-policy.component';
import {CapabilityListComponent} from './capability/capability-list.component';
import {CapabilityViewComponent} from './capability/capability-view.component';
import {CapabilityEditBaseComponent} from './capability/capability-edit-base.component';
import {CapabilityEditApiCallComponent} from './capability/capability-edit-api-call.component';
import {SystemListComponent} from './system/system-list.component';
import {SystemEditBaseComponent} from './system/system-edit-base.component';
import {SystemEditImplementsComponent} from './system/system-edit-implements.component';
import {SystemEditApiComponent} from './system/system-edit-api.component';
import {CapabilityEditImplementedByComponent} from './capability/capability-edit-implemented-by.component';
import {ApiCallEditImplementedInComponent} from './apiCall/api-call-edit-implemented-in.component';
import {ProcessEditUsedByComponent} from './process/process-edit-used-by.component';
import {SwimlaneViewComponent} from './swimlaneView/swimlane-view.component';
import { JourneyListComponent } from './journey/journey-list/journey-list.component';
import { JourneyEditorComponent } from './journey/journey-editor/journey-editor.component';
import { JourneyEditBaseComponent } from './journey/journey-edit-base.component';
import { RepositoriesComponent } from './repositories/repositories.component';
import { ApiGroupMapComponent } from './components/api-group-map.component';
import {LicensesComponent} from './licenses/licenses.component';
import {HelpComponent} from './help/help.component';
import {SettingsComponent} from './settings/settings.component';
import {RoleListComponent} from './settings/role-list/role-list.component';
import {RoleEditComponent} from './settings/role-edit/role-edit.component';

const routes: Routes = [

  { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] },
  { path: 'help', component: HelpComponent},
  { path: 'journeys', canActivate: [AuthGuard], children: [
      { path: '', redirectTo: 'list', pathMatch: 'full' },
      { path: 'list', component: JourneyListComponent, canActivate: [AuthGuard] },
      { path: 'edit/:id', canActivate: [AuthGuard], children: [
          { path: '', redirectTo: 'base', pathMatch: 'full' },
          { path: 'base', component: JourneyEditBaseComponent, canActivate: [AuthGuard] },
          { path: 'editor', component: JourneyEditorComponent, canActivate: [AuthGuard] },
        ] },
      { path: 'create', component: JourneyEditBaseComponent, canActivate: [AuthGuard] },
      { path: 'editor/:id', component: JourneyEditorComponent, canActivate: [AuthGuard] },
    ] },
  { path: 'swimlane/view/:id', component: SwimlaneViewComponent, canActivate: [AuthGuard] },

  { path: 'process', canActivate: [AuthGuard], children: [
      { path: '', redirectTo: 'list', pathMatch: 'full' },
      { path: 'list', component: ProcessListComponent, canActivate: [AuthGuard] },
      { path: 'view/:id', component: ProcessViewComponent, canActivate: [AuthGuard] },

      { path: 'edit/:id', canActivate: [AuthGuard], children: [
          { path: '', redirectTo: 'base', pathMatch: 'full' },
          { path: 'base', component: ProcessEditBaseComponent, canActivate: [AuthGuard] },
          { path: 'flow', component: ProcessViewComponent, canActivate: [AuthGuard] },
          { path: 'subprocesses', component: ProcessEditSubprocessComponent, canActivate: [AuthGuard] },
          { path: 'functions', component: ProcessEditApiCallsComponent, canActivate: [AuthGuard] },
          { path: 'usedBy', component: ProcessEditUsedByComponent, canActivate: [AuthGuard] },

        ] },
      { path: 'create', component: ProcessEditBaseComponent, canActivate: [AuthGuard] },
    ] },
  { path: 'apiCall', canActivate: [AuthGuard], children: [
      { path: '', redirectTo: 'list', pathMatch: 'full' },
      { path: 'list', component: ApiCallListComponent, canActivate: [AuthGuard] },
      { path: 'groups', component: ApiGroupMapComponent, canActivate: [AuthGuard], data: { mode: 'group' } },
      { path: 'groups/capabilities', component: ApiGroupMapComponent, canActivate: [AuthGuard], data: { mode: 'capability' } },
      { path: 'view/:id', component: ApiCallViewComponent, canActivate: [AuthGuard] },
      { path: 'edit/:id', canActivate: [AuthGuard], children: [
          { path: '', redirectTo: 'base', pathMatch: 'full' },
          { path: 'base', component: ApiCallEditBaseComponent, canActivate: [AuthGuard] },
          { path: 'usage', component: ApiCallEditUsageComponent, canActivate: [AuthGuard] },
          { path: 'implementedIn', component: ApiCallEditImplementedInComponent, canActivate: [AuthGuard] },
        ] },
      { path: 'create', component: ApiCallEditBaseComponent, canActivate: [AuthGuard] },
    ] },
  { path: 'data', canActivate: [AuthGuard], children: [
      { path: '', redirectTo: 'list', pathMatch: 'full' },
      { path: 'list', component: DataListComponent, canActivate: [AuthGuard] },
      { path: 'diagram', component: DataErDiagramComponent, canActivate: [AuthGuard] },
      { path: 'edit/:id', canActivate: [AuthGuard], children: [
          { path: '', redirectTo: 'base', pathMatch: 'full' },
          { path: 'base', component: DataEditBaseComponent, canActivate: [AuthGuard] },
        ] },
      { path: 'create', component: DataEditBaseComponent, canActivate: [AuthGuard] },
    ] },
  { path: 'capability', canActivate: [AuthGuard], children: [
      { path: '', redirectTo: 'list', pathMatch: 'full' },
      { path: 'list', component: CapabilityListComponent, canActivate: [AuthGuard] },
      { path: 'view', component: CapabilityViewComponent, canActivate: [AuthGuard] },
      { path: 'view/:root', component: CapabilityViewComponent, canActivate: [AuthGuard] },
      { path: 'edit/:id', canActivate: [AuthGuard], children: [
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
      { path: 'edit/:id', canActivate: [AuthGuard], children: [
          { path: '', redirectTo: 'base', pathMatch: 'full' },
          { path: 'base', component: SystemEditBaseComponent, canActivate: [AuthGuard] },
          { path: 'usage', component: SystemEditImplementsComponent, canActivate: [AuthGuard] },
          { path: 'apis', component: SystemEditApiComponent, canActivate: [AuthGuard] },

        ] },
      { path: 'create', component: SystemEditBaseComponent, canActivate: [AuthGuard] },
  ] },
  { path: 'settings', canActivate: [AuthGuard], children: [
      { path: '', component: SettingsComponent, canActivate: [AuthGuard] },
      { path: 'roles', component: RoleListComponent, canActivate: [AuthGuard] },
      { path: 'roles/edit/:id', component: RoleEditComponent, canActivate: [AuthGuard] },
  ] },
  { path: 'privacyPolicy', component: PrivacyPolicyComponent},
  { path: 'disclaimer', component: DisclaimerComponent},
  { path: 'imprint', component: ImprintComponent},
  { path: 'licenses', component: LicensesComponent},
  { path: 'login', component: LoginPage},
  { path: 'repositories', component: RepositoriesComponent, canActivate: [AuthGuard] },
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
];

@NgModule({
  imports: [ RouterModule.forRoot(routes, {onSameUrlNavigation: 'reload'}) ],
  exports: [ RouterModule ]
})
export class AppRoutingModule {}
