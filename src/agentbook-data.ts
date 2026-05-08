import { Database } from "bun:sqlite"
import { randomUUIDv7 } from "bun"
import fs from "fs"
import path from "path"
import { execSync } from "child_process"
import type {
  CreatePlanInput,
  CreateTaskInput,
  ProjectDiscoveryResponse,
  ProjectDiscoverySource,
  ProjectRefreshResponse,
  PlanLookup,
  PlanRow,
  PlanSummary,
  ProjectRecord,
  ProjectRow,
  TaskListFilters,
  TaskRow,
  UpdatePlanInput,
  UpdateTaskInput,
} from "./shared-types"
import { ManualProjectSourceAdapter, listProjectDiscoverySources as listAdapterDiscoverySources, refreshProjectRegistryWithAdapters } from "./project-adapters"
import { projectGitInfo, resolveProjectPath } from "./project-identity"

export type { CreatePlanInput, CreateTaskInput, PlanLookup, PlanRow, PlanSummary, ProjectDiscoveryResponse, ProjectDiscoverySource, ProjectRefreshResponse, ProjectRecord, ProjectRow, TaskListFilters, TaskRow, UpdatePlanInput, UpdateTaskInput } from "./shared-types"

const LEGACY_TASK_STATUS_ALIASES: Record<string, string> = {
  needs_review: "needs_guidance",
}

const manualProjectSourceAdapter = new ManualProjectSourceAdapter()

function currentProjectSeed(): ProjectRow {
  return manualProjectSourceAdapter.refreshProject(resolveProjectPath())
}

export function listProjectDiscoverySources(): ProjectDiscoverySource[] {
  return listAdapterDiscoverySources([manualProjectSourceAdapter])
}

export function refreshProjectRegistry(db: Database): ProjectRefreshResponse {
  return refreshProjectRegistryWithAdapters(db, [manualProjectSourceAdapter], { ensureProjectRow, listProjects })
}

