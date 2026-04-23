import { describe, it, expect } from "bun:test"
import { freshTmpDir, runCli } from "./helpers"

/**
 * Smoke check: confirm that bun-in-bun subprocess works.
 * Spawns `bun src/cli.ts --help` and asserts exit code 0.
 * All downstream test tasks depend on this passing.
 */
describe("bun-in-bun smoke check", () => {
  it("agentbook --help exits 0 and prints usage", () => {
    const tmp = freshTmpDir()
    const result = runCli(["--help"], { dbPath: `${tmp}/smoke.db` })
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain("agentbook")
  })
})
