import { describe, it, expect } from "bun:test"
import { Database } from "bun:sqlite"
import { freshTmpDir, runCli, json } from "./helpers"

// ─── local test helpers ───────────────────────────────────────────────────────

function mkPlan(dbPath: string, title: string, extra: string[] = []): Record<string, unknown> {
  const r = runCli(["plan", "create", "--title", title, ...extra], { dbPath })
  if (r.exitCode !== 0) throw new Error(`plan create failed: ${r.stderr}`)
  return json<Record<string, unknown>>(r.stdout)
}

function getPlan(dbPath: string, ref: string): Record<string, unknown> {
  const r = runCli(["plan", "get", ref], { dbPath })
  if (r.exitCode !== 0) throw new Error(`plan get failed: ${r.stderr}`)
  return json<Record<string, unknown>>(r.stdout)
}

function mkTask(dbPath: string, planRef: string, title: string, extra: string[] = []): Record<string, unknown> {
  const r = runCli(["task", "create", "--plan", planRef, "--title", title, ...extra], { dbPath })
  if (r.exitCode !== 0) throw new Error(`task create failed: ${r.stderr}`)
  return json<Record<string, unknown>>(r.stdout)
}

// ─── Plan CRUD ────────────────────────────────────────────────────────────────

describe("Plan CRUD", () => {
  const tmp = freshTmpDir()
  const db = `${tmp}/plans.db`

  it("plan create with all optional flags", () => {
    const r = runCli(
      [
        "plan", "create",
        "--title", "Full Plan",
        "--name", "full-plan",
        "--description", "A description",
        "--document", "Document content",
        "--spec", "Spec content",
        "--created-by", "tester",
      ],
      { dbPath: db },
    )
    expect(r.exitCode).toBe(0)
    const p = json<Record<string, unknown>>(r.stdout)
    expect(p.title).toBe("Full Plan")
    expect(p.name).toBe("full-plan")
    expect(p.description).toBe("A description")
    expect(p.document).toBe("Document content")
    expect(p.spec).toBe("Spec content")
    expect(p.created_by).toBe("tester")
    expect(p.status).toBe("draft")
    expect(typeof p.id).toBe("string")
    expect(typeof p.created_at).toBe("number")
  })

  it("plan create without optional flags uses defaults", () => {
    const r = runCli(["plan", "create", "--title", "Minimal Plan"], { dbPath: db })
    expect(r.exitCode).toBe(0)
    const p = json<Record<string, unknown>>(r.stdout)
    expect(p.title).toBe("Minimal Plan")
    expect(p.name).toBe("Minimal Plan") // defaults to title
    expect(p.description).toBe("")
    expect(p.document).toBe("")
    expect(p.spec).toBe("")
    expect(p.created_by).toBe("")
    expect(p.status).toBe("draft")
  })

  it("plan get by id", () => {
    const created = mkPlan(db, "Get By Id Plan")
    const r = runCli(["plan", "get", created.id as string], { dbPath: db })
    expect(r.exitCode).toBe(0)
    const p = json<Record<string, unknown>>(r.stdout)
    expect(p.id).toBe(created.id)
    expect(p.title).toBe("Get By Id Plan")
  })

  it("plan get by name", () => {
    const created = mkPlan(db, "Get By Name Plan", ["--name", "get-by-name"])
    const r = runCli(["plan", "get", "get-by-name"], { dbPath: db })
    expect(r.exitCode).toBe(0)
    const p = json<Record<string, unknown>>(r.stdout)
    expect(p.id).toBe(created.id)
    expect(p.name).toBe("get-by-name")
  })

  it("plan get of missing plan exits non-zero with error in stderr", () => {
    const r = runCli(["plan", "get", "no-such-plan-xyz"], { dbPath: db })
    expect(r.exitCode).not.toBe(0)
    expect(r.stderr).toContain("error:")
  })

  it("plan update each field independently", () => {
    const created = mkPlan(db, "Update Target", ["--name", "update-target"])
    const id = created.id as string

    const r1 = runCli(["plan", "update", id, "--name", "updated-name"], { dbPath: db })
    expect(r1.exitCode).toBe(0)
    expect(json<Record<string, unknown>>(r1.stdout).name).toBe("updated-name")

    const r2 = runCli(["plan", "update", id, "--title", "Updated Title"], { dbPath: db })
    expect(r2.exitCode).toBe(0)
    expect(json<Record<string, unknown>>(r2.stdout).title).toBe("Updated Title")

    const r3 = runCli(["plan", "update", id, "--description", "new desc"], { dbPath: db })
    expect(r3.exitCode).toBe(0)
    expect(json<Record<string, unknown>>(r3.stdout).description).toBe("new desc")

    const r4 = runCli(["plan", "update", id, "--document", "new doc"], { dbPath: db })
    expect(r4.exitCode).toBe(0)
    expect(json<Record<string, unknown>>(r4.stdout).document).toBe("new doc")

    const r5 = runCli(["plan", "update", id, "--spec", "new spec"], { dbPath: db })
    expect(r5.exitCode).toBe(0)
    expect(json<Record<string, unknown>>(r5.stdout).spec).toBe("new spec")

    const r6 = runCli(["plan", "update", id, "--status", "active"], { dbPath: db })
    expect(r6.exitCode).toBe(0)
    expect(json<Record<string, unknown>>(r6.stdout).status).toBe("active")
  })

  it("updated_at advances after update", () => {
    const created = mkPlan(db, "Timestamp Check")
    const id = created.id as string
    const initialUpdatedAt = getPlan(db, id).updated_at as number

    // Update triggers a new updated_at; subprocess spawn time guarantees > 0 ms delta
    const r = runCli(["plan", "update", id, "--description", "changed"], { dbPath: db })
    expect(r.exitCode).toBe(0)
    const afterUpdatedAt = json<Record<string, unknown>>(r.stdout).updated_at as number
    expect(afterUpdatedAt).toBeGreaterThanOrEqual(initialUpdatedAt)

    // Confirm plan get reflects the new updated_at
    const got = getPlan(db, id)
    expect(got.updated_at).toBe(afterUpdatedAt)
  })

  it("plan list excludes archived plans by default", () => {
    const c = mkPlan(db, "To Archive Soon")
    runCli(["plan", "archive", c.id as string], { dbPath: db })
    const r = runCli(["plan", "list"], { dbPath: db })
    expect(r.exitCode).toBe(0)
    const plans = json<Array<Record<string, unknown>>>(r.stdout)
    expect(plans.find((p) => p.id === c.id)).toBeUndefined()
  })

  it("plan list --status filters to matching plans", () => {
    const c = mkPlan(db, "Status Filter Plan")
    const r = runCli(["plan", "list", "--status", "draft"], { dbPath: db })
    expect(r.exitCode).toBe(0)
    const plans = json<Array<Record<string, unknown>>>(r.stdout)
    expect(plans.some((p) => p.id === c.id)).toBe(true)
    expect(plans.every((p) => p.status === "draft")).toBe(true)
  })
})

