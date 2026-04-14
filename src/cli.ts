#!/usr/bin/env bun

import { Database } from "bun:sqlite"
import { randomUUIDv7 } from "bun"
import path from "path"
import fs from "fs"

function open() {
  const file = process.env.AGENTBOOK_DB || path.join(process.cwd(), ".opencode", "agentbook.db")
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
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'draft',
    created_by TEXT DEFAULT '',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`)
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
  db.run(`CREATE TABLE IF NOT EXISTS activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_id TEXT NOT NULL REFERENCES plan(id) ON DELETE CASCADE,
    task_id TEXT DEFAULT '',
    action TEXT NOT NULL,
    agent TEXT DEFAULT '',
    detail TEXT DEFAULT '',
    created_at INTEGER NOT NULL
  )`)
  db.run(`CREATE INDEX IF NOT EXISTS activity_plan_idx ON activity(plan_id)`)
}

const now = () => Date.now()

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(name)
  if (i === -1 || i + 1 >= args.length) return undefined
  return args[i + 1]
}

function positional(args: string[]): string | undefined {
  return args.find((a) => !a.startsWith("--"))
}

function json(data: unknown) {
  console.log(JSON.stringify(data, null, 2))
}

function die(msg: string): never {
  console.error(`error: ${msg}`)
  process.exit(1)
}

function logActivity(db: Database, plan: string, task: string, action: string, agent: string, detail: string) {
  db.run(`INSERT INTO activity (plan_id, task_id, action, agent, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)`, [
    plan,
    task,
    action,
    agent,
    detail,
    now(),
  ])
}

function planCreate(db: Database, args: string[]) {
  const title = flag(args, "--title")
  if (!title) die("--title is required")
  const description = flag(args, "--description") || ""
  const by = flag(args, "--created-by") || ""
  const id = randomUUIDv7()
  const ts = now()
  db.run(
    `INSERT INTO plan (id, title, description, status, created_by, created_at, updated_at) VALUES (?, ?, ?, 'draft', ?, ?, ?)`,
    [id, title, description, by, ts, ts],
  )
  logActivity(db, id, "", "created", "", `Plan created: ${title}`)
  json({ id, title, description, status: "draft", created_by: by, created_at: ts })
}

function planList(db: Database, args: string[]) {
  const status = flag(args, "--status")
  const rows = status
    ? db.query(`SELECT * FROM plan WHERE status = ? ORDER BY created_at DESC`).all(status)
    : db.query(`SELECT * FROM plan ORDER BY created_at DESC`).all()
  json(rows)
}

function planGet(db: Database, args: string[]) {
  const id = positional(args)
  if (!id) die("plan id is required")
  const plan = db.query(`SELECT * FROM plan WHERE id = ?`).get(id)
  if (!plan) die(`plan not found: ${id}`)
  const tasks = db.query(`SELECT * FROM task WHERE plan_id = ? ORDER BY position`).all(id)
  json({ ...plan, tasks })
}

function planUpdate(db: Database, args: string[]) {
  const id = positional(args)
  if (!id) die("plan id is required")
  const existing = db.query(`SELECT * FROM plan WHERE id = ?`).get(id)
  if (!existing) die(`plan not found: ${id}`)
  const title = flag(args, "--title") || existing.title
  const description = flag(args, "--description") ?? existing.description
  const status = flag(args, "--status") || existing.status
  const ts = now()
  db.run(`UPDATE plan SET title = ?, description = ?, status = ?, updated_at = ? WHERE id = ?`, [
    title,
    description,
    status,
    ts,
    id,
  ])
  if (status !== existing.status) {
    logActivity(db, id, "", "status_changed", "", `Plan status: ${existing.status} -> ${status}`)
  }
  json({ id, title, description, status, updated_at: ts })
}

function taskCreate(db: Database, args: string[]) {
  const plan = flag(args, "--plan")
  if (!plan) die("--plan is required")
  const title = flag(args, "--title")
  if (!title) die("--title is required")
  const existing = db.query(`SELECT id FROM plan WHERE id = ?`).get(plan)
  if (!existing) die(`plan not found: ${plan}`)
  const description = flag(args, "--description") || ""
  const priority = parseInt(flag(args, "--priority") || "0", 10)
  const depends = flag(args, "--depends-on") || ""
  const max = db.query(`SELECT COALESCE(MAX(position), -1) as m FROM task WHERE plan_id = ?`).get(plan) as { m: number }
  const position = max.m + 1
  const id = randomUUIDv7()
  const ts = now()
  db.run(
    `INSERT INTO task (id, plan_id, title, description, status, priority, position, depends_on, created_at, updated_at) VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)`,
    [id, plan, title, description, priority, position, depends, ts, ts],
  )
  logActivity(db, plan, id, "task_created", "", `Task created: ${title}`)
  json({ id, plan_id: plan, title, description, status: "pending", priority, position, depends_on: depends })
}

function taskList(db: Database, args: string[]) {
  const plan = flag(args, "--plan")
  const status = flag(args, "--status")
  let q = `SELECT * FROM task WHERE 1=1`
  const params: unknown[] = []
  if (plan) {
    q += ` AND plan_id = ?`
    params.push(plan)
  }
  if (status) {
    q += ` AND status = ?`
    params.push(status)
  }
  q += ` ORDER BY position`
  json(db.query(q).all(...params))
}

function taskGet(db: Database, args: string[]) {
  const id = positional(args)
  if (!id) die("task id is required")
  const task = db.query(`SELECT * FROM task WHERE id = ?`).get(id)
  if (!task) die(`task not found: ${id}`)
  json(task)
}

function taskUpdate(db: Database, args: string[]) {
  const id = positional(args)
  if (!id) die("task id is required")
  const existing = db.query(`SELECT * FROM task WHERE id = ?`).get(id)
  if (!existing) die(`task not found: ${id}`)
  const status = flag(args, "--status") || existing.status
  const assignee = flag(args, "--assignee") ?? existing.assignee
  const notes = flag(args, "--notes") ?? existing.notes
  const session = flag(args, "--session") ?? existing.session_id
  const worktree = flag(args, "--worktree") ?? existing.worktree_dir
  const ts = now()
  db.run(
    `UPDATE task SET status = ?, assignee = ?, notes = ?, session_id = ?, worktree_dir = ?, updated_at = ? WHERE id = ?`,
    [status, assignee, notes, session, worktree, ts, id],
  )
  if (status !== existing.status) {
    logActivity(
      db,
      existing.plan_id,
      id,
      "task_status_changed",
      assignee,
      `Task "${existing.title}": ${existing.status} -> ${status}`,
    )
  }
  json({ ...existing, status, assignee, notes, session_id: session, worktree_dir: worktree, updated_at: ts })
}

function activityCreate(db: Database, args: string[]) {
  const plan = flag(args, "--plan")
  if (!plan) die("--plan is required")
  const task = flag(args, "--task") || ""
  const action = flag(args, "--action") || "note"
  const detail = flag(args, "--detail") || ""
  const agent = flag(args, "--agent") || ""
  logActivity(db, plan, task, action, agent, detail)
  json({ ok: true })
}

function activityList(db: Database, args: string[]) {
  const plan = flag(args, "--plan")
  if (!plan) die("--plan is required")
  const limit = parseInt(flag(args, "--limit") || "20", 10)
  const rows = db.query(`SELECT * FROM activity WHERE plan_id = ? ORDER BY created_at DESC LIMIT ?`).all(plan, limit)
  json(rows)
}

function summary(db: Database, args: string[]) {
  const id = positional(args)
  if (!id) die("plan id is required")
  const plan = db.query(`SELECT * FROM plan WHERE id = ?`).get(id)
  if (!plan) die(`plan not found: ${id}`)
  const tasks = db.query(`SELECT * FROM task WHERE plan_id = ? ORDER BY position`).all(id) as Array<{
    status: string
    id: string
    title: string
    assignee: string
    worktree_dir: string
  }>
  const counts: Record<string, number> = {}
  for (const t of tasks) counts[t.status] = (counts[t.status] || 0) + 1
  const total = tasks.length
  const done = counts["completed"] || 0
  const progress = total > 0 ? Math.round((done / total) * 100) : 0
  const recent = db
    .query(`SELECT * FROM activity WHERE plan_id = ? ORDER BY created_at DESC LIMIT 5`)
    .all(id) as Array<{ action: string; detail: string; agent: string; created_at: number }>

  json({
    plan: { id: plan.id, title: plan.title, status: plan.status, description: plan.description },
    progress: { total, completed: done, percentage: progress, by_status: counts },
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      assignee: t.assignee || null,
      worktree_dir: t.worktree_dir || null,
    })),
    recent_activity: recent.map((a) => ({
      action: a.action,
      detail: a.detail,
      agent: a.agent || null,
      created_at: a.created_at,
    })),
  })
}

function usage(): never {
  console.log(`agentbook - AI-oriented cross-session plan tracking

