import { Database } from "bun:sqlite"
import fs from "fs"
import os from "os"
import path from "path"
import { execSync } from "child_process"
import { fileURLToPath } from "url"

type OpenCodeProjectRow = {
  id: string
  worktree: string
  name: string | null
  icon_color: string | null
  time_created: number
}

type OpenCodeSessionRow = {
  id: string
  slug: string | null
  title: string | null
  time_created: number
  time_updated: number
}

type AgentbookPlanRow = {
  id: string
  title: string
  description: string | null
  status: string
  created_at: number
  updated_at: number
}

type AgentbookTaskRow = {
  id: string
  plan_id: string
  title: string
  status: string
  priority: number
  assignee: string | null
  session_id: string | null
  notes: string | null
  created_at: number
  updated_at: number
}

type AgentbookActivityRow = {
  action: string
  detail: string | null
  agent: string | null
  created_at: number
}

type CountRow = { count: number }

const DEFAULT_PORT = 3141
const OPENCODE_DB_PATH = path.join(os.homedir(), ".local", "share", "opencode", "opencode.db")
const UI_DIR = path.dirname(fileURLToPath(import.meta.url))
const INDEX_HTML_PATH = path.join(UI_DIR, "index.html")

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} satisfies Record<string, string>

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

function jsonResponse(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers)
  headers.set("Content-Type", "application/json; charset=utf-8")
  for (const [key, value] of Object.entries(CORS_HEADERS)) headers.set(key, value)
  return new Response(JSON.stringify(data), { ...init, headers })
}

function textResponse(body: string, status = 500): Response {
  const headers = new Headers(CORS_HEADERS)
  headers.set("Content-Type", "text/plain; charset=utf-8")
  return new Response(body, { status, headers })
}

function optionsResponse(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

function getCount(db: Database, sql: string): number {
  const row = db.query(sql).get() as CountRow | null
  return row?.count ?? 0
}

function loadProjectSummaries(): Array<{
  id: string
  worktree: string
  name: string
  icon_color: string | null
  has_agentbook: boolean
  active_plans: number
  active_tasks: number
  pending_tasks: number
  completed_tasks: number
}> {
  return withReadonlyDatabase(OPENCODE_DB_PATH, (openCodeDb) => {
    const projects = openCodeDb
      .query(
        `SELECT id, worktree, name, icon_color, time_created
         FROM project
         WHERE id != 'global'
         ORDER BY time_created DESC`,
      )
      .all() as OpenCodeProjectRow[]

    const results: Array<{
      id: string
      worktree: string
      name: string
      icon_color: string | null
      has_agentbook: boolean
      active_plans: number
      active_tasks: number
      pending_tasks: number
      completed_tasks: number
    }> = []

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

function loadProjectDetails(projectId: string): {
  project: { id: string; worktree: string; name: string }
  plans: Array<{
    id: string
    title: string
    status: string
    description: string
    created_at: number
    updated_at: number
    tasks: Array<{
      id: string
      title: string
      status: string
      priority: number
      assignee: string
      session_id: string
      notes: string
      created_at: number
      updated_at: number
    }>
  }>
  activity: Array<{ action: string; detail: string; agent: string; created_at: number }>
  sessions: Array<{ id: string; slug: string; title: string; time_created: number; time_updated: number }>
} {
  return withReadonlyDatabase(OPENCODE_DB_PATH, (openCodeDb) => {
    const project = openCodeDb
      .query(`SELECT id, worktree, name, icon_color, time_created FROM project WHERE id = ?`)
      .get(projectId) as OpenCodeProjectRow | null

    if (!project) {
      throw new Response("Project not found", { status: 404, headers: CORS_HEADERS })
    }

    if (!safeDirectoryExists(project.worktree)) {
      throw new Response("Project worktree not found", { status: 404, headers: CORS_HEADERS })
    }

    const sessions = openCodeDb
      .query(
        `SELECT id, slug, title, time_created, time_updated
         FROM session
         WHERE project_id = ?
         ORDER BY time_updated DESC
         LIMIT 10`,
      )
      .all(projectId) as OpenCodeSessionRow[]

    const response = {
      project: {
        id: project.id,
        worktree: project.worktree,
        name: projectName(project.name, project.worktree),
      },
      plans: [] as Array<{
        id: string
        title: string
        status: string
        description: string
        created_at: number
        updated_at: number
        tasks: Array<{
          id: string
          title: string
          status: string
          priority: number
          assignee: string
          session_id: string
          notes: string
          created_at: number
          updated_at: number
        }>
      }>,
      activity: [] as Array<{ action: string; detail: string; agent: string; created_at: number }>,
      sessions: sessions.map((session) => ({
        id: session.id,
        slug: session.slug ?? "",
        title: session.title ?? "",
        time_created: session.time_created,
        time_updated: session.time_updated,
      })),
    }

    const agentbookDbPath = findAgentbookDbPath(project.worktree)
    if (!agentbookDbPath) return response

    return withReadonlyDatabase(agentbookDbPath, (agentbookDb) => {
      const plans = agentbookDb
        .query(`SELECT * FROM plan ORDER BY created_at DESC`)
        .all() as AgentbookPlanRow[]

      response.plans = plans.map((plan) => {
        const tasks = agentbookDb
          .query(`SELECT * FROM task WHERE plan_id = ? ORDER BY position`)
          .all(plan.id) as AgentbookTaskRow[]

        return {
          id: plan.id,
          title: plan.title,
          status: plan.status,
          description: plan.description ?? "",
          created_at: plan.created_at,
          updated_at: plan.updated_at,
          tasks: tasks.map((task) => ({
            id: task.id,
            title: task.title,
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

      const activity = agentbookDb
        .query(`SELECT * FROM activity ORDER BY created_at DESC LIMIT 50`)
        .all() as AgentbookActivityRow[]

      response.activity = activity.map((entry) => ({
        action: entry.action,
        detail: entry.detail ?? "",
        agent: entry.agent ?? "",
        created_at: entry.created_at,
      }))

      return response
    })
  })
}

async function serveIndex(): Promise<Response> {
  const file = Bun.file(INDEX_HTML_PATH)
  if (!(await file.exists())) {
    return textResponse("src/ui/index.html not found", 404)
  }

  const headers = new Headers(CORS_HEADERS)
  headers.set("Content-Type", file.type || "text/html; charset=utf-8")
  return new Response(file, { headers })
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

      if (request.method === "OPTIONS") {
        return optionsResponse()
      }

      try {
        if (request.method === "GET" && url.pathname === "/") {
          return await serveIndex()
        }

        if (request.method === "GET" && url.pathname === "/api/projects") {
          return jsonResponse(loadProjectSummaries())
        }

        if (request.method === "GET" && url.pathname.startsWith("/api/projects/")) {
          const projectId = decodeURIComponent(url.pathname.slice("/api/projects/".length))
          if (!projectId) return jsonResponse({ error: "Project id is required" }, { status: 400 })
          return jsonResponse(loadProjectDetails(projectId))
        }

        return jsonResponse({ error: "Not found" }, { status: 404 })
      } catch (error) {
        if (error instanceof Response) return error
        console.error("UI server error:", error)
        return jsonResponse({ error: "Internal server error" }, { status: 500 })
      }
    },
  })
}

if (import.meta.main) {
  const port = resolvePort()
  startServer(port)
  console.log(`Agentbook UI server listening on http://localhost:${port}`)
}
