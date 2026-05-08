import { LitElement, css, html } from "lit"
import { customElement } from "lit/decorators.js"
import type { TaskRow } from "../lib/types"

@customElement("ab-task-list")
export class AgentbookTaskList extends LitElement {
  static properties = {
    tasks: { type: Array },
    selectedTaskId: { type: String },
    selectedPlanTitle: { type: String },
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
      gap: 0.75rem;
      align-items: start;
    }

    .title {
      margin: 0;
      font-size: 1rem;
    }

    .subtitle,
    .empty {
      color: #94a3b8;
      font-size: 0.9rem;
    }

    .task-list {
      display: grid;
      gap: 0.6rem;
    }

    .task-card {
      width: 100%;
      text-align: left;
      border: 1px solid rgba(148, 163, 184, 0.14);
      background: rgba(15, 23, 42, 0.86);
      color: inherit;
      border-radius: 14px;
      padding: 0.75rem;
      cursor: pointer;
    }

    .task-card[selected] {
      border-color: rgba(96, 165, 250, 0.7);
      box-shadow: inset 0 0 0 1px rgba(96, 165, 250, 0.18);
    }

    .task-title {
      font-weight: 650;
      margin-bottom: 0.25rem;
    }

    .task-meta {
      color: #94a3b8;
      font-size: 0.85rem;
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .pill {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      border-radius: 999px;
      padding: 0.18rem 0.55rem;
      background: rgba(30, 41, 59, 0.9);
      color: #e2e8f0;
      font-size: 0.76rem;
    }
  `

  tasks: TaskRow[] = []
  selectedTaskId = ""
  selectedPlanTitle = ""
  loading = false

  private selectTask(taskId: string) {
    this.dispatchEvent(new CustomEvent("task-selected", { detail: { taskId }, bubbles: true, composed: true }))
  }

  render() {
    const tasks = this.tasks ?? []

    return html`
      <section class="panel">
        <div class="header">
          <div>
            <h2 class="title">Tasks</h2>
            <div class="subtitle">${this.selectedPlanTitle || "Select a plan to view tasks."}</div>
          </div>
          <div class="pill">${tasks.length} items</div>
        </div>

        ${tasks.length
          ? html`
              <div class="task-list">
                ${tasks.map(
                  (task) => html`
                    <button
                      class="task-card"
                      type="button"
                      ?selected=${task.id === this.selectedTaskId}
                      @click=${() => this.selectTask(task.id)}
                    >
                      <div class="task-title">${task.title}</div>
                      <div class="task-meta">
                        <span class="pill">${task.status}</span>
                        <span>priority ${task.priority}</span>
                        <span>position ${task.position}</span>
                        ${task.assignee ? html`<span>assignee ${task.assignee}</span>` : null}
                      </div>
                    </button>
                  `,
                )}
              </div>
            `
          : html`<div class="empty">${this.loading ? "Loading tasks…" : "No tasks to show yet."}</div>`}
      </section>
    `
  }
}
