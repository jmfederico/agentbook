import fs from "fs"
import os from "os"
import path from "path"
import { execSync } from "child_process"
import { Database } from "bun:sqlite"

export const REPO_ROOT = path.join(import.meta.dirname, "..")

/**
 * Creates an isolated temporary directory under os.tmpdir().
 * Cleanup is implicit at process exit; tests may also rm -rf in afterEach.
 */
export function freshTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "agentbook-test-"))
}

export interface RunResult {
  exitCode: number
  stdout: string
  stderr: string
}

/**
 * Spawns `bun src/cli.ts ...args` synchronously.
 * Sets AGENTBOOK_DB=opts.dbPath when provided.
 * opts.cwd defaults to the repo root.
 * opts.env is merged last so callers can override any env var.
 */
export function runCli(
  args: string[],
  opts: { dbPath?: string; cwd?: string; env?: Record<string, string | undefined> } = {},
): RunResult {
  const cwd = opts.cwd ?? REPO_ROOT

  // Build a clean env from process.env (strip undefined values)
  const processEnv: Record<string, string> = {}
  for (const [k, v] of Object.entries(process.env)) {
    if (v !== undefined) processEnv[k] = v
  }

  const env: Record<string, string> = {
    ...processEnv,
    ...(opts.dbPath != null ? { AGENTBOOK_DB: opts.dbPath } : {}),
  }

  // Apply opts.env overrides; undefined values delete the key (e.g. unset AGENTBOOK_DB)
  if (opts.env) {
    for (const [k, v] of Object.entries(opts.env)) {
      if (v === undefined) {
        delete env[k]
      } else {
        env[k] = v
      }
    }
  }

  const result = Bun.spawnSync(["bun", path.join(REPO_ROOT, "src/cli.ts"), ...args], {
    cwd,
    env,
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  })

  return {
    exitCode: result.exitCode ?? 1,
    stdout: result.stdout.toString(),
    stderr: result.stderr.toString(),
  }
}

/**
 * JSON.parse with a helpful error message on failure.
 */
export function json<T = unknown>(stdout: string): T {
  try {
    return JSON.parse(stdout) as T
  } catch (err) {
    throw new Error(`Failed to parse CLI stdout as JSON:\n${stdout}\n\nUnderlying error: ${err}`)
  }
}

export type Era = "era0" | "era1"

/**
 * Opens the SQLite file at dbPath and creates tables matching the requested
 * historical era. SQL is copied from the historical shape of migrate() at
 * cli.ts:56-93. Each era is self-contained so test files stay focused on
 * assertions.
 *
 * Era 0 — pre-name, pre-document, pre-spec.
 *   Plan table as originally defined: id, title, description, status,
 *   created_by, timestamps. No name, document, or spec columns.
 *
 * Era 1 — has document, no spec.
 *   The shape right before the spec refactor: adds name and document to the
 *   plan table; still no spec column.
 *
 * The task table is unchanged since inception and is created in both eras.
 */
export function writeOldSchema(dbPath: string, era: Era): void {
  const dir = path.dirname(dbPath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

  const db = new Database(dbPath)
  try {
    db.run("PRAGMA journal_mode=WAL")
    db.run("PRAGMA foreign_keys=ON")

    if (era === "era0") {
      // Era 0: plan table WITHOUT name, document, or spec
      db.run(`CREATE TABLE IF NOT EXISTS plan (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        status TEXT NOT NULL DEFAULT 'draft',
        created_by TEXT DEFAULT '',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`)
    } else {
      // Era 1: plan table WITH name + document, but WITHOUT spec
      db.run(`CREATE TABLE IF NOT EXISTS plan (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL DEFAULT '',
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        status TEXT NOT NULL DEFAULT 'draft',
        created_by TEXT DEFAULT '',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        document TEXT DEFAULT ''
      )`)
    }

    // Task table is unchanged since inception — present in both eras
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
  } finally {
    db.close()
  }
}

/**
 * Runs `git init` in dirPath. Used by the legacy-location migration test.
 * Requires git on PATH.
 */
export function initTempGitRepo(dirPath: string): void {
  execSync("git init", { cwd: dirPath, stdio: "pipe" })
}

export interface WorktreeFixture {
  mainPath: string      // main checkout working tree
  worktreePath: string  // secondary worktree working tree
  commonDir: string     // resolved absolute path to git common dir (i.e. <main>/.git)
}

/**
 * Creates an isolated git repo with an initial commit and a second worktree.
 * Returns { mainPath, worktreePath, commonDir } where commonDir is resolved
 * via `git rev-parse --git-common-dir` — the same mechanism used by resolveDbPath
 * in cli.ts.
 *
 * Requires git on PATH.
 */
export function initGitRepoWithWorktree(opts?: { branch?: string }): WorktreeFixture {
  const mainPath = freshTmpDir()

  execSync("git init", { cwd: mainPath, stdio: "pipe" })
  // An initial commit is required before `git worktree add` will succeed.
  execSync("git commit --allow-empty -m init", { cwd: mainPath, stdio: "pipe" })

  const worktreePath = path.join(freshTmpDir(), "wt")
  const branch = opts?.branch ?? "wt-branch"
  execSync(`git worktree add ${worktreePath} -b ${branch}`, { cwd: mainPath, stdio: "pipe" })

  const gitCommonDirRaw = execSync("git rev-parse --git-common-dir", {
    cwd: mainPath,
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
  }).trim()
  const commonDir = path.resolve(mainPath, gitCommonDirRaw)

  return { mainPath, worktreePath, commonDir }
}
