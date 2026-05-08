#!/usr/bin/env bun

import cors from "@fastify/cors"
import Fastify from "fastify"
import fs from "fs"
import type { Database } from "bun:sqlite"
import {
  getCurrentProject,
  getPlanSummary,
  getTask,
  getProject,
  listProjectDiscoverySources,
  listPlans,
  listTasks,
  listProjects,
  lookupPlan,
  openAgentbookDb,
  resolveDbPath,
  refreshProjectRegistry,
  type ProjectDiscoveryResponse,
  type ProjectRefreshResponse,
  type ProjectRecord,
  type PlanRow,
  type TaskRow,
} from "./agentbook-data"

type SelectionQuery = {
  planRef?: string
  taskId?: string
}

function httpError(statusCode: number, message: string) {
  const error = new Error(message) as Error & { statusCode: number }
  error.statusCode = statusCode
  return error
}

function createServerHelpers(appDb: Database, currentProject: ProjectRecord) {
  function resolveProject(projectId: string) {
    if (projectId === "current") return currentProject
    const project = getProject(appDb, projectId)
    if (!project) throw httpError(404, `project not found: ${projectId}`)
    return project
  }

  function resolvePlanOrThrow(ref: string): PlanRow {
    const lookup = lookupPlan(appDb, ref)
    if (lookup.plan) return lookup.plan
    throw httpError(404, lookup.multiple ? `multiple plans found with name: ${ref}` : `plan not found: ${ref}`)
  }

  function resolvePlanForProject(projectId: string, ref: string): PlanRow {
    const plan = resolvePlanOrThrow(ref)
    if (plan.project_id !== projectId) throw httpError(404, `plan not found: ${ref}`)
    return plan
  }

  function resolveTaskOrThrow(id: string): TaskRow {
    const task = getTask(appDb, id)
    if (!task) throw httpError(404, `task not found: ${id}`)
    return task
  }

  function normalizeProjectSelection(projectId: string, query: SelectionQuery) {
    const task = query.taskId ? resolveTaskOrThrow(query.taskId) : null
    if (task) {
      const taskPlan = resolvePlanForProject(projectId, task.plan_id)
      const summary = getPlanSummary(appDb, taskPlan.id)
      const tasks = listTasks(appDb, { planRef: taskPlan.id, projectId })
      return { plan: taskPlan, task, summary, tasks }
    }

    const plan = query.planRef ? resolvePlanForProject(projectId, query.planRef) : null
    const summary = plan ? getPlanSummary(appDb, plan.id) : null
    const tasks = plan ? listTasks(appDb, { planRef: plan.id, projectId }) : []
    return { plan, task, summary, tasks }
  }

  return { resolveProject, resolvePlanOrThrow, normalizeProjectSelection }
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
      if (url.pathname === "/ws" && upgradeServer.upgrade(req, { data: { projectId: currentProject.id } })) {
        return undefined
      }
      return new Response("Not found", { status: 404 })
    },
    websocket: {
      open(socket) {
        clients.add(socket)
        socket.send(JSON.stringify({ type: "hello", projectId: currentProject.id, dbPath }))
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
        projectId: currentProject.id,
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

export function createServer(options: { db?: Database; currentProject?: ProjectRecord; dbPath?: string } = {}) {
  const appDb = options.db ?? db
  const appDbPath = options.dbPath ?? dbPath
  const appCurrentProject = options.currentProject ?? getCurrentProject(appDb)
  const { resolveProject, resolvePlanOrThrow, normalizeProjectSelection } = createServerHelpers(appDb, appCurrentProject)
  const app = Fastify({ logger: true })

  app.register(cors, { origin: true })

  app.setErrorHandler((error, _request, reply) => {
    const statusCode = typeof (error as { statusCode?: number }).statusCode === "number" ? (error as { statusCode: number }).statusCode : 500
    app.log.error({ err: error }, "request failed")
    reply.code(statusCode).send({ error: { message: error.message } })
  })

  app.get("/api/projects", async () => ({
    projects: listProjects(appDb),
    currentProjectId: appCurrentProject.id,
  }))

  app.get("/api/projects/discovery", async (): Promise<ProjectDiscoveryResponse> => ({
    sources: listProjectDiscoverySources(),
  }))

  app.post("/api/projects/discovery/refresh", async (): Promise<ProjectRefreshResponse> => refreshProjectRegistry(appDb))
  app.get("/api/projects/discovery/refresh", async (): Promise<ProjectRefreshResponse> => refreshProjectRegistry(appDb))
  app.post("/api/projects/refresh", async (): Promise<ProjectRefreshResponse> => refreshProjectRegistry(appDb))
  app.get("/api/projects/refresh", async (): Promise<ProjectRefreshResponse> => refreshProjectRegistry(appDb))

  app.get("/api/projects/:projectId", async (request) => {
    const { projectId } = request.params as { projectId: string }
    return { project: resolveProject(projectId) }
  })

  app.get("/api/projects/:projectId/plans", async (request) => {
    const { projectId } = request.params as { projectId: string }
    const { status } = request.query as { status?: string }
    const project = resolveProject(projectId)
    return { project, plans: listPlans(appDb, { status, projectId }) }
  })

  app.get("/api/projects/:projectId/tasks", async (request) => {
    const { projectId } = request.params as { projectId: string }
    const { planRef, status } = request.query as { planRef?: string; status?: string }
    const project = resolveProject(projectId)
    return { project, tasks: listTasks(appDb, { planRef, status, projectId }) }
  })

  app.get("/api/projects/:projectId/selection", async (request) => {
    const { projectId } = request.params as { projectId: string }
    const project = resolveProject(projectId)
    const selection = normalizeProjectSelection(projectId, request.query as SelectionQuery)
    return { project, ...selection }
  })

  app.get("/api/plans/:ref", async (request) => {
    const { ref } = request.params as { ref: string }
    return { plan: resolvePlanOrThrow(ref) }
  })

  app.get("/api/plans/:ref/summary", async (request) => {
    const { ref } = request.params as { ref: string }
    return getPlanSummary(appDb, ref)
  })

  app.get("/api/plans/:ref/tasks", async (request) => {
    const { ref } = request.params as { ref: string }
    const plan = resolvePlanOrThrow(ref)
    return { plan, tasks: listTasks(appDb, { planRef: plan.id, projectId: plan.project_id }) }
  })

  app.get("/api/tasks/:id", async (request) => {
    const { id } = request.params as { id: string }
    return { task: resolveTaskOrThrow(id) }
  })

  app.addHook("onClose", async () => {
    fs.unwatchFile(appDbPath)
    appDb.close()
  })

  return app
}

const dbPath = resolveDbPath()
const db = openAgentbookDb()
const currentProject = getCurrentProject(db)

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