function ensureProjectRow(db: Database, seed: ProjectRow): ProjectRow {
  const existing = db.query(`SELECT * FROM project WHERE path = ?`).get(seed.path) as ProjectRow | null
  if (existing) return existing

  db.run(
    `INSERT INTO project (id, path, name, title, description, source, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [seed.id, seed.path, seed.name, seed.title, seed.description, seed.source, seed.created_at, seed.updated_at],
  )
  return db.query(`SELECT * FROM project WHERE id = ?`).get(seed.id) as ProjectRow
}

export function resolveCurrentProjectPath() {
  return resolveProjectPath()
}

export function getCurrentProjectRow(db: Database): ProjectRow {
  return ensureProjectRow(db, currentProjectSeed())
}

export function getCurrentProject(db: Database): ProjectRecord {
  return projectRowToRecord(db, getCurrentProjectRow(db))
}

export function getProjectRow(db: Database, projectId: string): ProjectRow | null {
  return (db.query(`SELECT * FROM project WHERE id = ?`).get(projectId) as ProjectRow | null) ?? null
}

export function getProject(db: Database, projectId: string): ProjectRecord | null {
  const row = getProjectRow(db, projectId)
  return row ? projectRowToRecord(db, row) : null
}

export function resolveSharedRoot(): string | null {
  try {
    const raw = execSync("git rev-parse --git-common-dir", { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim()
    const gitCommonDir = path.resolve(process.cwd(), raw)
    return path.join(gitCommonDir, "agentbook")
  } catch {
    return null
  }
}

export function resolveDbPath(): string {
  if (process.env.AGENTBOOK_DB) return process.env.AGENTBOOK_DB

  const legacyPath = path.join(process.cwd(), ".opencode", "agentbook.db")
  const sharedRoot = resolveSharedRoot()

  if (sharedRoot) {
    const sharedDb = path.join(sharedRoot, "agentbook.db")
    const sharedExists = fs.existsSync(sharedDb)
    const legacyExists = fs.existsSync(legacyPath)

    if (!sharedExists && legacyExists) {
      if (!fs.existsSync(sharedRoot)) fs.mkdirSync(sharedRoot, { recursive: true })
      fs.copyFileSync(legacyPath, sharedDb)
      console.error(`Migrated database from .opencode/agentbook.db to ${sharedDb}`)
    } else if (sharedExists && legacyExists) {
      console.error(`Note: legacy database found at .opencode/agentbook.db; using shared database at ${sharedDb}`)
    }

    return sharedDb
  }

  return legacyPath
}

export function migrateSchema(db: Database) {
  db.run(`CREATE TABLE IF NOT EXISTS project (
    id TEXT PRIMARY KEY,
    path TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    source TEXT DEFAULT '',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`)

  const projectColumns = db.query(`PRAGMA table_info(project)`).all() as Array<{ name: string }>
  if (!projectColumns.some((column) => column.name === "path")) db.run(`ALTER TABLE project ADD COLUMN path TEXT DEFAULT ''`)
  if (!projectColumns.some((column) => column.name === "name")) db.run(`ALTER TABLE project ADD COLUMN name TEXT DEFAULT ''`)
  if (!projectColumns.some((column) => column.name === "title")) db.run(`ALTER TABLE project ADD COLUMN title TEXT DEFAULT ''`)
  if (!projectColumns.some((column) => column.name === "description")) db.run(`ALTER TABLE project ADD COLUMN description TEXT DEFAULT ''`)
  if (!projectColumns.some((column) => column.name === "source")) db.run(`ALTER TABLE project ADD COLUMN source TEXT DEFAULT ''`)

  const currentProject = ensureProjectRow(db, currentProjectSeed())

  db.run(`CREATE TABLE IF NOT EXISTS plan (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'draft',
    created_by TEXT DEFAULT '',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`)
  const planColumns = db.query(`PRAGMA table_info(plan)`).all() as Array<{ name: string }>
  if (!planColumns.some((column) => column.name === "project_id")) db.run(`ALTER TABLE plan ADD COLUMN project_id TEXT DEFAULT ''`)
  if (!planColumns.some((column) => column.name === "name")) {
    db.run(`ALTER TABLE plan ADD COLUMN name TEXT DEFAULT ''`)
    db.run(`UPDATE plan SET name = title WHERE name = ''`)
  }
  if (!planColumns.some((column) => column.name === "document")) db.run(`ALTER TABLE plan ADD COLUMN document TEXT DEFAULT ''`)
  if (!planColumns.some((column) => column.name === "spec")) db.run(`ALTER TABLE plan ADD COLUMN spec TEXT DEFAULT ''`)
  db.run(`UPDATE plan SET project_id = ? WHERE project_id = '' OR project_id IS NULL`, [currentProject.id])
  db.run(`CREATE INDEX IF NOT EXISTS plan_project_idx ON plan(project_id)`)
  db.run(`CREATE INDEX IF NOT EXISTS plan_status_idx ON plan(status)`)

  db.run(`CREATE TABLE IF NOT EXISTS task (
    id TEXT PRIMARY KEY,
    plan_id TEXT NOT NULL REFERENCES plan(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending',
    priority INTEGER DEFAULT 0,
    position INTEGER NOT NULL,
    assignee TEXT DEFAULT '',
    worktree_dir TEXT DEFAULT '',
    session_id TEXT DEFAULT '',
    depends_on TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`)
  db.run(`CREATE INDEX IF NOT EXISTS task_plan_idx ON task(plan_id)`)
  db.run(`CREATE INDEX IF NOT EXISTS task_status_idx ON task(status)`)
}

export function openAgentbookDb() {
  const file = resolveDbPath()
  const dir = path.dirname(file)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  const db = new Database(file)
  db.run("PRAGMA journal_mode=WAL")
  db.run("PRAGMA foreign_keys=ON")
  migrateSchema(db)
  getCurrentProjectRow(db)
  return db
}

const nowTs = () => Date.now()

export function canonicalTaskStatus(status: string): string {
  return LEGACY_TASK_STATUS_ALIASES[status] || status
}

export function taskStatusFilterValues(status: string): string[] {
  const canonical = canonicalTaskStatus(status)
  return canonical === "needs_guidance" ? ["needs_guidance", "needs_review"] : [canonical]
}

export function normalizeTaskRow(task: Record<string, unknown>) {
  return {
    ...task,
    status: canonicalTaskStatus(String(task.status || "")),
  }
}

function projectRowToRecord(db: Database, row: ProjectRow): ProjectRecord {
  const plans = listPlans(db, { projectId: row.id })
  const tasks = listTasks(db, { projectId: row.id })
  const updatedAt = Math.max(row.updated_at, ...plans.map((plan) => plan.updated_at), ...tasks.map((task) => task.updated_at))

  return {
    ...row,
    updated_at: updatedAt,
    ...projectGitInfo(row.path),
    plan_count: plans.length,
    task_count: tasks.length,
  }
}

export function listProjects(db: Database): ProjectRecord[] {
  const rows = db.query(`SELECT * FROM project ORDER BY updated_at DESC, path ASC`).all() as ProjectRow[]
  return rows.map((row) => projectRowToRecord(db, row))
}

export function lookupPlan(db: Database, ref: string, projectId = getCurrentProjectRow(db).id): PlanLookup {
  const byId = db.query(`SELECT * FROM plan WHERE id = ?`).get(ref) as PlanRow | null
  if (byId) return { plan: byId, multiple: false }

  const byName = db.query(`SELECT * FROM plan WHERE name = ? AND project_id = ? ORDER BY created_at DESC`).all(ref, projectId) as PlanRow[]
  if (byName.length === 1) return { plan: byName[0], multiple: false }

  return { plan: null, multiple: byName.length > 1 }
}

export function resolvePlan(db: Database, ref: string, projectId?: string): PlanRow | null {
  return lookupPlan(db, ref, projectId).plan
}

export function listPlans(db: Database, options: { status?: string; projectId?: string } = {}): PlanRow[] {
  const projectId = options.projectId ?? getCurrentProjectRow(db).id
  return options.status
    ? (db.query(`SELECT * FROM plan WHERE project_id = ? AND status = ? ORDER BY created_at DESC`).all(projectId, options.status) as PlanRow[])
    : (db.query(`SELECT * FROM plan WHERE project_id = ? AND status != 'archived' ORDER BY created_at DESC`).all(projectId) as PlanRow[])
}

export function createPlan(db: Database, input: CreatePlanInput, projectId = getCurrentProjectRow(db).id): PlanRow {
  const id = randomUUIDv7()
  const ts = nowTs()
  db.run(
    `INSERT INTO plan (id, project_id, name, title, description, document, spec, status, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?)`,
    [id, projectId, input.name || input.title, input.title, input.description || "", input.document || "", input.spec || "", input.createdBy || "", ts, ts],
  )
  return db.query(`SELECT * FROM plan WHERE id = ?`).get(id) as PlanRow
}

export function archivePlan(db: Database, planId: string): PlanRow {
  const existing = db.query(`SELECT * FROM plan WHERE id = ?`).get(planId) as PlanRow | null
  if (!existing) throw new Error(`plan not found: ${planId}`)

  const ts = nowTs()
  db.run(`UPDATE plan SET status = 'archived', updated_at = ? WHERE id = ?`, [ts, planId])
  return { ...existing, status: "archived", updated_at: ts }
}

export function archivePlansOlderThan(db: Database, olderThan: string, projectId = getCurrentProjectRow(db).id): PlanRow[] {
  const match = olderThan.match(/^(\d+)([hdw])$/)
  if (!match) throw new Error(`invalid duration: ${olderThan}; expected formats like 12h, 7d, or 2w`)

  const value = parseInt(match[1], 10)
  const unit = match[2]
  const multipliers: Record<string, number> = {
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
  }

  const cutoff = nowTs() - value * multipliers[unit]
  const candidates = db
    .query(`SELECT * FROM plan WHERE project_id = ? AND status IN ('draft', 'active') AND updated_at < ? ORDER BY updated_at ASC`)
    .all(projectId, cutoff) as PlanRow[]

  const ts = nowTs()
  for (const plan of candidates) {
    db.run(`UPDATE plan SET status = 'archived', updated_at = ? WHERE id = ?`, [ts, plan.id])
  }

  return candidates.map((plan) => ({ ...plan, status: "archived", updated_at: ts }))
}

export function updatePlan(db: Database, planId: string, input: UpdatePlanInput): PlanRow {
  const existing = db.query(`SELECT * FROM plan WHERE id = ?`).get(planId) as PlanRow | null
  if (!existing) throw new Error(`plan not found: ${planId}`)

  const next = {
    ...existing,
    name: input.name ?? existing.name,
    title: input.title ?? existing.title,
    description: input.description ?? existing.description,
    document: input.document ?? existing.document,
    spec: input.spec ?? existing.spec,
    status: input.status ?? existing.status,
  }
  const ts = nowTs()
  db.run(`UPDATE plan SET name = ?, title = ?, description = ?, document = ?, spec = ?, status = ?, updated_at = ? WHERE id = ?`, [
    next.name,
    next.title,
    next.description,
    next.document,
    next.spec,
    next.status,
    ts,
    planId,
  ])
  return { ...next, updated_at: ts }
}

export function createTask(db: Database, input: CreateTaskInput, projectId = getCurrentProjectRow(db).id): TaskRow {
  const lookup = lookupPlan(db, input.planRef, projectId)
  if (!lookup.plan) throw new Error(lookup.multiple ? `multiple plans found with name: ${input.planRef}` : `plan not found: ${input.planRef}`)

  const max = db.query(`SELECT COALESCE(MAX(position), -1) as m FROM task WHERE plan_id = ?`).get(lookup.plan.id) as { m: number }
  const position = max.m + 1
  const id = randomUUIDv7()
  const ts = nowTs()
  db.run(
    `INSERT INTO task (id, plan_id, title, description, status, priority, position, depends_on, created_at, updated_at) VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)`,
    [id, lookup.plan.id, input.title, input.description || "", input.priority ?? 0, position, input.dependsOn || "", ts, ts],
  )
  return db.query(`SELECT * FROM task WHERE id = ?`).get(id) as TaskRow
}

export function listTasks(db: Database, filters: TaskListFilters = {}): TaskRow[] {
  let q = `SELECT task.* FROM task INNER JOIN plan ON plan.id = task.plan_id WHERE 1=1`
  const params: unknown[] = []

  if (filters.projectId || !filters.planRef) {
    const projectId = filters.projectId ?? getCurrentProjectRow(db).id
    q += ` AND plan.project_id = ?`
    params.push(projectId)
  }

  if (filters.planRef) {
    const lookup = lookupPlan(db, filters.planRef, filters.projectId)
    if (!lookup.plan) throw new Error(lookup.multiple ? `multiple plans found with name: ${filters.planRef}` : `plan not found: ${filters.planRef}`)
    q += ` AND task.plan_id = ?`
    params.push(lookup.plan.id)
  }

  if (filters.status) {
    const statusValues = taskStatusFilterValues(filters.status)
    q += ` AND task.status IN (${statusValues.map(() => "?").join(", ")})`
    params.push(...statusValues)
  }

  q += ` ORDER BY task.position`
  return (db.query(q).all(...params) as TaskRow[]).map((task) => normalizeTaskRow(task)) as TaskRow[]
}

export function getTask(db: Database, id: string): TaskRow | null {
  const task = db.query(`SELECT * FROM task WHERE id = ?`).get(id)
  if (!task) return null
  return normalizeTaskRow(task as Record<string, unknown>) as TaskRow
}

export function updateTask(db: Database, id: string, input: UpdateTaskInput): TaskRow {
  const existing = db.query(`SELECT * FROM task WHERE id = ?`).get(id) as TaskRow | null
  if (!existing) throw new Error(`task not found: ${id}`)

  const next = {
    ...existing,
    title: input.title ?? existing.title,
    description: input.description ?? existing.description,
    status: input.status ? canonicalTaskStatus(input.status) : canonicalTaskStatus(existing.status),
    priority: input.priority ?? existing.priority,
    depends_on: input.dependsOn ?? existing.depends_on,
    assignee: input.assignee ?? existing.assignee,
    notes: input.notes ?? existing.notes,
    session_id: input.session ?? existing.session_id,
    worktree_dir: input.worktree ?? existing.worktree_dir,
  }

  const ts = nowTs()
  db.run(
    `UPDATE task SET title = ?, description = ?, status = ?, priority = ?, assignee = ?, worktree_dir = ?, session_id = ?, depends_on = ?, notes = ?, updated_at = ? WHERE id = ?`,
    [next.title, next.description, next.status, next.priority, next.assignee, next.worktree_dir, next.session_id, next.depends_on, next.notes, ts, id],
  )
  return { ...next, updated_at: ts }
}

export function getPlanSummary(db: Database, ref: string): PlanSummary {
  const lookup = lookupPlan(db, ref)
  if (!lookup.plan) throw new Error(lookup.multiple ? `multiple plans found with name: ${ref}` : `plan not found: ${ref}`)
  const plan = lookup.plan

  const tasks = listTasks(db, { planRef: plan.id, projectId: plan.project_id })
  const counts: Record<string, number> = {}
  for (const task of tasks) counts[task.status] = (counts[task.status] || 0) + 1
  const total = tasks.length
  const completed = counts.completed || 0
  const needsGuidance = counts.needs_guidance || 0
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0

  return {
    plan: {
      id: plan.id,
      project_id: plan.project_id,
      name: plan.name,
      title: plan.title,
      status: plan.status,
      description: plan.description,
      spec: plan.spec,
      document: plan.document,
    },
    progress: {
      total,
      completed,
      needs_guidance: needsGuidance,
      percentage,
      by_status: counts,
    },
    tasks: tasks.map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      assignee: task.assignee || null,
      worktree_dir: task.worktree_dir || null,
    })),
  }
}
