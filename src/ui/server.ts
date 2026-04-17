import { Database } from "bun:sqlite"
import fs from "fs"
import os from "os"
import path from "path"
import { execSync } from "child_process"

type OpenCodeProjectRow = {
  id: string
  worktree: string
  name: string | null
  icon_color: string | null
  time_created: number
}

type AgentbookPlanRow = {
  id: string
  name: string
  title: string
  description: string | null
  document: string | null
  status: string
  created_at: number
  updated_at: number
}

type AgentbookTaskRow = {
  id: string
  plan_id: string
  title: string
  description: string | null
  status: string
  priority: number
  assignee: string | null
  session_id: string | null
  notes: string | null
  created_at: number
  updated_at: number
}

type CountRow = { count: number }

const DEFAULT_PORT = 3141
const OPENCODE_DB_PATH = path.join(os.homedir(), ".local", "share", "opencode", "opencode.db")
const REFRESH_MS = 10_000
const STREAM_POLL_MS = 3_000
const STREAM_KEEPALIVE_MS = 15_000
const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000

const TASK_ICONS: Record<string, string> = {
  pending: "⏳",
  in_progress: "🔄",
  completed: "✅",
  blocked: "🚫",
  needs_review: "🟣",
  cancelled: "❌",
}

const TASK_STATUS_COLUMNS = [
  { key: "pending", label: "Pending" },
  { key: "in_progress", label: "In Progress" },
  { key: "completed", label: "Completed" },
  { key: "blocked", label: "Blocked" },
  { key: "cancelled", label: "Cancelled" },
] as const

