#!/usr/bin/env bun

import { Database } from "bun:sqlite"
import {
  archivePlan,
  archivePlansOlderThan,
  createPlan,
  createTask,
  getPlanSummary,
  getTask,
  listPlans,
  listTasks,
  lookupPlan,
  openAgentbookDb,
  resolveDbPath,
  updatePlan,
  updateTask,
} from "./agentbook-data"

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

function json(data: unknown) {
  console.log(JSON.stringify(data, null, 2))
}

function die(msg: string): never {
  console.error(`error: ${msg}`)
  process.exit(1)
}

function orDie<T>(fn: () => T): T {
  try {
    return fn()
  } catch (error) {
    die(error instanceof Error ? error.message : String(error))
  }
}

function resolvePlanOrDie(db: Database, ref: string) {
  const lookup = lookupPlan(db, ref)
  if (lookup.plan) return lookup.plan
  die(lookup.multiple ? `multiple plans found with name: ${ref}` : `plan not found: ${ref}`)
}

function planCreate(db: Database, args: string[]) {
  const title = flag(args, "--title")
  if (!title) die("--title is required")
  const created = orDie(() =>
    createPlan(db, {
      title,
      name: flag(args, "--name") || title,
      description: flag(args, "--description") || "",
      document: flag(args, "--document") || "",
      spec: flag(args, "--spec") || "",
      createdBy: flag(args, "--created-by") || "",
    }),
  )
  json({
    id: created.id,
    name: created.name,
    title: created.title,
    description: created.description,
    document: created.document,
    spec: created.spec,
    status: created.status,
    created_by: created.created_by,
    created_at: created.created_at,
  })
}

function planList(db: Database, args: string[]) {
  json(listPlans(db, flag(args, "--status") || undefined))
}

function planArchive(db: Database, args: string[]) {
  const ref = positional(args)
  const olderThan = flag(args, "--older-than")

  if (ref && olderThan) die("provide either a plan ref or --older-than, not both")
  if (!ref && !olderThan) die("plan id or name is required, or provide --older-than <duration>")

  if (ref) {
    const existing = resolvePlanOrDie(db, ref)
    json(orDie(() => archivePlan(db, existing.id)))
    return
  }

  json(orDie(() => archivePlansOlderThan(db, olderThan!)))
}

function planArchiveStale(db: Database, args: string[]) {
  if (positional(args)) die("plan id or name is not supported for plan archive-stale")
  assertNoUnknownFlags(args, ["--older-than"], "plan archive-stale")

  const olderThan = flag(args, "--older-than") || "7d"
  json(orDie(() => archivePlansOlderThan(db, olderThan)))
}

function planGet(db: Database, args: string[]) {
  const ref = positional(args)
  if (!ref) die("plan id or name is required")
  json(resolvePlanOrDie(db, ref))
}

function planUpdate(db: Database, args: string[]) {
  const ref = positional(args)
  if (!ref) die("plan id or name is required")
  const existing = resolvePlanOrDie(db, ref)
  if (flag(args, "--title") === "") die("--title cannot be empty")
  assertNoUnknownFlags(args, ["--name", "--title", "--description", "--document", "--spec", "--status"], "plan update")

  const updated = orDie(() =>
    updatePlan(db, existing.id, {
      name: flag(args, "--name") ?? existing.name,
      title: flag(args, "--title") ?? existing.title,
      description: flag(args, "--description") ?? existing.description,
      document: flag(args, "--document") ?? existing.document,
      spec: flag(args, "--spec") ?? existing.spec,
      status: flag(args, "--status") || existing.status,
    }),
  )
  json({
    id: updated.id,
    name: updated.name,
    title: updated.title,
    description: updated.description,
    document: updated.document,
    spec: updated.spec,
    status: updated.status,
    updated_at: updated.updated_at,
  })
}

function taskCreate(db: Database, args: string[]) {
  const plan = flag(args, "--plan")
  if (!plan) die("--plan is required")
  const title = flag(args, "--title")
  if (!title) die("--title is required")
  const created = orDie(() =>
    createTask(db, {
      planRef: plan,
      title,
      description: flag(args, "--description") || "",
      priority: parseInt(flag(args, "--priority") || "0", 10),
      dependsOn: flag(args, "--depends-on") || "",
    }),
  )
  json({
    id: created.id,
    plan_id: created.plan_id,
    title: created.title,
    description: created.description,
    status: created.status,
    priority: created.priority,
    position: created.position,
    depends_on: created.depends_on,
  })
}

