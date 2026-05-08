import { describe, test, expect, afterEach } from "bun:test"
import { Database } from "bun:sqlite"
import fs from "fs"
import path from "path"
import { initGitRepoWithWorktree, runCli, json } from "./helpers"

describe("Layer C: worktree / shared common-dir behavior", () => {
  const tmpdirs: string[] = []

  afterEach(() => {
    for (const dir of tmpdirs.splice(0)) {
      try {
        fs.rmSync(dir, { recursive: true, force: true })
      } catch {
        // best-effort cleanup
      }
    }
  })

  test("Main → worktree: plan written from main is readable from worktree by id", () => {
    const { mainPath, worktreePath } = initGitRepoWithWorktree()
    tmpdirs.push(mainPath, worktreePath)

    const createResult = runCli(
      ["plan", "create", "--title", "Cross-worktree plan", "--name", "p-main"],
      { cwd: mainPath, env: { AGENTBOOK_DB: undefined } },
    )
    expect(createResult.exitCode).toBe(0)
    const created = json<Record<string, unknown>>(createResult.stdout)

    const getResult = runCli(
      ["plan", "get", created.id as string],
      { cwd: worktreePath, env: { AGENTBOOK_DB: undefined } },
    )
    expect(getResult.exitCode).toBe(0)
    const fetched = json<Record<string, unknown>>(getResult.stdout)

    expect(fetched.id).toBe(created.id)
    expect(fetched.name).toBe(created.name)
    expect(fetched.title).toBe(created.title)
  })

  test("Worktree → main: plan written from worktree is readable from main by id", () => {
    const { mainPath, worktreePath } = initGitRepoWithWorktree({ branch: "wt-branch-2" })
    tmpdirs.push(mainPath, worktreePath)

    const createResult = runCli(
      ["plan", "create", "--title", "Worktree-origin plan", "--name", "p-wt"],
      { cwd: worktreePath, env: { AGENTBOOK_DB: undefined } },
    )
    expect(createResult.exitCode).toBe(0)
    const created = json<Record<string, unknown>>(createResult.stdout)

    const getResult = runCli(
      ["plan", "get", created.id as string],
      { cwd: mainPath, env: { AGENTBOOK_DB: undefined } },
    )
    expect(getResult.exitCode).toBe(0)
    const fetched = json<Record<string, unknown>>(getResult.stdout)

    expect(fetched.id).toBe(created.id)
    expect(fetched.name).toBe(created.name)
    expect(fetched.title).toBe(created.title)
  })

  test("DB is at <commonDir>/agentbook/agentbook.db, not in either checkout's working tree", () => {
    const { mainPath, worktreePath, commonDir } = initGitRepoWithWorktree({ branch: "wt-branch-3" })
    tmpdirs.push(mainPath, worktreePath)

    const createResult = runCli(
      ["plan", "create", "--title", "DB location plan", "--name", "p-dbloc"],
      { cwd: mainPath, env: { AGENTBOOK_DB: undefined } },
    )
    expect(createResult.exitCode).toBe(0)

    // DB must exist at the git common dir location
    expect(fs.existsSync(path.join(commonDir, "agentbook", "agentbook.db"))).toBe(true)

    // DB must NOT appear inside the main checkout's working tree
    expect(fs.existsSync(path.join(mainPath, "agentbook", "agentbook.db"))).toBe(false)

    // DB must NOT appear inside the secondary worktree's working tree
    expect(fs.existsSync(path.join(worktreePath, "agentbook", "agentbook.db"))).toBe(false)

    // Guard against regression into the non-git fallback (.opencode) location
    expect(fs.existsSync(path.join(mainPath, ".opencode", "agentbook.db"))).toBe(false)
  })

  test("Projects are keyed by the canonical git root path", () => {
    const { mainPath, worktreePath, commonDir } = initGitRepoWithWorktree({ branch: "wt-project-canonical" })
    tmpdirs.push(mainPath, worktreePath)

    const nestedPath = path.join(worktreePath, "nested", "dir")
    fs.mkdirSync(nestedPath, { recursive: true })

    const createResult = runCli(
      ["plan", "create", "--title", "Canonical project plan", "--name", "canonical-project"],
      { cwd: nestedPath, env: { AGENTBOOK_DB: undefined } },
    )
    expect(createResult.exitCode).toBe(0)

    const db = new Database(path.join(commonDir, "agentbook", "agentbook.db"))
    try {
      const projects = db.query(`SELECT * FROM project ORDER BY created_at`).all() as Array<Record<string, unknown>>
      expect(projects).toHaveLength(1)
      expect(projects[0].path).toBe(path.resolve(worktreePath))
      expect(projects[0].name).toBe(path.basename(worktreePath))
    } finally {
      db.close()
    }
  })

  test("Plans and tasks stay scoped to their project", () => {
    const { mainPath, worktreePath, commonDir } = initGitRepoWithWorktree({ branch: "wt-project-scope" })
    tmpdirs.push(mainPath, worktreePath)

    const mainPlanResult = runCli(
      ["plan", "create", "--title", "Main scoped plan", "--name", "main-scoped"],
      { cwd: mainPath, env: { AGENTBOOK_DB: undefined } },
    )
    const wtPlanResult = runCli(
      ["plan", "create", "--title", "Worktree scoped plan", "--name", "worktree-scoped"],
      { cwd: worktreePath, env: { AGENTBOOK_DB: undefined } },
    )
    expect(mainPlanResult.exitCode).toBe(0)
    expect(wtPlanResult.exitCode).toBe(0)

    const mainPlan = json<Record<string, unknown>>(mainPlanResult.stdout)
    const wtPlan = json<Record<string, unknown>>(wtPlanResult.stdout)

    const mainTaskResult = runCli(
      ["task", "create", "--plan", String(mainPlan.id), "--title", "Main scoped task"],
      { cwd: mainPath, env: { AGENTBOOK_DB: undefined } },
    )
    const wtTaskResult = runCli(
      ["task", "create", "--plan", String(wtPlan.id), "--title", "Worktree scoped task"],
      { cwd: worktreePath, env: { AGENTBOOK_DB: undefined } },
    )
    expect(mainTaskResult.exitCode).toBe(0)
    expect(wtTaskResult.exitCode).toBe(0)

    const mainPlans = json<Array<Record<string, unknown>>>(runCli(["plan", "list"], { cwd: mainPath, env: { AGENTBOOK_DB: undefined } }).stdout)
    const wtPlans = json<Array<Record<string, unknown>>>(runCli(["plan", "list"], { cwd: worktreePath, env: { AGENTBOOK_DB: undefined } }).stdout)
    const mainTasks = json<Array<Record<string, unknown>>>(runCli(["task", "list"], { cwd: mainPath, env: { AGENTBOOK_DB: undefined } }).stdout)
    const wtTasks = json<Array<Record<string, unknown>>>(runCli(["task", "list"], { cwd: worktreePath, env: { AGENTBOOK_DB: undefined } }).stdout)

    expect(mainPlans.map((plan) => plan.id)).toEqual([mainPlan.id])
    expect(wtPlans.map((plan) => plan.id)).toEqual([wtPlan.id])
    expect(mainTasks.map((task) => task.plan_id)).toEqual([mainPlan.id])
    expect(wtTasks.map((task) => task.plan_id)).toEqual([wtPlan.id])

    const db = new Database(path.join(commonDir, "agentbook", "agentbook.db"))
    try {
      const projectRows = db.query(`SELECT * FROM project ORDER BY path`).all() as Array<Record<string, unknown>>
      expect(projectRows).toHaveLength(2)

      const planRows = db.query(`SELECT plan.id, plan.project_id, project.path FROM plan JOIN project ON project.id = plan.project_id ORDER BY plan.created_at`).all() as Array<Record<string, unknown>>
      expect(planRows).toHaveLength(2)
      expect(new Set(planRows.map((row) => row.project_id as string)).size).toBe(2)

      const taskRows = db.query(`SELECT task.id, plan.project_id FROM task JOIN plan ON plan.id = task.plan_id ORDER BY task.created_at`).all() as Array<Record<string, unknown>>
      expect(taskRows).toHaveLength(2)
      expect(new Set(taskRows.map((row) => row.project_id as string)).size).toBe(2)
    } finally {
      db.close()
    }
  })
})
