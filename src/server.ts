#!/usr/bin/env bun

import cors from "@fastify/cors"
import Fastify from "fastify"
import { createHash } from "crypto"
import fs from "fs"
import path from "path"
import { execSync } from "child_process"
import {
  getPlanSummary,
  getTask,
  listPlans,
  listTasks,
  lookupPlan,
  openAgentbookDb,
  resolveDbPath,
  type PlanRow,
  type TaskRow,
} from "./agentbook-data"

type ProjectRecord = {
  id: string
  name: string
  title: string
  description: string
  git_root: string | null
  git_common_dir: string | null
  db_path: string
  plan_count: number
  task_count: number
  updated_at: number
}

type SelectionQuery = {
  planRef?: string
  taskId?: string
}

function gitRoot(): string | null {
  try {
    return execSync("git rev-parse --show-toplevel", { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim()
  } catch {
    return null
  }
}

function gitCommonDir(): string | null {
  try {
    return execSync("git rev-parse --git-common-dir", { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim()
  } catch {
    return null
  }
}

function projectIdFor(dbPath: string): string {
  return `project-${createHash("sha1").update(dbPath).digest("hex").slice(0, 12)}`
}

function httpError(statusCode: number, message: string) {
  const error = new Error(message) as Error & { statusCode: number }
  error.statusCode = statusCode
  return error
}

function projectName(root: string | null, dbPath: string): string {
  if (root) return path.basename(root)
  return path.basename(path.dirname(dbPath)) || "agentbook"
}

function buildProjectRecord(dbPath: string): ProjectRecord {
  const plans = listPlans(db)
  const tasks = listTasks(db)
  let updatedAt = 0
  for (const plan of plans) updatedAt = Math.max(updatedAt, plan.updated_at)
  for (const task of tasks) updatedAt = Math.max(updatedAt, task.updated_at)

  return {
    id: projectIdFor(dbPath),
    name: projectName(gitRootPath, dbPath),
    title: gitRootPath ? `Current repository (${path.basename(gitRootPath)})` : "Current repository",
    description: `Read-only agentbook data at ${dbPath}`,
    git_root: gitRootPath,
    git_common_dir: gitCommon,
    db_path: dbPath,
    plan_count: plans.length,
    task_count: tasks.length,
    updated_at: updatedAt,
  }
}

function resolveProject(projectId: string): ProjectRecord {
  const project = buildProjectRecord(dbPath)
  if (projectId !== project.id && projectId !== "current") throw httpError(404, `project not found: ${projectId}`)
  return project
}

function resolvePlanOrThrow(ref: string): PlanRow {
  const lookup = lookupPlan(db, ref)
  if (lookup.plan) return lookup.plan
  throw httpError(404, lookup.multiple ? `multiple plans found with name: ${ref}` : `plan not found: ${ref}`)
}

function resolveTaskOrThrow(id: string): TaskRow {
  const task = getTask(db, id)
  if (!task) throw httpError(404, `task not found: ${id}`)
  return task
}

function normalizeProjectSelection(query: SelectionQuery) {
  const task = query.taskId ? resolveTaskOrThrow(query.taskId) : null
  const plan = query.planRef ? resolvePlanOrThrow(query.planRef) : task ? resolvePlanOrThrow(task.plan_id) : null
  const summary = plan ? getPlanSummary(db, plan.id) : null
  const tasks = plan ? listTasks(db, { planRef: plan.id }) : []
  return { plan, task, summary, tasks }
}

function createWebSocketServer(host: string, port: number) {
  const clients = new Set<any>()

  function broadcast(message: unknown) {
    const payload = JSON.stringify(message)
    for (const socket of clients) {
      try {
        socket.send(payload)
      } catch {
        clients.delete(socket)
      }
    }
  }

  const server = Bun.serve({
    hostname: host,
    port,
    fetch(req, upgradeServer) {
      const url = new URL(req.url)
      if (url.pathname === "/ws" && upgradeServer.upgrade(req, { data: { projectId: projectIdFor(dbPath) } })) {
        return undefined
      }
      return new Response("Not found", { status: 404 })
    },
    websocket: {
      open(socket) {
        clients.add(socket)
        socket.send(JSON.stringify({ type: "hello", projectId: projectIdFor(dbPath), dbPath }))
      },
      close(socket) {
        clients.delete(socket)
      },
    },
  })

  fs.watchFile(dbPath, { interval: 1000 }, (current, previous) => {
    if (current.mtimeMs === previous.mtimeMs && current.size === previous.size) return
    broadcast({
      type: "invalidate",
      scope: "database",
      reason: "file-changed",
      projectId: projectIdFor(dbPath),
      dbPath,
      at: Date.now(),
    })
  })

  return {
    server,
    stop() {
      fs.unwatchFile(dbPath)
      clients.clear()
      server.stop()
    },
  }
}

function createServer() {
  const app = Fastify({ logger: true })

  app.register(cors, { origin: true })

  app.setErrorHandler((error, _request, reply) => {
    const statusCode = typeof (error as { statusCode?: number }).statusCode === "number" ? (error as { statusCode: number }).statusCode : 500
    app.log.error({ err: error }, "request failed")
    reply.code(statusCode).send({ error: { message: error.message } })
  })

  app.get("/api/projects", async () => ({
    projects: [buildProjectRecord(dbPath)],
    currentProjectId: projectIdFor(dbPath),
  }))

  app.get("/api/projects/:projectId", async (request) => {
    const { projectId } = request.params as { projectId: string }
    return { project: resolveProject(projectId) }
  })

  app.get("/api/projects/:projectId/plans", async (request) => {
    const { projectId } = request.params as { projectId: string }
    resolveProject(projectId)
    const { status } = request.query as { status?: string }
    return { project: buildProjectRecord(dbPath), plans: listPlans(db, status) }
  })

  app.get("/api/projects/:projectId/tasks", async (request) => {
    const { projectId } = request.params as { projectId: string }
    resolveProject(projectId)
    const { planRef, status } = request.query as { planRef?: string; status?: string }
    return { project: buildProjectRecord(dbPath), tasks: listTasks(db, { planRef, status }) }
  })

  app.get("/api/projects/:projectId/selection", async (request) => {
    const { projectId } = request.params as { projectId: string }
    const project = resolveProject(projectId)
    const selection = normalizeProjectSelection(request.query as SelectionQuery)
    return { project, ...selection }
  })

  app.get("/api/plans/:ref", async (request) => {
    const { ref } = request.params as { ref: string }
    return { plan: resolvePlanOrThrow(ref) }
  })

  app.get("/api/plans/:ref/summary", async (request) => {
    const { ref } = request.params as { ref: string }
    return getPlanSummary(db, ref)
  })

  app.get("/api/plans/:ref/tasks", async (request) => {
    const { ref } = request.params as { ref: string }
    const plan = resolvePlanOrThrow(ref)
    return { plan, tasks: listTasks(db, { planRef: plan.id }) }
  })

  app.get("/api/tasks/:id", async (request) => {
    const { id } = request.params as { id: string }
    return { task: resolveTaskOrThrow(id) }
  })

  app.addHook("onClose", async () => {
    fs.unwatchFile(dbPath)
    db.close()
  })

  return app
}

const dbPath = resolveDbPath()
const db = openAgentbookDb()
const gitRootPath = gitRoot()
const gitCommon = gitCommonDir()

if (import.meta.main) {
  const server = createServer()
  const port = Number(process.env.PORT || "3000")
  const host = process.env.HOST || "127.0.0.1"
  const wsPort = Number(process.env.WS_PORT || String(port + 1))
  const wsServer = createWebSocketServer(host, wsPort)

  await server.listen({ port, host })
  server.log.info(`agentbook server listening on http://${host}:${port}`)
  server.log.info(`agentbook websocket listening on ws://${host}:${wsPort}/ws`)

  const shutdown = async () => {
    await server.close()
    wsServer.stop()
    process.exit(0)
  }

  process.once("SIGINT", shutdown)
  process.once("SIGTERM", shutdown)
}
