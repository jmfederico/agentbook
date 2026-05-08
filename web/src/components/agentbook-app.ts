import { LitElement, css, html } from "lit"
import { customElement, state } from "lit/decorators.js"
import { AgentbookApiClient, LiveUpdatesClient } from "../lib/api"
import { readSelectionFromLocation, writeSelectionToLocation } from "../lib/routing"
import type { LiveConnectionState, PlanRow, PlanSummary, ProjectRecord, SelectionState, TaskRow } from "../lib/types"
import "./agentbook-details"
import "./agentbook-markdown"
import "./agentbook-projects"
import "./agentbook-tasks"

@customElement("ab-app")
export class AgentbookApp extends LitElement {
  static styles = css`
    :host {
      display: block;
      min-height: 100vh;
      color: #e2e8f0;
    }

    .shell {
      min-height: 100vh;
      padding: 1rem;
      display: grid;
      grid-template-rows: auto 1fr;
      gap: 1rem;
    }

    .topbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      padding: 1rem 1.1rem;
      border-radius: 18px;
      border: 1px solid rgba(148, 163, 184, 0.16);
      background: rgba(15, 23, 42, 0.72);
      box-shadow: 0 18px 50px rgba(2, 6, 23, 0.2);
    }

    h1 {
      margin: 0;
      font-size: 1.1rem;
    }

    .subtle {
      color: #94a3b8;
      font-size: 0.88rem;
    }

    .status {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.4rem 0.7rem;
      border-radius: 999px;
      background: rgba(30, 41, 59, 0.9);
      color: #e2e8f0;
      font-size: 0.82rem;
      text-transform: capitalize;
    }

    .grid {
      min-height: 0;
      display: grid;
      gap: 1rem;
      grid-template-columns: minmax(280px, 0.95fr) minmax(280px, 1fr) minmax(320px, 1.2fr);
      align-items: stretch;
    }

    .message {
      margin-top: 0.75rem;
      padding: 0.75rem 0.95rem;
      border-radius: 14px;
      border: 1px solid rgba(248, 113, 113, 0.32);
      background: rgba(127, 29, 29, 0.22);
      color: #fecaca;
    }

    @media (max-width: 1180px) {
      .grid {
        grid-template-columns: 1fr;
      }
    }
  `

  @state() private projects: ProjectRecord[] = []
  @state() private plans: PlanRow[] = []
  @state() private tasks: TaskRow[] = []
  @state() private selectedProject: ProjectRecord | null = null
  @state() private selectedPlan: PlanRow | null = null
  @state() private selectedTask: TaskRow | null = null
  @state() private summary: PlanSummary | null = null
  @state() private selectedProjectId = ""
  @state() private selectedPlanId = ""
  @state() private selectedTaskId = ""
  @state() private loading = true
  @state() private error: string | null = null
  @state() private connectionState: LiveConnectionState = "closed"

  private readonly api = new AgentbookApiClient()
  private readonly socket = new LiveUpdatesClient()
  private activeRequest = 0
  private bootstrapped = false

  connectedCallback() {
    super.connectedCallback()
    window.addEventListener("popstate", this.handlePopState)

    if (!this.bootstrapped) {
      this.bootstrapped = true
      void this.bootstrap()
    }
  }

  disconnectedCallback() {
    window.removeEventListener("popstate", this.handlePopState)
    this.socket.disconnect()
    super.disconnectedCallback()
  }

  private handlePopState = () => {
    void this.loadFromLocation({ replaceHistory: true, refreshProjects: true })
  }

  private async bootstrap() {
    this.socket.onStatus = (status) => {
      this.connectionState = status
    }
    this.socket.onMessage = (message) => {
      if (message.type === "invalidate") void this.refreshCurrentSelection()
    }
    this.socket.connect()
    await this.loadFromLocation({ replaceHistory: true, refreshProjects: true })
  }

  private async refreshCurrentSelection() {
    await this.loadFromLocation({ replaceHistory: true, refreshProjects: true })
  }

