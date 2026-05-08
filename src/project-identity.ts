import fs from "fs"
import path from "path"
import { execSync } from "child_process"
import { createHash } from "crypto"
import type { ProjectRecord } from "./shared-types"

export function canonicalizeFsPath(input: string): string {
  try {
    return fs.realpathSync(input)
  } catch {
    return path.resolve(input)
  }
}

export function runGit(command: string, cwd: string): string | null {
  try {
    return execSync(command, { cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim()
  } catch {
    return null
  }
}

export function resolveProjectPath(cwd = process.cwd()): string {
  const canonicalCwd = canonicalizeFsPath(cwd)
  const gitRoot = runGit("git rev-parse --show-toplevel", canonicalCwd)
  return gitRoot ? canonicalizeFsPath(gitRoot) : canonicalCwd
}

export function resolveProjectSource(cwd = process.cwd()): "git" | "filesystem" {
  return runGit("git rev-parse --show-toplevel", canonicalizeFsPath(cwd)) ? "git" : "filesystem"
}

export function projectNameForPath(projectPath: string): string {
  return path.basename(projectPath) || "agentbook"
}

export function projectIdForPath(projectPath: string): string {
  return `project-${createHash("sha1").update(canonicalizeFsPath(projectPath)).digest("hex").slice(0, 12)}`
}

export function projectGitInfo(projectPath: string): Pick<ProjectRecord, "git_root" | "git_common_dir"> {
  const gitRoot = runGit("git rev-parse --show-toplevel", projectPath)
  if (!gitRoot) return { git_root: null, git_common_dir: null }

  const gitCommonDirRaw = runGit("git rev-parse --git-common-dir", projectPath)
  return {
    git_root: canonicalizeFsPath(gitRoot),
    git_common_dir: gitCommonDirRaw ? canonicalizeFsPath(path.resolve(projectPath, gitCommonDirRaw)) : null,
  }
}