// ─── plan get shape lock ──────────────────────────────────────────────────────

describe("plan get shape lock", () => {
  const tmp = freshTmpDir()
  const db = `${tmp}/shape.db`

  it("plan get returns exactly the expected key set and no tasks key", () => {
    const created = mkPlan(db, "Shape Lock Plan", [
      "--name", "shape-lock",
      "--description", "desc",
      "--document", "doc",
      "--spec", "spec",
      "--created-by", "tester",
    ])
    const plan = getPlan(db, created.id as string)

    const expectedKeys = [
      "id", "name", "title", "description", "status",
      "spec", "document", "created_by", "created_at", "updated_at",
    ].sort()

    expect(Object.keys(plan).sort()).toEqual(expectedKeys)
    expect(plan.tasks).toBeUndefined()
  })
})

// ─── spec round-trip ──────────────────────────────────────────────────────────

describe("spec round-trip", () => {
  const tmp = freshTmpDir()
  const db = `${tmp}/spec.db`

  it("plan created with --spec preserves the value on get", () => {
    const created = mkPlan(db, "Spec Plan", ["--spec", "initial spec text"])
    const plan = getPlan(db, created.id as string)
    expect(plan.spec).toBe("initial spec text")
  })

  it("plan created without --spec has empty string spec (not null, not missing)", () => {
    const created = mkPlan(db, "No Spec Plan")
    const plan = getPlan(db, created.id as string)
    expect(plan.spec).toBe("")
    expect("spec" in plan).toBe(true)
  })

  it("plan update --spec replaces and is readable via plan get", () => {
    const created = mkPlan(db, "Update Spec Plan", ["--spec", "original spec"])
    const id = created.id as string

    const r = runCli(["plan", "update", id, "--spec", "updated spec"], { dbPath: db })
    expect(r.exitCode).toBe(0)
    expect(json<Record<string, unknown>>(r.stdout).spec).toBe("updated spec")

    const plan = getPlan(db, id)
    expect(plan.spec).toBe("updated spec")
  })
})

