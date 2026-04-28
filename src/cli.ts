#!/usr/bin/env bun

import { Database } from "bun:sqlite"
import { randomUUIDv7 } from "bun"
import path from "path"
import fs from "fs"
import { execSync } from "child_process"

function resolveSharedRoot(): string | null {
  try {
    const raw = execSync("git rev-parse --git-common-dir", { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim()
    const gitCommonDir = path.resolve(process.cwd(), raw)
    return path.join(gitCommonDir, "agentbook")
  } catch {
    return null
  }
}

function resolveDbPath(): string {
  if (process.env.AGENTBOOK_DB) return process.env.AGENTBOOK_DB

  const legacyPath = path.join(process.cwd(), ".opencode", "agentbook.db")
  const sharedRoot = resolveSharedRoot()

  if (sharedRoot) {
    const sharedDb = path.join(sharedRoot, "agentbook.db")
    const sharedExists = fs.existsSync(sharedDb)
    const legacyExists = fs.existsSync(legacyPath)

    if (!sharedExists && legacyExists) {
      // Migrate legacy DB to shared location
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

function open() {
  const file = resolveDbPath()
  const dir = path.dirname(file)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  const db = new Database(file)
  db.run("PRAGMA journal_mode=WAL")
  db.run("PRAGMA foreign_keys=ON")
  migrate(db)
  return db
}

function migrate(db: Database) {
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

const now = () => Date.now()

const LEGACY_TASK_STATUS_ALIASES: Record<string, string> = {
  needs_review: "needs_guidance",
}

function canonicalTaskStatus(status: string): string {
  return LEGACY_TASK_STATUS_ALIASES[status] || status
}

function taskStatusFilterValues(status: string): string[] {
  const canonical = canonicalTaskStatus(status)
  return canonical === "needs_guidance" ? ["needs_guidance", "needs_review"] : [canonical]
}

function normalizeTaskRow(task: Record<string, unknown>) {
  return {
    ...task,
    status: canonicalTaskStatus(String(task.status || "")),
  }
}

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(name)
  if (i === -1 || i + 1 >= args.length) return undefined
  return args[i + 1]
}

function assertNoUnknownFlags(args: string[], allowedFlags: string[], command: string) {
  const allowed = new Set(allowedFlags)
  for (let i = 0; i < args.length; i++) {
    const token = args[i]
    if (!token.startsWith("--")) continue
    if (!allowed.has(token)) die(`unknown flag for ${command}: ${token}`)
    i += 1
  }
}

function positional(args: string[]): string | undefined {
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      i += 1
      continue
    }
    return args[i]
  }
  return undefined
}

function parseDuration(input: string): number {
  const match = input.match(/^(\d+)([hdw])$/)
  if (!match) die(`invalid duration: ${input}; expected formats like 12h, 7d, or 2w`)

  const value = parseInt(match[1], 10)
  const unit = match[2]
  const multipliers: Record<string, number> = {
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
  }

  return value * multipliers[unit]
}

function resolvePlan(db: Database, ref: string) {
  const byId = db.query(`SELECT * FROM plan WHERE id = ?`).get(ref)
  if (byId) return byId

  const byName = db.query(`SELECT * FROM plan WHERE name = ? ORDER BY created_at DESC`).all(ref) as Array<Record<string, unknown>>
  if (byName.length === 1) return byName[0]
  if (byName.length > 1) die(`multiple plans found with name: ${ref}`)

  return null
}

function json(data: unknown) {
  console.log(JSON.stringify(data, null, 2))
}

function die(msg: string): never {
  console.error(`error: ${msg}`)
  process.exit(1)
}

function planCreate(db: Database, args: string[]) {
  const title = flag(args, "--title")
  if (!title) die("--title is required")
  const name = flag(args, "--name") || title
  const description = flag(args, "--description") || ""
  const document = flag(args, "--document") || ""
  const spec = flag(args, "--spec") || ""
  const by = flag(args, "--created-by") || ""
  const id = randomUUIDv7()
  const ts = now()
  db.run(
    `INSERT INTO plan (id, name, title, description, document, spec, status, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?)`,
    [id, name, title, description, document, spec, by, ts, ts],
  )
  json({ id, name, title, description, document, spec, status: "draft", created_by: by, created_at: ts })
}

function planList(db: Database, args: string[]) {
  const status = flag(args, "--status")
  const rows = status
    ? db.query(`SELECT * FROM plan WHERE status = ? ORDER BY created_at DESC`).all(status)
    : db.query(`SELECT * FROM plan WHERE status != 'archived' ORDER BY created_at DESC`).all()
  json(rows)
}

function planArchive(db: Database, args: string[]) {
  const ref = positional(args)
  const olderThan = flag(args, "--older-than")

  if (ref && olderThan) die("provide either a plan ref or --older-than, not both")
  if (!ref && !olderThan) die("plan id or name is required, or provide --older-than <duration>")

  if (ref) {
    const existing = resolvePlan(db, ref)
    if (!existing) die(`plan not found: ${ref}`)

    const plan = existing as Record<string, unknown>
    const ts = now()
    db.run(`UPDATE plan SET status = 'archived', updated_at = ? WHERE id = ?`, [ts, plan.id])
    json({ ...plan, status: "archived", updated_at: ts })
    return
  }

  const maxAge = parseDuration(olderThan!)
  const cutoff = now() - maxAge
  const candidates = db
    .query(`SELECT * FROM plan WHERE status IN ('draft', 'active') AND updated_at < ? ORDER BY updated_at ASC`)
    .all(cutoff) as Array<Record<string, unknown>>

  const ts = now()
  for (const plan of candidates) {
    db.run(`UPDATE plan SET status = 'archived', updated_at = ? WHERE id = ?`, [ts, plan.id])
  }

  json(candidates.map((plan) => ({ ...plan, status: "archived", updated_at: ts })))
}

function planGet(db: Database, args: string[]) {
  const ref = positional(args)
  if (!ref) die("plan id or name is required")
  const plan = resolvePlan(db, ref)
  if (!plan) die(`plan not found: ${ref}`)
  json(plan)
}

function planUpdate(db: Database, args: string[]) {
  const ref = positional(args)
  if (!ref) die("plan id or name is required")
  const existing = resolvePlan(db, ref)
  if (!existing) die(`plan not found: ${ref}`)
  const id = (existing as { id: string }).id
  if (flag(args, "--title") === "") die("--title cannot be empty")
  const name = flag(args, "--name") ?? (existing as { name: string }).name
  const title = flag(args, "--title") ?? existing.title
  const description = flag(args, "--description") ?? existing.description
  const document = flag(args, "--document") ?? (existing as any).document
  const spec = flag(args, "--spec") ?? (existing as any).spec ?? ""
  const status = flag(args, "--status") || existing.status
  assertNoUnknownFlags(args, ["--name", "--title", "--description", "--document", "--spec", "--status"], "plan update")
  const changedFields = [
    name !== (existing as { name: string }).name ? "name" : null,
    title !== existing.title ? "title" : null,
    description !== existing.description ? "description" : null,
    document !== (existing as { document?: string | null }).document ? "document" : null,
    spec !== (existing as { spec?: string | null }).spec ? "spec" : null,
  ].filter((field): field is string => field !== null)
  const ts = now()
  db.run(`UPDATE plan SET name = ?, title = ?, description = ?, document = ?, spec = ?, status = ?, updated_at = ? WHERE id = ?`, [
    name,
    title,
    description,
    document,
    spec,
    status,
    ts,
    id,
  ])
  json({ id, name, title, description, document, spec, status, updated_at: ts })
}

function taskCreate(db: Database, args: string[]) {
  const plan = flag(args, "--plan")
  if (!plan) die("--plan is required")
  const title = flag(args, "--title")
  if (!title) die("--title is required")
  const existing = resolvePlan(db, plan)
  if (!existing) die(`plan not found: ${plan}`)
  const planId = (existing as { id: string }).id
  const description = flag(args, "--description") || ""
  const priority = parseInt(flag(args, "--priority") || "0", 10)
  const depends = flag(args, "--depends-on") || ""
  const max = db.query(`SELECT COALESCE(MAX(position), -1) as m FROM task WHERE plan_id = ?`).get(planId) as { m: number }
  const position = max.m + 1
  const id = randomUUIDv7()
  const ts = now()
  db.run(
    `INSERT INTO task (id, plan_id, title, description, status, priority, position, depends_on, created_at, updated_at) VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)`,
    [id, planId, title, description, priority, position, depends, ts, ts],
  )
  json({ id, plan_id: planId, title, description, status: "pending", priority, position, depends_on: depends })
}

function taskList(db: Database, args: string[]) {
  const planRef = flag(args, "--plan")
  const status = flag(args, "--status")
  let q = `SELECT * FROM task WHERE 1=1`
  const params: unknown[] = []
  if (planRef) {
    const plan = resolvePlan(db, planRef)
    if (!plan) die(`plan not found: ${planRef}`)
    q += ` AND plan_id = ?`
    params.push((plan as { id: string }).id)
  }
  if (status) {
    const statusValues = taskStatusFilterValues(status)
    q += ` AND status IN (${statusValues.map(() => "?").join(", ")})`
    params.push(...statusValues)
  }
  q += ` ORDER BY position`
  json(db.query(q).all(...params).map(normalizeTaskRow))
}

function taskGet(db: Database, args: string[]) {
  const id = positional(args)
  if (!id) die("task id is required")
  const task = db.query(`SELECT * FROM task WHERE id = ?`).get(id)
  if (!task) die(`task not found: ${id}`)
  json(normalizeTaskRow(task as Record<string, unknown>))
}

function taskUpdate(db: Database, args: string[]) {
  const id = positional(args)
  if (!id) die("task id is required")
  const existing = db.query(`SELECT * FROM task WHERE id = ?`).get(id) as {
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
  } | null
  if (!existing) die(`task not found: ${id}`)
  const title = flag(args, "--title") ?? existing.title
  const description = flag(args, "--description") ?? existing.description
  const requestedStatus = flag(args, "--status")
  const status = requestedStatus ? canonicalTaskStatus(requestedStatus) : canonicalTaskStatus(existing.status)
  const priority = parseInt(flag(args, "--priority") || String(existing.priority), 10)
  const dependsOn = flag(args, "--depends-on") ?? existing.depends_on
  const assignee = flag(args, "--assignee") ?? existing.assignee
  const notes = flag(args, "--notes") ?? existing.notes
  const session = flag(args, "--session") ?? existing.session_id
  const worktree = flag(args, "--worktree") ?? existing.worktree_dir
  assertNoUnknownFlags(
    args,
    ["--title", "--description", "--status", "--priority", "--depends-on", "--assignee", "--notes", "--session", "--worktree"],
    "task update",
  )
  const changedFields = [
    title !== existing.title ? "title" : null,
    description !== existing.description ? "description" : null,
    priority !== existing.priority ? "priority" : null,
    dependsOn !== existing.depends_on ? "depends_on" : null,
    assignee !== existing.assignee ? "assignee" : null,
    notes !== existing.notes ? "notes" : null,
    session !== existing.session_id ? "session_id" : null,
    worktree !== existing.worktree_dir ? "worktree_dir" : null,
  ].filter((field): field is string => field !== null)
  const ts = now()
  db.run(
    `UPDATE task SET title = ?, description = ?, status = ?, priority = ?, assignee = ?, worktree_dir = ?, session_id = ?, depends_on = ?, notes = ?, updated_at = ? WHERE id = ?`,
    [title, description, status, priority, assignee, worktree, session, dependsOn, notes, ts, id],
  )
  json({
    ...existing,
    title,
    description,
    status,
    priority,
    assignee,
    notes,
    session_id: session,
    worktree_dir: worktree,
    depends_on: dependsOn,
    updated_at: ts,
  })
}

function summary(db: Database, args: string[]) {
  const ref = positional(args)
  if (!ref) die("plan id or name is required")
  const plan = resolvePlan(db, ref)
  if (!plan) die(`plan not found: ${ref}`)
  const planId = (plan as { id: string }).id
  const tasks = db.query(`SELECT * FROM task WHERE plan_id = ? ORDER BY position`).all(planId) as Array<{
    status: string
    id: string
    title: string
    assignee: string
    worktree_dir: string
  }>
  const normalizedTasks = tasks.map((task) => normalizeTaskRow(task)) as Array<{
    status: string
    id: string
    title: string
    assignee: string
    worktree_dir: string
  }>
  const counts: Record<string, number> = {}
  for (const t of normalizedTasks) counts[t.status] = (counts[t.status] || 0) + 1
  const total = normalizedTasks.length
  const done = counts["completed"] || 0
  const needsGuidance = counts["needs_guidance"] || 0
  const progress = total > 0 ? Math.round((done / total) * 100) : 0
  json({
    plan: { id: plan.id, name: plan.name, title: plan.title, status: plan.status, description: plan.description, spec: plan.spec, document: plan.document },
    progress: { total, completed: done, needs_guidance: needsGuidance, percentage: progress, by_status: counts },
    tasks: normalizedTasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      assignee: t.assignee || null,
      worktree_dir: t.worktree_dir || null,
    })),
  })
}

