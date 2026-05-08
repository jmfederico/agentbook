import type { Database } from "bun:sqlite"
import type { ProjectDiscoverySource, ProjectRefreshResponse, ProjectRow } from "./shared-types"
import { canonicalizeFsPath, projectIdForPath, projectNameForPath, resolveProjectPath, resolveProjectSource } from "./project-identity"

export type ProjectSourceAdapter = {
  source: ProjectDiscoverySource
  discoverProjects(): ProjectRow[]
  refreshProject(path: string): ProjectRow
  getHostSessionContext?(): Record<string, unknown> | null
}

function now() {
  return Date.now()
}

export class ManualProjectSourceAdapter implements ProjectSourceAdapter {
  source: ProjectDiscoverySource = {
    id: "manual",
    title: "Manual / generic",
    description: "Keep canonical filesystem-path projects in the shared registry.",
  }

  discoverProjects(): ProjectRow[] {
    return [this.refreshProject(resolveProjectPath())]
  }

  refreshProject(projectPath: string): ProjectRow {
    const ts = now()
    const canonicalPath = canonicalizeFsPath(projectPath)
    const name = projectNameForPath(canonicalPath)
    return {
      id: projectIdForPath(canonicalPath),
      path: canonicalPath,
      name,
      title: name,
      description: canonicalPath,
      source: resolveProjectSource(canonicalPath),
      created_at: ts,
      updated_at: ts,
    }
  }
}

export const HOST_DISCOVERY_SOURCES: ProjectDiscoverySource[] = [
  {
    id: "opencode",
    title: "opencode",
    description: "Discover projects from opencode workspaces and metadata.",
  },
  {
    id: "pi",
    title: "Pi.dev",
    description: "Discover projects from Pi.dev-backed workflows and metadata.",
  },
]

export function listProjectDiscoverySources(adapters: ProjectSourceAdapter[] = [new ManualProjectSourceAdapter()]): ProjectDiscoverySource[] {
  return [...HOST_DISCOVERY_SOURCES, ...adapters.map((adapter) => adapter.source)]
}

export function refreshProjectRegistryWithAdapters(
  db: Database,
  adapters: ProjectSourceAdapter[],
  options: { ensureProjectRow: (db: Database, seed: ProjectRow) => ProjectRow; listProjects: (db: Database) => ProjectRefreshResponse["projects"] },
): ProjectRefreshResponse {
  let currentProjectId = ""
  for (const adapter of adapters) {
    for (const project of adapter.discoverProjects()) {
      const row = options.ensureProjectRow(db, project)
      if (!currentProjectId && adapter.source.id === "manual") currentProjectId = row.id
    }
  }

  if (!currentProjectId) {
    currentProjectId = options.ensureProjectRow(db, new ManualProjectSourceAdapter().refreshProject(resolveProjectPath())).id
  }

  return {
    currentProjectId,
    projects: options.listProjects(db),
    sources: listProjectDiscoverySources(adapters),
  }
}