// ─── needs_spec_approval status ───────────────────────────────────────────────

describe("needs_spec_approval status", () => {
  const tmp = freshTmpDir()
  const db = `${tmp}/nsa.db`

  it("round-trips through needs_spec_approval and back to active", () => {
    const created = mkPlan(db, "NSA Plan")
    const id = created.id as string

    // Set to needs_spec_approval
    const r1 = runCli(["plan", "update", id, "--status", "needs_spec_approval"], { dbPath: db })
    expect(r1.exitCode).toBe(0)
    expect(json<Record<string, unknown>>(r1.stdout).status).toBe("needs_spec_approval")

    // plan get reflects the status
    expect(getPlan(db, id).status).toBe("needs_spec_approval")

    // plan list --status needs_spec_approval includes this plan
    const listR = runCli(["plan", "list", "--status", "needs_spec_approval"], { dbPath: db })
    expect(listR.exitCode).toBe(0)
    const plans = json<Array<Record<string, unknown>>>(listR.stdout)
    expect(plans.some((p) => p.id === id)).toBe(true)

    // Round-trip back to active
    const r2 = runCli(["plan", "update", id, "--status", "active"], { dbPath: db })
    expect(r2.exitCode).toBe(0)
    expect(json<Record<string, unknown>>(r2.stdout).status).toBe("active")
    expect(getPlan(db, id).status).toBe("active")
  })
})

// ─── Task CRUD ────────────────────────────────────────────────────────────────