const APP_CSS = String.raw`
    :root {
      color-scheme: dark;
      --bg: #1a1a2e;
      --panel: #16213e;
      --panel-2: #13203a;
      --panel-3: #0f3460;
      --text: #e0e0e0;
      --muted: #9ca3af;
      --border: rgba(255, 255, 255, 0.08);
      --shadow: 0 10px 24px rgba(0, 0, 0, 0.22);
      --highlight: #e94560;
      --active: #3b82f6;
      --draft: #6b7280;
      --completed: #22c55e;
      --paused: #eab308;
      --cancelled: #ef4444;
      --pending: #9ca3af;
      --in-progress: #3b82f6;
      --blocked: #f97316;
      --radius: 8px;
      --max-width: 1180px;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      min-height: 100vh;
      background: linear-gradient(180deg, #19192b 0%, #121726 100%);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }

    a {
      color: inherit;
      text-decoration: none;
    }

    .page {
      width: min(100%, var(--max-width));
      margin: 0 auto;
      padding: 24px;
    }

    .hero,
    .panel,
    .project-card,
    .plan-card,
    .timeline-item,
    .empty,
    .error {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
    }

    .hero {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 20px 22px;
      margin-bottom: 24px;
      background: linear-gradient(135deg, rgba(15, 52, 96, 0.95), rgba(22, 33, 62, 0.95));
    }

    .hero-title {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 0;
      font-size: 1.7rem;
    }

    .hero-icon {
      width: 38px;
      height: 38px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 10px;
      background: rgba(233, 69, 96, 0.15);
      color: var(--highlight);
      font-size: 1.1rem;
    }

    .hero-subtitle,
    .muted,
    .project-path,
    .meta,
    .timeline-meta {
      color: var(--muted);
    }

    .toolbar {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .subtle-button,
    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 9px 12px;
      border-radius: 999px;
      border: 1px solid var(--border);
      background: rgba(255, 255, 255, 0.04);
    }

    .subtle-button:hover,
    .back-link:hover,
    .project-card:hover {
      background: rgba(255, 255, 255, 0.08);
    }

    .project-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 18px;
    }

    .project-card {
      padding: 18px;
      transition: border-color 0.15s ease, transform 0.15s ease, background 0.15s ease;
    }

    .project-card:hover {
      transform: translateY(-2px);
      border-color: rgba(233, 69, 96, 0.35);
    }

    .row {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .row-between {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
    }

    .project-name,
    .section-title,
    .plan-title,
    .detail-title {
      margin: 0;
      font-weight: 700;
    }

    .project-name {
      font-size: 1.05rem;
    }

    .project-path {
      margin-top: 8px;
      font-size: 0.92rem;
      word-break: break-all;
    }

    .color-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      display: inline-block;
      flex: none;
      background: var(--highlight);
      box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.06);
    }

    .badge-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 14px;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 0.78rem;
      font-weight: 600;
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(255, 255, 255, 0.05);
      white-space: nowrap;
    }

    .badge.status-active,
    .badge.status-in_progress { background: rgba(59, 130, 246, 0.18); color: #bfdbfe; }
    .badge.status-draft,
    .badge.status-pending { background: rgba(107, 114, 128, 0.2); color: #d1d5db; }
    .badge.status-completed { background: rgba(34, 197, 94, 0.18); color: #bbf7d0; }
    .badge.status-paused { background: rgba(234, 179, 8, 0.18); color: #fde68a; }
    .badge.status-cancelled { background: rgba(239, 68, 68, 0.18); color: #fecaca; }
    .badge.status-blocked { background: rgba(249, 115, 22, 0.18); color: #fed7aa; }
    .badge.status-needs_review { background: rgba(233, 69, 96, 0.18); color: #fda4af; }
    .badge.action { background: rgba(233, 69, 96, 0.16); color: #fda4af; }

    .label-empty {
      margin-top: 14px;
      font-size: 0.88rem;
      color: var(--muted);
    }

    .detail-header {
      display: grid;
      gap: 18px;
      margin-bottom: 24px;
    }

    .panel {
      padding: 18px;
    }

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 16px;
    }

    .section-title {
      font-size: 1.1rem;
    }

    .stack {
      display: grid;
      gap: 14px;
    }

    turbo-frame {
      display: block;
    }

    .plan-list {
      display: grid;
      gap: 14px;
    }

    .plan-card {
      overflow: hidden;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: linear-gradient(180deg, rgba(22, 33, 62, 0.94), rgba(19, 32, 58, 0.98));
    }

    .plan-summary {
      list-style: none;
      cursor: pointer;
      padding: 16px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      background: rgba(255, 255, 255, 0.02);
    }

    .plan-summary::-webkit-details-marker { display: none; }

    .plan-summary-main {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
      flex: 1;
    }

    .plan-chevron {
      width: 16px;
      flex: none;
      color: var(--muted);
    }

    .plan-card[open] .plan-chevron {
      color: var(--text);
    }

    .plan-chevron .when-open {
      display: none;
    }

    .plan-card[open] .plan-chevron .when-open {
      display: inline;
    }

    .plan-card[open] .plan-chevron .when-closed {
      display: none;
    }

    .plan-summary-copy {
      min-width: 0;
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .copy-plan-button {
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(255, 255, 255, 0.04);
      color: var(--muted);
      border-radius: 999px;
      padding: 4px 8px;
      font-size: 0.8rem;
      line-height: 1;
      cursor: pointer;
      flex: none;
      transition: color 120ms ease, background 120ms ease, border-color 120ms ease;
    }

    .copy-plan-button:hover {
      color: var(--text);
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 255, 255, 0.14);
    }

    .copy-plan-button.copied {
      color: #7ee787;
      border-color: rgba(126, 231, 135, 0.35);
      background: rgba(126, 231, 135, 0.12);
    }

    .plan-title {
      font-size: 1rem;
    }

    .plan-summary-meta {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 12px;
      flex-wrap: wrap;
    }

    .plan-summary-stat {
      font-size: 0.84rem;
      color: var(--muted);
      white-space: nowrap;
    }

    .progress-inline {
      width: 140px;
      min-width: 140px;
    }

    .plan-body {
      border-top: 1px solid var(--border);
      padding: 16px 18px 18px;
      display: grid;
      gap: 16px;
      background: rgba(0, 0, 0, 0.08);
    }

    .plan-description {
      margin: 0;
    }

    .progress {
      width: 100%;
      height: 8px;
      border-radius: 999px;
      overflow: hidden;
      background: rgba(255, 255, 255, 0.08);
    }

    .progress > span {
      display: block;
      height: 100%;
      background: linear-gradient(90deg, var(--highlight), #ff7a8b);
    }

    .description,
    .timeline-detail {
      line-height: 1.5;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .document-details {
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: rgba(255, 255, 255, 0.03);
      overflow: hidden;
    }

    .document-summary {
      list-style: none;
      cursor: pointer;
      padding: 10px 12px;
      font-weight: 600;
      color: var(--muted);
    }

    .document-summary::-webkit-details-marker { display: none; }

    .document-body {
      margin: 0;
      padding: 0 12px 12px;
      white-space: pre-wrap;
      word-break: break-word;
      font: 0.9rem/1.5 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      color: var(--text);
    }

    .task-title-line {
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }

    .task-icon {
      flex: none;
      width: 1.2rem;
      text-align: center;
    }

    .task-title {
      font-weight: 600;
    }

    .plan-task-columns {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      gap: 12px;
      align-items: start;
    }

    .task-column {
      display: flex;
      flex-direction: column;
      gap: 10px;
      min-height: 132px;
      padding: 12px;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.06);
      background: rgba(255, 255, 255, 0.03);
    }

    .task-column-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .task-column-title {
      margin: 0;
      font-size: 0.84rem;
      font-weight: 700;
      color: var(--muted);
    }

    .task-column-count {
      font-size: 0.76rem;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.08);
      color: var(--muted);
    }

    .task-column-body {
      display: grid;
      gap: 8px;
    }

    .task-card {
      padding: 10px;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.05);
      background: rgba(10, 14, 25, 0.28);
    }

    .task-card-meta {
      margin-top: 8px;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      font-size: 0.78rem;
      color: var(--muted);
    }

    .task-column-empty {
      font-size: 0.82rem;
      color: var(--muted);
      padding: 4px 0;
    }

    .timeline {
      display: grid;
      gap: 12px;
    }

    .timeline-item {
      padding: 14px 16px;
    }

    .timeline-meta {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 8px;
      font-size: 0.9rem;
    }

    .error,
    .empty {
      padding: 24px;
      text-align: center;
    }

    .error-title,
    .empty-title {
      margin: 0 0 8px;
      font-size: 1.1rem;
    }

    .error-message,
    .empty-copy {
      margin: 0;
      color: var(--muted);
    }

    .pill-count {
      font-weight: 700;
    }

    @media (max-width: 860px) {
      .hero {
        align-items: flex-start;
        flex-direction: column;
      }

      .section-header,
      .row-between {
        flex-direction: column;
        align-items: flex-start;
      }

      .plan-summary {
        flex-direction: column;
        align-items: flex-start;
      }

      .plan-summary-meta {
        justify-content: flex-start;
      }

      .progress-inline {
        width: min(100%, 220px);
        min-width: 0;
      }
    }

    @media (max-width: 640px) {
      .page {
        padding: 16px;
      }

      .hero-title {
        font-size: 1.4rem;
      }

      .project-grid {
        grid-template-columns: 1fr;
      }
    }
`