  private async loadFromLocation(options: { replaceHistory: boolean; refreshProjects: boolean; selection?: SelectionState }) {
    const requestId = ++this.activeRequest
    this.loading = true
    this.error = null

    try {
      const projectResponse = options.refreshProjects || this.projects.length === 0 ? await this.api.listProjects() : null
      if (requestId !== this.activeRequest) return

      if (projectResponse) {
        this.projects = projectResponse.projects
      }

      const routeSelection = options.selection ?? readSelectionFromLocation()
      const availableProjects = this.projects.length ? this.projects : projectResponse?.projects ?? []
      const resolvedProjectId = this.resolveProjectId(routeSelection.projectId, availableProjects, projectResponse?.currentProjectId)

      if (!resolvedProjectId) {
        this.clearSelection()
        this.loading = false
        return
      }

      const planResponse = await this.api.listPlans(resolvedProjectId)
      if (requestId !== this.activeRequest) return

      const tasksList = planResponse.plans
      let selectedTask: TaskRow | null = null
      let selectedPlanId = this.resolvePlanId(routeSelection.planId, tasksList)

      if (routeSelection.taskId) {
        try {
          const taskResponse = await this.api.getTask(routeSelection.taskId)
          if (requestId !== this.activeRequest) return
          selectedTask = taskResponse.task
          selectedPlanId = selectedTask.plan_id
        } catch {
          selectedTask = null
        }
      }

      if (!selectedPlanId && tasksList.length > 0) {
        selectedPlanId = tasksList[0].id
      }

      this.selectedProjectId = resolvedProjectId
      this.selectedProject = planResponse.project
      this.plans = tasksList
      this.selectedTask = selectedTask
      this.selectedTaskId = selectedTask?.id ?? ""
      this.selectedPlanId = selectedPlanId

      if (selectedPlanId) {
        const [planResponseDetail, summaryResponse, taskResponse] = await Promise.all([
          this.api.getPlan(selectedPlanId),
          this.api.getPlanSummary(selectedPlanId),
          this.api.listTasks(resolvedProjectId, selectedPlanId),
        ])

        if (requestId !== this.activeRequest) return

        this.selectedPlan = planResponseDetail.plan
        this.summary = summaryResponse
        this.tasks = taskResponse.tasks

        if (this.selectedTaskId) {
          const matchedTask = this.tasks.find((task) => task.id === this.selectedTaskId) ?? null
          this.selectedTask = matchedTask ?? this.selectedTask
          this.selectedTaskId = matchedTask?.id ?? this.selectedTaskId
        } else {
          this.selectedTask = null
        }
      } else {
        this.selectedPlan = null
        this.summary = null
        this.tasks = []
        this.selectedTask = null
        this.selectedTaskId = ""
      }

      writeSelectionToLocation(
        {
          projectId: this.selectedProjectId,
          planId: this.selectedPlanId || undefined,
          taskId: this.selectedTaskId || undefined,
        },
        options.replaceHistory,
      )
    } catch (error) {
      if (requestId !== this.activeRequest) return
      this.error = error instanceof Error ? error.message : "Failed to load agentbook data"
    } finally {
      if (requestId === this.activeRequest) this.loading = false
    }
  }

  private resolveProjectId(requestedProjectId: string | undefined, projects: ProjectRecord[], fallbackProjectId?: string) {
    if (requestedProjectId && projects.some((project) => project.id === requestedProjectId)) return requestedProjectId
    if (fallbackProjectId && projects.some((project) => project.id === fallbackProjectId)) return fallbackProjectId
    return projects[0]?.id ?? ""
  }

  private resolvePlanId(requestedPlanId: string | undefined, plans: PlanRow[]) {
    if (requestedPlanId && plans.some((plan) => plan.id === requestedPlanId)) return requestedPlanId
    return ""
  }

  private clearSelection() {
    this.selectedProjectId = ""
    this.selectedProject = null
    this.plans = []
    this.selectedPlanId = ""
    this.selectedPlan = null
    this.selectedTaskId = ""
    this.selectedTask = null
    this.summary = null
    this.tasks = []
    writeSelectionToLocation({}, true)
  }

  private handleProjectSelected = (event: CustomEvent<{ projectId: string }>) => {
    void this.loadSelection({ projectId: event.detail.projectId }, true)
  }

  private handlePlanSelected = (event: CustomEvent<{ planId: string }>) => {
    void this.loadSelection({ projectId: this.selectedProjectId, planId: event.detail.planId }, true)
  }

  private handleTaskSelected = (event: CustomEvent<{ taskId: string }>) => {
    void this.loadSelection({ projectId: this.selectedProjectId, taskId: event.detail.taskId }, true)
  }

  private handleRefreshRequested = () => {
    void this.refreshCurrentSelection()
  }

  private async loadSelection(selection: SelectionState, pushHistory: boolean) {
    await this.loadFromLocation({ replaceHistory: !pushHistory, refreshProjects: false, selection })
  }

  render() {
    const activePlanTitle = this.selectedPlan?.title ?? ""

    return html`
      <div class="shell">
        <header class="topbar">
          <div>
            <h1>agentbook browser</h1>
            <div class="subtle">Browse projects, plans, tasks, and live updates from the SQLite store.</div>
          </div>
          <div class="status">${this.connectionState}</div>
        </header>

        ${this.error ? html`<div class="message">${this.error}</div>` : null}

        <main class="grid">
          <ab-project-browser
            .projects=${this.projects}
            .plans=${this.plans}
            .selectedProjectId=${this.selectedProjectId}
            .selectedPlanId=${this.selectedPlanId}
            .loading=${this.loading}
            @project-selected=${this.handleProjectSelected}
            @plan-selected=${this.handlePlanSelected}
            @refresh-requested=${this.handleRefreshRequested}
          ></ab-project-browser>

          <ab-task-list
            .tasks=${this.tasks}
            .selectedTaskId=${this.selectedTaskId}
            .selectedPlanTitle=${activePlanTitle}
            .loading=${this.loading}
            @task-selected=${this.handleTaskSelected}
          ></ab-task-list>

          <ab-detail-panel
            .project=${this.selectedProject}
            .plan=${this.selectedPlan}
            .task=${this.selectedTask}
            .summary=${this.summary}
            .loading=${this.loading}
            .connectionState=${this.connectionState}
          ></ab-detail-panel>
        </main>
      </div>
    `
  }
}