function taskList(db: Database, args: string[]) {
  json(orDie(() => listTasks(db, { planRef: flag(args, "--plan") || undefined, status: flag(args, "--status") || undefined })))
}

function taskGet(db: Database, args: string[]) {
  const id = positional(args)
  if (!id) die("task id is required")
  const task = getTask(db, id)
  if (!task) die(`task not found: ${id}`)
  json(task)
}

function taskUpdate(db: Database, args: string[]) {
  const id = positional(args)
  if (!id) die("task id is required")
  const existing = getTask(db, id)
  if (!existing) die(`task not found: ${id}`)
  assertNoUnknownFlags(
    args,
    ["--title", "--description", "--status", "--priority", "--depends-on", "--assignee", "--notes", "--session", "--worktree"],
    "task update",
  )

  json(
    orDie(() =>
      updateTask(db, id, {
        title: flag(args, "--title") ?? existing.title,
        description: flag(args, "--description") ?? existing.description,
        status: flag(args, "--status") || undefined,
        priority: parseInt(flag(args, "--priority") || String(existing.priority), 10),
        dependsOn: flag(args, "--depends-on") ?? existing.depends_on,
        assignee: flag(args, "--assignee") ?? existing.assignee,
        notes: flag(args, "--notes") ?? existing.notes,
        session: flag(args, "--session") ?? existing.session_id,
        worktree: flag(args, "--worktree") ?? existing.worktree_dir,
      }),
    ),
  )
}

function summary(db: Database, args: string[]) {
  const ref = positional(args)
  if (!ref) die("plan id or name is required")
  json(orDie(() => getPlanSummary(db, ref)))
}

function usage(): never {
  console.log(`agentbook - AI-oriented cross-session plan tracking

Usage: agentbook <command> <subcommand> [options]

Commands:
  plan create   --title <t> [--name <n>] [--description <d>] [--document <d>] [--spec <s>] [--created-by <name>]
  plan list     [--status <s>]
  plan get      <plan-id|plan-name>
  plan archive  <plan-id|plan-name> | --older-than <12h|7d|2w>
  plan archive-stale [--older-than <7d>]
  plan update   <plan-id|plan-name> [--name <n>] [--title <t>] [--description <d>] [--document <d>] [--spec <s>] [--status <s>]

  archive-stale [--older-than <7d>]

  task create   --plan <plan-id|plan-name> --title <t> [--description <d>] [--priority <n>] [--depends-on <ids>]
  task list     [--plan <plan-id|plan-name>] [--status <s>]
  task get      <task-id>
  task update   <task-id> [--status <s>] [--assignee <a>] [--notes <n>] [--session <sid>] [--worktree <dir>] [--title <t>] [--description <d>] [--priority <n>] [--depends-on <ids>]

  summary       <plan-id|plan-name>
  init

Environment:
  AGENTBOOK_DB   Path to SQLite database (default: $GIT_COMMON_DIR/agentbook/agentbook.db or .opencode/agentbook.db)

Plan statuses: draft | discovery | needs_spec_approval | active | paused | completed | cancelled | archived
  discovery: coordinator and human are actively shaping the plan before spec approval.
  needs_spec_approval: coordinator has drafted or revised the spec; awaiting user approval before dispatching new workers.`)
  process.exit(0)
}

const args = process.argv.slice(2)
if (args.length === 0 || args[0] === "--help" || args[0] === "-h") usage()

const cmd = args[0]
const sub = args[1]
const rest = args.slice(2)

const db = openAgentbookDb()

try {
  if (cmd === "init") {
    json({ ok: true, db: resolveDbPath() })
  } else if (cmd === "plan") {
    if (sub === "create") planCreate(db, rest)
    else if (sub === "list") planList(db, rest)
    else if (sub === "get") planGet(db, rest)
    else if (sub === "archive") planArchive(db, rest)
    else if (sub === "archive-stale") planArchiveStale(db, rest)
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
  } else if (cmd === "archive-stale") {
    planArchiveStale(db, args.slice(1))
  } else {
    die(`unknown command: ${cmd}`)
  }
} finally {
  db.close()
}
