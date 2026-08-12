import { Component, HostBinding, HostListener, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { first } from 'rxjs/operators';

import { ApiCall, ApiImplementationStatus, ApiType, DataStatus } from '../models/api-call';
import {
  ActivitySupport,
  GAP_PRIORITIES,
  GAP_PRIORITY_LABELS,
  GapPriority,
  GapReport,
  JourneyGap,
  OpenItem,
  ProcessGap,
  SUPPORT_BAND_COLORS,
  SUPPORT_BAND_LABELS,
  SUPPORT_REASON_TEXT,
  SUPPORT_STATE_BAND,
  SupportBand,
  SupportState,
  sumGaps
} from '../models/gap.model';
import { Process, ProcessSupportPlan } from '../models/process';
import { Scenario } from '../models/scenario.model';
import { ApiCallService } from '../services/api-call.service';
import { GapAnalysisService } from '../services/gap-analysis.service';
import { LandscapeService, LandscapeSource } from '../services/landscape.service';
import { ProcessService } from '../services/process.service';
import { ScenarioService } from '../services/scenario.service';

/** A journey with the processes of it that survive the current filters */
interface BoardGroup {
  journey: JourneyGap;
  processes: ProcessGap[];
  coverage: number;
}

/** What the second bar of the comparison stands for */
const PLANNED_ONLY = '';

@Component({
  selector: 'app-gap-overview',
  templateUrl: './gap-overview.component.html',
  styleUrls: ['./gap-overview.component.scss']
})
export class GapOverviewComponent implements OnInit {

  @HostBinding('class.presenting') presenting = false;

  loading = true;
  report: GapReport | null = null;

  /** the model the report was made from, kept so the panel can write to it */
  private source: LandscapeSource | null = null;

  // filters
  journeyFilter = 'all';
  bandFilter: SupportBand | 'all' = 'all';
  roleFilter = 'all';

  // what the filters produce
  groups: BoardGroup[] = [];
  visible: ProcessGap[] = [];
  openItems: OpenItem[] = [];
  totals = sumGaps([], 0, 0);
  roles: string[] = [];

  // the process in the panel
  selectedId: string | null = null;
  selected: ProcessGap | null = null;

  // planning a function for one activity
  planningKey: string | null = null;
  planningName = '';

  // the plan of the selected process, edited in the panel
  planOpen = false;
  planPriority: GapPriority | '' = '';
  planHorizon = '';
  planOwner = '';
  planNote = '';

  // comparison with a target picture
  comparing = false;
  scenarios: Scenario[] = [];
  compareScenarioId = PLANNED_ONLY;
  targetCoverage = 0;
  targetLabel = '';

  saving = false;

  // for the template
  bandLabels = SUPPORT_BAND_LABELS;
  reasonText = SUPPORT_REASON_TEXT;
  priorities = GAP_PRIORITIES;
  priorityLabels = GAP_PRIORITY_LABELS;
  bands: SupportBand[] = ['gap', 'planned', 'seamless', 'manual'];
  bandCounts: { [key: string]: number } = {};

  constructor(
    private gapService: GapAnalysisService,
    private landscapeService: LandscapeService,
    private processService: ProcessService,
    private apiCallService: ApiCallService,
    private scenarioService: ScenarioService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.refresh();
    this.scenarioService.all().pipe(first()).subscribe(scenarios => this.scenarios = scenarios || []);
  }

  refresh(): void {
    this.loading = true;
    this.landscapeService.load().pipe(first()).subscribe(source => {
      this.source = source;
      this.report = this.gapService.analyse(source);
      this.loading = false;
      this.applyFilters();
      this.updateComparison();
    });
  }

  // ---------------------------------------------------------------------------
  // Filters
  // ---------------------------------------------------------------------------

  filterByJourney(journeyId: string): void {
    this.journeyFilter = journeyId;
    this.applyFilters();
  }

  filterByBand(band: SupportBand | 'all'): void {
    this.bandFilter = band;
    this.applyFilters();
  }

  onRoleFilter(role: string): void {
    this.roleFilter = role;
    this.applyFilters();
  }

  clearFilters(): void {
    this.journeyFilter = 'all';
    this.bandFilter = 'all';
    this.roleFilter = 'all';
    this.applyFilters();
  }

  get filtered(): boolean {
    return this.journeyFilter !== 'all' || this.bandFilter !== 'all' || this.roleFilter !== 'all';
  }

  private applyFilters(): void {
    if (!this.report) {
      return;
    }

    const journeyOf = new Map<string, string[]>();
    this.report.journeys.forEach(j => j.processIds.forEach(id => {
      const list = journeyOf.get(id) || [];
      list.push(j.journeyId);
      journeyOf.set(id, list);
    }));

    this.visible = this.report.processes.filter(p => {
      if (this.journeyFilter !== 'all' && (journeyOf.get(p.processId) || []).indexOf(this.journeyFilter) < 0) {
        return false;
      }
      if (this.bandFilter !== 'all' && p.band !== this.bandFilter) {
        return false;
      }
      if (this.roleFilter !== 'all' && p.roleName !== this.roleFilter) {
        return false;
      }
      return true;
    });

    const inView = new Set(this.visible.map(p => p.processId));
    const byId = new Map(this.report.processes.map(p => [p.processId, p] as [string, ProcessGap]));

    this.groups = this.report.journeys
      .map(journey => {
        const processes = journey.processIds
          .filter(id => inView.has(id))
          .map(id => byId.get(id));
        const counted = processes.reduce((sum, p) => sum + p.counted, 0);
        const live = processes.reduce((sum, p) => sum + p.live, 0);
        return { journey, processes, coverage: counted ? live / counted : 1 };
      })
      .filter(group => group.processes.length > 0);

    this.openItems = this.gapService.openItems(this.visible);
    this.totals = sumGaps(this.visible, this.report.totals.journeys, this.openItems.length);

    this.bandCounts = { all: this.report.processes.length };
    this.bands.forEach(band => {
      this.bandCounts[band] = this.report.processes.filter(p => p.band === band).length;
    });

    this.roles = Array.from(new Set(this.report.processes.map(p => p.roleName))).sort();

    if (!this.selectedId || !inView.has(this.selectedId)) {
      this.select(this.visible.length ? this.visible[0].processId : null);
    } else {
      this.selected = byId.get(this.selectedId) || null;
      this.readPlan();
    }
  }

  // ---------------------------------------------------------------------------
  // The panel
  // ---------------------------------------------------------------------------

  select(processId: string | null): void {
    this.selectedId = processId;
    this.selected = processId && this.report
      ? this.report.processes.find(p => p.processId === processId) || null
      : null;
    this.planningKey = null;
    this.planningName = '';
    this.planOpen = false;
    this.readPlan();
  }

  private readPlan(): void {
    const process = this.selectedProcess();
    const plan = process && process.supportPlan;
    this.planPriority = (plan && plan.priority) || '';
    this.planHorizon = (plan && plan.horizon) || '';
    this.planOwner = (plan && plan.owner) || '';
    this.planNote = (plan && plan.note) || '';
  }

  private selectedProcess(): Process | null {
    if (!this.source || !this.selectedId) {
      return null;
    }
    return this.source.processes.find(p => p.id === this.selectedId) || null;
  }

  get openActivities(): ActivitySupport[] {
    if (!this.selected) {
      return [];
    }
    return this.selected.activities.filter(a => a.state === 'declared' || a.state === 'missing');
  }

  // ---------------------------------------------------------------------------
  // Writing back into the model
  // ---------------------------------------------------------------------------

  /** A function that is already in the model moves from gap to planned */
  markPlanned(activity: ActivitySupport): void {
    if (!activity.apiCallId || this.saving) {
      return;
    }
    const apiCall = this.source.apiCalls.find(a => a.id === activity.apiCallId);
    if (!apiCall) {
      return;
    }
    this.saving = true;
    const updated = { ...apiCall, implementationStatus: ApiImplementationStatus.Planned };
    this.apiCallService.update(apiCall.id, updated as ApiCall).pipe(first()).subscribe(
      () => {
        this.saving = false;
        this.toastr.success(`${apiCall.name} is planned now`);
        this.refresh();
      },
      () => {
        this.saving = false;
        this.toastr.error('The function could not be saved');
      }
    );
  }

  startPlanning(activity: ActivitySupport): void {
    this.planningKey = activity.key;
    this.planningName = '';
  }

  cancelPlanning(): void {
    this.planningKey = null;
    this.planningName = '';
  }

  /**
   * Writes the function the process is waiting for into the model, as a planned
   * one, and hooks it onto the step that has none. From here on the roadmap and
   * the target picture carry it - nobody has to remember it separately.
   */
  planFunction(activity: ActivitySupport): void {
    const name = (this.planningName || '').trim();
    const process = this.selectedProcess();
    if (!name || !process || this.saving) {
      return;
    }

    const apiCall: ApiCall = {
      id: undefined as any,
      repoId: '',
      name,
      description: `Planned to close the gap in "${process.name}"`,
      docLinkUrl: '',
      capabilityId: '',
      implementationStatus: ApiImplementationStatus.Planned,
      implementedBy: [],
      input: '',
      output: '',
      inputData: [],
      outputData: [],
      tags: [],
      apiType: ApiType.Business,
      status: DataStatus.Draft
    } as ApiCall;

    this.saving = true;
    this.apiCallService.create(apiCall).pipe(first()).subscribe(
      created => {
        const stepIndex = this.stepIndexOf(activity);
        const changed: Process = { ...process };
        if (stepIndex >= 0) {
          const steps = (changed.steps || []).map(step => ({ ...step }));
          steps[stepIndex].apiCallReference = created.id;
          changed.steps = steps;
        } else {
          changed.apiCallIds = (changed.apiCallIds || []).concat(created.id);
        }

        this.processService.update(changed.id, changed).pipe(first()).subscribe(
          () => {
            this.saving = false;
            this.planningKey = null;
            this.planningName = '';
            this.toastr.success(`${name} is on the roadmap`);
            this.refresh();
          },
          () => {
            this.saving = false;
            this.toastr.error('The process could not be saved');
          }
        );
      },
      () => {
        this.saving = false;
        this.toastr.error('The function could not be created');
      }
    );
  }

  private stepIndexOf(activity: ActivitySupport): number {
    if (activity.key.indexOf('step:') !== 0) {
      return -1;
    }
    const index = parseInt(activity.key.substring('step:'.length), 10);
    return isNaN(index) ? -1 : index;
  }

  /** Says that a human does this on purpose, so it stops counting as a gap */
  toggleManual(): void {
    const process = this.selectedProcess();
    if (!process || this.saving) {
      return;
    }
    const isManual = !!process.supportPlan && process.supportPlan.intent === 'manualByDesign';
    this.savePlan(process, {
      ...(process.supportPlan || { intent: 'automate' }),
      intent: isManual ? 'automate' : 'manualByDesign'
    }, isManual ? 'Counted as a gap again' : 'Marked as manual by design');
  }

  get isManualByDesign(): boolean {
    const process = this.selectedProcess();
    return !!process && !!process.supportPlan && process.supportPlan.intent === 'manualByDesign';
  }

  savePlanForm(): void {
    const process = this.selectedProcess();
    if (!process || this.saving) {
      return;
    }
    this.savePlan(process, {
      intent: (process.supportPlan && process.supportPlan.intent) || 'automate',
      priority: this.planPriority || undefined,
      horizon: (this.planHorizon || '').trim() || undefined,
      owner: (this.planOwner || '').trim() || undefined,
      note: (this.planNote || '').trim() || undefined
    }, 'Plan saved');
  }

  private savePlan(process: Process, plan: ProcessSupportPlan, message: string): void {
    this.saving = true;
    const changed: Process = { ...process, supportPlan: plan };
    this.processService.update(changed.id, changed).pipe(first()).subscribe(
      () => {
        this.saving = false;
        this.planOpen = false;
        this.toastr.success(message);
        this.refresh();
      },
      () => {
        this.saving = false;
        this.toastr.error('The plan could not be saved');
      }
    );
  }

  // ---------------------------------------------------------------------------
  // Comparison with a target picture
  // ---------------------------------------------------------------------------

  toggleComparison(): void {
    this.comparing = !this.comparing;
    this.updateComparison();
  }

  onCompareScenario(id: string): void {
    this.compareScenarioId = id;
    this.updateComparison();
  }

  private updateComparison(): void {
    if (!this.comparing || !this.report || !this.source) {
      return;
    }

    if (this.compareScenarioId === PLANNED_ONLY) {
      this.targetCoverage = this.report.totals.plannedCoverage;
      this.targetLabel = 'Once everything already planned is built';
      return;
    }

    const scenario = this.scenarios.find(s => s.id === this.compareScenarioId);
    if (!scenario) {
      this.targetCoverage = this.report.totals.plannedCoverage;
      this.targetLabel = 'Once everything already planned is built';
      return;
    }

    const target = this.scenarioService.applyTo({
      journeys: this.source.journeys,
      processes: this.source.processes,
      capabilities: this.source.capabilities,
      apiCalls: this.source.apiCalls,
      data: this.source.data,
      applications: this.source.applications,
      roles: this.source.roles
    }, scenario);

    this.targetCoverage = this.gapService.analysePayload(target).totals.coverage;
    this.targetLabel = scenario.name;
  }

  // ---------------------------------------------------------------------------
  // Presenting
  // ---------------------------------------------------------------------------

  togglePresenting(): void {
    this.presenting = !this.presenting;
    if (this.presenting) {
      window.scrollTo(0, 0);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.presenting = false;
  }

  // ---------------------------------------------------------------------------
  // Small helpers for the template
  // ---------------------------------------------------------------------------

  percent(value: number): string {
    return Math.round((value || 0) * 100) + '%';
  }

  colorOf(band: SupportBand): string {
    return SUPPORT_BAND_COLORS[band];
  }

  colorOfState(state: SupportState): string {
    return SUPPORT_BAND_COLORS[SUPPORT_STATE_BAND[state]];
  }

  /** The meter of a process says how far it got, in the colour of where it is */
  meterColor(gap: ProcessGap): string {
    if (gap.band === 'manual') {
      return SUPPORT_BAND_COLORS.manual;
    }
    if (gap.open > 0) {
      return SUPPORT_BAND_COLORS.gap;
    }
    if (gap.planned > 0) {
      return SUPPORT_BAND_COLORS.planned;
    }
    return SUPPORT_BAND_COLORS.seamless;
  }

  coverageColor(coverage: number): string {
    if (coverage >= 0.8) {
      return SUPPORT_BAND_COLORS.seamless;
    }
    if (coverage >= 0.5) {
      return SUPPORT_BAND_COLORS.planned;
    }
    return SUPPORT_BAND_COLORS.gap;
  }

  trackByProcess(index: number, gap: ProcessGap): string {
    return gap.processId;
  }

  trackByGroup(index: number, group: BoardGroup): string {
    return group.journey.journeyId;
  }

  trackByItem(index: number, item: OpenItem): string {
    return item.key;
  }

  trackByActivity(index: number, activity: ActivitySupport): string {
    return activity.key;
  }
}
