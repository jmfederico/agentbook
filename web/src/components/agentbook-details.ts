import { LitElement, css, html } from "lit"
import { customElement } from "lit/decorators.js"
import type { PlanRow, PlanSummary, ProjectRecord, TaskRow } from "../lib/types"

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
})

function formatTimestamp(value: number | null | undefined) {
  if (!value) return "—"
  return dateTimeFormatter.format(new Date(value))
}

function formatValue(value: string | number | null | undefined) {
  return value === null || value === undefined || value === "" ? "—" : String(value)
}

function splitList(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean)
}

function shouldCollapseMarkdown(value: string) {
  const trimmed = value.trim()
  return trimmed.includes("\n") || trimmed.length > 220 || trimmed.includes("```")
}

@customElement("ab-detail-panel")
export class AgentbookDetailPanel extends LitElement {
  static properties = {
    project: { type: Object },
    plan: { type: Object },
    task: { type: Object },
    summary: { type: Object },
    loading: { type: Boolean },
    connectionState: { type: String },
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

    .badge,
    .pill,
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      border-radius: 999px;
      padding: 0.18rem 0.55rem;
      background: rgba(30, 41, 59, 0.9);
      color: #e2e8f0;
      font-size: 0.76rem;
    }

    .section {
      display: grid;
      gap: 0.5rem;
      padding: 0.85rem;
      border-radius: 14px;
      background: rgba(2, 6, 23, 0.46);
      border: 1px solid rgba(148, 163, 184, 0.12);
    }

    .section h3 {
      margin: 0;
      font-size: 0.92rem;
      color: #dbeafe;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      gap: 0.5rem;
      align-items: start;
    }