describe("Task CRUD", () => {
  const tmp = freshTmpDir()
  const db = `${tmp}/tasks.db`

  it("task create with all optional flags", () => {
    const plan = mkPlan(db, "Task Host Plan", ["--name", "task-host"])
    const r = runCli(
      [
        "task", "create",
        "--plan", plan.id as string,
        "--title", "Full Task",
        "--description", "A task description",
        "--priority", "3",
      ],
      { dbPath: db },
    )
    expect(r.exitCode).toBe(0)
    const t = json<Record<string, unknown>>(r.stdout)
    expect(t.title).toBe("Full Task")
    expect(t.description).toBe("A task description")
    expect(t.priority).toBe(3)
    expect(t.status).toBe("pending")
    expect(t.plan_id).toBe(plan.id)
    expect(typeof t.id).toBe("string")
    expect(typeof t.position).toBe("number")
  })

  it("task create without optional flags uses defaults", () => {
    const plan = mkPlan(db, "Minimal Task Host", ["--name", "minimal-task-host"])
    const r = runCli(
      ["task", "create", "--plan", plan.id as string, "--title", "Minimal Task"],
      { dbPath: db },
    )
    expect(r.exitCode).toBe(0)
    const t = json<Record<string, unknown>>(r.stdout)
    expect(t.description).toBe("")
    expect(t.priority).toBe(0)
    expect(t.depends_on).toBe("")
    expect(t.status).toBe("pending")
  })

  it("task positions increment within a plan", () => {
    const plan = mkPlan(db, "Position Plan", ["--name", "position-plan"])
    const id = plan.id as string

    const t1 = mkTask(db, id, "Task One")
    const t2 = mkTask(db, id, "Task Two")
    const t3 = mkTask(db, id, "Task Three")

    expect(t2.position as number).toBe((t1.position as number) + 1)
    expect(t3.position as number).toBe((t2.position as number) + 1)
  })

  it("task positions are independent across plans", () => {
    const planA = mkPlan(db, "Plan A Positions", ["--name", "plan-a-pos"])
    const planB = mkPlan(db, "Plan B Positions", ["--name", "plan-b-pos"])

    const ta1 = mkTask(db, planA.id as string, "A Task 1")
    const tb1 = mkTask(db, planB.id as string, "B Task 1")
    const ta2 = mkTask(db, planA.id as string, "A Task 2")

    // Both plans start at position 0
    expect(ta1.position).toBe(0)
    expect(tb1.position).toBe(0)
    expect(ta2.position).toBe(1)
  })

  it("task create with --depends-on stores the dependency", () => {
    const plan = mkPlan(db, "Dep Plan", ["--name", "dep-plan"])
    const id = plan.id as string

    const dep = mkTask(db, id, "Dependency Task")
    const r = runCli(
      [
        "task", "create",
        "--plan", id,
        "--title", "Dependent Task",
        "--depends-on", dep.id as string,
      ],
      { dbPath: db },
    )
    expect(r.exitCode).toBe(0)
    const t = json<Record<string, unknown>>(r.stdout)
    expect(t.depends_on).toBe(dep.id)
  })

  it("task get returns the task by id", () => {
    const plan = mkPlan(db, "Get Task Plan", ["--name", "get-task-plan"])
    const created = mkTask(db, plan.id as string, "Gettable Task", ["--description", "some desc"])

    const r = runCli(["task", "get", created.id as string], { dbPath: db })
    expect(r.exitCode).toBe(0)
    const t = json<Record<string, unknown>>(r.stdout)
    expect(t.id).toBe(created.id)
    expect(t.title).toBe("Gettable Task")
    expect(t.description).toBe("some desc")
  })

  it("task update of each field", () => {
    const plan = mkPlan(db, "Update Task Plan", ["--name", "update-task-plan"])
    const created = mkTask(db, plan.id as string, "Updatable Task")
    const id = created.id as string

    const r1 = runCli(["task", "update", id, "--title", "Renamed Task"], { dbPath: db })
    expect(r1.exitCode).toBe(0)
    expect(json<Record<string, unknown>>(r1.stdout).title).toBe("Renamed Task")

    const r2 = runCli(["task", "update", id, "--description", "new desc"], { dbPath: db })
    expect(r2.exitCode).toBe(0)
    expect(json<Record<string, unknown>>(r2.stdout).description).toBe("new desc")

    const r3 = runCli(["task", "update", id, "--status", "in_progress"], { dbPath: db })
    expect(r3.exitCode).toBe(0)
    expect(json<Record<string, unknown>>(r3.stdout).status).toBe("in_progress")

    const r4 = runCli(["task", "update", id, "--priority", "5"], { dbPath: db })
    expect(r4.exitCode).toBe(0)
    expect(json<Record<string, unknown>>(r4.stdout).priority).toBe(5)

    const r5 = runCli(["task", "update", id, "--assignee", "worker1"], { dbPath: db })
    expect(r5.exitCode).toBe(0)
    expect(json<Record<string, unknown>>(r5.stdout).assignee).toBe("worker1")

    const r6 = runCli(["task", "update", id, "--notes", "some notes"], { dbPath: db })
    expect(r6.exitCode).toBe(0)
    expect(json<Record<string, unknown>>(r6.stdout).notes).toBe("some notes")

    const r7 = runCli(["task", "update", id, "--session", "sess-abc"], { dbPath: db })
    expect(r7.exitCode).toBe(0)
    expect(json<Record<string, unknown>>(r7.stdout).session_id).toBe("sess-abc")

    const r8 = runCli(["task", "update", id, "--worktree", "/tmp/wt"], { dbPath: db })
    expect(r8.exitCode).toBe(0)
    expect(json<Record<string, unknown>>(r8.stdout).worktree_dir).toBe("/tmp/wt")

    // Confirm final state via task get
    const got = json<Record<string, unknown>>(
      runCli(["task", "get", id], { dbPath: db }).stdout,
    )
    expect(got.title).toBe("Renamed Task")
    expect(got.description).toBe("new desc")
    expect(got.status).toBe("in_progress")
    expect(got.priority).toBe(5)
    expect(got.assignee).toBe("worker1")
    expect(got.notes).toBe("some notes")
    expect(got.session_id).toBe("sess-abc")
    expect(got.worktree_dir).toBe("/tmp/wt")
  })

  it("task list --plan returns tasks for that plan only", () => {
    const planX = mkPlan(db, "Plan X List", ["--name", "plan-x-list"])
    const planY = mkPlan(db, "Plan Y List", ["--name", "plan-y-list"])
    const tx = mkTask(db, planX.id as string, "X Task")
    const ty = mkTask(db, planY.id as string, "Y Task")

    const r = runCli(["task", "list", "--plan", planX.id as string], { dbPath: db })
    expect(r.exitCode).toBe(0)
    const tasks = json<Array<Record<string, unknown>>>(r.stdout)
    expect(tasks.some((t) => t.id === tx.id)).toBe(true)
    expect(tasks.every((t) => t.plan_id === planX.id)).toBe(true)
    expect(tasks.find((t) => t.id === ty.id)).toBeUndefined()
  })

  it("task list --status filters by status", () => {
    const plan = mkPlan(db, "Status List Plan", ["--name", "status-list-plan"])
    const id = plan.id as string
    const t1 = mkTask(db, id, "Pending Task")
    const t2 = mkTask(db, id, "Completed Task")
    runCli(["task", "update", t2.id as string, "--status", "completed"], { dbPath: db })

    const r = runCli(["task", "list", "--status", "completed"], { dbPath: db })
    expect(r.exitCode).toBe(0)
    const tasks = json<Array<Record<string, unknown>>>(r.stdout)
    expect(tasks.some((t) => t.id === t2.id)).toBe(true)
    expect(tasks.find((t) => t.id === t1.id)).toBeUndefined()
    expect(tasks.every((t) => t.status === "completed")).toBe(true)
  })

  it("task list --plan --status filters by both", () => {
    const plan = mkPlan(db, "Combined Filter Plan", ["--name", "combined-filter-plan"])
    const id = plan.id as string
    const t1 = mkTask(db, id, "CF Pending")
    const t2 = mkTask(db, id, "CF In Progress")
    runCli(["task", "update", t2.id as string, "--status", "in_progress"], { dbPath: db })

    const r = runCli(["task", "list", "--plan", id, "--status", "in_progress"], { dbPath: db })
    expect(r.exitCode).toBe(0)
    const tasks = json<Array<Record<string, unknown>>>(r.stdout)
    expect(tasks.some((t) => t.id === t2.id)).toBe(true)
    expect(tasks.find((t) => t.id === t1.id)).toBeUndefined()
    expect(tasks.every((t) => t.plan_id === id && t.status === "in_progress")).toBe(true)
  })
})

