import { resolveApiBaseUrl, resolveWebSocketUrl } from "./env"
import type {
  LiveConnectionState,
  PlanRow,
  PlanSummary,
  ProjectDiscoveryResponse,
  ProjectRefreshResponse,
  ProjectRecord,
  SelectionState,
  SocketMessage,
  TaskRow,
} from "./types"

function buildQuery(params: Record<string, string | undefined>) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value)
  }
  const query = search.toString()
  return query ? `?${query}` : ""
}

export class AgentbookApiClient {
  constructor(private readonly baseUrl = resolveApiBaseUrl()) {}

  private endpoint(path: string) {
    return new URL(path, this.baseUrl).toString()
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const headers = new Headers(init?.headers)
    if (!headers.has("accept")) headers.set("accept", "application/json")

    const response = await fetch(this.endpoint(path), { ...init, headers })
    if (!response.ok) {
      const message = await response.text().catch(() => "")
      throw new Error(message ? `${response.status} ${response.statusText}: ${message}` : `${response.status} ${response.statusText}`)
    }

    return (await response.json()) as T
  }

  listProjects() {
    return this.request<{ projects: ProjectRecord[]; currentProjectId: string }>("/api/projects")
  }

  listProjectDiscoverySources() {
    return this.request<ProjectDiscoveryResponse>("/api/projects/discovery")
  }

  refreshProjects() {
    return this.request<ProjectRefreshResponse>("/api/projects/discovery/refresh", { method: "POST" })
  }

  listPlans(projectId: string, status?: string) {
    return this.request<{ project: ProjectRecord; plans: PlanRow[] }>(`/api/projects/${encodeURIComponent(projectId)}/plans${buildQuery({ status })}`)
  }

  listTasks(projectId: string, planRef?: string, status?: string) {
    return this.request<{ project: ProjectRecord; tasks: TaskRow[] }>(
      `/api/projects/${encodeURIComponent(projectId)}/tasks${buildQuery({ planRef, status })}`,
    )
  }

  getPlan(ref: string) {
    return this.request<{ plan: PlanRow }>(`/api/plans/${encodeURIComponent(ref)}`)
  }

  getPlanSummary(ref: string) {
    return this.request<PlanSummary>(`/api/plans/${encodeURIComponent(ref)}/summary`)
  }

  getTask(id: string) {
    return this.request<{ task: TaskRow }>(`/api/tasks/${encodeURIComponent(id)}`)
  }

  getSelection(projectId: string, selection: SelectionState) {
    return this.request<{
      project: ProjectRecord
      plan: PlanRow | null
      task: TaskRow | null
      summary: PlanSummary | null
      tasks: TaskRow[]
    }>(`/api/projects/${encodeURIComponent(projectId)}/selection${buildQuery({ planRef: selection.planId, taskId: selection.taskId })}`)
  }
}

type StatusListener = (status: LiveConnectionState) => void
type MessageListener = (message: SocketMessage) => void

export class LiveUpdatesClient {
  private socket: WebSocket | null = null
  private reconnectTimer: number | null = null
  private running = false

  onStatus: StatusListener | null = null
  onMessage: MessageListener | null = null

  constructor(private readonly url = resolveWebSocketUrl()) {}

  connect() {
    this.running = true
    this.open()
  }

  disconnect() {
    this.running = false
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.socket?.close()
    this.socket = null
    this.onStatus?.("closed")
  }

  private open() {
    if (!this.running) return

    this.onStatus?.("connecting")
    const socket = new WebSocket(this.url)
    this.socket = socket

    socket.addEventListener("open", () => this.onStatus?.("open"))
    socket.addEventListener("message", (event) => {
      try {
        this.onMessage?.(JSON.parse(String(event.data)) as SocketMessage)
      } catch {
        this.onMessage?.({ type: "invalidate", reason: "unparseable-message" })
      }
    })
    socket.addEventListener("error", () => this.onStatus?.("error"))
    socket.addEventListener("close", () => {
      this.onStatus?.("closed")
      if (!this.running) return

      if (this.reconnectTimer !== null) window.clearTimeout(this.reconnectTimer)
      this.reconnectTimer = window.setTimeout(() => {
        this.reconnectTimer = null
        this.open()
      }, 2000)
    })
  }
}