type ProjectSummary = {
  id: string
  worktree: string
  name: string
  icon_color: string | null
  has_agentbook: boolean
  active_plans: number
  active_tasks: number
  pending_tasks: number
  completed_tasks: number
}

type TaskDetails = {
  id: string
  title: string
  description: string
  status: string
  priority: number
  assignee: string
  session_id: string
  notes: string
  created_at: number
  updated_at: number
}

type PlanDetails = {
  id: string
  name: string
  title: string
  status: string
  description: string
  document: string
  created_at: number
  updated_at: number
  tasks: TaskDetails[]
}

type ProjectDetails = {
  project: {
    id: string
    worktree: string
    name: string
    icon_color: string | null
    has_agentbook: boolean
  }
  plans: PlanDetails[]
}

type ProjectDbInfo = {
  project: OpenCodeProjectRow
  agentbookDbPath: string | null
}

type DataVersionRow = {
  data_version: number
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`
}

function projectName(name: string | null | undefined, worktree: string): string {
  const trimmed = name?.trim()
  return trimmed ? trimmed : path.basename(worktree)
}

function openReadonlyDatabase(databasePath: string): Database {
  return new Database(databasePath, { readonly: true })
}

function withReadonlyDatabase<T>(databasePath: string, fn: (db: Database) => T): T {
  const db = openReadonlyDatabase(databasePath)
  try {
    return fn(db)
  } finally {
    db.close()
  }
}

function readDataVersion(db: Database): number {
  const row = db.query("PRAGMA data_version").get() as DataVersionRow | null
  return Number(row?.data_version ?? 0)
}

function getDataVersion(databasePath: string): number {
  return withReadonlyDatabase(databasePath, (db) => {
    return readDataVersion(db)
  })
}

function safeDirectoryExists(directoryPath: string): boolean {
  try {
    return fs.statSync(directoryPath).isDirectory()
  } catch {
    return false
  }
}

function resolveGitCommonDir(worktree: string): string | null {
  try {
    const raw = execSync(`git -C ${shellQuote(worktree)} rev-parse --git-common-dir`, {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim()
    return path.resolve(worktree, raw)
  } catch {
    return null
  }
}

function findAgentbookDbPath(worktree: string): string | null {
  if (!safeDirectoryExists(worktree)) return null

  const gitCommonDir = resolveGitCommonDir(worktree)
  if (gitCommonDir) {
    const sharedDbPath = path.join(gitCommonDir, "agentbook", "agentbook.db")
    if (fs.existsSync(sharedDbPath)) return sharedDbPath
  }

  const fallbackDbPath = path.join(worktree, ".opencode", "agentbook.db")
  return fs.existsSync(fallbackDbPath) ? fallbackDbPath : null
}

function openProjectDb(projectId: string): ProjectDbInfo {
  return withReadonlyDatabase(OPENCODE_DB_PATH, (openCodeDb) => {
    const project = openCodeDb
      .query(`SELECT id, worktree, name, icon_color, time_created FROM project WHERE id = ?`)
      .get(projectId) as OpenCodeProjectRow | null

    if (!project) {
      throw new Response("Project not found", { status: 404 })
    }

    if (!safeDirectoryExists(project.worktree)) {
      throw new Response("Project worktree not found", { status: 404 })
    }

    return {
      project,
      agentbookDbPath: findAgentbookDbPath(project.worktree),
    }
  })
}

function htmlResponse(body: string, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers)
  headers.set("Content-Type", "text/html; charset=utf-8")
  return new Response(body, { ...init, headers })
}

function textResponse(body: string, status = 500): Response {
  const headers = new Headers()
  headers.set("Content-Type", "text/plain; charset=utf-8")
  return new Response(body, { status, headers })
}

function getCount(db: Database, sql: string): number {
  const row = db.query(sql).get() as CountRow | null
  return row?.count ?? 0
}

function loadProjectSummaries(): ProjectSummary[] {
  return withReadonlyDatabase(OPENCODE_DB_PATH, (openCodeDb) => {
    const projects = openCodeDb
      .query(
        `SELECT id, worktree, name, icon_color, time_created
         FROM project
         WHERE id != 'global'
         ORDER BY time_created DESC`,
      )
      .all() as OpenCodeProjectRow[]

    const results: ProjectSummary[] = []

    for (const project of projects) {
      if (!safeDirectoryExists(project.worktree)) continue

      const agentbookDbPath = findAgentbookDbPath(project.worktree)
      const summary = {
        id: project.id,
        worktree: project.worktree,
        name: projectName(project.name, project.worktree),
        icon_color: project.icon_color,
        has_agentbook: agentbookDbPath !== null,
        active_plans: 0,
        active_tasks: 0,
        pending_tasks: 0,
        completed_tasks: 0,
      }

      if (agentbookDbPath) {
        withReadonlyDatabase(agentbookDbPath, (agentbookDb) => {
          summary.active_plans = getCount(
            agentbookDb,
            `SELECT COUNT(*) AS count FROM plan WHERE status IN ('active', 'draft')`,
          )
          summary.active_tasks = getCount(
            agentbookDb,
            `SELECT COUNT(*) AS count FROM task WHERE status = 'in_progress'`,
          )
          summary.pending_tasks = getCount(agentbookDb, `SELECT COUNT(*) AS count FROM task WHERE status = 'pending'`)
          summary.completed_tasks = getCount(
            agentbookDb,
            `SELECT COUNT(*) AS count FROM task WHERE status = 'completed'`,
          )
        })
      }

      results.push(summary)
    }

    return results
  })
}

function loadProjectDetails(projectId: string): ProjectDetails {
  const { project, agentbookDbPath } = openProjectDb(projectId)

  const response = {
    project: {
      id: project.id,
      worktree: project.worktree,
      name: projectName(project.name, project.worktree),
      icon_color: project.icon_color,
      has_agentbook: agentbookDbPath !== null,
    },
    plans: [] as PlanDetails[],
  }

  if (!agentbookDbPath) return response

  return withReadonlyDatabase(agentbookDbPath, (agentbookDb) => {
    const plans = agentbookDb.query(`SELECT * FROM plan ORDER BY created_at DESC`).all() as AgentbookPlanRow[]

    response.plans = plans.map((plan) => {
      const tasks = agentbookDb.query(`SELECT * FROM task WHERE plan_id = ? ORDER BY position`).all(plan.id) as AgentbookTaskRow[]

      return {
        id: plan.id,
        name: plan.name,
        title: plan.title,
        status: plan.status,
        description: plan.description ?? "",
        document: plan.document ?? "",
        created_at: plan.created_at,
        updated_at: plan.updated_at,
        tasks: tasks.map((task) => ({
          id: task.id,
          title: task.title,
          description: task.description ?? "",
          status: task.status,
          priority: task.priority ?? 0,
          assignee: task.assignee ?? "",
          session_id: task.session_id ?? "",
          notes: task.notes ?? "",
          created_at: task.created_at,
          updated_at: task.updated_at,
        })),
      }
    })
    return response
  })
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function safeColor(value: string | null | undefined): string {
  return typeof value === "string" && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value) ? value : "#e94560"
}

function formatRelative(value: number): string {
  const timestamp = Number(value)
  if (!timestamp) return "unknown"

  const diff = Date.now() - timestamp
  const abs = Math.abs(diff)
  const units: Array<[string, number]> = [
    ["y", 365 * 24 * 60 * 60 * 1000],
    ["mo", 30 * 24 * 60 * 60 * 1000],
    ["d", 24 * 60 * 60 * 1000],
    ["h", 60 * 60 * 1000],
    ["m", 60 * 1000],
    ["s", 1000],
  ]

  for (const [label, size] of units) {
    if (abs >= size || label === "s") {
      const amount = Math.max(1, Math.floor(abs / size))
      return diff >= 0 ? `${amount}${label} ago` : `in ${amount}${label}`
    }
  }

  return "just now"
}

function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`
}

