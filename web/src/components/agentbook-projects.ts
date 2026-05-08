import { LitElement, css, html } from "lit"
import { customElement } from "lit/decorators.js"
import type { PlanRow, ProjectRecord } from "../lib/types"

@customElement("ab-project-browser")
export class AgentbookProjectBrowser extends LitElement {
  static properties = {
    projects: { type: Array },
    plans: { type: Array },
    selectedProjectId: { type: String },
    selectedPlanId: { type: String },
    loading: { type: Boolean },
  }

  static styles = css`
    :host {
      display: block;
      min-height: 0;
    }

    .panel {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
      min-height: 100%;
      padding: 1rem;
      background: rgba(15, 23, 42, 0.72);
      border: 1px solid rgba(148, 163, 184, 0.16);
      border-radius: 18px;
      box-shadow: 0 18px 50px rgba(2, 6, 23, 0.22);
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.75rem;
    }

    .title {
      margin: 0;
      font-size: 1rem;
    }

    .refresh {
      border: 1px solid rgba(148, 163, 184, 0.2);
      background: rgba(30, 41, 59, 0.9);
      color: #e2e8f0;
      border-radius: 999px;
      padding: 0.45rem 0.75rem;
      cursor: pointer;
    }

    .project-list,
    .plan-list {
      display: grid;
      gap: 0.6rem;
    }

    .project-card,
    .plan-card {
      width: 100%;
      text-align: left;
      border: 1px solid rgba(148, 163, 184, 0.14);
      background: rgba(15, 23, 42, 0.86);
      color: inherit;
      border-radius: 14px;
      padding: 0.75rem;
      cursor: pointer;
    }

    .project-card[selected],
    .plan-card[selected] {
      border-color: rgba(96, 165, 250, 0.7);
      box-shadow: inset 0 0 0 1px rgba(96, 165, 250, 0.18);
    }

    .project-name,
    .plan-name {
      font-weight: 650;
      margin-bottom: 0.2rem;
    }

    .meta,
    .submeta {
      color: #94a3b8;
      font-size: 0.85rem;
      line-height: 1.35;
    }

    .section-title {
      margin: 0.4rem 0 0.15rem;
      font-size: 0.92rem;
      color: #cbd5e1;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .empty {
      color: #94a3b8;
      border: 1px dashed rgba(148, 163, 184, 0.28);
      border-radius: 14px;
      padding: 0.8rem;
    }
  `

  projects: ProjectRecord[] = []
  plans: PlanRow[] = []
  selectedProjectId = ""
  selectedPlanId = ""
  loading = false

  private selectProject(projectId: string) {
    this.dispatchEvent(new CustomEvent("project-selected", { detail: { projectId }, bubbles: true, composed: true }))
  }

  private selectPlan(planId: string) {
    this.dispatchEvent(new CustomEvent("plan-selected", { detail: { planId }, bubbles: true, composed: true }))
  }

  private requestRefresh() {
    this.dispatchEvent(new CustomEvent("refresh-requested", { bubbles: true, composed: true }))
  }

  render() {
    const projects = this.projects ?? []
    const plans = this.plans ?? []
    const selectedProject = projects.find((project) => project.id === this.selectedProjectId) ?? null

    return html`
      <section class="panel">
        <div class="header">
          <h2 class="title">Projects & plans</h2>
          <button class="refresh" type="button" @click=${this.requestRefresh}>Refresh</button>
        </div>

        <div class="project-list">
          ${projects.map(
            (project) => html`
              <button
                class="project-card"
                type="button"
                ?selected=${project.id === this.selectedProjectId}
                @click=${() => this.selectProject(project.id)}
              >
                <div class="project-name">${project.title}</div>
                <div class="meta">${project.description}</div>
                <div class="submeta">${project.plan_count} plans · ${project.task_count} tasks</div>
              </button>
            `,
          )}
        </div>

        <div>
          <div class="section-title">Selected project</div>
          ${selectedProject
            ? html`
                <div class="meta">${selectedProject.name}</div>
                <div class="submeta">${selectedProject.db_path}</div>
              `
            : html`<div class="empty">Choose a project to browse its plans.</div>`}
        </div>

        <div>
          <div class="section-title">Plans</div>
          ${plans.length
            ? html`
                <div class="plan-list">
                  ${plans.map(
                    (plan) => html`
                      <button
                        class="plan-card"
                        type="button"
                        ?selected=${plan.id === this.selectedPlanId}
                        @click=${() => this.selectPlan(plan.id)}
                      >
                        <div class="plan-name">${plan.title}</div>
                        <div class="meta">${plan.description || plan.name}</div>
                        <div class="submeta">${plan.status}</div>
                      </button>
                    `,
                  )}
                </div>
              `
            : html`<div class="empty">No plans available for this project.</div>`}
        </div>
      </section>
    `
  }
}
