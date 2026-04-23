import { describe, test, expect, afterEach } from "bun:test"
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

  test("Main → worktree: plan written from main is readable from worktree", () => {
    const { mainPath, worktreePath } = initGitRepoWithWorktree()
    tmpdirs.push(mainPath, worktreePath)

    const createResult = runCli(
      ["plan", "create", "--title", "Cross-worktree plan", "--name", "p-main"],
      { cwd: mainPath, env: { AGENTBOOK_DB: undefined } },
    )
    expect(createResult.exitCode).toBe(0)
    const created = json<Record<string, unknown>>(createResult.stdout)

    const getResult = runCli(
      ["plan", "get", "p-main"],
      { cwd: worktreePath, env: { AGENTBOOK_DB: undefined } },
    )
    expect(getResult.exitCode).toBe(0)
    const fetched = json<Record<string, unknown>>(getResult.stdout)

    expect(fetched.id).toBe(created.id)
    expect(fetched.name).toBe(created.name)
    expect(fetched.title).toBe(created.title)
  })

  test("Worktree → main: plan written from worktree is readable from main", () => {
    const { mainPath, worktreePath } = initGitRepoWithWorktree({ branch: "wt-branch-2" })
    tmpdirs.push(mainPath, worktreePath)

    const createResult = runCli(
      ["plan", "create", "--title", "Worktree-origin plan", "--name", "p-wt"],
      { cwd: worktreePath, env: { AGENTBOOK_DB: undefined } },
    )
    expect(createResult.exitCode).toBe(0)
    const created = json<Record<string, unknown>>(createResult.stdout)

    const getResult = runCli(
      ["plan", "get", "p-wt"],
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
})
