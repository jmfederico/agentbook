import { Database } from "bun:sqlite"
import { randomUUIDv7 } from "bun"
import fs from "fs"
import path from "path"
import { execSync } from "child_process"

export type PlanRow = {
  id: string
  name: string
  title: string
  description: string
  document: string
  spec: string
  status: string
  created_by: string
  created_at: number
  updated_at: number
}

export type TaskRow = {
  id: string
  plan_id: string
  title: string
  description: string
  status: string
  priority: number
  position: number
  assignee: string
  worktree_dir: string
  session_id: string
  depends_on: string
  notes: string
  created_at: number
  updated_at: number
}

export type PlanLookup = {
  plan: PlanRow | null
  multiple: boolean
}

export type TaskListFilters = {
  planRef?: string
  status?: string
}

export type CreatePlanInput = {
  title: string
  name?: string
  description?: string
  document?: string
  spec?: string
  createdBy?: string
}

export type UpdatePlanInput = {
  name?: string
  title?: string
  description?: string
  document?: string
  spec?: string
  status?: string
}

export type CreateTaskInput = {
  planRef: string
  title: string
  description?: string
  priority?: number
  dependsOn?: string
}

export type UpdateTaskInput = {
  title?: string
  description?: string
  status?: string
  priority?: number
  dependsOn?: string
  assignee?: string
  notes?: string
  session?: string
  worktree?: string
}

export type PlanSummary = {
  plan: Pick<PlanRow, "id" | "name" | "title" | "status" | "description" | "spec" | "document">
  progress: {
    total: number
    completed: number
    needs_guidance: number
    percentage: number
    by_status: Record<string, number>
  }
  tasks: Array<{
    id: string
    title: string
    status: string
    assignee: string | null
    worktree_dir: string | null
  }>
}

const LEGACY_TASK_STATUS_ALIASES: Record<string, string> = {
  needs_review: "needs_guidance",
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
  db.run(`CREATE TABLE IF NOT EXISTS plan (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'draft',
    created_by TEXT DEFAULT '',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`)
  const planColumns = db.query(`PRAGMA table_info(plan)`).all() as Array<{ name: string }>
  if (!planColumns.some((column) => column.name === "name")) {
    db.run(`ALTER TABLE plan ADD COLUMN name TEXT DEFAULT ''`)
    db.run(`UPDATE plan SET name = title WHERE name = ''`)
  }
  if (!planColumns.some((column) => column.name === "document")) {
    db.run(`ALTER TABLE plan ADD COLUMN document TEXT DEFAULT ''`)
  }
  if (!planColumns.some((column) => column.name === "spec")) {
    db.run(`ALTER TABLE plan ADD COLUMN spec TEXT DEFAULT ''`)
  }
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
  return db
}

const now = () => Date.now()

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

export function lookupPlan(db: Database, ref: string): PlanLookup {
  const byId = db.query(`SELECT * FROM plan WHERE id = ?`).get(ref) as PlanRow | null
  if (byId) return { plan: byId, multiple: false }

  const byName = db.query(`SELECT * FROM plan WHERE name = ? ORDER BY created_at DESC`).all(ref) as PlanRow[]
  if (byName.length === 1) return { plan: byName[0], multiple: false }

  return { plan: null, multiple: byName.length > 1 }
}

export function resolvePlan(db: Database, ref: string): PlanRow | null {
  return lookupPlan(db, ref).plan
}

export function listPlans(db: Database, status?: string): PlanRow[] {
  return status
    ? (db.query(`SELECT * FROM plan WHERE status = ? ORDER BY created_at DESC`).all(status) as PlanRow[])
    : (db.query(`SELECT * FROM plan WHERE status != 'archived' ORDER BY created_at DESC`).all() as PlanRow[])
}

export function createPlan(db: Database, input: CreatePlanInput): PlanRow {
  const id = randomUUIDv7()
  const ts = now()
  db.run(
    `INSERT INTO plan (id, name, title, description, document, spec, status, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?)`,
    [id, input.name || input.title, input.title, input.description || "", input.document || "", input.spec || "", input.createdBy || "", ts, ts],
  )
  return db.query(`SELECT * FROM plan WHERE id = ?`).get(id) as PlanRow
}

export function archivePlan(db: Database, planId: string): PlanRow {
  const existing = db.query(`SELECT * FROM plan WHERE id = ?`).get(planId) as PlanRow | null
  if (!existing) throw new Error(`plan not found: ${planId}`)

  const ts = now()
  db.run(`UPDATE plan SET status = 'archived', updated_at = ? WHERE id = ?`, [ts, planId])
  return { ...existing, status: "archived", updated_at: ts }
}

export function archivePlansOlderThan(db: Database, olderThan: string): PlanRow[] {
  const match = olderThan.match(/^(\d+)([hdw])$/)
  if (!match) throw new Error(`invalid duration: ${olderThan}; expected formats like 12h, 7d, or 2w`)

  const value = parseInt(match[1], 10)
  const unit = match[2]
  const multipliers: Record<string, number> = {
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
  }

  const cutoff = now() - value * multipliers[unit]
  const candidates = db
    .query(`SELECT * FROM plan WHERE status IN ('draft', 'active') AND updated_at < ? ORDER BY updated_at ASC`)
    .all(cutoff) as PlanRow[]

  const ts = now()
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
  const ts = now()
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

export function createTask(db: Database, input: CreateTaskInput): TaskRow {
  const lookup = lookupPlan(db, input.planRef)
  if (!lookup.plan) throw new Error(lookup.multiple ? `multiple plans found with name: ${input.planRef}` : `plan not found: ${input.planRef}`)

  const max = db.query(`SELECT COALESCE(MAX(position), -1) as m FROM task WHERE plan_id = ?`).get(lookup.plan.id) as { m: number }
  const position = max.m + 1
  const id = randomUUIDv7()
  const ts = now()
  db.run(
    `INSERT INTO task (id, plan_id, title, description, status, priority, position, depends_on, created_at, updated_at) VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)`,
    [id, lookup.plan.id, input.title, input.description || "", input.priority ?? 0, position, input.dependsOn || "", ts, ts],
  )
  return db.query(`SELECT * FROM task WHERE id = ?`).get(id) as TaskRow
}

export function listTasks(db: Database, filters: TaskListFilters = {}): TaskRow[] {
  let q = `SELECT * FROM task WHERE 1=1`
  const params: unknown[] = []

  if (filters.planRef) {
    const lookup = lookupPlan(db, filters.planRef)
    if (!lookup.plan) throw new Error(lookup.multiple ? `multiple plans found with name: ${filters.planRef}` : `plan not found: ${filters.planRef}`)
    q += ` AND plan_id = ?`
    params.push(lookup.plan.id)
  }

  if (filters.status) {
    const statusValues = taskStatusFilterValues(filters.status)
    q += ` AND status IN (${statusValues.map(() => "?").join(", ")})`
    params.push(...statusValues)
  }

  q += ` ORDER BY position`
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

  const ts = now()
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

  const tasks = listTasks(db, { planRef: plan.id })
  const counts: Record<string, number> = {}
  for (const task of tasks) counts[task.status] = (counts[task.status] || 0) + 1
  const total = tasks.length
  const completed = counts.completed || 0
  const needsGuidance = counts.needs_guidance || 0
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0

  return {
    plan: {
      id: plan.id,
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