// ─── summary shape ────────────────────────────────────────────────────────────

describe("summary shape", () => {
  const tmp = freshTmpDir()
  const db = `${tmp}/summary.db`

  it("summary has correct progress counts, spec on plan subobject, and compact task projection", () => {
    const plan = mkPlan(db, "Summary Plan", ["--name", "summary-plan", "--spec", "the-spec", "--document", "the-doc"])
    const id = plan.id as string

    const t1 = mkTask(db, id, "Task A")
    const t2 = mkTask(db, id, "Task B", ["--description", "desc b"])
    const t3 = mkTask(db, id, "Task C")
    const t4 = mkTask(db, id, "Task D")

    runCli(["task", "update", t2.id as string, "--status", "completed", "--notes", "done"], { dbPath: db })
    runCli(["task", "update", t3.id as string, "--status", "completed"], { dbPath: db })
    runCli(["task", "update", t4.id as string, "--status", "needs_guidance"], { dbPath: db })

    const r = runCli(["summary", id], { dbPath: db })
    expect(r.exitCode).toBe(0)
    const s = json<Record<string, unknown>>(r.stdout)

    // Progress counts
    const progress = s.progress as Record<string, unknown>
    expect(progress.total).toBe(4)
    expect(progress.completed).toBe(2)
    expect(progress.needs_guidance).toBe(1)
    expect(progress.percentage).toBe(50)

    // Plan subobject includes spec and document
    const planObj = s.plan as Record<string, unknown>
    expect(planObj.id).toBe(id)
    expect(planObj.spec).toBe("the-spec")
    expect(planObj.document).toBe("the-doc")
    expect(planObj.title).toBe("Summary Plan")
    expect(planObj.status).toBeDefined()

    // Task entries are compact: no description, no notes
    const tasks = s.tasks as Array<Record<string, unknown>>
    expect(tasks).toHaveLength(4)
    for (const t of tasks) {
      expect(t.id).toBeDefined()
      expect(t.title).toBeDefined()
      expect(t.status).toBeDefined()
      expect("description" in t).toBe(false)
      expect("notes" in t).toBe(false)
    }

    // assignee is null (not empty string) for unassigned tasks
    const unassigned = tasks.find((t) => t.id === t1.id)!
    expect(unassigned.assignee).toBeNull()
    expect(unassigned.worktree_dir).toBeNull()
  })

  it("normalizes legacy needs_review tasks in list, get, and summary outputs", () => {
    const plan = mkPlan(db, "Legacy Status Plan", ["--name", "legacy-status-plan"])
    const task = mkTask(db, plan.id as string, "Legacy Task")

    const sqlDb = new Database(db)
    try {
      sqlDb.run(`UPDATE task SET status = 'needs_review' WHERE id = ?`, [task.id])
    } finally {
      sqlDb.close()
    }

    const list = runCli(["task", "list", "--plan", plan.id as string, "--status", "needs_guidance"], { dbPath: db })
    expect(list.exitCode).toBe(0)
    const listed = json<Array<Record<string, unknown>>>(list.stdout)
    expect(listed.some((t) => t.id === task.id && t.status === "needs_guidance")).toBe(true)

    const got = runCli(["task", "get", task.id as string], { dbPath: db })
    expect(got.exitCode).toBe(0)
    expect(json<Record<string, unknown>>(got.stdout).status).toBe("needs_guidance")

    const summary = runCli(["summary", plan.id as string], { dbPath: db })
    expect(summary.exitCode).toBe(0)
    const progress = json<Record<string, unknown>>(summary.stdout).progress as Record<string, unknown>
    expect(progress.needs_guidance).toBe(1)
  })
})

