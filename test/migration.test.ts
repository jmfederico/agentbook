import { describe, test, expect, afterEach } from "bun:test"
import { Database } from "bun:sqlite"
import { execSync } from "child_process"
import path from "path"
import fs from "fs"
import { freshTmpDir, runCli, json, writeOldSchema, initTempGitRepo } from "./helpers"

describe("Layer B: schema migration", () => {
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

  test("Era 1 → current: spec column added, document preserved byte-for-byte", () => {
    const tmpdir = freshTmpDir()
    tmpdirs.push(tmpdir)
    const dbPath = path.join(tmpdir, "agentbook.db")

    writeOldSchema(dbPath, "era1")

    const planId = "018fae10-0000-7000-0001-000000000001"
    const ts = Date.now()
    const doc = "Important document — preserved byte-for-byte: special chars & unicode \u00e9\u4e2d\u6587."

    const db = new Database(dbPath)
    db.run(
      `INSERT INTO plan (id, name, title, description, status, created_by, created_at, updated_at, document)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [planId, "era1-plan", "Era 1 Plan", "some desc", "draft", "tester", ts, ts, doc],
    )
    db.close()

    const { exitCode, stdout } = runCli(["plan", "get", planId], { dbPath })
    expect(exitCode).toBe(0)

    const plan = json<Record<string, unknown>>(stdout)
    expect(plan.id).toBe(planId)
    // spec column was absent in era1; migrate() adds it with DEFAULT ''
    expect(plan.spec).toBe("")
    // document must be preserved exactly
    expect(plan.document).toBe(doc)
    expect(plan.name).toBe("era1-plan")
    expect(plan.title).toBe("Era 1 Plan")
    expect(plan.description).toBe("some desc")
    expect(plan.status).toBe("draft")
    expect(plan.created_by).toBe("tester")
  })

  test("Era 0 → current: name/document/spec added with defaults, original rows intact", () => {
    const tmpdir = freshTmpDir()
    tmpdirs.push(tmpdir)
    const dbPath = path.join(tmpdir, "agentbook.db")

    writeOldSchema(dbPath, "era0")

    const planId = "018fae10-0000-7000-0002-000000000001"
    const taskId = "018fae10-0000-7000-0002-000000000002"
    const ts = Date.now()

    const db = new Database(dbPath)
    db.run(
      `INSERT INTO plan (id, title, description, status, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [planId, "Era 0 Plan", "era0 description", "active", "founder", ts, ts],
    )
    db.run(
      `INSERT INTO task (id, plan_id, title, description, status, priority, position,
         assignee, worktree_dir, session_id, depends_on, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [taskId, planId, "Do the thing", "task desc", "pending", 1, 0, "", "", "", "", "", ts, ts],
    )
    db.close()

    // plan get triggers migrate()
    const planResult = runCli(["plan", "get", planId], { dbPath })
    expect(planResult.exitCode).toBe(0)
    const plan = json<Record<string, unknown>>(planResult.stdout)

    expect(plan.id).toBe(planId)
    expect(plan.title).toBe("Era 0 Plan")
    // migrate() runs: ALTER TABLE ADD COLUMN name DEFAULT '', then UPDATE SET name = title WHERE name = ''
    expect(plan.name).toBe("Era 0 Plan")
    expect(plan.document).toBe("")
    expect(plan.spec).toBe("")
    expect(plan.description).toBe("era0 description")
    expect(plan.status).toBe("active")
    expect(plan.created_by).toBe("founder")

    // task survives migration intact
    const taskResult = runCli(["task", "list", "--plan", planId], { dbPath })
    expect(taskResult.exitCode).toBe(0)
    const tasks = json<Array<Record<string, unknown>>>(taskResult.stdout)
    expect(tasks).toHaveLength(1)
    const task = tasks[0]
    expect(task.id).toBe(taskId)
    expect(task.title).toBe("Do the thing")
    expect(task.description).toBe("task desc")
    expect(task.status).toBe("pending")
    expect(task.priority).toBe(1)
    expect(task.position).toBe(0)
  })

  test("Legacy-location migration: DB copied to git-common-dir, seeded row readable", () => {
    const tmpdir = freshTmpDir()
    tmpdirs.push(tmpdir)

    initTempGitRepo(tmpdir)

    // Resolve where the CLI will place the shared DB
    const gitCommonDirRaw = execSync("git rev-parse --git-common-dir", {
      cwd: tmpdir,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim()
    const gitCommonDir = path.resolve(tmpdir, gitCommonDirRaw)
    const sharedDb = path.join(gitCommonDir, "agentbook", "agentbook.db")

    // Seed the legacy DB at .opencode/agentbook.db
    const legacyDbPath = path.join(tmpdir, ".opencode", "agentbook.db")
    writeOldSchema(legacyDbPath, "era1")

    const planId = "018fae10-0000-7000-0003-000000000001"
    const ts = Date.now()
    const doc = "Legacy plan document content."

    const legacyDb = new Database(legacyDbPath)
    legacyDb.run(
      `INSERT INTO plan (id, name, title, description, status, created_by, created_at, updated_at, document)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [planId, "legacy-plan", "Legacy Plan", "", "active", "", ts, ts, doc],
    )
    legacyDb.close()

    // Invoke CLI with cwd=tmpdir; explicitly unset AGENTBOOK_DB so git-based discovery runs
    const result = runCli(["plan", "get", planId], {
      cwd: tmpdir,
      env: { AGENTBOOK_DB: undefined },
    })
    expect(result.exitCode).toBe(0)

    // DB was copied from legacy location to shared location
    expect(fs.existsSync(sharedDb)).toBe(true)

    // Seeded row is readable; migrate() also ran (spec column added)
    const plan = json<Record<string, unknown>>(result.stdout)
    expect(plan.id).toBe(planId)
    expect(plan.name).toBe("legacy-plan")
    expect(plan.title).toBe("Legacy Plan")
    expect(plan.document).toBe(doc)
    expect(plan.spec).toBe("")
    expect(plan.status).toBe("active")
  })
})