function humanizeStatus(status: string): string {
  return String(status || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

function statusBadge(status: string, label?: string): string {
  return `<span class="badge status-${escapeHtml(status)}">${escapeHtml(label ?? humanizeStatus(status))}</span>`
}

function statusSortPriority(status: string): number {
  if (["active", "draft", "paused"].includes(status)) return 0
  if (status === "completed") return 1
  if (status === "cancelled") return 2
  return 3
}

function filterPlans(plans: PlanDetails[]): PlanDetails[] {
  const now = Date.now()
  return plans.filter(
    (plan) =>
      plan.status !== "archived" && !(plan.status === "completed" && now - Number(plan.updated_at) > TWO_DAYS_MS),
  )
}

function frameId(planId: string): string {
  return `plan-${planId}`
}

function planCardId(planId: string): string {
  return `plan-card-${planId}`
}

function planSummaryId(planId: string): string {
  return `plan-summary-${planId}`
}

function projectHref(projectId: string): string {
  return `/projects/${encodeURIComponent(projectId)}`
}

function planFrameHref(projectId: string, planId: string): string {
  return `/projects/${encodeURIComponent(projectId)}/plans/${encodeURIComponent(planId)}`
}

function decodePathSegment(value: string, label: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    throw new Response(`${label} is not a valid URL path segment`, { status: 400 })
  }
}

function renderAutoRefreshScript(mode: "page" | "frames" | "none"): string {
  if (mode === "none") {
    return ""
  }

  if (mode === "frames") {
    return `
  <script>
    window.addEventListener("load", () => {
      setInterval(() => {
        document.querySelectorAll("turbo-frame[src]").forEach((frame) => {
          if (typeof frame.reload === "function") {
            frame.reload()
            return
          }

          const src = frame.getAttribute("src")
          if (!src) return
          frame.setAttribute("src", src)
        })
      }, ${REFRESH_MS})
    })
  </script>`
  }

  return `
  <script>
    window.addEventListener("load", () => {
      setInterval(() => Turbo.visit(location.href, {action: "replace"}), ${REFRESH_MS})
    })
  </script>`
}

function renderShell(
  title: string,
  subtitle: string,
  currentPath: string,
  content: string,
  refreshMode: "page" | "frames" | "none" = "page",
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="turbo-refresh-method" content="morph">
  <meta name="turbo-refresh-scroll" content="preserve">
  <style>${APP_CSS}</style>
  <script type="module" src="https://cdn.jsdelivr.net/npm/@hotwired/turbo@8/dist/turbo.es2017-esm.js"></script>
</head>
<body>
  <main class="page">
    <header class="hero">
      <div>
        <h1 class="hero-title"><span class="hero-icon">◈</span> Agentbook Dashboard</h1>
        <div class="hero-subtitle">${escapeHtml(subtitle)}</div>
      </div>
      <div class="toolbar">
        <a class="subtle-button" href="${escapeHtml(currentPath)}">Refresh</a>
      </div>
    </header>
    ${content}
  </main>
  ${renderAutoRefreshScript(refreshMode)}
  <script>
    (function () {
      function flashCopied(button) {
        if (!button || !button.classList) return;
        button.classList.add('copied');
        setTimeout(function () { button.classList.remove('copied'); }, 1500);
      }

      function fallbackCopy(text, button) {
        try {
          var ta = document.createElement('textarea');
          ta.value = text;
          ta.setAttribute('readonly', '');
          ta.style.position = 'fixed';
          ta.style.top = '0';
          ta.style.left = '0';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.focus();
          ta.select();
          var ok = document.execCommand('copy');
          document.body.removeChild(ta);
          if (ok) { flashCopied(button); return true; }
        } catch (err) {
          console.warn('Clipboard fallback failed:', err);
        }
        return false;
      }

      window.copyToClipboard = function (text, button) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () {
            flashCopied(button);
          }).catch(function (err) {
            console.warn('Clipboard API failed, falling back:', err);
            fallbackCopy(text, button);
          });
        } else {
          fallbackCopy(text, button);
        }
      };
    })();
  </script>