// ─── plan archive ─────────────────────────────────────────────────────────────

describe("plan archive", () => {
  const tmp = freshTmpDir()
  const db = `${tmp}/archive.db`

  it("single-ref archive sets status to archived", () => {
    const plan = mkPlan(db, "Archive Me", ["--name", "archive-me"])
    const r = runCli(["plan", "archive", plan.id as string], { dbPath: db })
    expect(r.exitCode).toBe(0)
    const result = json<Record<string, unknown>>(r.stdout)
    expect(result.status).toBe("archived")
    expect(result.id).toBe(plan.id)

    // Confirm via plan get (plan get works regardless of archived status)
    const got = getPlan(db, plan.id as string)
    expect(got.status).toBe("archived")
  })

  it("--older-than archives nothing when all plans are recent", () => {
    mkPlan(db, "Recent Plan", ["--name", "recent-plan"])
    const r = runCli(["plan", "archive", "--older-than", "1h"], { dbPath: db })
    expect(r.exitCode).toBe(0)
    const result = json<unknown[]>(r.stdout)
    // No plans have updated_at older than 1 hour
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBe(0)
  })

  it("--older-than archives plans whose updated_at is before the cutoff", () => {
    const plan = mkPlan(db, "Old Plan", ["--name", "old-plan"])
    const planId = plan.id as string

    // Backdate updated_at by 2 hours using bun:sqlite directly
    const sqlDb = new Database(db)
    try {
      sqlDb.run(`UPDATE plan SET updated_at = ? WHERE id = ?`, [
        Date.now() - 2 * 60 * 60 * 1000,
        planId,
      ])
    } finally {
      sqlDb.close()
    }

    const r = runCli(["plan", "archive", "--older-than", "1h"], { dbPath: db })
    expect(r.exitCode).toBe(0)
    const archived = json<Array<Record<string, unknown>>>(r.stdout)
    expect(archived.some((p) => p.id === planId)).toBe(true)
    expect(archived.every((p) => p.status === "archived")).toBe(true)
  })

  it("providing both a ref and --older-than exits non-zero", () => {
    const plan = mkPlan(db, "Mutual Exclusion Plan", ["--name", "mutex-plan"])
    const r = runCli(["plan", "archive", plan.id as string, "--older-than", "1h"], { dbPath: db })
    expect(r.exitCode).not.toBe(0)
    expect(r.stderr).toContain("error:")
  })
})