    .meta-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.5rem;
    }

    .field {
      display: grid;
      gap: 0.15rem;
      color: #cbd5e1;
      font-size: 0.9rem;
    }

    .field-block {
      gap: 0.35rem;
    }

    .label {
      color: #94a3b8;
      font-size: 0.76rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      word-break: break-word;
    }

    .muted {
      color: #94a3b8;
    }

    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
    }

    .chip {
      background: rgba(30, 41, 59, 0.9);
      color: #e2e8f0;
      font-size: 0.74rem;
    }

    .progress {
      display: grid;
      gap: 0.35rem;
    }

    .bar {
      width: 100%;
      height: 10px;
      border-radius: 999px;
      background: rgba(148, 163, 184, 0.14);
      overflow: hidden;
    }

    .bar > div {
      height: 100%;
      border-radius: inherit;
      background: linear-gradient(90deg, #38bdf8, #818cf8);
    }

    details {
      border: 1px solid rgba(148, 163, 184, 0.12);
      border-radius: 12px;
      background: rgba(15, 23, 42, 0.56);
      padding: 0.5rem 0.7rem;
    }

    summary {
      cursor: pointer;
      color: #dbeafe;
      font-weight: 600;
    }

    details summary::-webkit-details-marker {
      color: #94a3b8;
    }

    .markdown-wrap {
      margin-top: 0.55rem;
    }

    .empty {
      color: #94a3b8;
      border: 1px dashed rgba(148, 163, 184, 0.24);
      border-radius: 14px;
      padding: 0.8rem;
    }

    .task-snapshot {
      display: grid;
      gap: 0.35rem;
      font-size: 0.9rem;
      color: #cbd5e1;
    }

    .task-snapshot .label-value {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
    }

    @media (max-width: 860px) {
      .meta-grid {
        grid-template-columns: 1fr;
      }
    }
  `

  project: ProjectRecord | null = null
  plan: PlanRow | null = null
  task: TaskRow | null = null
  summary: PlanSummary | null = null
  loading = false
  connectionState = "closed"

  private renderField(label: string, value: string | number | null | undefined, opts: { mono?: boolean } = {}) {
    const content = formatValue(value)
    return html`
      <div class="field">
        <span class="label">${label}</span>
        <span class=${opts.mono ? "mono" : ""}>${content}</span>
      </div>
    `
  }

  private renderMarkdownBlock(label: string, content: string, opts: { collapse?: boolean } = {}) {
    const trimmed = content.trim()
    if (!trimmed) {
      return html`
        <div class="field field-block">
          <span class="label">${label}</span>
          <span class="muted">—</span>
        </div>
      `
    }

    const collapse = opts.collapse ?? shouldCollapseMarkdown(trimmed)
    if (collapse) {
      return html`
        <details>
          <summary>${label}</summary>
          <div class="markdown-wrap">
            <ab-markdown .content=${trimmed}></ab-markdown>
          </div>
        </details>
      `
    }

    return html`
      <div class="field field-block">
        <span class="label">${label}</span>
        <div class="markdown-wrap">
          <ab-markdown .content=${trimmed}></ab-markdown>
        </div>
      </div>
    `
  }

  private renderChips(values: string[]) {
    if (values.length === 0) return html`<span class="muted">—</span>`
    return html`
      <div class="chips">
        ${values.map((value) => html`<span class="chip mono">${value}</span>`) }
      </div>
    `
  }

  private renderProject(project: ProjectRecord) {
    return html`
      <div class="section">
        <div class="section-header">
          <h3>Project</h3>
          <span class="badge mono">${project.id}</span>
        </div>

        <div class="meta-grid">
          ${this.renderField("Title", project.title)}
          ${this.renderField("Name", project.name, { mono: true })}
          ${this.renderField("Plans", project.plan_count)}
          ${this.renderField("Tasks", project.task_count)}
          ${this.renderField("Path", project.path, { mono: true })}
          ${this.renderField("Source", project.source || "—")}
          ${this.renderField("Updated", formatTimestamp(project.updated_at))}
          ${this.renderField("Git root", project.git_root, { mono: true })}
          ${this.renderField("Git common dir", project.git_common_dir, { mono: true })}
        </div>

        ${this.renderMarkdownBlock("Description", project.description, { collapse: shouldCollapseMarkdown(project.description) })}
      </div>
    `
  }

  private renderPlan(plan: PlanRow, summary: PlanSummary | null) {
    return html`
      <div class="section">
        <div class="section-header">
          <h3>Plan</h3>
          <span class="badge mono">${plan.id}</span>
        </div>

        <div class="meta-grid">
          ${this.renderField("Title", plan.title)}
          ${this.renderField("Status", plan.status)}
          ${this.renderField("Name", plan.name, { mono: true })}
          ${this.renderField("Owner", plan.created_by || "—")}
          ${this.renderField("Created", formatTimestamp(plan.created_at))}
          ${this.renderField("Updated", formatTimestamp(plan.updated_at))}
        </div>

        <div class="progress">
          ${summary
            ? html`
                <div class="field">
                  <span class="label">Progress</span>
                  <span>${summary.progress.percentage}% complete · ${summary.progress.completed}/${summary.progress.total} tasks</span>
                </div>
                <div class="bar"><div style=${`width:${summary.progress.percentage}%`}></div></div>
                <div class="chips">
                  <span class="chip">needs guidance ${summary.progress.needs_guidance}</span>
                  ${Object.entries(summary.progress.by_status)
                    .sort(([left], [right]) => left.localeCompare(right))
                    .map(([status, count]) => html`<span class="chip mono">${status}: ${count}</span>`)}
                </div>
              `
            : null}
        </div>

        ${this.renderMarkdownBlock("Description", plan.description)}
        ${this.renderMarkdownBlock("Specification", plan.spec, { collapse: true })}
        ${this.renderMarkdownBlock("Document", plan.document, { collapse: true })}
      </div>
    `
  }

  private renderTask(task: TaskRow) {
    const dependsOn = splitList(task.depends_on)

    return html`
      <div class="section">
        <div class="section-header">
          <h3>Task</h3>
          <span class="badge mono">${task.id}</span>
        </div>

        <div class="meta-grid">
          ${this.renderField("Title", task.title)}
          ${this.renderField("Status", task.status)}
          ${this.renderField("Priority", task.priority)}
          ${this.renderField("Position", task.position)}
          ${this.renderField("Plan", task.plan_id, { mono: true })}
          ${this.renderField("Assignee", task.assignee || "—")}
          ${this.renderField("Session", task.session_id || "—", { mono: true })}
          ${this.renderField("Updated", formatTimestamp(task.updated_at))}
        </div>

        <div class="task-snapshot">
          <div class="label-value"><span class="label">Worktree</span><span class="mono">${formatValue(task.worktree_dir)}</span></div>
          <div class="label-value"><span class="label">Created</span><span>${formatTimestamp(task.created_at)}</span></div>
          <div class="label-value"><span class="label">Depends on</span>${this.renderChips(dependsOn)}</div>
        </div>

        ${this.renderMarkdownBlock("Description", task.description)}
        ${this.renderMarkdownBlock("Notes", task.notes, { collapse: true })}
      </div>
    `
  }

  render() {
    return html`
      <section class="panel">
        <div class="header">
          <h2 class="title">Details</h2>
          <div class="badge">ws: ${this.connectionState}</div>
        </div>

        ${this.project ? this.renderProject(this.project) : html`<div class="empty">${this.loading ? "Loading project…" : "Pick a project or plan to see details."}</div>`}

        ${this.plan ? this.renderPlan(this.plan, this.summary) : html`<div class="empty">Select a plan to inspect its details.</div>`}

        ${this.task ? this.renderTask(this.task) : html`<div class="empty">Select a task to inspect its details.</div>`}
      </section>
    `
  }
}
