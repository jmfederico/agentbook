export function resolveApiBaseUrl() {
  const explicit = import.meta.env.VITE_AGENTBOOK_API_BASE_URL?.trim()
  if (explicit) return explicit.replace(/\/+$/, "")
  if (typeof window !== "undefined") return window.location.origin
  return "http://127.0.0.1:3000"
}

export function resolveWebSocketUrl() {
  const explicit = import.meta.env.VITE_AGENTBOOK_WS_URL?.trim()
  if (explicit) return explicit

  const base = new URL(resolveApiBaseUrl())
  base.protocol = base.protocol === "https:" ? "wss:" : "ws:"
  base.pathname = "/ws"
  base.search = ""
  base.hash = ""
  return base.toString()
}
