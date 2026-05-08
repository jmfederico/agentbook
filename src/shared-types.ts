export type ProjectRow = {
  id: string
  path: string
  name: string
  title: string
  description: string
  source: string
  created_at: number
  updated_at: number
}

export type ProjectRecord = ProjectRow & {
  git_root: string | null
  git_common_dir: string | null
  plan_count: number
  task_count: number
}

export type ProjectDiscoverySource = {
  id: "opencode" | "pi" | "manual"
  title: string
  description: string
}

export type ProjectDiscoveryResponse = {
  sources: ProjectDiscoverySource[]
}

export type ProjectRefreshResponse = {
  currentProjectId: string
  projects: ProjectRecord[]
  sources: ProjectDiscoverySource[]
}

export type PlanRow = {
  id: string
  project_id: string
  name: string
  title: string
  description: string
  document: string
  spec: string
  status: string
  created_by: string
  created_at: number
  updated_at: number
}

export type TaskRow = {
  id: string
  plan_id: string
  title: string
  description: string
  status: string
  priority: number
  position: number
  assignee: string
  worktree_dir: string
  session_id: string
  depends_on: string
  notes: string
  created_at: number
  updated_at: number
}

export type PlanLookup = {
  plan: PlanRow | null
  multiple: boolean
}

export type TaskListFilters = {
  planRef?: string
  status?: string
  projectId?: string
}

export type CreatePlanInput = {
  title: string
  name?: string
  description?: string
  document?: string
  spec?: string
  createdBy?: string
}

export type UpdatePlanInput = {
  name?: string
  title?: string
  description?: string
  document?: string
  spec?: string
  status?: string
}

export type CreateTaskInput = {
  planRef: string
  title: string
  description?: string
  priority?: number
  dependsOn?: string
}

export type UpdateTaskInput = {
  title?: string
  description?: string
  status?: string
  priority?: number
  dependsOn?: string
  assignee?: string
  notes?: string
  session?: string
  worktree?: string
}

export type PlanSummary = {
  plan: Pick<PlanRow, "id" | "project_id" | "name" | "title" | "status" | "description" | "spec" | "document">
  progress: {
    total: number
    completed: number
    needs_guidance: number
    percentage: number
    by_status: Record<string, number>
  }
  tasks: Array<{
    id: string
    title: string
    status: string
    assignee: string | null
    worktree_dir: string | null
  }>
}

export type SelectionState = {
  projectId?: string
  planId?: string
  taskId?: string
}

export type LiveConnectionState = "connecting" | "open" | "closed" | "error"

export type InvalidationMessage = {
  type: "invalidate"
  scope?: string
  reason?: string
  projectId?: string
  dbPath?: string
  at?: number
}

export type HelloMessage = {
  type: "hello"
  projectId?: string
  dbPath?: string
}

export type SocketMessage = HelloMessage | InvalidationMessage | Record<string, unknown>
