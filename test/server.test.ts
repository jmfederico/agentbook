import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { Database } from "bun:sqlite"
import fs from "fs"
import path from "path"
import { freshTmpDir, initGitRepoWithWorktree } from "./helpers"
import { getCurrentProject, migrateSchema } from "../src/agentbook-data"

describe("server API", () => {
  const tmpdirs: string[] = []
  const previousDb = process.env.AGENTBOOK_DB
  let dbPath = ""
  let app: any = null
  let db: Database | null = null
  let currentProjectId = ""
  let foreignProjectId = ""
  let foreignPlanId = ""
  let foreignTaskId = ""
  let worktreePath = ""
  let commonDir = ""

  beforeAll(async () => {
    const fixture = initGitRepoWithWorktree({ branch: "server-api-projects" })
    tmpdirs.push(fixture.mainPath, fixture.worktreePath)
    worktreePath = fixture.worktreePath
    commonDir = fixture.commonDir

    const tempDir = freshTmpDir()
    tmpdirs.push(tempDir)
    dbPath = path.join(tempDir, "agentbook.db")
    process.env.AGENTBOOK_DB = dbPath

    db = new Database(dbPath)
    migrateSchema(db)
    currentProjectId = getCurrentProject(db).id

    const ts = Date.now()
    foreignProjectId = "project-server-api-foreign"
    foreignPlanId = "plan-server-api-foreign"
    foreignTaskId = "task-server-api-foreign"

    db.run(
      `INSERT INTO project (id, path, name, title, description, source, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [foreignProjectId, worktreePath, path.basename(worktreePath), "Foreign project", "Foreign project description", "manual", ts, ts],
    )
    db.run(
      `INSERT INTO plan (id, project_id, name, title, description, document, spec, status, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [foreignPlanId, foreignProjectId, "foreign-plan", "Foreign plan", "Foreign plan description", "", "", "active", "tester", ts, ts],
    )
    db.run(
      `INSERT INTO task (id, plan_id, title, description, status, priority, position, assignee, worktree_dir, session_id, depends_on, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [foreignTaskId, foreignPlanId, "Foreign task", "Foreign task description", "pending", 1, 0, "", "", "", "", "", ts, ts],
    )

    const { createServer } = await import("../src/server")
    app = createServer({ db, dbPath, currentProject: getCurrentProject(db) })
  })

  afterAll(async () => {
    await app?.close()
    if (previousDb === undefined) {
      delete process.env.AGENTBOOK_DB
    } else {
      process.env.AGENTBOOK_DB = previousDb
    }
    for (const dir of tmpdirs.splice(0)) {
      try {
        fs.rmSync(dir, { recursive: true, force: true })
      } catch {
        // best effort cleanup
      }
    }
  })

  test("exposes discovery sources for supported hosts", async () => {
    const response = await app!.inject({ method: "GET", url: "/api/projects/discovery" })
    expect(response.statusCode).toBe(200)

    const payload = JSON.parse(response.body) as { sources: Array<{ id: string }> }
    expect(payload.sources.map((source) => source.id)).toEqual(["opencode", "pi", "manual"])
  })

  test("refresh returns project records with derived git metadata", async () => {
    const response = await app!.inject({ method: "POST", url: "/api/projects/discovery/refresh" })
    expect(response.statusCode).toBe(200)

    const payload = JSON.parse(response.body) as {
      currentProjectId: string
      projects: Array<Record<string, unknown>>
    }

    expect(payload.currentProjectId).toBe(currentProjectId)
    const foreign = payload.projects.find((project) => project.id === foreignProjectId)
    expect(foreign).toBeTruthy()
    expect(foreign?.path).toBe(path.resolve(worktreePath))
    expect(foreign?.git_root).toBe(path.resolve(worktreePath))
    expect(foreign?.git_common_dir).toBe(commonDir)
    expect(foreign?.plan_count).toBe(1)
    expect(foreign?.task_count).toBe(1)
  })

  test("project-scoped endpoints stay within the selected project", async () => {
    const plansResponse = await app!.inject({ method: "GET", url: `/api/projects/${foreignProjectId}/plans` })
    expect(plansResponse.statusCode).toBe(200)
    const plansPayload = JSON.parse(plansResponse.body) as { project: { id: string }; plans: Array<{ id: string }> }
    expect(plansPayload.project.id).toBe(foreignProjectId)
    expect(plansPayload.plans.map((plan) => plan.id)).toEqual([foreignPlanId])

    const selectionResponse = await app!.inject({
      method: "GET",
      url: `/api/projects/${foreignProjectId}/selection?taskId=${encodeURIComponent(foreignTaskId)}`,
    })
    expect(selectionResponse.statusCode).toBe(200)
    const selectionPayload = JSON.parse(selectionResponse.body) as { project: { id: string }; plan: { id: string } | null; task: { id: string } | null }
    expect(selectionPayload.project.id).toBe(foreignProjectId)
    expect(selectionPayload.plan?.id).toBe(foreignPlanId)
    expect(selectionPayload.task?.id).toBe(foreignTaskId)
  })
})