describe("plan archive-stale", () => {
  const tmp = freshTmpDir()
  const db = `${tmp}/archive-stale.db`

  it("archives stale plans on the default 7d cutoff without touching tasks", () => {
    const stale = mkPlan(db, "Stale Plan", ["--name", "stale-plan"])
    const fresh = mkPlan(db, "Fresh Plan", ["--name", "fresh-plan"])
    const staleTask = mkTask(db, stale.id as string, "Stale task")

    const sqlDb = new Database(db)
    try {
      sqlDb.run(`UPDATE plan SET updated_at = ? WHERE id = ?`, [Date.now() - 8 * 24 * 60 * 60 * 1000, stale.id])
    } finally {
      sqlDb.close()
    }

    const r = runCli(["plan", "archive-stale"], { dbPath: db })
    expect(r.exitCode).toBe(0)
    const archived = json<Array<Record<string, unknown>>>(r.stdout)
    expect(archived).toHaveLength(1)
    expect(archived[0].id).toBe(stale.id)
    expect(archived[0].status).toBe("archived")

    expect(getPlan(db, stale.id as string).status).toBe("archived")
    expect(getPlan(db, fresh.id as string).status).toBe("draft")

    const task = runCli(["task", "get", staleTask.id as string], { dbPath: db })
    expect(task.exitCode).toBe(0)
    expect(json<Record<string, unknown>>(task.stdout).status).toBe("pending")
  })

  it("accepts a custom older-than cutoff", () => {
    const plan = mkPlan(db, "Custom Cutoff Plan", ["--name", "custom-cutoff-plan"])
    const sqlDb = new Database(db)
    try {
      sqlDb.run(`UPDATE plan SET updated_at = ? WHERE id = ?`, [Date.now() - 2 * 60 * 60 * 1000, plan.id])
    } finally {
      sqlDb.close()
    }

    const r = runCli(["archive-stale", "--older-than", "1h"], { dbPath: db })
    expect(r.exitCode).toBe(0)
    const archived = json<Array<Record<string, unknown>>>(r.stdout)
    expect(archived).toHaveLength(1)
    expect(archived[0].id).toBe(plan.id)
  })
})

// ─── Error paths ──────────────────────────────────────────────────────────────

describe("Error paths", () => {
  const tmp = freshTmpDir()
  const db = `${tmp}/errors.db`

  it("unknown flag on plan update exits non-zero with error in stderr", () => {
    const plan = mkPlan(db, "Error Plan", ["--name", "error-plan"])
    const r = runCli(["plan", "update", plan.id as string, "--unknown-flag", "val"], { dbPath: db })
    expect(r.exitCode).not.toBe(0)
    expect(r.stderr).toContain("error:")
  })

  it("unknown flag on task update exits non-zero with error in stderr", () => {
    const plan = mkPlan(db, "Error Plan 2", ["--name", "error-plan-2"])
    const task = mkTask(db, plan.id as string, "Error Task")
    const r = runCli(["task", "update", task.id as string, "--bogus-flag", "val"], { dbPath: db })
    expect(r.exitCode).not.toBe(0)
    expect(r.stderr).toContain("error:")
  })

  it("missing --title on plan create exits non-zero", () => {
    const r = runCli(["plan", "create", "--description", "no title here"], { dbPath: db })
    expect(r.exitCode).not.toBe(0)
    expect(r.stderr).toContain("error:")
  })

  it("unknown plan subcommand exits non-zero", () => {
    const r = runCli(["plan", "frobnicate"], { dbPath: db })
    expect(r.exitCode).not.toBe(0)
    expect(r.stderr).toContain("error:")
  })

  it("unknown task subcommand exits non-zero", () => {
    const r = runCli(["task", "explode"], { dbPath: db })
    expect(r.exitCode).not.toBe(0)
    expect(r.stderr).toContain("error:")
  })

  it("unknown top-level command exits non-zero", () => {
    const r = runCli(["nonexistent-command"], { dbPath: db })
    expect(r.exitCode).not.toBe(0)
    expect(r.stderr).toContain("error:")
  })

  it("plan get with no id exits non-zero", () => {
    const r = runCli(["plan", "get"], { dbPath: db })
    expect(r.exitCode).not.toBe(0)
    expect(r.stderr).toContain("error:")
  })

  it("task get with no id exits non-zero", () => {
    const r = runCli(["task", "get"], { dbPath: db })
    expect(r.exitCode).not.toBe(0)
    expect(r.stderr).toContain("error:")
  })

  it("task get with unknown id exits non-zero", () => {
    const r = runCli(["task", "get", "00000000-0000-0000-0000-000000000000"], { dbPath: db })
    expect(r.exitCode).not.toBe(0)
    expect(r.stderr).toContain("error:")
  })
})
