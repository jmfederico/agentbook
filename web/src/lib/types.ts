export type ProjectRecord = {
  id: string
  name: string
  title: string
  description: string
  git_root: string | null
  git_common_dir: string | null
  db_path: string
  plan_count: number
  task_count: number
  updated_at: number
}

export type PlanRow = {
  id: string
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

export type PlanSummary = {
  plan: Pick<PlanRow, "id" | "name" | "title" | "status" | "description" | "spec" | "document">
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