</body>
</html>`
}

function renderProjectCard(project: ProjectSummary): string {
  const badges = project.has_agentbook
    ? `
      <div class="badge-row">
        <span class="badge"><span class="pill-count">${project.active_plans}</span> active plans</span>
        <span class="badge"><span class="pill-count">${project.active_tasks}</span> active tasks</span>
        <span class="badge"><span class="pill-count">${project.pending_tasks}</span> pending</span>
        <span class="badge"><span class="pill-count">${project.completed_tasks}</span> completed</span>
      </div>
    `
    : `<div class="label-empty">No plans yet</div>`

  return `
    <a href="${projectHref(project.id)}" aria-label="Open project ${escapeHtml(project.name)}">
      <article class="project-card">
        <div class="row-between">
          <div>
            <div class="row">
              <span class="color-dot" style="background:${escapeHtml(safeColor(project.icon_color))}"></span>
              <h2 class="project-name">${escapeHtml(project.name)}</h2>
            </div>
            <div class="project-path">${escapeHtml(project.worktree)}</div>
          </div>
          ${project.has_agentbook ? '<span class="badge status-active">Agentbook</span>' : '<span class="badge status-draft">OpenCode</span>'}
        </div>
        ${badges}
      </article>
    </a>
  `
}

function renderProjects(projects: ProjectSummary[]): string {
  const sortedProjects = [...projects].sort((left, right) => {
    if (Boolean(right.has_agentbook) !== Boolean(left.has_agentbook)) {
      return Number(Boolean(right.has_agentbook)) - Number(Boolean(left.has_agentbook))
    }

    return left.name.localeCompare(right.name, undefined, { sensitivity: "base" })
  })

  const content = sortedProjects.length
    ? `<section class="project-grid">${sortedProjects.map(renderProjectCard).join("")}</section>`
    : `
      <section class="empty">
        <h2 class="empty-title">No projects found</h2>
        <p class="empty-copy">Once OpenCode projects exist, they will appear here automatically.</p>
      </section>
    `

  return renderShell(
    "Agentbook Dashboard",
    `${pluralize(sortedProjects.length, "project")} discovered. Auto-refreshing every 10 seconds.`,
    "/",
    content,
  )
}

function planShouldStartOpen(status: string): boolean {
  return ["active", "draft", "paused"].includes(status)
}

function taskColumnKey(status: string): (typeof TASK_STATUS_COLUMNS)[number]["key"] {
  if (TASK_STATUS_COLUMNS.some((column) => column.key === status)) {
    return status as (typeof TASK_STATUS_COLUMNS)[number]["key"]
  }

  if (status === "needs_review") return "blocked"
  return "pending"
}

function renderTaskCard(task: TaskDetails): string {
  const description = String(task.description || "")
  const hasDescription = Boolean(description.trim())
  const metadata = [
    task.assignee ? `@${escapeHtml(task.assignee)}` : "Unassigned",
    `Updated ${escapeHtml(formatRelative(task.updated_at || task.created_at))}`,
  ]

  return `
    <article class="task-card">
      <div class="task-title-line">
        <span class="task-icon">${escapeHtml(TASK_ICONS[task.status] ?? "•")}</span>
        <div>
          <div class="task-title">${escapeHtml(task.title || "Untitled task")}</div>
          <div class="meta" style="margin-top: 6px;">${statusBadge(task.status || "pending")}</div>
        </div>
      </div>
      ${
        hasDescription
          ? `
            <details class="document-details">
              <summary class="document-summary">Description</summary>
              <pre class="document-body">${escapeHtml(description)}</pre>
            </details>
          `
          : ""
      }
      <div class="task-card-meta">
        ${metadata.map((item) => `<span>${item}</span>`).join("")}
      </div>
    </article>
  `
}

function renderTaskColumns(tasks: TaskDetails[]): string {
  const grouped = new Map<(typeof TASK_STATUS_COLUMNS)[number]["key"], TaskDetails[]>()
  for (const column of TASK_STATUS_COLUMNS) grouped.set(column.key, [])

  for (const task of tasks) {
    grouped.get(taskColumnKey(task.status))?.push(task)
  }

  return `
    <div class="plan-task-columns">
      ${TASK_STATUS_COLUMNS.map((column) => {
        const columnTasks = grouped.get(column.key) ?? []

        return `
          <section class="task-column">
            <div class="task-column-header">
              <h5 class="task-column-title">${escapeHtml(column.label)}</h5>
              <span class="task-column-count">${columnTasks.length}</span>
            </div>
            <div class="task-column-body">
              ${columnTasks.length ? columnTasks.map(renderTaskCard).join("") : '<div class="task-column-empty">No tasks</div>'}
            </div>
          </section>
        `
      }).join("")}
    </div>
  `
}

function renderPlanSummary(plan: PlanDetails): string {
  const tasks = Array.isArray(plan.tasks) ? plan.tasks : []
  const completed = tasks.filter((task) => task.status === "completed").length
  const total = tasks.length
  const percentage = total ? Math.round((completed / total) * 100) : 0
  const copyText = JSON.stringify(`${plan.id} ${plan.name}`)

  return `
    <summary class="plan-summary" id="${escapeHtml(planSummaryId(plan.id))}">
      <div class="plan-summary-main">
        <span class="plan-chevron" aria-hidden="true"><span class="when-closed">▶</span><span class="when-open">▼</span></span>
        <div class="plan-summary-copy">
          <h4 class="plan-title">${escapeHtml(plan.title || "Untitled plan")}</h4>
          ${statusBadge(plan.status || "draft")}
        </div>
        <button
          type="button"
          class="copy-plan-button"
          title="Copy UUID + name"
          aria-label="Copy UUID and name for ${escapeHtml(plan.title || plan.name || "plan")}"
          onclick="event.preventDefault(); event.stopPropagation(); window.copyToClipboard(${escapeHtml(copyText)}, this)"
        ><span class="copy-plan-button-text">📋</span></button>
      </div>
      <div class="plan-summary-meta">
        <span class="plan-summary-stat">${completed}/${total} tasks</span>
        <div class="progress progress-inline" aria-label="${escapeHtml(`${percentage}% complete`)}"><span style="width:${percentage}%;"></span></div>
        <span class="plan-summary-stat">created ${escapeHtml(formatRelative(plan.created_at))}</span>
      </div>
    </summary>
  `
}

function renderPlanBody(plan: PlanDetails): string {
  const tasks = Array.isArray(plan.tasks) ? plan.tasks : []
  const document = String(plan.document || "").trim()

  return `
    <div class="plan-body">
      ${plan.description ? `<div class="plan-description description">${escapeHtml(plan.description)}</div>` : ""}
      ${
        document
          ? `
            <details class="document-details" id="${escapeHtml(`plan-doc-${plan.id}`)}">
              <summary class="document-summary">Plan document</summary>
              <pre class="document-body">${escapeHtml(document)}</pre>
            </details>
          `
          : ""
      }
      ${renderTaskColumns(tasks)}
    </div>
  `
}

function renderPlanFrame(projectId: string, plan: PlanDetails, includeSrc = true): string {
  const openAttribute = planShouldStartOpen(plan.status) ? " open" : ""
  const srcAttribute = includeSrc ? ` src="${escapeHtml(planFrameHref(projectId, plan.id))}"` : ""

  return `
    <details class="plan-card" id="${escapeHtml(planCardId(plan.id))}"${openAttribute}>
      ${renderPlanSummary(plan)}
      <turbo-frame id="${escapeHtml(frameId(plan.id))}"${srcAttribute}>
        ${renderPlanBody(plan)}
      </turbo-frame>
    </details>
  `
}

function planFingerprint(plan: PlanDetails): number {
  const taskTimestamps = Array.isArray(plan.tasks) ? plan.tasks.map((task) => Number(task.updated_at) || 0) : []
  return Math.max(Number(plan.updated_at) || 0, ...taskTimestamps)
}

function sseEvent(payload: string): string {
  const normalized = payload.replaceAll("\r\n", "\n")
  return `${normalized.split("\n").map((line) => `data: ${line}`).join("\n")}\n\n`
}

function sseComment(): string {
  return `:\n\n`
}

function turboStream(action: string, target: string, template?: string, method?: "morph"): string {
  const methodAttribute = method ? ` method="${method}"` : ""
  if (template === undefined) {
    return `<turbo-stream action="${action}"${methodAttribute} target="${escapeHtml(target)}"></turbo-stream>`
  }

  return `<turbo-stream action="${action}"${methodAttribute} target="${escapeHtml(target)}">\n<template>\n${template}\n</template>\n</turbo-stream>`
}

function renderProjectStreamResponse(projectId: string, request: Request): Response {
  const initialSnapshot = loadProjectDetails(projectId)
  let { agentbookDbPath } = openProjectDb(projectId)
  let previousPlans = filterPlans(initialSnapshot.plans)
  let previousFingerprints = new Map(previousPlans.map((plan) => [plan.id, planFingerprint(plan)]))

  const headers = new Headers({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  })

  const encoder = new TextEncoder()
  let cleanup = () => {}

  return new Response(
    new ReadableStream({
      start(controller) {
        let closed = false
        let polling = false
        let pollTimer: ReturnType<typeof setInterval> | null = null
        let keepAliveTimer: ReturnType<typeof setInterval> | null = null
        const openCodeDb = openReadonlyDatabase(OPENCODE_DB_PATH)
        let agentbookDb = agentbookDbPath ? openReadonlyDatabase(agentbookDbPath) : null
        let openCodeVersion = readDataVersion(openCodeDb)
        let agentbookVersion = agentbookDb ? readDataVersion(agentbookDb) : null

        const send = (payload: string) => {
          if (closed) return
          try {
            controller.enqueue(encoder.encode(payload))
          } catch {
            cleanup()
          }
        }

        cleanup = () => {
          if (closed) return
          closed = true
          if (pollTimer) clearInterval(pollTimer)
          if (keepAliveTimer) clearInterval(keepAliveTimer)
          try {
            agentbookDb?.close()
          } catch {}
          try {
            openCodeDb.close()
          } catch {}
          request.signal.removeEventListener("abort", cleanup)
          try {
            controller.close()
          } catch {}
        }

        const poll = async () => {
          if (closed || polling) return
          polling = true

          try {
            const hadPlansBefore = previousPlans.length > 0
            const currentProject = openProjectDb(projectId)
            const nextOpenCodeVersion = readDataVersion(openCodeDb)
            const nextAgentbookDbPath = currentProject.agentbookDbPath

            if (nextAgentbookDbPath !== agentbookDbPath) {
              try {
                agentbookDb?.close()
              } catch {}
              agentbookDb = nextAgentbookDbPath ? openReadonlyDatabase(nextAgentbookDbPath) : null
            }

            const nextAgentbookVersion = agentbookDb ? readDataVersion(agentbookDb) : null

            if (
              nextOpenCodeVersion === openCodeVersion &&
              nextAgentbookVersion === agentbookVersion &&
              nextAgentbookDbPath === agentbookDbPath
            ) {
              return
            }

            const nextSnapshot = loadProjectDetails(projectId)
            const nextPlans = filterPlans(nextSnapshot.plans)
            const nextFingerprints = new Map(nextPlans.map((plan) => [plan.id, planFingerprint(plan)]))
            const nextPlanMap = new Map(nextPlans.map((plan) => [plan.id, plan]))

            if (previousPlans.length === 0 && nextPlans.length > 0) {
              send(sseEvent(turboStream("remove", "plan-list-empty")))
            }

            for (const plan of nextPlans) {
              const previousFingerprint = previousFingerprints.get(plan.id)
              if (previousFingerprint === undefined) {
                send(sseEvent(turboStream("prepend", "plan-list", renderPlanFrame(projectId, plan, false))))
                continue
              }

              const currentFingerprint = nextFingerprints.get(plan.id)
              if (previousFingerprint !== currentFingerprint) {
                send(sseEvent(turboStream("replace", planSummaryId(plan.id), renderPlanSummary(plan), "morph")))
                send(sseEvent(turboStream("replace", frameId(plan.id), renderPlanBody(plan), "morph")))
              }
            }

            for (const plan of previousPlans) {
              if (!nextPlanMap.has(plan.id)) {
                send(sseEvent(turboStream("remove", planCardId(plan.id))))
              }
            }
            previousPlans = nextPlans
            previousFingerprints = nextFingerprints
            openCodeVersion = nextOpenCodeVersion
            agentbookDbPath = nextAgentbookDbPath
            agentbookVersion = nextAgentbookVersion

            if (hadPlansBefore && nextPlans.length === 0) {
              send(
                sseEvent(
                  turboStream(
                    "prepend",
                    "plan-list",
                    '<div class="empty" id="plan-list-empty"><h4 class="empty-title">No plans yet</h4><p class="empty-copy">This project does not have any tracked plans.</p></div>',
                  ),
                ),
              )
            }
          } catch (error) {
            console.error("Project stream error:", error)
            cleanup()
          } finally {
            polling = false
          }
        }

        send(sseComment())
        pollTimer = setInterval(() => {
          void poll()
        }, STREAM_POLL_MS)
        keepAliveTimer = setInterval(() => send(sseComment()), STREAM_KEEPALIVE_MS)
        request.signal.addEventListener("abort", cleanup)
      },
      cancel() {
        cleanup()
      },
    }),
    { headers },
  )
}

function renderDetail(detail: ProjectDetails): string {
  const project = detail.project
  const allPlans = Array.isArray(detail.plans) ? detail.plans : []
  const now = Date.now()
  const archivedCount = allPlans.filter((plan) => plan.status === "archived").length
  const olderCompletedHiddenCount = allPlans.filter(
    (plan) => plan.status === "completed" && now - Number(plan.updated_at) > TWO_DAYS_MS,
  ).length
  const hiddenDetails = [
    olderCompletedHiddenCount ? `${pluralize(olderCompletedHiddenCount, "older completed plan")} hidden` : "",
    archivedCount ? pluralize(archivedCount, "archived plan") : "",
  ].filter(Boolean)
  const plans = filterPlans(allPlans).sort((left, right) => {
    const priorityDiff = statusSortPriority(left.status) - statusSortPriority(right.status)
    if (priorityDiff !== 0) return priorityDiff
    return Number(right.updated_at) - Number(left.updated_at)
  })

  const header = `
    <section class="detail-header">
      <div>
        <a class="back-link" href="/">← All Projects</a>
      </div>
      <div class="panel">
        <div class="row-between">
          <div>
            <div class="row">
              <span class="color-dot" style="background:${escapeHtml(safeColor(project.icon_color))}"></span>
              <h2 class="detail-title">${escapeHtml(project.name)}</h2>
            </div>
            <div class="project-path">${escapeHtml(project.worktree)}</div>
          </div>
          <div class="badge-row">
            ${project.has_agentbook ? '<span class="badge status-active">Agentbook enabled</span>' : '<span class="badge status-draft">No agentbook data</span>'}
          </div>
        </div>
      </div>
    </section>
  `

  const plansHtml = plans.map((plan) => renderPlanFrame(project.id, plan)).join("")

  const plansSection = plans.length || allPlans.length
    ? `
      <section>
        <div class="section-header">
          <h3 class="section-title">Plans</h3>
          <div class="meta">${pluralize(plans.length, "plan")}${hiddenDetails.length ? ` (${hiddenDetails.join(", ")})` : ""}</div>
        </div>
        <div class="plan-list" id="plan-list">${plansHtml || '<div class="empty" id="plan-list-empty"><h4 class="empty-title">No plans yet</h4><p class="empty-copy">This project does not have any tracked plans.</p></div>'}</div>
      </section>
    `
    : `
      <section>
        <div class="section-header">
          <h3 class="section-title">Plans</h3>
          <div class="meta">0 plans</div>
        </div>
        <div class="plan-list" id="plan-list"><div class="empty" id="plan-list-empty"><h4 class="empty-title">No plans yet</h4><p class="empty-copy">This project does not have any tracked plans.</p></div></div>
      </section>
    `
  return renderShell(
    `${project.name} · Agentbook Dashboard`,
    `Viewing ${project.name}. Live updates enabled.`,
    projectHref(project.id),
    `${header}<div class="stack">${plansSection}</div><turbo-stream-source src="/streams/projects/${escapeHtml(encodeURIComponent(project.id))}"></turbo-stream-source>`,
    "none",
  )
}

function renderPlanFrameResponse(projectId: string, planId: string): string {
  const detail = loadProjectDetails(projectId)
  const plan = detail.plans.find((entry) => entry.id === planId)
  if (!plan) throw new Response("Plan not found", { status: 404 })
  return `<turbo-frame id="${escapeHtml(frameId(plan.id))}">${renderPlanBody(plan)}</turbo-frame>`
}

function renderErrorPage(title: string, message: string, status = 500): Response {
  const body = renderShell(
    `${title} · Agentbook Dashboard`,
    message,
    "/",
    `
      <section class="error">
        <h2 class="error-title">${escapeHtml(title)}</h2>
        <p class="error-message">${escapeHtml(message)}</p>
      </section>
    `,
  )
  return htmlResponse(body, { status })
}

function resolvePort(argv: string[] = process.argv.slice(2)): number {
  const flagIndex = argv.indexOf("--port")
  const rawPort = flagIndex >= 0 ? argv[flagIndex + 1] : process.env.PORT
  const parsed = Number.parseInt(rawPort ?? `${DEFAULT_PORT}`, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_PORT
}

export function startServer(port: number) {
  return Bun.serve({
    port,
    async fetch(request) {
      const url = new URL(request.url)

      try {
        if (request.method === "GET" && url.pathname === "/") {
          return htmlResponse(renderProjects(loadProjectSummaries()))
        }

        const planMatch = url.pathname.match(/^\/projects\/([^/]+)\/plans\/([^/]+)$/)
        if (request.method === "GET" && planMatch) {
          const [, rawProjectId, rawPlanId] = planMatch
          const projectId = decodePathSegment(rawProjectId, "Project id")
          const planId = decodePathSegment(rawPlanId, "Plan id")

          if (request.headers.get("Turbo-Frame") !== frameId(planId)) {
            return Response.redirect(projectHref(projectId), 302)
          }

          return htmlResponse(renderPlanFrameResponse(projectId, planId))
        }

        const streamMatch = url.pathname.match(/^\/streams\/projects\/([^/]+)$/)
        if (request.method === "GET" && streamMatch) {
          const projectId = decodePathSegment(streamMatch[1], "Project id")
          return renderProjectStreamResponse(projectId, request)
        }

        const projectMatch = url.pathname.match(/^\/projects\/([^/]+)$/)
        if (request.method === "GET" && projectMatch) {
          const projectId = decodePathSegment(projectMatch[1], "Project id")
          return htmlResponse(renderDetail(loadProjectDetails(projectId)))
        }

        if (request.method !== "GET") {
          return textResponse("Method not allowed", 405)
        }

        return renderErrorPage("Not found", "The requested page could not be found.", 404)
      } catch (error) {
        if (error instanceof Response) return error
        console.error("UI server error:", error)
        return renderErrorPage("Internal server error", "Something went wrong while rendering the dashboard.", 500)
      }
    },
  })
}

if (import.meta.main) {
  const port = resolvePort()
  startServer(port)
  console.log(`Agentbook UI server listening on http://localhost:${port}`)
}