function usage(): never {
  console.log(`agentbook - AI-oriented cross-session plan tracking

Usage: agentbook <command> <subcommand> [options]

Commands:
  plan create   --title <t> [--name <n>] [--description <d>] [--document <d>] [--spec <s>] [--created-by <name>]
  plan list     [--status <s>]
  plan get      <plan-id|plan-name>
  plan archive  <plan-id|plan-name> | --older-than <12h|7d|2w>
  plan update   <plan-id|plan-name> [--name <n>] [--title <t>] [--description <d>] [--document <d>] [--spec <s>] [--status <s>]

  task create   --plan <plan-id|plan-name> --title <t> [--description <d>] [--priority <n>] [--depends-on <ids>]
  task list     [--plan <plan-id|plan-name>] [--status <s>]
  task get      <task-id>
  task update   <task-id> [--status <s>] [--assignee <a>] [--notes <n>] [--session <sid>] [--worktree <dir>] [--title <t>] [--description <d>] [--priority <n>] [--depends-on <ids>]

  summary       <plan-id|plan-name>
  ui [--port <n>]   Launch the dashboard web UI (default port: 3141)
  init

Environment:
  AGENTBOOK_DB   Path to SQLite database (default: $GIT_COMMON_DIR/agentbook/agentbook.db or .opencode/agentbook.db)

Plan statuses: draft | needs_spec_approval | active | paused | completed | cancelled | archived
  needs_spec_approval: coordinator has drafted or revised the spec; awaiting user approval before dispatching new workers.`)
  process.exit(0)
}

