import { afterEach, describe, expect, test } from "bun:test"
import fs from "fs"
import path from "path"
import { freshTmpDir, initTempGitRepo } from "./helpers"
import { ManualProjectSourceAdapter, listProjectDiscoverySources } from "../src/project-adapters"
import { canonicalizeFsPath, projectIdForPath, resolveProjectPath, resolveProjectSource } from "../src/project-identity"

describe("project identity", () => {
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

  test("canonicalizes symlink paths before deriving project ids", () => {
    const tmpdir = freshTmpDir()
    tmpdirs.push(tmpdir)

    const realProjectPath = path.join(tmpdir, "real-project")
    const symlinkPath = path.join(tmpdir, "linked-project")
    fs.mkdirSync(realProjectPath)
    fs.symlinkSync(realProjectPath, symlinkPath)

    expect(canonicalizeFsPath(symlinkPath)).toBe(realProjectPath)
    expect(projectIdForPath(symlinkPath)).toBe(projectIdForPath(realProjectPath))
  })

  test("resolves nested git directories to the canonical worktree root", () => {
    const tmpdir = freshTmpDir()
    tmpdirs.push(tmpdir)
    initTempGitRepo(tmpdir)

    const nestedPath = path.join(tmpdir, "nested", "dir")
    fs.mkdirSync(nestedPath, { recursive: true })

    expect(resolveProjectPath(nestedPath)).toBe(tmpdir)
    expect(resolveProjectSource(nestedPath)).toBe("git")
  })

  test("manual adapter returns canonical project rows", () => {
    const tmpdir = freshTmpDir()
    tmpdirs.push(tmpdir)

    const realProjectPath = path.join(tmpdir, "real-project")
    const symlinkPath = path.join(tmpdir, "linked-project")
    fs.mkdirSync(realProjectPath)
    fs.symlinkSync(realProjectPath, symlinkPath)

    const adapter = new ManualProjectSourceAdapter()
    const row = adapter.refreshProject(symlinkPath)

    expect(row.id).toBe(projectIdForPath(realProjectPath))
    expect(row.path).toBe(realProjectPath)
    expect(row.name).toBe("real-project")
    expect(row.source).toBe("filesystem")
  })
})

describe("project discovery adapters", () => {
  test("lists host sources before the manual adapter source", () => {
    expect(listProjectDiscoverySources().map((source) => source.id)).toEqual(["opencode", "pi", "manual"])
  })
})