Usage: agentbook <command> <subcommand> [options]

Commands:
  plan create   --title <t> [--description <d>] [--created-by <name>]
  plan list     [--status <s>]
  plan get      <plan-id>
  plan update   <plan-id> [--title <t>] [--description <d>] [--status <s>]

  task create   --plan <plan-id> --title <t> [--description <d>] [--priority <n>] [--depends-on <ids>]
  task list     [--plan <plan-id>] [--status <s>]
  task get      <task-id>
  task update   <task-id> [--status <s>] [--assignee <a>] [--notes <n>] [--session <sid>] [--worktree <dir>]

  log create    --plan <plan-id> [--task <task-id>] [--action <a>] [--detail <d>] [--agent <name>]
  log list      --plan <plan-id> [--limit <n>]

  summary       <plan-id>
  init

Environment:
  AGENTBOOK_DB   Path to SQLite database (default: .opencode/agentbook.db)`)
  process.exit(0)
}

const args = process.argv.slice(2)
if (args.length === 0 || args[0] === "--help" || args[0] === "-h") usage()

const cmd = args[0]
const sub = args[1]
const rest = args.slice(2)

const db = open()

try {
  if (cmd === "init") {
    json({ ok: true, db: process.env.AGENTBOOK_DB || path.join(process.cwd(), ".opencode", "agentbook.db") })
  } else if (cmd === "plan") {
    if (sub === "create") planCreate(db, rest)
    else if (sub === "list") planList(db, rest)
    else if (sub === "get") planGet(db, rest)
    else if (sub === "update") planUpdate(db, rest)
    else die(`unknown plan subcommand: ${sub}`)
  } else if (cmd === "task") {
    if (sub === "create") taskCreate(db, rest)
    else if (sub === "list") taskList(db, rest)
    else if (sub === "get") taskGet(db, rest)
    else if (sub === "update") taskUpdate(db, rest)
    else die(`unknown task subcommand: ${sub}`)
  } else if (cmd === "log") {
    if (sub === "create") activityCreate(db, rest)
    else if (sub === "list") activityList(db, rest)
    else die(`unknown log subcommand: ${sub}`)
  } else if (cmd === "summary") {
    summary(db, rest.length ? rest : args.slice(1))
  } else {
    die(`unknown command: ${cmd}`)
  }
} finally {
  db.close()
}