const args = process.argv.slice(2)
if (args.length === 0 || args[0] === "--help" || args[0] === "-h") usage()

const cmd = args[0]
const sub = args[1]
const rest = args.slice(2)

if (cmd === "ui") {
  const port = parseInt(flag(args.slice(1), "--port") || process.env.PORT || "3141", 10)
  const { startServer } = await import("./ui/server.ts")
  startServer(port)
  console.log(`Agentbook Dashboard: http://localhost:${port}`)
  try {
    const open = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open"
    execSync(`${open} http://localhost:${port}`, { stdio: "ignore" })
  } catch {}
  // Keep the process alive
  await new Promise(() => {})
}

const db = open()

try {
  if (cmd === "init") {
    json({ ok: true, db: resolveDbPath() })
  } else if (cmd === "plan") {
    if (sub === "create") planCreate(db, rest)
    else if (sub === "list") planList(db, rest)
    else if (sub === "get") planGet(db, rest)
    else if (sub === "archive") planArchive(db, rest)
    else if (sub === "update") planUpdate(db, rest)
    else die(`unknown plan subcommand: ${sub}`)
  } else if (cmd === "task") {
    if (sub === "create") taskCreate(db, rest)
    else if (sub === "list") taskList(db, rest)
    else if (sub === "get") taskGet(db, rest)
    else if (sub === "update") taskUpdate(db, rest)
    else die(`unknown task subcommand: ${sub}`)
  } else if (cmd === "summary") {
    summary(db, rest.length ? rest : args.slice(1))
  } else {
    die(`unknown command: ${cmd}`)
  }
} finally {
  db.close()
}
